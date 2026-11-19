import io
import os
import logging
import threading
from decimal import Decimal
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
import qrcode
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader

logger = logging.getLogger(__name__)


def generate_ticket_qr_png(booking):

    frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    booking_id = getattr(booking, 'booking_id', 'ETX-CONFIRMED')
    event_title = getattr(booking.event, 'title', '')
    quantity = getattr(booking, 'quantity', 1)
    
    payload = f"{frontend_base}/#payment-confirmation?id={booking_id}&seats={quantity}&event={event_title}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=8,
        border=1,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0F172A", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf.getvalue()


def _draw_pill(c, text, x, y, bg_color="#E0F2FE", border_color="#BAE6FD", text_color="#075985", font_size=7, h=16, px=8):
    c.setFont("Helvetica-Bold", font_size)
    text_w = c.stringWidth(text, "Helvetica-Bold", font_size)
    pill_w = text_w + (px * 2)

    c.setFillColor(colors.HexColor(bg_color))
    c.setStrokeColor(colors.HexColor(border_color))
    c.setLineWidth(0.8)
    c.roundRect(x, y, pill_w, h, h / 2, fill=1, stroke=1)

    c.setFillColor(colors.HexColor(text_color))
    c.drawString(x + px, y + (h - font_size) / 2 + 1, text)
    return pill_w


def generate_ticket_pdf(booking):
    
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter # 612 x 792 pt

    event = booking.event
    user = booking.user
    display_name = user.get_full_name() or user.first_name or user.username
    booking_id = getattr(booking, 'booking_id', 'ETX-CONFIRMED')
    quantity = getattr(booking, 'quantity', 1)
    total_price = getattr(booking, 'total_price', Decimal('0.00'))

    # Custom requirements (Tier, Seating, Dietary)
    reqs = getattr(booking, 'custom_requirements', None)
    tier = getattr(reqs, 'ticket_tier', 'GENERAL_ADMISSION') if reqs else 'GENERAL_ADMISSION'
    tier_label = 'VIP Access' if tier == 'VIP' else ('Early Bird' if tier == 'EARLY_BIRD' else 'General Admission')
    seating = getattr(reqs, 'seating_preference', 'Standard') if reqs else 'Standard'
    dietary = getattr(reqs, 'dietary_preference', 'None') if reqs else 'None'

    # Attendee phone
    profile = getattr(user, 'profile', None)
    phone = getattr(profile, 'phone', '') if profile else ''

    # Payment details
    payment = getattr(booking, 'payment', None)
    payment_method = getattr(payment, 'payment_method', '') or getattr(payment, 'payment_provider', 'cash')
    payment_method_str = payment_method.lower() if payment_method else 'cash'
    
    # Transaction ref
    if payment and getattr(payment, 'razorpay_payment_id', None):
        tx_ref = payment.razorpay_payment_id
    elif payment and getattr(payment, 'stripe_payment_intent_id', None):
        tx_ref = payment.stripe_payment_intent_id
    else:
        tx_ref = f"{payment_method_str.upper()}-{booking_id}"

    # Formatted Date & Time
    start_dt = getattr(event, 'start_time', None)
    end_dt = getattr(event, 'end_time', None)
    date_str = start_dt.strftime("%a, %b %d, %Y") if start_dt else "Date TBA"
    if start_dt and end_dt:
        time_str = f"{start_dt.strftime('%I:%M %p').lstrip('0')} – {end_dt.strftime('%I:%M %p').lstrip('0')} IST"
    elif start_dt:
        time_str = f"{start_dt.strftime('%I:%M %p').lstrip('0')} IST"
    else:
        time_str = "Time TBA"

    booked_at_dt = getattr(booking, 'booked_at', None)
    issued_on_str = booked_at_dt.strftime("%a, %b %d, %Y") if booked_at_dt else "Today"

    venue_name = getattr(event, 'venue_name', 'Event Venue')
    location = getattr(event, 'location_or_link', '')
    city = getattr(event, 'city', '')
    address_str = f"{venue_name}, {location}" if location else venue_name
    if city and city.lower() not in address_str.lower():
        address_str += f", {city}"

    # -------------------------------------------------------------
    # TICKET CARD BOUNDS
    # -------------------------------------------------------------
    card_w = 460
    card_h = 672
    card_x = (width - card_w) / 2 # 76
    card_y = (height - card_h) / 2 # 60
    top_y = card_y + card_h

    # Card background (white rounded container with border)
    c.setFillColor(colors.HexColor("#FFFFFF"))
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(1.5)
    c.roundRect(card_x, card_y, card_w, card_h, 16, fill=1, stroke=1)

    # 1. Top Premium Accent Strip (Gradient simulation: #075985 -> #0284C7 -> #FF4F70)
    strip_h = 5
    seg_w = (card_w - 4) / 3
    c.setFillColor(colors.HexColor("#075985"))
    c.roundRect(card_x + 2, top_y - strip_h - 1, seg_w + 2, strip_h, 2, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#0284C7"))
    c.rect(card_x + 2 + seg_w, top_y - strip_h - 1, seg_w, strip_h, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FF4F70"))
    c.roundRect(card_x + 2 + (seg_w * 2) - 2, top_y - strip_h - 1, seg_w + 2, strip_h, 2, fill=1, stroke=0)

    # 2. Header Bar (#F8FAFC)
    header_h = 52
    header_bottom = top_y - strip_h - header_h
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.roundRect(card_x + 1, header_bottom, card_w - 2, header_h, 0, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#F1F5F9"))
    c.setLineWidth(1)
    c.line(card_x, header_bottom, card_x + card_w, header_bottom)

    # Brand Logo (mark + wordmark)
    logo_path = os.path.normpath(os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'logo_mark.png'))
    if os.path.exists(logo_path):
        try:
            logo_img = ImageReader(logo_path)
            c.drawImage(logo_img, card_x + 20, header_bottom + 12, width=28, height=28, mask='auto')
            text_start_x = card_x + 54
        except Exception:
            text_start_x = card_x + 20
    else:
        text_start_x = card_x + 20

    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(text_start_x, header_bottom + 27, "EVENTRIX")
    # Orange dot
    c.setFillColor(colors.HexColor("#F97316"))
    c.circle(text_start_x + 78, header_bottom + 32, 2.5, fill=1, stroke=0)

    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(text_start_x, header_bottom + 15, "EVENTS MANAGEMENT SYSTEM")

    # Header Right: Verified Pass Badge & Booking ID
    badge_w = 98
    badge_h = 20
    badge_x = card_x + card_w - badge_w - 20
    badge_y = header_bottom + 24

    c.setFillColor(colors.HexColor("#ECFDF5"))
    c.setStrokeColor(colors.HexColor("#A7F3D0"))
    c.setLineWidth(1)
    c.roundRect(badge_x, badge_y, badge_w, badge_h, badge_h / 2, fill=1, stroke=1)

    # Green glowing dot
    c.setFillColor(colors.HexColor("#10B981"))
    c.circle(badge_x + 10, badge_y + 10, 2.5, fill=1, stroke=0)

    # Shield check icon / text
    c.setFillColor(colors.HexColor("#065F46"))
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(badge_x + 18, badge_y + 6.5, "VERIFIED PASS")

    # Booking ID
    c.setFillColor(colors.HexColor("#075985"))
    c.setFont("Helvetica-Bold", 10.5)
    c.drawRightString(card_x + card_w - 20, header_bottom + 9, booking_id)

    # 3. Event Information Section
    cur_y = header_bottom - 18

    # Category Chips
    chip_x = card_x + 20
    city_name_chip = (city or "LIVE EVENT").upper()
    chip_w1 = _draw_pill(c, city_name_chip, chip_x, cur_y, bg_color="#E0F2FE", border_color="#BAE6FD", text_color="#075985")
    chip_x += chip_w1 + 6

    category_name = event.category.name.upper() if getattr(event, 'category', None) else 'SPECIAL EVENT'
    chip_w2 = _draw_pill(c, category_name, chip_x, cur_y, bg_color="#F1F5F9", border_color="#E2E8F0", text_color="#475569")
    chip_x += chip_w2 + 6

    tier_chip_text = tier_label.upper()
    _draw_pill(c, tier_chip_text, chip_x, cur_y, bg_color="#E0F2FE", border_color="#BAE6FD", text_color="#075985")

    # Event Title (wrapped cleanly by word)
    cur_y -= 26
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 15)
    import textwrap
    title_lines = textwrap.wrap(event.title, width=38)
    for line in title_lines[:2]:
        c.drawString(card_x + 20, cur_y, line)
        cur_y -= 18
    if len(title_lines) == 1:
        cur_y += 2

    # Short description (wrapped cleanly by word)
    cur_y -= 4
    desc = getattr(event, 'short_description', '') or (event.description[:140] if event.description else '')
    c.setFillColor(colors.HexColor("#475569"))
    c.setFont("Helvetica", 7.5)
    desc_lines = textwrap.wrap(desc, width=85)
    for line in desc_lines[:2]:
        c.drawString(card_x + 20, cur_y, line)
        cur_y -= 11
    if len(desc_lines) <= 1:
        cur_y -= 2

    # 4. Schedule & Venue Side-by-Side Cards
    cur_y -= 10
    side_w = (card_w - 40 - 10) / 2 # 205
    box_h = 50

    # Left Box: Date & Schedule
    b1_x = card_x + 20
    b1_y = cur_y - box_h
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.setLineWidth(1)
    c.roundRect(b1_x, b1_y, side_w, box_h, 8, fill=1, stroke=1)

    # Vector Calendar Icon
    c.setFillColor(colors.HexColor("#E0F2FE"))
    c.roundRect(b1_x + 8, b1_y + 13, 24, 24, 6, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#075985"))
    c.roundRect(b1_x + 13, b1_y + 18, 14, 13, 2, fill=0, stroke=1)
    c.rect(b1_x + 13, b1_y + 26, 14, 5, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FFFFFF"))
    c.rect(b1_x + 15, b1_y + 29, 2, 3, fill=1, stroke=0)
    c.rect(b1_x + 23, b1_y + 29, 2, 3, fill=1, stroke=0)

    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(b1_x + 38, b1_y + 35, "DATE & SCHEDULE")

    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(b1_x + 38, b1_y + 22, date_str)

    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 7)
    c.drawString(b1_x + 38, b1_y + 11, time_str)

    # Right Box: Venue
    b2_x = b1_x + side_w + 10
    b2_y = b1_y
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.roundRect(b2_x, b2_y, side_w, box_h, 8, fill=1, stroke=1)

    # Vector Pin Icon
    c.setFillColor(colors.HexColor("#FFE4E6"))
    c.roundRect(b2_x + 8, b2_y + 13, 24, 24, 6, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FF4F70"))
    c.circle(b2_x + 20, b2_y + 27, 4.5, fill=1, stroke=0)
    # triangle bottom of pin
    p = c.beginPath()
    p.moveTo(b2_x + 16.5, b2_y + 25)
    p.lineTo(b2_x + 23.5, b2_y + 25)
    p.lineTo(b2_x + 20, b2_y + 18)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FFFFFF"))
    c.circle(b2_x + 20, b2_y + 27, 1.8, fill=1, stroke=0)

    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(b2_x + 38, b2_y + 35, "VENUE")

    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 9)
    v_disp = (venue_name[:28] + '...') if len(venue_name) > 28 else venue_name
    c.drawString(b2_x + 38, b2_y + 22, v_disp)

    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 7)
    c.drawString(b2_x + 38, b2_y + 11, f"{city} • In-Person Access" if city else "In-Person Access")

    # 5. Venue Address Bar
    cur_y = b1_y - 8
    addr_h = 44
    addr_y = cur_y - addr_h
    c.setFillColor(colors.HexColor("#F0F9FF"))
    c.setStrokeColor(colors.HexColor("#BAE6FD"))
    c.setLineWidth(1)
    c.roundRect(card_x + 20, addr_y, card_w - 40, addr_h, 8, fill=1, stroke=1)

    # Vector Building Icon
    c.setFillColor(colors.HexColor("#E0F2FE"))
    c.roundRect(card_x + 28, addr_y + 10, 22, 22, 6, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#075985"))
    c.rect(card_x + 33, addr_y + 14, 12, 14, fill=0, stroke=1)
    c.rect(card_x + 35, addr_y + 21, 2.5, 2.5, fill=1, stroke=0)
    c.rect(card_x + 40.5, addr_y + 21, 2.5, 2.5, fill=1, stroke=0)
    c.rect(card_x + 37, addr_y + 14, 4, 5, fill=1, stroke=0)

    # Label & City
    c.setFillColor(colors.HexColor("#075985"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(card_x + 56, addr_y + 30, "EVENT VENUE ADDRESS")

    if city:
        c.setFillColor(colors.HexColor("#64748B"))
        c.setFont("Helvetica", 6.5)
        c.drawString(card_x + 160, addr_y + 30, f"City: {city}")

    c.setFillColor(colors.HexColor("#1E293B"))
    c.setFont("Helvetica-Bold", 7)
    addr_lines = textwrap.wrap(address_str, width=68)
    if len(addr_lines) >= 2:
        c.drawString(card_x + 56, addr_y + 18, addr_lines[0])
        c.drawString(card_x + 56, addr_y + 8, addr_lines[1])
    elif addr_lines:
        c.drawString(card_x + 56, addr_y + 14, addr_lines[0])

    # 6. Realistic Perforated Ticket Tear Line with Notches
    tear_y = addr_y - 15
    notch_r = 8

    # Left Notch
    c.setFillColor(colors.HexColor("#FFFFFF"))
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(1.2)
    c.circle(card_x, tear_y, notch_r, fill=1, stroke=1)

    # Right Notch
    c.circle(card_x + card_w, tear_y, notch_r, fill=1, stroke=1)

    # Dashed Perforation Line
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(1.2)
    c.setDash(4, 3)
    c.line(card_x + notch_r + 2, tear_y, card_x + card_w - notch_r - 2, tear_y)
    c.setDash() # reset dash

    # 7. Attendee & Admission Metadata Grid (4 Columns)
    cur_y = tear_y - 10
    col_w = (card_w - 40) / 4 # 105

    # Background tint for metadata area
    meta_h = 58
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.roundRect(card_x + 1, cur_y - meta_h, card_w - 2, meta_h, 0, fill=1, stroke=0)

    # Col 1: Attendee
    c1_x = card_x + 20
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(c1_x, cur_y - 10, "ATTENDEE")
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(c1_x, cur_y - 22, (display_name[:18] + '...') if len(display_name) > 18 else display_name)
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 6.5)
    c.drawString(c1_x, cur_y - 33, (user.email[:20] + '...') if len(user.email) > 20 else user.email)
    if phone:
        c.drawString(c1_x, cur_y - 43, str(phone))

    # Col 2: Admission
    c2_x = c1_x + col_w
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(c2_x, cur_y - 10, "ADMISSION")
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(c2_x, cur_y - 22, tier_label)
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 6.5)
    c.drawString(c2_x, cur_y - 33, f"{quantity} Ticket" if quantity == 1 else f"{quantity} Tickets")

    # Col 3: Seating Zone
    c3_x = c2_x + col_w
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(c3_x, cur_y - 10, "SEATING ZONE")
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(c3_x, cur_y - 22, seating[:16])
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 6.5)
    c.drawString(c3_x, cur_y - 33, f"Diet: {dietary}" if dietary else "Diet: None")

    # Col 4: Settled Amount
    c4_x = c3_x + col_w
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(c4_x, cur_y - 10, "SETTLED AMOUNT")
    
    # Vector Rupee Symbol
    rupee_x = c4_x
    rupee_y = cur_y - 22
    c.setStrokeColor(colors.HexColor("#059669"))
    c.setFillColor(colors.HexColor("#059669"))
    c.setLineWidth(1.2)
    c.line(rupee_x, rupee_y + 8.5, rupee_x + 6.5, rupee_y + 8.5)
    c.line(rupee_x, rupee_y + 5.8, rupee_x + 5.5, rupee_y + 5.8)
    c.line(rupee_x + 1.2, rupee_y + 8.5, rupee_x + 1.2, rupee_y + 2.5)
    p_rp = c.beginPath()
    p_rp.moveTo(rupee_x + 1.2, rupee_y + 8.5)
    p_rp.curveTo(rupee_x + 6.5, rupee_y + 8.5, rupee_x + 6.5, rupee_y + 4.5, rupee_x + 1.2, rupee_y + 4.5)
    c.drawPath(p_rp, fill=0, stroke=1)
    c.line(rupee_x + 2.2, rupee_y + 4.5, rupee_x + 6.5, rupee_y)

    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(c4_x + 9, cur_y - 22, f"{float(total_price):,.2f}")
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 6.5)
    c.drawString(c4_x, cur_y - 33, f"{payment_method_str} • Paid & Verified")

    # 8. Transaction Ref Bar
    tx_y = cur_y - meta_h - 4
    tx_h = 20
    c.setFillColor(colors.HexColor("#FFFFFF"))
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.setLineWidth(1)
    c.roundRect(card_x + 20, tx_y - tx_h, card_w - 40, tx_h, 6, fill=1, stroke=1)

    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 7)
    c.drawString(card_x + 30, tx_y - 13, "Transaction Ref:")

    c.setFillColor(colors.HexColor("#1E293B"))
    c.setFont("Helvetica-Bold", 7.5)
    c.drawRightString(card_x + card_w - 30, tx_y - 13, tx_ref)

    # 9. QR Entry Verification Stub
    stub_top_y = tx_y - tx_h - 10
    stub_h = 100
    stub_bottom_y = stub_top_y - stub_h

    # Top border separating stub
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.setLineWidth(1)
    c.line(card_x, stub_top_y, card_x + card_w, stub_top_y)

    # Left: Authorized Entry Pass
    _draw_pill(c, "✔ Authorized Entry Pass", card_x + 20, stub_top_y - 22, bg_color="#E0F2FE", border_color="#BAE6FD", text_color="#075985", font_size=7, h=16, px=8)

    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(card_x + 20, stub_top_y - 36, "Present this QR Code at the Venue Turnstiles")

    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 6.5)
    c.drawString(card_x + 20, stub_top_y - 48, "This digital pass contains a cryptographically verified security token.")
    c.drawString(card_x + 20, stub_top_y - 58, "Scan directly from your phone screen or printed copy.")

    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica", 7)
    c.drawString(card_x + 20, stub_top_y - 74, f"Issued on: {issued_on_str}")

    # Right: High Contrast QR Code Block
    qr_card_w = 84
    qr_card_h = 88
    qr_card_x = card_x + card_w - qr_card_w - 20
    qr_card_y = stub_top_y - qr_card_h - 4

    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.setLineWidth(1.2)
    c.roundRect(qr_card_x, qr_card_y, qr_card_w, qr_card_h, 8, fill=1, stroke=1)

    # Inner QR white container
    c.setFillColor(colors.HexColor("#FFFFFF"))
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(0.8)
    c.roundRect(qr_card_x + 7, qr_card_y + 14, 70, 70, 6, fill=1, stroke=1)

    qr_bytes = generate_ticket_qr_png(booking)
    qr_img = ImageReader(io.BytesIO(qr_bytes))
    c.drawImage(qr_img, qr_card_x + 9, qr_card_y + 16, width=66, height=66)

    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 5.5)
    c.drawCentredString(qr_card_x + (qr_card_w / 2), qr_card_y + 5, "SCAN FOR ENTRY")

    # 10. Footer Legal Disclaimer Bar
    c.setFillColor(colors.HexColor("#F1F5F9"))
    c.roundRect(card_x + 1, card_y + 1, card_w - 2, 22, 4, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.setLineWidth(1)
    c.line(card_x, card_y + 22, card_x + card_w, card_y + 22)

    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(width / 2, card_y + 8, "Official Eventrix Entry Pass. Non-transferable once scanned at gate turnstile. Eventrix Hub © 2026.")

    c.save()
    buf.seek(0)
    return buf.getvalue()


def get_ticket_email_clean_html(booking):
    """
    Generates a simple, clean, and minimal HTML confirmation message.
    """
    event = booking.event
    user = booking.user
    display_name = user.get_full_name() or user.first_name or user.username
    booking_id = getattr(booking, 'booking_id', 'ETX-CONFIRMED')
    quantity = getattr(booking, 'quantity', 1)
    total_price = getattr(booking, 'total_price', Decimal('0.00'))
    support_email = getattr(settings, 'EMAIL_HOST_USER', 'ravitech090@gmail.com')

    reqs = getattr(booking, 'custom_requirements', None)
    tier = getattr(reqs, 'ticket_tier', 'GENERAL_ADMISSION') if reqs else 'GENERAL_ADMISSION'
    tier_label = 'VIP Access' if tier == 'VIP' else ('Early Bird' if tier == 'EARLY_BIRD' else 'General Admission')

    start_dt = getattr(event, 'start_time', None)
    end_dt = getattr(event, 'end_time', None)
    date_str = start_dt.strftime("%A, %B %d, %Y") if start_dt else "Date TBA"
    if start_dt and end_dt:
        time_str = f"{start_dt.strftime('%I:%M %p').lstrip('0')} – {end_dt.strftime('%I:%M %p').lstrip('0')} IST"
    elif start_dt:
        time_str = f"{start_dt.strftime('%I:%M %p').lstrip('0')} IST"
    else:
        time_str = "Time TBA"

    venue_name = getattr(event, 'venue_name', 'Event Venue')
    city = getattr(event, 'city', '')

    frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    my_bookings_url = f"{frontend_base}/#my-bookings"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ticket Confirmation - {event.title}</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; padding: 24px 28px;">
          
          <!-- Logo -->
          <tr>
            <td style="padding-bottom: 18px; border-bottom: 1px solid #f1f5f9;">
              <span style="font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">EVENTRIX</span>
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #f97316; vertical-align: middle; margin-left: 2px;"></span>
            </td>
          </tr>

          <!-- Simple Message -->
          <tr>
            <td style="padding-top: 20px;">
              <p style="font-size: 14px; margin: 0 0 12px; color: #0f172a;">
                Dear <strong>{display_name}</strong>,
              </p>
              <p style="font-size: 14px; margin: 0 0 16px; color: #334155;">
                Your booking for <strong>{event.title}</strong> has been successfully confirmed.
              </p>

              <!-- Quick Details Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 0 0 16px; font-size: 13px;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <div style="margin-bottom: 4px;"><strong>Booking ID:</strong> <span style="color: #075985;">{booking_id}</span></div>
                    <div style="margin-bottom: 4px;"><strong>Date & Time:</strong> {date_str} ({time_str})</div>
                    <div style="margin-bottom: 4px;"><strong>Venue:</strong> {venue_name}{f', {city}' if city else ''}</div>
                    <div style="margin-bottom: 4px;"><strong>Admission:</strong> {tier_label} ({quantity} Ticket{'s' if quantity > 1 else ''})</div>
                    <div><strong>Amount Paid:</strong> ₹{float(total_price):,.2f}</div>
                  </td>
                </tr>
              </table>

              <!-- PDF Attachment Notice -->
              <p style="font-size: 13px; color: #075985; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px 14px; margin: 0 0 20px;">
                📎 <strong>Your Official Ticket (PDF) is attached to this email.</strong><br>
                You can scan the QR code directly from your smartphone or print it for entry at the venue.
              </p>

              <!-- Button -->
              <p style="margin: 0 0 20px;">
                <a href="{my_bookings_url}" target="_blank" style="display: inline-block; background-color: #075985; color: #ffffff !important; text-decoration: none; font-size: 13px; font-weight: 600; padding: 9px 20px; border-radius: 6px;">
                  View My Bookings &rarr;
                </a>
              </p>

              <p style="font-size: 13px; color: #64748b; margin: 0;">
                Warm regards,<br>
                <strong style="color: #0f172a;">Eventrix Team</strong>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return html


def _send_ticket_email_task(subject, text_content, html_content, recipient_email, from_email, pdf_bytes, booking_id):
    
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[recipient_email]
        )
        msg.attach_alternative(html_content, "text/html")

        # Attach PDF ticket
        if pdf_bytes:
            pdf_filename = f"Eventrix_Ticket_{booking_id}.pdf"
            msg.attach(pdf_filename, pdf_bytes, "application/pdf")

        msg.send(fail_silently=False)
        logger.info(f"Successfully sent ticket PDF email to {recipient_email} for booking {booking_id}")
    except Exception as e:
        logger.error(f"Failed to send ticket email to {recipient_email} for booking {booking_id}: {str(e)}", exc_info=True)


def send_booking_ticket_email(booking, async_send=True):
    
    user = getattr(booking, 'user', None)
    if not user or not getattr(user, 'email', None):
        logger.warning(f"Booking {getattr(booking, 'booking_id', 'UNKNOWN')} has no valid user email. Skipping ticket email.")
        return False

    event = getattr(booking, 'event', None)
    event_title = getattr(event, 'title', 'Your Event')
    booking_id = getattr(booking, 'booking_id', 'ETX-CONFIRMED')
    display_name = user.get_full_name() or user.first_name or user.username
    total_price = getattr(booking, 'total_price', Decimal('0.00'))

    reqs = getattr(booking, 'custom_requirements', None)
    tier = getattr(reqs, 'ticket_tier', 'GENERAL_ADMISSION') if reqs else 'GENERAL_ADMISSION'
    tier_label = 'VIP Access' if tier == 'VIP' else ('Early Bird' if tier == 'EARLY_BIRD' else 'General Admission')
    quantity = getattr(booking, 'quantity', 1)

    subject = f"🎟️ Your Ticket for {event_title} - Booking Confirmed! [{booking_id}]"

    # Generate matching PDF ticket bytes
    try:
        pdf_bytes = generate_ticket_pdf(booking)
    except Exception as e:
        logger.error(f"Failed to generate ticket PDF for {booking_id}: {str(e)}", exc_info=True)
        pdf_bytes = None

    # Clean, simple HTML Email Message
    html_content = get_ticket_email_clean_html(booking)

    # Clean Plain text version
    start_dt = getattr(event, 'start_time', None)
    date_str = start_dt.strftime("%A, %B %d, %Y") if start_dt else "TBA"
    venue_str = getattr(event, 'venue_name', 'Venue TBA')
    city = getattr(event, 'city', '')
    
    text_content = (
        f"Dear {display_name},\n\n"
        f"Thank you for your booking! Your payment of ₹{float(total_price):,.2f} has been successfully processed and your booking is confirmed.\n\n"
        f"BOOKING CONFIRMATION SUMMARY:\n"
        f"• Event: {event_title}\n"
        f"• Booking ID: {booking_id}\n"
        f"• Date: {date_str}\n"
        f"• Venue: {venue_str}{f', {city}' if city else ''}\n"
        f"• Admission: {tier_label} ({quantity} Ticket{'s' if quantity > 1 else ''})\n"
        f"• Amount Paid: ₹{float(total_price):,.2f}\n\n"
        f"Your official verified ticket is attached to this email as a PDF (Eventrix_Ticket_{booking_id}.pdf).\n"
        f"Please present the QR code directly from your smartphone or print a physical copy at the venue turnstiles.\n\n"
        f"Warm regards,\n"
        f"Eventrix Team\n"
        f"Support: {getattr(settings, 'EMAIL_HOST_USER', 'ravitech090@gmail.com')}\n"
    )

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', getattr(settings, 'EMAIL_HOST_USER', 'ravitech090@gmail.com'))

    if async_send:
        thread = threading.Thread(
            target=_send_ticket_email_task,
            args=(subject, text_content, html_content, user.email, from_email, pdf_bytes, booking_id),
            daemon=True
        )
        thread.start()
        return True
    else:
        try:
            _send_ticket_email_task(subject, text_content, html_content, user.email, from_email, pdf_bytes, booking_id)
            return True
        except Exception:
            return False

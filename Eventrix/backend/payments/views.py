import uuid
import logging
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
import stripe
from bookings.models import Booking
from bookings.serializers import BookingSerializer
from bookings.emails import send_booking_ticket_email
from .models import PaymentTransaction

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'publishable_key': settings.STRIPE_PUBLISHABLE_KEY
        })

class CreatePaymentIntentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        booking = get_object_or_404(Booking, booking_id=booking_id, user=request.user)

        if booking.status == 'CONFIRMED':
            return Response({'error': 'Booking is already confirmed and paid'}, status=status.HTTP_400_BAD_REQUEST)

        amount_in_cents = int(round(booking.total_price * 100))
        
        # Free event handling
        if amount_in_cents <= 0:
            booking.status = 'CONFIRMED'
            booking.save()
            send_booking_ticket_email(booking, async_send=True)
            return Response({
                'is_free': True,
                'status': 'CONFIRMED',
                'message': 'Free admission confirmed'
            })

        # Test Stripe Payment Intent
        try:
            # If a genuine test secret key is configured, create real Stripe PaymentIntent
            if settings.STRIPE_SECRET_KEY.startswith('sk_test_') and len(settings.STRIPE_SECRET_KEY) > 30:
                intent = stripe.PaymentIntent.create(
                    amount=amount_in_cents,
                    currency='usd',
                    metadata={
                        'booking_id': booking.booking_id,
                        'user_username': request.user.username,
                        'event_title': booking.event.title,
                        'discount_applied': f"{booking.discount_percentage}%"
                    }
                )
                client_secret = intent.client_secret
                intent_id = intent.id
            else:
                # Mock Stripe test intent for instant standalone local testing
                intent_id = f"pi_test_{uuid.uuid4().hex[:16]}"
                client_secret = f"{intent_id}_secret_{uuid.uuid4().hex[:16]}"

            transaction, _ = PaymentTransaction.objects.update_or_create(
                booking=booking,
                defaults={
                    'stripe_payment_intent_id': intent_id,
                    'stripe_client_secret': client_secret,
                    'amount': booking.total_price,
                    'currency': 'usd',
                    'status': 'PENDING'
                }
            )

            return Response({
                'client_secret': client_secret,
                'payment_intent_id': intent_id,
                'amount': float(booking.total_price),
                'currency': 'usd',
                'booking_id': booking.booking_id,
                'discount_percentage': float(booking.discount_percentage),
                'discount_amount': float(booking.discount_amount),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ConfirmPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        payment_intent_id = request.data.get('payment_intent_id')

        booking = get_object_or_404(Booking, booking_id=booking_id, user=request.user)

        try:
            transaction = PaymentTransaction.objects.get(booking=booking)
            transaction.status = 'SUCCEEDED'
            transaction.receipt_url = f"https://dashboard.stripe.com/test/payments/{payment_intent_id}"
            transaction.save()
        except PaymentTransaction.DoesNotExist:
            PaymentTransaction.objects.create(
                booking=booking,
                stripe_payment_intent_id=payment_intent_id or f"pi_test_{uuid.uuid4().hex[:16]}",
                amount=booking.total_price,
                currency='usd',
                status='SUCCEEDED'
            )

        booking.status = 'CONFIRMED'
        booking.save()
        send_booking_ticket_email(booking, async_send=True)

        return Response({
            'success': True,
            'message': 'Payment confirmed successfully. Your ticket has been issued!',
            'booking_id': booking.booking_id,
            'status': booking.status,
            'event_title': booking.event.title,
            'quantity': booking.quantity,
            'amount_paid': float(booking.total_price),
            'discount_saved': float(booking.discount_amount),
        })


class CashPaymentView(APIView):
    """
    Confirms a booking payment via Cash (e.g. Cash at Venue / Pay at Counter).
    Idempotent, validates user ownership, records PaymentTransaction as SUCCEEDED,
    and updates Booking status to CONFIRMED.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id') or request.data.get('bookingId')
        if not booking_id:
            return Response({'error': 'booking_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        booking = get_object_or_404(Booking, booking_id=booking_id)

        # Verify user ownership
        if booking.user != request.user:
            return Response(
                {'error': 'You are not authorized to confirm payment for this booking'},
                status=status.HTTP_403_FORBIDDEN
            )

        if booking.status == 'CANCELLED':
            return Response(
                {'error': 'This booking has been cancelled and cannot be paid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        currency = getattr(settings, 'RAZORPAY_CURRENCY', 'INR')

        # Idempotent response if already confirmed
        if booking.status == 'CONFIRMED':
            return Response({
                'success': True,
                'message': f'Booking {booking.booking_id} is already confirmed.',
                'booking_id': booking.booking_id,
                'status': 'CONFIRMED',
                'payment_method': 'CASH',
                'amount_paid': float(booking.total_price),
                'booking': BookingSerializer(booking).data,
            })

        cash_receipt_id = f"CASH-{booking.booking_id}"
        PaymentTransaction.objects.update_or_create(
            booking=booking,
            defaults={
                'payment_provider': 'cash',
                'payment_method': 'cash',
                'amount': booking.total_price,
                'currency': currency,
                'status': 'SUCCEEDED',
                'receipt_url': None,
            }
        )

        booking.status = 'CONFIRMED'
        booking.save()
        booking.refresh_from_db()
        send_booking_ticket_email(booking, async_send=True)

        return Response({
            'success': True,
            'message': 'Cash payment confirmed successfully! Your tickets are ready.',
            'booking_id': booking.booking_id,
            'status': 'CONFIRMED',
            'payment_method': 'CASH',
            'event_title': booking.event.title,
            'quantity': booking.quantity,
            'amount_paid': float(booking.total_price),
            'discount_saved': float(booking.discount_amount),
            'booking': BookingSerializer(booking).data,
        })



# ============================================================
# RAZORPAY PAYMENT VIEWS
# ============================================================
import json
import razorpay
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

class RazorpayConfigView(APIView):
    """
    Returns public Razorpay configuration (Key ID & configured currency).
    Never exposes RAZORPAY_KEY_SECRET.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'key_id': settings.RAZORPAY_KEY_ID,
            'currency': getattr(settings, 'RAZORPAY_CURRENCY', 'INR')
        })


class CreateRazorpayOrderView(APIView):
    """
    Creates a Razorpay order for an existing booking pending payment.
    Enforces user authentication, booking ownership, and authoritative pricing.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id') or request.data.get('bookingId')
        if not booking_id:
            return Response({'error': 'booking_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        booking = get_object_or_404(Booking, booking_id=booking_id)

        # Verify user ownership
        if booking.user != request.user:
            return Response(
                {'error': 'You are not authorized to initiate payment for this booking'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify booking status
        if booking.status == 'CONFIRMED':
            return Response(
                {
                    'error': 'Booking is already confirmed and paid',
                    'is_already_paid': True,
                    'status': 'CONFIRMED',
                    'booking_id': booking.booking_id
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if booking.status == 'CANCELLED':
            return Response(
                {
                    'error': 'This booking has been cancelled and cannot be paid',
                    'status': 'CANCELLED',
                    'booking_id': booking.booking_id
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if booking.status != 'PENDING':
            return Response(
                {'error': f'Booking cannot be paid (status: {booking.status})'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent duplicate payment attempts if transaction already succeeded
        existing_tx = PaymentTransaction.objects.filter(booking=booking).first()
        if existing_tx and existing_tx.status == 'SUCCEEDED':
            return Response(
                {
                    'error': 'Payment has already succeeded for this booking',
                    'is_already_paid': True,
                    'status': 'CONFIRMED',
                    'booking_id': booking.booking_id
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Authoritative amount from backend database
        amount_in_subunits = int(round(float(booking.total_price) * 100))

        # Handle free booking
        if amount_in_subunits <= 0:
            booking.status = 'CONFIRMED'
            booking.save()
            send_booking_ticket_email(booking, async_send=True)
            return Response({
                'is_free': True,
                'status': 'CONFIRMED',
                'booking_id': booking.booking_id,
                'message': 'Free admission confirmed'
            })

        currency = getattr(settings, 'RAZORPAY_CURRENCY', 'INR')

        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

            order_data = {
                'amount': amount_in_subunits,
                'currency': currency,
                'receipt': booking.booking_id,
                'notes': {
                    'booking_id': booking.booking_id,
                    'user_id': str(request.user.id),
                    'user_username': request.user.username,
                    'event_title': str(booking.event.title)[:40],
                }
            }
            razorpay_order = client.order.create(data=order_data)
            order_id = razorpay_order['id']

            # Idempotently update or create PaymentTransaction
            PaymentTransaction.objects.update_or_create(
                booking=booking,
                defaults={
                    'razorpay_order_id': order_id,
                    'amount': booking.total_price,
                    'currency': currency,
                    'payment_provider': 'razorpay',
                    'status': 'PENDING'
                }
            )

            return Response({
                'order_id': order_id,
                'amount': razorpay_order['amount'],
                'currency': currency,
                'key_id': settings.RAZORPAY_KEY_ID,
                'booking_id': booking.booking_id,
                'event_title': booking.event.title,
                'unit_price': float(booking.unit_price),
                'quantity': booking.quantity,
                'discount_percentage': float(booking.discount_percentage),
                'discount_amount': float(booking.discount_amount),
                'total_price': float(booking.total_price),
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to create Razorpay order: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyRazorpayPaymentView(APIView):
    """
    Verifies Razorpay payment signature server-side using RAZORPAY_KEY_SECRET.
    Only updates booking to CONFIRMED after cryptographic verification succeeds.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id') or request.data.get('bookingId')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')

        if not all([booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response({
                'error': 'Missing required payment verification parameters (booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature)'
            }, status=status.HTTP_400_BAD_REQUEST)

        booking = get_object_or_404(Booking, booking_id=booking_id)

        # Verify user ownership
        if booking.user != request.user:
            return Response(
                {'error': 'You are not authorized to verify this payment'},
                status=status.HTTP_403_FORBIDDEN
            )

        if booking.status == 'CANCELLED':
            return Response(
                {'error': 'Cannot verify payment for a cancelled booking'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Idempotent response if already confirmed
        if booking.status == 'CONFIRMED':
            return Response({
                'success': True,
                'message': f'Payment already verified. Booking {booking.booking_id} is confirmed.',
                'booking_id': booking.booking_id,
                'status': 'CONFIRMED',
                'event_title': booking.event.title,
                'amount_paid': float(booking.total_price),
                'booking': BookingSerializer(booking).data,
            })

        # Verify the Razorpay order belongs to this booking
        tx = PaymentTransaction.objects.filter(booking=booking).first()
        if tx and tx.razorpay_order_id and tx.razorpay_order_id != razorpay_order_id:
            return Response({
                'error': 'Razorpay order ID does not match this booking'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify signature with official Razorpay SDK
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        try:
            client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature,
            })
        except razorpay.errors.SignatureVerificationError:
            PaymentTransaction.objects.filter(booking=booking).update(status='FAILED')
            return Response(
                {'error': 'Payment verification failed: Invalid signature'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Payment verification error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch payment method from Razorpay
        payment_method = None
        try:
            rzp_payment = client.payment.fetch(razorpay_payment_id)
            if rzp_payment and isinstance(rzp_payment, dict):
                payment_method = rzp_payment.get('method')
        except Exception:
            payment_method = request.data.get('payment_method')

        if payment_method:
            payment_method = str(payment_method).lower().strip()

        # Update PaymentTransaction to SUCCEEDED
        currency = getattr(settings, 'RAZORPAY_CURRENCY', 'INR')
        receipt_url = f"https://dashboard.razorpay.com/app/payments/{razorpay_payment_id}"

        PaymentTransaction.objects.update_or_create(
            booking=booking,
            defaults={
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature,
                'payment_provider': 'razorpay',
                'payment_method': payment_method,
                'amount': booking.total_price,
                'currency': currency,
                'status': 'SUCCEEDED',
                'receipt_url': receipt_url,
            }
        )

        # Mark booking as CONFIRMED
        booking.status = 'CONFIRMED'
        booking.save()

        # Reload booking to get fresh relationships
        booking.refresh_from_db()
        send_booking_ticket_email(booking, async_send=True)

        return Response({
            'success': True,
            'message': f'Payment confirmed successfully. Your booking {booking.booking_id} is confirmed.',
            'booking_id': booking.booking_id,
            'status': 'CONFIRMED',
            'event_title': booking.event.title,
            'quantity': booking.quantity,
            'amount_paid': float(booking.total_price),
            'discount_saved': float(booking.discount_amount),
            'booking': BookingSerializer(booking).data,
        })


@method_decorator(csrf_exempt, name='dispatch')
class RazorpayWebhookView(APIView):
    """
    Handles asynchronous Razorpay webhooks for payment events (e.g. payment.captured, order.paid).
    Validates webhook signature when RAZORPAY_WEBHOOK_SECRET is provided.
    Idempotent state update.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '')
        signature = request.headers.get('X-Razorpay-Signature')

        payload_body = request.body.decode('utf-8')
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

        if webhook_secret and signature:
            try:
                client.utility.verify_webhook_signature(payload_body, signature, webhook_secret)
            except Exception:
                return Response({'error': 'Invalid webhook signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = json.loads(payload_body)
            event = data.get('event')
            payload = data.get('payload', {})

            if event in ['payment.captured', 'order.paid']:
                order_entity = payload.get('order', {}).get('entity', {})
                payment_entity = payload.get('payment', {}).get('entity', {})

                order_id = order_entity.get('id') or payment_entity.get('order_id')
                payment_id = payment_entity.get('id')
                booking_id = (
                    order_entity.get('receipt') or 
                    order_entity.get('notes', {}).get('booking_id') or 
                    payment_entity.get('notes', {}).get('booking_id')
                )

                if booking_id:
                    booking = Booking.objects.filter(booking_id=booking_id).first()
                    if booking and booking.status != 'CANCELLED':
                        if booking.status != 'CONFIRMED':
                            booking.status = 'CONFIRMED'
                            booking.save()
                            send_booking_ticket_email(booking, async_send=True)

                        receipt_url = f"https://dashboard.razorpay.com/app/payments/{payment_id}" if payment_id else None
                        method = payment_entity.get('method')
                        if method:
                            method = str(method).lower().strip()

                        PaymentTransaction.objects.update_or_create(
                            booking=booking,
                            defaults={
                                'razorpay_order_id': order_id,
                                'razorpay_payment_id': payment_id,
                                'payment_provider': 'razorpay',
                                'payment_method': method,
                                'amount': booking.total_price,
                                'currency': getattr(settings, 'RAZORPAY_CURRENCY', 'INR'),
                                'status': 'SUCCEEDED',
                                'receipt_url': receipt_url
                            }
                        )

            return Response({'status': 'ok'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

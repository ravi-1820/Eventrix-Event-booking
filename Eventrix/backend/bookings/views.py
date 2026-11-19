from decimal import Decimal
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Booking, EventRequirement
from .serializers import BookingSerializer, EventRequirementSerializer
from events.models import Event

def calculate_user_discount(user):
    """
    Evaluates returning customer status:
    - 0 previous confirmed bookings: 0% discount
    - 1 previous confirmed booking: 10% returning customer loyalty discount
    - >=2 previous confirmed bookings: 20% VIP returning customer discount
    """
    if not user.is_authenticated:
        return Decimal('0.00'), 0, 'Guest / Non-Authenticated'
    
    confirmed_count = Booking.objects.filter(user=user, status='CONFIRMED').count()
    if confirmed_count == 0:
        return Decimal('0.00'), 0, 'First-time Customer'
    elif confirmed_count == 1:
        return Decimal('10.00'), 10, 'Returning Customer (10% Off)'
    else:
        return Decimal('20.00'), 20, 'VIP Repeat Patron (20% Off)'

class CalculateDiscountPreviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        event_id = request.data.get('event_id')
        quantity = int(request.data.get('quantity', 1))
        unit_price_override = request.data.get('unit_price_override')

        event = get_object_or_404(Event, pk=event_id)
        discount_percentage, percent_int, tier_label = calculate_user_discount(request.user)

        unit_price = Decimal(str(unit_price_override)) if unit_price_override is not None else event.ticket_price
        subtotal = unit_price * quantity
        discount_amount = round(subtotal * (discount_percentage / Decimal('100.00')), 2)
        total_price = subtotal - discount_amount

        return Response({
            'unit_price': float(unit_price),
            'quantity': quantity,
            'subtotal': float(subtotal),
            'discount_percentage': percent_int,
            'discount_tier': tier_label,
            'discount_amount': float(discount_amount),
            'total_price': float(total_price),
            'is_loyalty_applied': percent_int > 0,
            'is_free_event': total_price == 0,
        })

class CreateBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        event_id = request.data.get('event_id')
        quantity = int(request.data.get('quantity', 1))

        # Custom requirements data
        dietary = request.data.get('dietary_preference', 'None')
        seating = request.data.get('seating_preference', 'Standard')
        special_requests = request.data.get('special_requests', '')
        ticket_tier = request.data.get('ticket_tier', 'GENERAL_ADMISSION')
        unit_price_override = request.data.get('unit_price_override')

        event = get_object_or_404(Event, pk=event_id)

        # Check capacity
        if event.remaining_seats < quantity:
            return Response({'error': f'Only {event.remaining_seats} seats remaining'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve unit price: use frontend-provided override (for VIP/Early Bird tiers) or fall back to event price
        unit_price = Decimal(str(unit_price_override)) if unit_price_override is not None else event.ticket_price

        # Calculate pricing with loyalty discount
        discount_percentage, _, _ = calculate_user_discount(user)
        subtotal = unit_price * quantity
        discount_amount = round(subtotal * (discount_percentage / Decimal('100.00')), 2)
        total_price = subtotal - discount_amount

        # Free events can be confirmed immediately
        initial_status = 'CONFIRMED' if total_price == 0 else 'PENDING'

        booking = Booking.objects.create(
            event=event,
            user=user,
            quantity=quantity,
            unit_price=unit_price,
            discount_percentage=discount_percentage,
            discount_amount=discount_amount,
            total_price=total_price,
            status=initial_status,
        )

        EventRequirement.objects.create(
            booking=booking,
            dietary_preference=dietary,
            seating_preference=seating,
            special_requests=special_requests,
            ticket_tier=ticket_tier,
            unit_price_override=unit_price if unit_price_override is not None else None,
        )

        if initial_status == 'CONFIRMED':
            from .emails import send_booking_ticket_email
            send_booking_ticket_email(booking, async_send=True)

        serializer = BookingSerializer(booking)
        return Response({
            'booking': serializer.data,
            'requires_payment': total_price > 0,
            'message': 'Booking registered successfully'
        }, status=status.HTTP_201_CREATED)

class MyBookingsListView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).order_by('-booked_at')

class BookingDetailView(generics.RetrieveAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'booking_id'

    def get_queryset(self):
        user = self.request.user
        if user.profile.role in ['ORGANIZER', 'ADMIN']:
            return Booking.objects.all()
        return Booking.objects.filter(user=user)

class CancelBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):
        booking = get_object_or_404(Booking, booking_id=booking_id, user=request.user)
        if booking.status == 'CANCELLED':
            return Response({'error': 'Booking is already cancelled'}, status=status.HTTP_400_BAD_REQUEST)
        
        booking.status = 'CANCELLED'
        booking.save()
        return Response({'message': 'Booking cancelled successfully', 'booking_id': booking.booking_id})

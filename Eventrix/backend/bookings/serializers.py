
from rest_framework import serializers
from .models import Booking, EventRequirement
from events.serializers import EventSerializer

class EventRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventRequirement
        fields = ['id', 'dietary_preference', 'seating_preference', 'special_requests', 'ticket_tier', 'unit_price_override', 'is_fulfilled', 'organizer_notes']

class BookingSerializer(serializers.ModelSerializer):
    event_details = EventSerializer(source='event', read_only=True)
    custom_requirements = EventRequirementSerializer(read_only=True)
    attendee_name = serializers.SerializerMethodField()
    attendee_email = serializers.SerializerMethodField()
    attendee_phone = serializers.SerializerMethodField()
    payment_details = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_id', 'event', 'event_details', 'user', 'attendee_name',
            'attendee_email', 'attendee_phone', 'quantity', 'unit_price',
            'discount_percentage', 'discount_amount', 'total_price',
            'status', 'custom_requirements', 'payment_details', 'booked_at', 'updated_at'
        ]
        read_only_fields = ['id', 'booking_id', 'user', 'unit_price', 'discount_percentage', 'discount_amount', 'total_price', 'status', 'booked_at']

    def get_attendee_name(self, obj):
        if not obj.user:
            return ''
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.username

    def get_attendee_email(self, obj):
        return obj.user.email if obj.user else ''

    def get_attendee_phone(self, obj):
        if obj.user and hasattr(obj.user, 'profile'):
            return obj.user.profile.phone or ''
        return ''

    def get_payment_details(self, obj):
        payment = getattr(obj, 'payment', None)
        if not payment:
            return None
        return {
            'payment_id': payment.razorpay_payment_id or (f"TXN-{payment.id}" if payment.id else None),
            'order_id': payment.razorpay_order_id,
            'provider': payment.payment_provider,
            'payment_provider': payment.payment_provider,
            'payment_method': payment.payment_method,
            'amount': float(payment.amount),
            'currency': payment.currency,
            'status': payment.status,
            'receipt_url': payment.receipt_url,
            'created_at': payment.created_at.isoformat() if payment.created_at else None,
        }

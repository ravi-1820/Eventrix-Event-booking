import uuid
from django.db import models
from django.contrib.auth.models import User
from events.models import Event

def generate_booking_code():
    return 'ETX-' + uuid.uuid4().hex[:8].upper()

class Booking(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Payment'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
    ]

    booking_id = models.CharField(max_length=20, unique=True, default=generate_booking_code)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='bookings')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    booked_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-booked_at']

    def __str__(self):
        return f"{self.booking_id} - {self.user.username} - {self.event.title} ({self.status})"

class EventRequirement(models.Model):
    TICKET_TIER_CHOICES = [
        ('GENERAL_ADMISSION', 'General Admission'),
        ('VIP', 'VIP Access'),
        ('EARLY_BIRD', 'Early Bird'),
    ]

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='custom_requirements')
    dietary_preference = models.CharField(max_length=120, blank=True, default='None')
    seating_preference = models.CharField(max_length=120, blank=True, default='Standard')
    special_requests = models.TextField(blank=True, default='')
    ticket_tier = models.CharField(
        max_length=30,
        choices=TICKET_TIER_CHOICES,
        default='GENERAL_ADMISSION'
    )
    unit_price_override = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Frontend-resolved unit price for the selected tier. Overrides event.ticket_price when set.'
    )
    is_fulfilled = models.BooleanField(default=False)
    organizer_notes = models.TextField(blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Requirements for {self.booking.booking_id} (Fulfilled: {self.is_fulfilled})"

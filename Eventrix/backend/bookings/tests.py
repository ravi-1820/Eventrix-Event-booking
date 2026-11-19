from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from events.models import Category, Event
from bookings.models import Booking, EventRequirement
from bookings.views import calculate_user_discount

class LoyaltyDiscountAndBookingTests(TestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(username='org_test', password='password')
        self.organizer.profile.role = 'ORGANIZER'
        self.organizer.profile.save()

        self.customer = User.objects.create_user(username='cust_test', password='password')
        self.customer.profile.role = 'PARTICIPANT'
        self.customer.profile.save()

        self.category = Category.objects.create(name='Tech Summit', slug='tech-summit')
        self.event = Event.objects.create(
            organizer=self.organizer,
            category=self.category,
            title='Future Tech 2026',
            slug='future-tech-2026',
            description='Tech event description',
            start_time=timezone.now() + timedelta(days=2),
            end_time=timezone.now() + timedelta(days=3),
            capacity=50,
            ticket_price=Decimal('100.00'),
            status='PUBLISHED'
        )

    def test_first_time_customer_discount(self):
        # 0 bookings -> 0%
        discount_percentage, percent_int, tier = calculate_user_discount(self.customer)
        self.assertEqual(percent_int, 0)
        self.assertEqual(discount_percentage, Decimal('0.00'))

    def test_returning_customer_10_percent_discount(self):
        # Create 1 confirmed booking
        Booking.objects.create(
            event=self.event,
            user=self.customer,
            quantity=1,
            unit_price=Decimal('100.00'),
            discount_percentage=Decimal('0.00'),
            discount_amount=Decimal('0.00'),
            total_price=Decimal('100.00'),
            status='CONFIRMED'
        )

        discount_percentage, percent_int, tier = calculate_user_discount(self.customer)
        self.assertEqual(percent_int, 10)
        self.assertEqual(discount_percentage, Decimal('10.00'))

    def test_vip_customer_20_percent_discount(self):
        # Create 2 confirmed bookings
        Booking.objects.create(
            event=self.event,
            user=self.customer,
            quantity=1,
            unit_price=Decimal('100.00'),
            total_price=Decimal('100.00'),
            status='CONFIRMED'
        )
        Booking.objects.create(
            event=self.event,
            user=self.customer,
            quantity=1,
            unit_price=Decimal('100.00'),
            total_price=Decimal('100.00'),
            status='CONFIRMED'
        )

        discount_percentage, percent_int, tier = calculate_user_discount(self.customer)
        self.assertEqual(percent_int, 20)
        self.assertEqual(discount_percentage, Decimal('20.00'))

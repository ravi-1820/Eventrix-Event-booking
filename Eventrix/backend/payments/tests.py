from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from events.models import Event, Category
from bookings.models import Booking
from payments.models import PaymentTransaction
from django.conf import settings
import hmac
import hashlib

class RazorpayPaymentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='password123', email='test@example.com')
        self.other_user = User.objects.create_user(username='otheruser', password='password123')
        
        self.category = Category.objects.create(name='Music', slug='music')
        self.event = Event.objects.create(
            title='Test Concert',
            slug='test-concert',
            organizer=self.user,
            category=self.category,
            start_time=timezone.now() + timezone.timedelta(days=7),
            end_time=timezone.now() + timezone.timedelta(days=7, hours=3),
            ticket_price=100.00,
            capacity=50,
        )
        
        self.pending_booking = Booking.objects.create(
            booking_id='ETX-TEST0001',
            event=self.event,
            user=self.user,
            quantity=1,
            unit_price=100.00,
            discount_percentage=0.00,
            discount_amount=0.00,
            total_price=100.00,
            status='PENDING'
        )

    def test_razorpay_config_endpoint(self):
        """Config endpoint returns public key and currency, never exposes secret"""
        response = self.client.get('/api/payments/razorpay/config/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('key_id', response.data)
        self.assertIn('currency', response.data)
        self.assertEqual(response.data['key_id'], settings.RAZORPAY_KEY_ID)
        self.assertNotIn('secret', str(response.data).lower())
        self.assertNotIn('key_secret', response.data)

    def test_create_order_unauthenticated(self):
        """Unauthenticated requests are rejected"""
        response = self.client.post('/api/payments/razorpay/create-order/', {'booking_id': self.pending_booking.booking_id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_order_unauthorized_user(self):
        """User cannot create payment order for someone else's booking"""
        self.client.force_authenticate(user=self.other_user)
        response = self.client.post('/api/payments/razorpay/create-order/', {'booking_id': self.pending_booking.booking_id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_order_cancelled_booking(self):
        """Cancelled bookings cannot have payment orders created"""
        self.pending_booking.status = 'CANCELLED'
        self.pending_booking.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/payments/razorpay/create-order/', {'booking_id': self.pending_booking.booking_id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cancelled', response.data['error'].lower())

    def test_create_order_confirmed_booking(self):
        """Confirmed bookings cannot have payment orders created"""
        self.pending_booking.status = 'CONFIRMED'
        self.pending_booking.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/payments/razorpay/create-order/', {'booking_id': self.pending_booking.booking_id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already confirmed', response.data['error'].lower())

    @patch('razorpay.Client')
    def test_create_order_success(self, mock_razorpay_client):
        """Creates Razorpay order with authoritative amount in cents and stores order_id"""
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {
            'id': 'order_test_12345',
            'amount': 10000,
            'currency': 'INR',
            'status': 'created'
        }
        mock_razorpay_client.return_value = mock_instance

        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/payments/razorpay/create-order/', {'booking_id': self.pending_booking.booking_id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['order_id'], 'order_test_12345')
        self.assertEqual(response.data['amount'], 10000)
        self.assertEqual(response.data['booking_id'], self.pending_booking.booking_id)

        # Verify PaymentTransaction record
        tx = PaymentTransaction.objects.get(booking=self.pending_booking)
        self.assertEqual(tx.razorpay_order_id, 'order_test_12345')
        self.assertEqual(tx.status, 'PENDING')
        self.assertEqual(tx.payment_provider, 'razorpay')

    def test_verify_payment_unauthenticated(self):
        """Unauthenticated payment verification is rejected"""
        response = self.client.post('/api/payments/razorpay/verify/', {
            'booking_id': self.pending_booking.booking_id,
            'razorpay_order_id': 'order_123',
            'razorpay_payment_id': 'pay_123',
            'razorpay_signature': 'sig_123'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_verify_payment_mismatched_order_id(self):
        """Payment verification fails if order ID does not match the booking transaction"""
        PaymentTransaction.objects.create(
            booking=self.pending_booking,
            razorpay_order_id='order_real_123',
            amount=100.00,
            currency='INR',
            status='PENDING'
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/payments/razorpay/verify/', {
            'booking_id': self.pending_booking.booking_id,
            'razorpay_order_id': 'order_wrong_999',
            'razorpay_payment_id': 'pay_123',
            'razorpay_signature': 'sig_123'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('does not match', response.data['error'])

    @patch('razorpay.Client')
    def test_verify_payment_success(self, mock_razorpay_client):
        """Successful verification confirms booking and marks transaction SUCCEEDED"""
        order_id = 'order_test_verified'
        payment_id = 'pay_test_verified'
        signature = 'sig_test_valid'

        PaymentTransaction.objects.create(
            booking=self.pending_booking,
            razorpay_order_id=order_id,
            amount=100.00,
            currency='INR',
            status='PENDING'
        )

        mock_instance = MagicMock()
        mock_instance.utility.verify_payment_signature.return_value = True
        mock_razorpay_client.return_value = mock_instance

        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/payments/razorpay/verify/', {
            'booking_id': self.pending_booking.booking_id,
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['status'], 'CONFIRMED')

        self.pending_booking.refresh_from_db()
        self.assertEqual(self.pending_booking.status, 'CONFIRMED')

        tx = PaymentTransaction.objects.get(booking=self.pending_booking)
        self.assertEqual(tx.status, 'SUCCEEDED')
        self.assertEqual(tx.razorpay_payment_id, payment_id)
        self.assertEqual(tx.razorpay_signature, signature)

    def test_verify_payment_idempotent_if_already_confirmed(self):
        """Verifying an already confirmed booking returns idempotent success"""
        self.pending_booking.status = 'CONFIRMED'
        self.pending_booking.save()

        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/payments/razorpay/verify/', {
            'booking_id': self.pending_booking.booking_id,
            'razorpay_order_id': 'order_123',
            'razorpay_payment_id': 'pay_123',
            'razorpay_signature': 'sig_123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['status'], 'CONFIRMED')

    def test_cash_payment_persists_method_and_provider(self):
        """Cash payment stores payment_provider='cash' and payment_method='cash'"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/payments/cash-payment/', {
            'booking_id': self.pending_booking.booking_id
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['status'], 'CONFIRMED')

        tx = PaymentTransaction.objects.get(booking=self.pending_booking)
        self.assertEqual(tx.payment_provider, 'cash')
        self.assertEqual(tx.payment_method, 'cash')
        self.assertEqual(tx.status, 'SUCCEEDED')

    @patch('razorpay.Client')
    def test_verify_payment_persists_razorpay_method(self, mock_razorpay_client):
        """Razorpay verification fetches and persists customer's actual method (e.g. upi, card)"""
        order_id = 'order_test_method_123'
        payment_id = 'pay_test_method_123'
        signature = 'sig_test_method_123'

        PaymentTransaction.objects.create(
            booking=self.pending_booking,
            razorpay_order_id=order_id,
            amount=self.pending_booking.total_price,
            currency='INR',
            status='PENDING'
        )

        mock_instance = MagicMock()
        mock_instance.utility.verify_payment_signature.return_value = True
        mock_instance.payment.fetch.return_value = {'id': payment_id, 'method': 'upi'}
        mock_razorpay_client.return_value = mock_instance

        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/payments/razorpay/verify/', {
            'booking_id': self.pending_booking.booking_id,
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        tx = PaymentTransaction.objects.get(booking=self.pending_booking)
        self.assertEqual(tx.payment_provider, 'razorpay')
        self.assertEqual(tx.payment_method, 'upi')
        self.assertEqual(tx.status, 'SUCCEEDED')

    @patch('payments.views.send_booking_ticket_email')
    def test_payment_confirmation_dispatches_ticket_email(self, mock_send_email):
        """Confirming payment automatically dispatches the professional ticket email"""
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/payments/cash-payment/', {
            'booking_id': self.pending_booking.booking_id
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(mock_send_email.called)
        called_booking = mock_send_email.call_args[0][0]
        self.assertEqual(called_booking.booking_id, self.pending_booking.booking_id)
        self.assertEqual(called_booking.status, 'CONFIRMED')


from django.urls import path
from .views import (
    StripeConfigView, CreatePaymentIntentView, ConfirmPaymentView, CashPaymentView,
    RazorpayConfigView, CreateRazorpayOrderView, VerifyRazorpayPaymentView, RazorpayWebhookView
)

urlpatterns = [
    # Cash Payment Endpoints
    path('cash-payment/', CashPaymentView.as_view(), name='cash-payment'),
    path('cash/', CashPaymentView.as_view(), name='cash-alias'),

    # Razorpay Endpoints
    path('razorpay/config/', RazorpayConfigView.as_view(), name='razorpay-config'),
    path('razorpay/create-order/', CreateRazorpayOrderView.as_view(), name='razorpay-create-order'),
    path('razorpay/verify/', VerifyRazorpayPaymentView.as_view(), name='razorpay-verify'),
    path('razorpay/webhook/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),

    # Convenience aliases
    path('create-order/', CreateRazorpayOrderView.as_view(), name='create-order-alias'),
    path('verify/', VerifyRazorpayPaymentView.as_view(), name='verify-alias'),

    # Stripe legacy endpoints
    path('config/', StripeConfigView.as_view(), name='stripe-config'),
    path('create-intent/', CreatePaymentIntentView.as_view(), name='create-payment-intent'),
    path('confirm/', ConfirmPaymentView.as_view(), name='confirm-payment'),
]

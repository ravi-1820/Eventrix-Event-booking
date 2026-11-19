from django.contrib import admin
from .models import PaymentTransaction


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'payment_provider', 'payment_method', 'amount', 'currency', 'status', 'created_at']
    list_filter = ['status', 'payment_provider', 'payment_method', 'currency']
    search_fields = ['booking__booking_id', 'booking__user__username', 'razorpay_payment_id', 'razorpay_order_id', 'stripe_payment_intent_id']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Transaction Info', {
            'fields': ('booking', 'amount', 'currency', 'status', 'payment_provider', 'payment_method')
        }),
        ('Razorpay Details', {
            'fields': ('razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'receipt_url')
        }),
        ('Stripe Details (Legacy)', {
            'fields': ('stripe_payment_intent_id', 'stripe_client_secret')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


from django.contrib import admin
from .models import Booking, EventRequirement


class EventRequirementInline(admin.StackedInline):
    model = EventRequirement
    extra = 0
    readonly_fields = ['updated_at']
    fields = ['dietary_preference', 'seating_preference', 'ticket_tier', 'special_requests', 'unit_price_override', 'is_fulfilled', 'organizer_notes', 'updated_at']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['booking_id', 'user', 'event', 'quantity', 'total_price', 'status', 'booked_at']
    list_filter = ['status', 'booked_at']
    search_fields = ['booking_id', 'user__username', 'event__title']
    ordering = ['-booked_at']
    readonly_fields = ['booking_id', 'booked_at', 'updated_at']
    list_editable = ['status']
    inlines = [EventRequirementInline]
    fieldsets = (
        ('Booking Info', {
            'fields': ('booking_id', 'user', 'event', 'quantity', 'status')
        }),
        ('Pricing', {
            'fields': ('unit_price', 'discount_percentage', 'discount_amount', 'total_price')
        }),
        ('Timestamps', {
            'fields': ('booked_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(EventRequirement)
class EventRequirementAdmin(admin.ModelAdmin):
    list_display = ['booking', 'ticket_tier', 'dietary_preference', 'seating_preference', 'is_fulfilled', 'updated_at']
    list_filter = ['ticket_tier', 'is_fulfilled']
    search_fields = ['booking__booking_id', 'booking__user__username']
    ordering = ['-updated_at']
    readonly_fields = ['updated_at']
    list_editable = ['is_fulfilled']

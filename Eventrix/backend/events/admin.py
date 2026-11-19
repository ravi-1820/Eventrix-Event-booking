from django.contrib import admin
from .models import Category, Event

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'icon', 'color']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'organizer', 'category', 'status', 'event_type', 'city', 'start_time', 'capacity', 'is_featured']
    list_filter = ['status', 'event_type', 'is_featured', 'category']
    search_fields = ['title', 'venue_name', 'city', 'organizer__username']
    ordering = ['-created_at']
    readonly_fields = ['slug', 'created_at', 'updated_at', 'booked_count', 'remaining_seats', 'is_sold_out']
    list_editable = ['status', 'is_featured']
    date_hierarchy = 'start_time'
    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'slug', 'short_description', 'description', 'banner_url')
        }),
        ('Organization', {
            'fields': ('organizer', 'category', 'status', 'is_featured')
        }),
        ('Event Details', {
            'fields': ('event_type', 'venue_name', 'location_or_link', 'city', 'start_time', 'end_time')
        }),
        ('Tickets & Capacity', {
            'fields': ('ticket_price', 'capacity', 'booked_count', 'remaining_seats', 'is_sold_out')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

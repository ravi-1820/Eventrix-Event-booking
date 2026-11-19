from rest_framework import serializers
from .models import Category, Event

class CategorySerializer(serializers.ModelSerializer):
    event_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'color', 'event_count']

    def get_event_count(self, obj):
        return obj.events.filter(status='PUBLISHED').count()

class EventSerializer(serializers.ModelSerializer):
    category_details = CategorySerializer(source='category', read_only=True)
    organizer_name = serializers.SerializerMethodField()
    booked_count = serializers.IntegerField(read_only=True)
    remaining_seats = serializers.IntegerField(read_only=True)
    is_sold_out = serializers.BooleanField(read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'slug', 'short_description', 'description', 'category',
            'category_details', 'organizer', 'organizer_name', 'banner_url',
            'event_type', 'venue_name', 'location_or_link', 'city', 'latitude', 'longitude',
            'start_time', 'end_time', 'capacity', 'ticket_price', 'status',
            'is_featured', 'booked_count', 'remaining_seats', 'is_sold_out',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['organizer', 'slug', 'created_at', 'updated_at']

    def get_organizer_name(self, obj):
        if obj.organizer.first_name and obj.organizer.last_name:
            return f"{obj.organizer.first_name} {obj.organizer.last_name}"
        return obj.organizer.username

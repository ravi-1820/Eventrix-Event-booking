from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.utils import timezone

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=50, default='Calendar')  # Lucide icon name
    color = models.CharField(max_length=50, default='indigo') # tailwind accent tag
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Event(models.Model):
    EVENT_TYPE_CHOICES = [
        ('IN_PERSON', 'In-Person'),
        ('VIRTUAL', 'Virtual'),
        ('HYBRID', 'Hybrid'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Published'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_events')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='events')
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    short_description = models.CharField(max_length=300, blank=True)
    description = models.TextField()
    banner_url = models.URLField(blank=True, default='https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES, default='IN_PERSON')
    venue_name = models.CharField(max_length=255, default='Grand Hall Convention Center')
    location_or_link = models.CharField(max_length=500, default='Sabarmati Riverfront, Ahmedabad & Zoom Live')
    city = models.CharField(max_length=100, default='Ahmedabad')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    capacity = models.PositiveIntegerField(default=150)
    ticket_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PUBLISHED')
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Event.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def booked_count(self):
        # Count confirmed bookings
        confirmed = self.bookings.filter(status='CONFIRMED')
        return sum(b.quantity for b in confirmed)

    @property
    def remaining_seats(self):
        remaining = self.capacity - self.booked_count
        return max(0, remaining)

    @property
    def is_sold_out(self):
        return self.remaining_seats <= 0

    def __str__(self):
        return f"{self.title} ({self.status})"

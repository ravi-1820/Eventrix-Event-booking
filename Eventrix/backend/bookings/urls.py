from django.urls import path
from .views import (
    CalculateDiscountPreviewView,
    CreateBookingView,
    MyBookingsListView,
    BookingDetailView,
    CancelBookingView
)

urlpatterns = [
    path('calculate-discount/', CalculateDiscountPreviewView.as_view(), name='calculate-discount'),
    path('', CreateBookingView.as_view(), name='create-booking'),
    path('my-bookings/', MyBookingsListView.as_view(), name='my-bookings'),
    path('<str:booking_id>/', BookingDetailView.as_view(), name='booking-detail'),
    path('<str:booking_id>/cancel/', CancelBookingView.as_view(), name='cancel-booking'),
]

from django.urls import path
from .views import (
    CategoryListView,
    EventListCreateView,
    EventDetailView,
    OrganizerDashboardView,
    ToggleRequirementFulfillmentView,
    AdminUserListCreateView,
    AdminManageUserView,
    AdminManagePaymentRefundView,
    AdminManageBookingStatusView,
)

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('events/', EventListCreateView.as_view(), name='event-list-create'),
    path('events/<slug:slug>/', EventDetailView.as_view(), name='event-detail'),
    path('organizer/dashboard/', OrganizerDashboardView.as_view(), name='organizer-dashboard'),
    path('organizer/requirements/<int:pk>/toggle/', ToggleRequirementFulfillmentView.as_view(), name='requirement-toggle'),

    # Admin Management routes
    path('admin/users/', AdminUserListCreateView.as_view(), name='admin-user-list-create'),
    path('admin/users/<int:pk>/', AdminManageUserView.as_view(), name='admin-manage-user'),
    path('admin/payments/<int:pk>/refund/', AdminManagePaymentRefundView.as_view(), name='admin-refund-payment'),
    path('admin/bookings/<str:booking_id>/status/', AdminManageBookingStatusView.as_view(), name='admin-booking-status'),
]


from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from django.utils import timezone
from django.contrib.auth.models import User
from .models import Category, Event
from .serializers import CategorySerializer, EventSerializer
from bookings.models import Booking, EventRequirement
from payments.models import PaymentTransaction
from accounts.models import UserProfile

def check_is_admin(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser:
        return True
    if hasattr(user, 'profile') and user.profile.role == 'ADMIN':
        return True
    return False

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

class EventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Event.objects.all()
        # Non-organizers only see published events
        user = self.request.user
        organizer_filter = self.request.query_params.get('organizer', None)

        if organizer_filter and user.is_authenticated:
            queryset = queryset.filter(organizer=user)
        elif not (
            user.is_authenticated and (
                user.is_staff or
                user.is_superuser or
                (hasattr(user, 'profile') and user.profile.role in ['ORGANIZER', 'ADMIN'])
            )
        ):
            queryset = queryset.filter(status__in=['PUBLISHED', 'ONGOING', 'COMPLETED'])

        # Filters
        search = self.request.query_params.get('search', None)
        category_slug = self.request.query_params.get('category', None)
        event_type = self.request.query_params.get('type', None)
        status_param = self.request.query_params.get('status', None)
        featured = self.request.query_params.get('featured', None)
        city_param = self.request.query_params.get('city', None)

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(venue_name__icontains=search) |
                Q(city__icontains=search)
            )
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        if city_param and city_param.strip() and city_param.strip().lower() != 'all cities':
            queryset = queryset.filter(city__iexact=city_param.strip())
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if featured == 'true':
            queryset = queryset.filter(is_featured=True)

        return queryset.order_by('start_time')

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_update(self, serializer):
        if self.request.user != self.get_object().organizer and not self.request.user.is_staff:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user != instance.organizer and not self.request.user.is_staff:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        instance.delete()

class OrganizerDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        is_admin = check_is_admin(user)

        if is_admin:
            events = Event.objects.all().order_by('-created_at')
            bookings = Booking.objects.all().select_related('user', 'event').order_by('-booked_at')
            payments = PaymentTransaction.objects.all().select_related('booking', 'booking__user', 'booking__event').order_by('-created_at')
            users = User.objects.all().select_related('profile').order_by('-date_joined')
            requirements = EventRequirement.objects.all().select_related('booking', 'booking__user', 'booking__event').order_by('-updated_at')
        else:
            events = Event.objects.filter(organizer=user).order_by('-created_at')
            bookings = Booking.objects.filter(event__organizer=user).select_related('user', 'event').order_by('-booked_at')
            payments = PaymentTransaction.objects.filter(booking__event__organizer=user).select_related('booking', 'booking__user', 'booking__event').order_by('-created_at')
            users = User.objects.none()
            requirements = EventRequirement.objects.filter(booking__event__organizer=user).select_related('booking', 'booking__user', 'booking__event').order_by('-updated_at')

        total_events = events.count()
        confirmed_bookings = bookings.filter(status='CONFIRMED')
        total_tickets_sold = sum(b.quantity for b in confirmed_bookings)
        total_revenue = sum(b.total_price for b in confirmed_bookings)
        total_capacity = sum(e.capacity for e in events)
        utilization_rate = round((total_tickets_sold / total_capacity * 100), 1) if total_capacity > 0 else 0

        # Payments list
        payments_data = []
        for p in payments[:100]:
            try:
                b = p.booking
                u = b.user
                ev = b.event
                attendee_name = f"{u.first_name} {u.last_name}".strip() or u.username
                payments_data.append({
                    'id': p.id,
                    'booking_id': b.booking_id,
                    'amount': float(p.amount),
                    'currency': p.currency,
                    'status': p.status,
                    'payment_provider': p.payment_provider,
                    'payment_method': p.payment_method,
                    'razorpay_payment_id': p.razorpay_payment_id,
                    'razorpay_order_id': p.razorpay_order_id,
                    'receipt_url': p.receipt_url,
                    'created_at': p.created_at.isoformat(),
                    'attendee_name': attendee_name,
                    'attendee_email': u.email,
                    'event_id': ev.id,
                    'event_title': ev.title,
                })
            except Exception:
                continue

        # Users list (Admin only)
        users_data = []
        if is_admin:
            for u in users:
                user_bookings = Booking.objects.filter(user=u)
                total_spent = sum(b.total_price for b in user_bookings.filter(status='CONFIRMED'))
                role = getattr(u, 'profile', None) and u.profile.role or ('ADMIN' if u.is_staff or u.is_superuser else 'PARTICIPANT')
                phone = getattr(u, 'profile', None) and u.profile.phone or ''
                organization = getattr(u, 'profile', None) and u.profile.organization or ''
                users_data.append({
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'first_name': u.first_name,
                    'last_name': u.last_name,
                    'full_name': f"{u.first_name} {u.last_name}".strip() or u.username,
                    'role': role,
                    'phone': phone,
                    'organization': organization,
                    'is_active': u.is_active,
                    'is_staff': u.is_staff,
                    'is_superuser': u.is_superuser,
                    'date_joined': u.date_joined.isoformat() if u.date_joined else None,
                    'last_login': u.last_login.isoformat() if u.last_login else None,
                    'bookings_count': user_bookings.count(),
                    'total_spent': float(total_spent),
                })

        # Bookings list
        bookings_data = []
        for b in bookings[:100]:
            try:
                attendee_name = f"{b.user.first_name} {b.user.last_name}".strip() or b.user.username
                bookings_data.append({
                    'id': b.id,
                    'booking_id': b.booking_id,
                    'attendee_name': attendee_name,
                    'attendee_email': b.user.email,
                    'event_id': b.event.id,
                    'event_title': b.event.title,
                    'quantity': b.quantity,
                    'unit_price': float(b.unit_price),
                    'discount_percentage': float(b.discount_percentage),
                    'discount_amount': float(b.discount_amount),
                    'total_price': float(b.total_price),
                    'status': b.status,
                    'booked_at': b.booked_at.isoformat(),
                })
            except Exception:
                continue

        # Custom requirements
        requirements_data = []
        for req in requirements[:50]:
            try:
                requirements_data.append({
                    'id': req.id,
                    'booking_id': req.booking.booking_id,
                    'event_title': req.booking.event.title,
                    'participant_name': f"{req.booking.user.first_name} {req.booking.user.last_name}".strip() or req.booking.user.username,
                    'participant_email': req.booking.user.email,
                    'dietary_preference': req.dietary_preference,
                    'seating_preference': req.seating_preference,
                    'special_requests': req.special_requests,
                    'ticket_tier': req.ticket_tier,
                    'is_fulfilled': req.is_fulfilled,
                    'organizer_notes': req.organizer_notes,
                })
            except Exception:
                continue

        # Events list (serialized)
        events_serializer = EventSerializer(events[:50], many=True)

        return Response({
            'is_admin': is_admin,
            'stats': {
                'total_events': total_events,
                'total_tickets_sold': total_tickets_sold,
                'total_revenue': float(total_revenue),
                'total_capacity': total_capacity,
                'utilization_rate': utilization_rate,
                'total_users': len(users_data) if is_admin else 0,
                'total_payments': len(payments_data),
                'total_bookings': bookings.count(),
            },
            'events': events_serializer.data,
            'users': users_data,
            'payments': payments_data,
            'bookings': bookings_data,
            'custom_requirements': requirements_data,
        })

class ToggleRequirementFulfillmentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        is_admin = check_is_admin(user)
        try:
            if is_admin:
                req = EventRequirement.objects.get(pk=pk)
            else:
                req = EventRequirement.objects.get(pk=pk, booking__event__organizer=user)
            req.is_fulfilled = not req.is_fulfilled
            notes = request.data.get('organizer_notes')
            if notes is not None:
                req.organizer_notes = notes
            req.save()
            return Response({
                'id': req.id,
                'is_fulfilled': req.is_fulfilled,
                'organizer_notes': req.organizer_notes,
                'message': 'Requirement updated'
            })
        except EventRequirement.DoesNotExist:
            return Response({'error': 'Requirement not found or unauthorized'}, status=status.HTTP_404_NOT_FOUND)

class AdminUserListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not check_is_admin(user):
            return Response({'error': 'Admin privileges required'}, status=status.HTTP_403_FORBIDDEN)

        users = User.objects.all().order_by('-date_joined')
        
        search = request.query_params.get('search', '').strip().lower()
        role_filter = request.query_params.get('role', '').strip().upper()
        status_filter = request.query_params.get('status', '').strip().upper()

        users_data = []
        for u in users:
            role = getattr(u, 'profile', None) and u.profile.role or ('ADMIN' if u.is_staff or u.is_superuser else 'PARTICIPANT')
            
            # Apply filters
            if role_filter and role_filter != 'ALL' and role != role_filter:
                continue
            if status_filter == 'ACTIVE' and not u.is_active:
                continue
            if status_filter == 'INACTIVE' and u.is_active:
                continue

            full_name = f"{u.first_name} {u.last_name}".strip() or u.username
            if search:
                if (search not in u.username.lower() and 
                    search not in (u.email or '').lower() and 
                    search not in full_name.lower()):
                    continue

            user_bookings = Booking.objects.filter(user=u)
            confirmed_bookings = user_bookings.filter(status='CONFIRMED')
            total_spent = sum(b.total_price for b in confirmed_bookings)
            phone = getattr(u, 'profile', None) and u.profile.phone or ''
            organization = getattr(u, 'profile', None) and u.profile.organization or ''

            users_data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'full_name': full_name,
                'role': role,
                'phone': phone,
                'organization': organization,
                'is_active': u.is_active,
                'is_staff': u.is_staff,
                'is_superuser': u.is_superuser,
                'date_joined': u.date_joined.isoformat() if u.date_joined else None,
                'last_login': u.last_login.isoformat() if u.last_login else None,
                'bookings_count': user_bookings.count(),
                'confirmed_bookings_count': confirmed_bookings.count(),
                'total_spent': float(total_spent),
            })

        return Response({
            'total_users': len(users_data),
            'users': users_data
        })

    def post(self, request):
        user = request.user
        if not check_is_admin(user):
            return Response({'error': 'Admin privileges required'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        role = data.get('role', 'PARTICIPANT').upper()
        phone = data.get('phone', '').strip()
        organization = data.get('organization', '').strip()

        if not username or not email or not password:
            return Response({'error': 'Username, email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({'error': f'Username "{username}" is already taken.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': f'Email "{email}" is already registered.'}, status=status.HTTP_400_BAD_REQUEST)

        new_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        if role == 'ADMIN':
            new_user.is_staff = True
            new_user.save()

        profile, _ = UserProfile.objects.get_or_create(user=new_user)
        profile.role = role if role in ['ADMIN', 'ORGANIZER', 'PARTICIPANT'] else 'PARTICIPANT'
        profile.phone = phone
        profile.organization = organization
        profile.save()

        return Response({
            'id': new_user.id,
            'username': new_user.username,
            'email': new_user.email,
            'full_name': f"{new_user.first_name} {new_user.last_name}".strip() or new_user.username,
            'role': profile.role,
            'phone': profile.phone,
            'organization': profile.organization,
            'is_active': new_user.is_active,
            'message': f'User {new_user.username} created successfully'
        }, status=status.HTTP_201_CREATED)

class AdminManageUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        if not check_is_admin(user):
            return Response({'error': 'Admin privileges required'}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        user_bookings = Booking.objects.filter(user=target_user).order_by('-booked_at')
        confirmed_bookings = user_bookings.filter(status='CONFIRMED')
        cancelled_bookings = user_bookings.filter(status='CANCELLED')
        total_spent = sum(b.total_price for b in confirmed_bookings)
        
        role = getattr(target_user, 'profile', None) and target_user.profile.role or ('ADMIN' if target_user.is_staff or target_user.is_superuser else 'PARTICIPANT')
        phone = getattr(target_user, 'profile', None) and target_user.profile.phone or ''
        organization = getattr(target_user, 'profile', None) and target_user.profile.organization or ''

        bookings_list = []
        for b in user_bookings:
            bookings_list.append({
                'id': b.id,
                'booking_id': b.booking_id,
                'event_id': b.event.id,
                'event_title': b.event.title,
                'event_start_time': b.event.start_time.isoformat() if b.event.start_time else None,
                'quantity': b.quantity,
                'unit_price': float(b.unit_price),
                'discount_amount': float(b.discount_amount),
                'total_price': float(b.total_price),
                'status': b.status,
                'booked_at': b.booked_at.isoformat() if b.booked_at else None,
            })

        return Response({
            'id': target_user.id,
            'username': target_user.username,
            'email': target_user.email,
            'first_name': target_user.first_name,
            'last_name': target_user.last_name,
            'full_name': f"{target_user.first_name} {target_user.last_name}".strip() or target_user.username,
            'role': role,
            'phone': phone,
            'organization': organization,
            'is_active': target_user.is_active,
            'is_staff': target_user.is_staff,
            'is_superuser': target_user.is_superuser,
            'date_joined': target_user.date_joined.isoformat() if target_user.date_joined else None,
            'last_login': target_user.last_login.isoformat() if target_user.last_login else None,
            'stats': {
                'total_bookings': user_bookings.count(),
                'confirmed_bookings': confirmed_bookings.count(),
                'cancelled_bookings': cancelled_bookings.count(),
                'total_spent': float(total_spent),
            },
            'bookings': bookings_list,
        })

    def patch(self, request, pk):
        user = request.user
        if not check_is_admin(user):
            return Response({'error': 'Admin privileges required'}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        # Update basic user fields
        if 'first_name' in data:
            target_user.first_name = data['first_name'].strip()
        if 'last_name' in data:
            target_user.last_name = data['last_name'].strip()
        if 'email' in data:
            new_email = data['email'].strip()
            if new_email and new_email != target_user.email:
                if User.objects.filter(email__iexact=new_email).exclude(pk=target_user.pk).exists():
                    return Response({'error': f'Email "{new_email}" is already used by another account.'}, status=status.HTTP_400_BAD_REQUEST)
                target_user.email = new_email

        # Update password if provided
        if 'password' in data and data['password'].strip():
            target_user.set_password(data['password'].strip())

        # Update role
        new_role = data.get('role')
        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        if new_role in ['ADMIN', 'ORGANIZER', 'PARTICIPANT']:
            profile.role = new_role
            if new_role == 'ADMIN':
                target_user.is_staff = True
            elif new_role == 'PARTICIPANT' and not target_user.is_superuser:
                target_user.is_staff = False

        if 'phone' in data:
            profile.phone = data['phone'].strip()
        if 'organization' in data:
            profile.organization = data['organization'].strip()
        profile.save()

        # Update active state
        is_active = data.get('is_active')
        if is_active is not None and not target_user.is_superuser:
            target_user.is_active = bool(is_active)

        target_user.save()

        return Response({
            'id': target_user.id,
            'username': target_user.username,
            'email': target_user.email,
            'full_name': f"{target_user.first_name} {target_user.last_name}".strip() or target_user.username,
            'role': profile.role,
            'phone': profile.phone,
            'organization': profile.organization,
            'is_active': target_user.is_active,
            'message': f'User {target_user.username} updated successfully'
        })

    def delete(self, request, pk):
        user = request.user
        if not check_is_admin(user):
            return Response({'error': 'Admin privileges required'}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if target_user.pk == user.pk:
            return Response({'error': 'You cannot delete your own account while logged in.'}, status=status.HTTP_400_BAD_REQUEST)

        if target_user.is_superuser:
            return Response({'error': 'Superuser accounts cannot be deleted from the dashboard.'}, status=status.HTTP_400_BAD_REQUEST)

        username = target_user.username
        target_user.delete()
        return Response({'message': f'User "{username}" deleted successfully'})


class AdminManagePaymentRefundView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        if not check_is_admin(user):
            return Response({'error': 'Admin privileges required'}, status=status.HTTP_403_FORBIDDEN)

        try:
            payment = PaymentTransaction.objects.get(pk=pk)
        except PaymentTransaction.DoesNotExist:
            return Response({'error': 'Payment transaction not found'}, status=status.HTTP_404_NOT_FOUND)

        payment.status = 'REFUNDED'
        payment.save()

        # Update associated booking
        if hasattr(payment, 'booking') and payment.booking:
            booking = payment.booking
            booking.status = 'CANCELLED'
            booking.save()

        return Response({
            'id': payment.id,
            'status': payment.status,
            'booking_id': payment.booking.booking_id if payment.booking else None,
            'message': 'Payment transaction marked as REFUNDED and booking cancelled.'
        })

class AdminManageBookingStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, booking_id):
        user = request.user
        if not check_is_admin(user):
            return Response({'error': 'Admin privileges required'}, status=status.HTTP_403_FORBIDDEN)

        try:
            booking = Booking.objects.get(booking_id=booking_id)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status in ['CONFIRMED', 'CANCELLED', 'PENDING']:
            booking.status = new_status
            booking.save()
            return Response({
                'booking_id': booking.booking_id,
                'status': booking.status,
                'message': f'Booking status updated to {new_status}'
            })
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)


from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q
from .models import PasswordResetOTP
from .serializers import RegisterSerializer, UserSerializer
from .emails import send_welcome_email, send_password_reset_otp_email
import logging

logger = logging.getLogger(__name__)

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            user_serializer = UserSerializer(user)

            # Send professional account confirmation email
            try:
                role = getattr(user, 'profile', None) and user.profile.role or 'PARTICIPANT'
                send_welcome_email(user=user, role=role, async_send=True)
            except Exception as e:
                logger.error(f"Error initiating welcome email: {e}")

            return Response({
                'token': token.key,
                'user': user_serializer.data,
                'message': 'Registration successful'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username_input = (request.data.get('email') or request.data.get('username') or '').strip()
        password = request.data.get('password', '')

        if not username_input or not password:
            return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        username_clean = username_input.strip()

        # 1. Direct standard authentication
        user = authenticate(username=username_clean, password=password)

        # 2. Check by email or case-insensitive username or common typo alias
        if not user:
            from django.contrib.auth.models import User
            from django.db.models import Q
            user_obj = User.objects.filter(
                Q(username__iexact=username_clean) | Q(email__iexact=username_clean)
            ).first()

            # Handle common variation for admin or rajja
            if not user_obj and username_clean.lower() in ['admin', 'admin@gmail.com', 'admin@eventrix.com']:
                user_obj = User.objects.filter(Q(username='admin') | Q(is_superuser=True)).first()
            elif not user_obj and username_clean.lower() in ['raja020', 'rajja020', 'rajjja020']:
                user_obj = User.objects.filter(username__in=['rajjja020', 'raja020', 'rajja020']).first()

            if user_obj:
                user = authenticate(username=user_obj.username, password=password)

        if not user:
            return Response({'error': 'Invalid username or password'}, status=status.HTTP_401_UNAUTHORIZED)

        token, _ = Token.objects.get_or_create(user=user)
        user_serializer = UserSerializer(user)
        return Response({
            'token': token.key,
            'user': user_serializer.data,
            'message': 'Login successful'
        })

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        data = request.data
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.email = data.get('email', user.email)

        new_password = data.get('password')
        if new_password:
            if len(new_password) < 6:
                return Response({'error': 'Password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)

        user.save()

        profile = user.profile
        profile.phone = data.get('phone', profile.phone)
        profile.organization = data.get('organization', profile.organization)
        profile.avatar_url = data.get('avatar_url', profile.avatar_url)
        profile.save()

        return Response(UserSerializer(user).data)

    patch = put

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({'message': 'Profile deleted successfully.'}, status=status.HTTP_200_OK)


def _mask_email(email_str):
    if not email_str or '@' not in email_str:
        return email_str
    user_part, domain = email_str.split('@', 1)
    if len(user_part) <= 2:
        masked_user = user_part[0] + '***'
    else:
        masked_user = user_part[:2] + '***' + user_part[-1]
    return f"{masked_user}@{domain}"


class RequestPasswordResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email_or_user = request.data.get('email', '').strip()
        if not email_or_user:
            return Response({'error': 'Please provide your registered email or username.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(
            Q(email__iexact=email_or_user) | Q(username__iexact=email_or_user)
        ).first()

        if not user or not user.email:
            return Response({
                'error': 'No account found with this email or username. Please check and try again.'
            }, status=status.HTTP_404_NOT_FOUND)

        otp_record = PasswordResetOTP.generate_otp_for_user(user)
        send_password_reset_otp_email(user, otp_record.otp, async_send=True)

        return Response({
            'message': 'A 6-digit verification code has been sent to your email.',
            'email': user.email,
            'masked_email': _mask_email(user.email)
        }, status=status.HTTP_200_OK)


class VerifyPasswordResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email_or_user = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()

        if not email_or_user or not otp:
            return Response({'error': 'Email and OTP code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(
            Q(email__iexact=email_or_user) | Q(username__iexact=email_or_user)
        ).first()

        if not user:
            return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        otp_record = PasswordResetOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()
        if not otp_record or not otp_record.is_valid() or otp_record.otp != otp:
            return Response({'error': 'Invalid or expired verification code. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'message': 'Code verified successfully.',
            'valid': True
        }, status=status.HTTP_200_OK)


class ResetPasswordWithOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email_or_user = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '')

        if not email_or_user or not otp or not new_password:
            return Response({'error': 'Email, OTP code, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({'error': 'New password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(
            Q(email__iexact=email_or_user) | Q(username__iexact=email_or_user)
        ).first()

        if not user:
            return Response({'error': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        otp_record = PasswordResetOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()
        if not otp_record or not otp_record.is_valid() or otp_record.otp != otp:
            return Response({'error': 'Invalid or expired verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark OTP as consumed
        otp_record.is_used = True
        otp_record.save()

        # Update user password
        user.set_password(new_password)
        user.save()

        return Response({
            'message': 'Your password has been successfully reset! You can now log in.'
        }, status=status.HTTP_200_OK)


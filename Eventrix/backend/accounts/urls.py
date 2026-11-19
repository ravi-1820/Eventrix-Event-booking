from django.urls import path
from .views import (
    RegisterView, LoginView, ProfileView,
    RequestPasswordResetOTPView, VerifyPasswordResetOTPView, ResetPasswordWithOTPView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('profile/', ProfileView.as_view(), name='auth-profile'),
    path('forgot-password/request-otp/', RequestPasswordResetOTPView.as_view(), name='forgot-password-request-otp'),
    path('forgot-password/verify-otp/', VerifyPasswordResetOTPView.as_view(), name='forgot-password-verify-otp'),
    path('forgot-password/reset/', ResetPasswordWithOTPView.as_view(), name='forgot-password-reset'),
]

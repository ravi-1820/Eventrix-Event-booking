"""
URL configuration for eventrix_hub project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        'service': 'Eventrix Hub API',
        'status': 'Online',
        'version': '1.0.0',
        'endpoints': {
            'categories': '/api/categories/',
            'events': '/api/events/',
            'bookings': '/api/bookings/',
            'my_bookings': '/api/bookings/my-bookings/',
            'discount_calculator': '/api/bookings/calculate-discount/',
            'stripe_config': '/api/payments/config/',
            'stripe_create_intent': '/api/payments/create-intent/',
            'stripe_confirm': '/api/payments/confirm/',
            'auth_login': '/api/auth/login/',
            'auth_register': '/api/auth/register/',
            'auth_profile': '/api/auth/profile/',
            'organizer_dashboard': '/api/organizer/dashboard/',
        }
    })

urlpatterns = [
    path('', api_root, name='root'),
    path('api/', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('events.urls')),
    path('api/bookings/', include('bookings.urls')),
    path('api/booking/', include('bookings.urls')),  # alias
    path('api/payments/', include('payments.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


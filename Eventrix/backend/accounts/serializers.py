from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role', 'phone', 'organization', 'avatar_url', 'created_at']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    phone = serializers.CharField(source='profile.phone', read_only=True, default='')
    confirmed_bookings_count = serializers.SerializerMethodField()
    loyalty_discount_tier = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'profile', 'phone', 'confirmed_bookings_count', 'loyalty_discount_tier']

    def get_confirmed_bookings_count(self, obj):
        return obj.bookings.filter(status='CONFIRMED').count()

    def get_loyalty_discount_tier(self, obj):
        count = self.get_confirmed_bookings_count(obj)
        if count == 0:
            return {'percentage': 0, 'tier': 'Standard Patron', 'description': 'Standard booking rate'}
        elif count == 1:
            return {'percentage': 10, 'tier': 'Returning Patron', 'description': '10% loyalty discount applied'}
        else:
            return {'percentage': 20, 'tier': 'VIP Gold Patron', 'description': '20% VIP loyalty discount applied'}

class RegisterSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES, default='PARTICIPANT', write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True, write_only=True)
    organization = serializers.CharField(required=False, allow_blank=True, write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'phone', 'organization']

    def create(self, validated_data):
        role = validated_data.pop('role', 'PARTICIPANT')
        phone = validated_data.pop('phone', '')
        organization = validated_data.pop('organization', '')
        password = validated_data.pop('password')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = role
        profile.phone = phone
        profile.organization = organization
        profile.save()

        return user

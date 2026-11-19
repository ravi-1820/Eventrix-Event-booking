from django.contrib import admin
from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'phone', 'organization', 'created_at']
    list_filter = ['role']
    search_fields = ['user__username', 'user__email', 'organization']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']

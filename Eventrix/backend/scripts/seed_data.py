import os
import sys
from pathlib import Path

# Add backend directory to sys.path so settings and apps are discoverable
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import django
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eventrix_hub.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile
from events.models import Category, Event


def run_seed():
    print("==================================================")
    print("  Seeding Eventrix Hub Database...")
    print("==================================================")

    # 1. Admin User
    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin1@gmail.com',
            'first_name': 'Rajja',
            'last_name': 'Admin',
            'is_staff': True,
            'is_superuser': True,
        }
    )
    admin_user.set_password('admin1')
    admin_user.first_name = 'Rajja'
    admin_user.last_name = 'Admin'
    admin_user.email = 'admin1@gmail.com'
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()

    # Ensure profile role is ADMIN
    profile, _ = UserProfile.objects.get_or_create(user=admin_user)
    profile.role = 'ADMIN'
    profile.phone = '+91 98765 43210'
    profile.organization = 'Eventrix Hub Core Team'
    profile.save()

    print("[OK] Admin user ready: username='admin1', password='admin1', email='admin1@gmail.com'")

    # 2. Categories (5 Categories)
    categories_data = [
        {
            'name': 'Tech & AI Summit',
            'slug': 'tech-ai',
            'description': 'Cutting edge developer summits, AI keynotes & hacking sessions',
            'icon': 'Cpu',
            'color': 'indigo'
        },
        {
            'name': 'Design & Creative',
            'slug': 'design-creative',
            'description': 'UI/UX masterclasses, typography workshops and design leadership',
            'icon': 'Palette',
            'color': 'purple'
        },
        {
            'name': 'Business & Startups',
            'slug': 'business-startups',
            'description': 'Venture pitch nights, leadership forums and founders networking',
            'icon': 'Briefcase',
            'color': 'emerald'
        },
        {
            'name': 'Music & Arts Festival',
            'slug': 'music-arts',
            'description': 'Live performances, acoustic sets, indie showcase and gallery walks',
            'icon': 'Music',
            'color': 'amber'
        },
        {
            'name': 'Health & Biohacking',
            'slug': 'health-biohacking',
            'description': 'Peak performance wellness, nutrition science and mindfulness retreats',
            'icon': 'HeartPulse',
            'color': 'rose'
        },
    ]

    cats = {}
    for c in categories_data:
        cat_obj, _ = Category.objects.update_or_create(slug=c['slug'], defaults=c)
        cats[c['slug']] = cat_obj
    print("[OK] 5 Categories seeded successfully.")

    # 3. 5 Events Data (Associated with organizer: admin_user)
    now = timezone.now()
    events_data = [
        {
            'title': 'NextGen AI & Autonomous Systems Expo 2026',
            'slug': 'nextgen-ai-systems-expo-2026',
            'organizer': admin_user,
            'category': cats['tech-ai'],
            'short_description': 'A premier 2-day conference bringing together top AI researchers, neural engine engineers, and frontier tech founders.',
            'description': """Join 1,200+ industry pioneers at the Mahatma Mandir Convention Centre for deep dives into autonomous agent architecture, multi-modal reasoning models, and distributed training pipelines.

Key highlights:
- 24 Keynote addresses from top research scientists
- Hands-on interactive engineering workshops
- Dedicated VIP founder & investor lounge
- Gourmet networking lunch & evening rooftop mixer""",
            'banner_url': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80',
            'event_type': 'HYBRID',
            'venue_name': 'Mahatma Mandir Convention Centre',
            'location_or_link': 'Sector 13C, Gandhinagar, Gujarat 382016 + Stream Live',
            'city': 'Gandhinagar',
            'latitude': Decimal('23.208500'),
            'longitude': Decimal('72.641600'),
            'start_time': now + timedelta(days=5, hours=9),
            'end_time': now + timedelta(days=7, hours=18),
            'capacity': 350,
            'ticket_price': Decimal('149.00'),
            'status': 'PUBLISHED',
            'is_featured': True,
        },
        {
            'title': 'Impeccable UI Craft: Micro-Interactions Masterclass',
            'slug': 'impeccable-ui-craft-masterclass',
            'organizer': admin_user,
            'category': cats['design-creative'],
            'short_description': 'Elevate your frontend taste with physics-based spring animations, fluid gesture control, and pixel-level typography polish.',
            'description': """A hands-on, high-taste masterclass exploring interaction design inspired by the world's most tactile interfaces.

What you will master:
- Dynamic layout animations and layout-id transitions
- Gesture physics & spring dampening calibration
- High visual contrast & accessible dark mode systems
- Real-time React component dissection and live critique""",
            'banner_url': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
            'event_type': 'IN_PERSON',
            'venue_name': 'Koramangala Design Loft',
            'location_or_link': '80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
            'city': 'Bengaluru',
            'latitude': Decimal('12.935200'),
            'longitude': Decimal('77.624500'),
            'start_time': now + timedelta(days=12, hours=10),
            'end_time': now + timedelta(days=12, hours=17),
            'capacity': 80,
            'ticket_price': Decimal('89.00'),
            'status': 'PUBLISHED',
            'is_featured': True,
        },
        {
            'title': 'Global Founders & Venture Syndicate Summit',
            'slug': 'founders-venture-syndicate-summit',
            'organizer': admin_user,
            'category': cats['business-startups'],
            'short_description': 'Exclusive assembly for Series A/B founders, seed angels, and sovereign wealth venture leads.',
            'description': """Private closed-door summit featuring 50 hand-selected venture capitalists and 100 breakout founders discussing liquidity strategies, cross-border expansion, and high-velocity hiring.

Includes confidential roundtables, 1-on-1 deal rooms, and private dinner at The Bayview.""",
            'banner_url': 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80',
            'event_type': 'IN_PERSON',
            'venue_name': 'Jio World Convention Centre, BKC',
            'location_or_link': 'G Block BKC, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
            'city': 'Mumbai',
            'latitude': Decimal('19.060700'),
            'longitude': Decimal('72.868300'),
            'start_time': now + timedelta(days=18, hours=11),
            'end_time': now + timedelta(days=19, hours=21),
            'capacity': 120,
            'ticket_price': Decimal('299.00'),
            'status': 'PUBLISHED',
            'is_featured': True,
        },
        {
            'title': 'Sunset Symphony & Indie Electronic Showcase',
            'slug': 'sunset-symphony-indie-electronic',
            'organizer': admin_user,
            'category': cats['music-arts'],
            'short_description': 'An atmospheric evening uniting live chamber strings with modular analog synthesizers overlooking the waterfront.',
            'description': """Experience an unforgettable sunset concert featuring orchestral arrangements of electronic music, ambient visual installations, and boutique artisan beverage pairings under the stars.""",
            'banner_url': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
            'event_type': 'IN_PERSON',
            'venue_name': 'Sabarmati Riverfront Event Centre',
            'location_or_link': 'Riverfront West Promenade, Ashram Road, Ahmedabad, Gujarat 380009',
            'city': 'Ahmedabad',
            'latitude': Decimal('23.028900'),
            'longitude': Decimal('72.576200'),
            'start_time': now + timedelta(days=8, hours=17),
            'end_time': now + timedelta(days=8, hours=23),
            'capacity': 250,
            'ticket_price': Decimal('45.00'),
            'status': 'PUBLISHED',
            'is_featured': False,
        },
        {
            'title': 'Biohacking & Circadian Optimization Master Retreat',
            'slug': 'biohacking-circadian-optimization',
            'organizer': admin_user,
            'category': cats['health-biohacking'],
            'short_description': 'Science-backed protocols for restorative sleep, metabolic vitality, cold thermogenesis, and executive resilience.',
            'description': """Immerse yourself in a weekend retreat led by world-class neuroscientists and metabolic medicine practitioners with personalized biomarker tracking and sauna recovery sessions.""",
            'banner_url': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&auto=format&fit=crop&q=80',
            'event_type': 'IN_PERSON',
            'venue_name': 'The Leela Palace',
            'location_or_link': '23 Old Airport Road, HAL 2nd Stage, Bengaluru, Karnataka 560008',
            'city': 'Bengaluru',
            'latitude': Decimal('12.960600'),
            'longitude': Decimal('77.648400'),
            'start_time': now + timedelta(days=25, hours=8),
            'end_time': now + timedelta(days=27, hours=14),
            'capacity': 50,
            'ticket_price': Decimal('199.00'),
            'status': 'PUBLISHED',
            'is_featured': False,
        },
    ]

    for idx, e in enumerate(events_data, start=1):
        event_obj, created = Event.objects.update_or_create(slug=e['slug'], defaults=e)
        status_tag = 'Created' if created else 'Updated'
        print(f"  [{idx}/5] {status_tag} Event: '{event_obj.title}' (${event_obj.ticket_price})")

    print("\n==================================================")
    print("  [OK] Database Seeding Complete!")
    print("  - Admin: admin / admin123")
    print("  - 5 Categories Seeded")
    print("  - 5 Events Seeded")
    print("==================================================")


if __name__ == '__main__':
    run_seed()

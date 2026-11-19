// frontend/src/lib/reviewsStorage.js
// Universal Persistent Storage & Real-time Event Dispatcher for Attendee Reviews

export const REVIEWS_STORAGE_KEY = 'eventrix_event_reviews';

export const DEFAULT_INITIAL_REVIEWS = [
  {
    id: 'REV-SEEDED-001',
    booking_id: 'BK-SAMPLE-01',
    eventId: 1,
    event_title: 'Ahmedabad Open Source Hackathon',
    author: 'Raj Patel',
    author_email: 'raj.patel@example.com',
    rating: 5,
    comment: 'Mind-blowing hackathon! The venue Wi-Fi was lightning fast, mentorship sessions were super helpful, and our team built an AI agent in 24 hours. 10/10 organization by Eventrix!',
    status: 'PUBLISHED',
    helpful: 14,
    isVerified: true,
    createdAt: '2026-09-28T10:00:00.000Z',
    date: 'Sep 28, 2026',
  },
  {
    id: 'REV-SEEDED-002',
    booking_id: 'BK-SAMPLE-02',
    eventId: 2,
    event_title: 'Gujarat Tech Conclave 2026',
    author: 'Priya Sharma',
    author_email: 'priya.tech@example.com',
    rating: 5,
    comment: 'Phenomenal keynote speakers and deep tech tracks! Smooth digital ticket entry with the QR pass on my phone. Met incredible startup founders and angels.',
    status: 'PUBLISHED',
    helpful: 9,
    isVerified: true,
    createdAt: '2026-09-27T18:30:00.000Z',
    date: 'Sep 27, 2026',
  },
  {
    id: 'REV-SEEDED-003',
    booking_id: 'BK-SAMPLE-03',
    eventId: 3,
    event_title: 'Acoustic Sunset Live Concert',
    author: 'Ananya Mehta',
    author_email: 'ananya.m@example.com',
    rating: 5,
    comment: 'The acoustic atmosphere under the sunset sky was pure magic. Sound engineering was crisp, seating was comfortable, and entry was seamless.',
    status: 'PUBLISHED',
    helpful: 12,
    isVerified: true,
    createdAt: '2026-09-26T21:15:00.000Z',
    date: 'Sep 26, 2026',
  },
  {
    id: 'REV-SEEDED-004',
    booking_id: 'BK-SAMPLE-04',
    eventId: 4,
    event_title: 'Sunburn Arena Ahmedabad - EDM Night',
    author: 'Devang Joshi',
    author_email: 'devang.j@example.com',
    rating: 4,
    comment: 'Electric vibe, world-class laser show, and unforgettable DJ sets! Fast VIP entry through Eventrix QR check-in.',
    status: 'PUBLISHED',
    helpful: 7,
    isVerified: true,
    createdAt: '2026-09-25T14:20:00.000Z',
    date: 'Sep 25, 2026',
  },
  {
    id: 'REV-SEEDED-005',
    booking_id: 'BK-SAMPLE-05',
    eventId: 5,
    event_title: 'Startup Pitch Arena 2026',
    author: 'Meera Trivedi',
    author_email: 'meera.founder@example.com',
    rating: 5,
    comment: 'Got directly connected to 3 VC funds during the networking hour. High-caliber attendees and seamless digital badge verification.',
    status: 'PUBLISHED',
    helpful: 11,
    isVerified: true,
    createdAt: '2026-09-24T16:45:00.000Z',
    date: 'Sep 24, 2026',
  },
];

/**
 * Retrieve all reviews from localStorage, seeding defaults if clean
 */
export function getStoredReviews() {
  try {
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seen = new Set();
        return parsed.filter(r => {
          if (!r || !r.id || seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
      }
    }
    // If not found or empty, initialize with high-quality published seed reviews
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_REVIEWS));
    return DEFAULT_INITIAL_REVIEWS;
  } catch (err) {
    console.warn('Reviews storage read error:', err);
    return DEFAULT_INITIAL_REVIEWS;
  }
}

/**
 * Save full list of reviews and broadcast sync event
 */
export function saveReviews(reviewsList) {
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviewsList));
    window.dispatchEvent(new CustomEvent('eventrix:reviews_updated', { detail: reviewsList }));
  } catch (err) {
    console.warn('Reviews storage save error:', err);
  }
}

/**
 * Add or update single review
 */
export function addOrUpdateReview(reviewObj) {
  const current = getStoredReviews();
  const index = current.findIndex(r => r.id === reviewObj.id || (r.booking_id && r.booking_id === reviewObj.booking_id));
  
  let updated;
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...reviewObj, updatedAt: new Date().toISOString() };
  } else {
    updated = [reviewObj, ...current];
  }
  
  saveReviews(updated);
  window.dispatchEvent(new CustomEvent('eventrix:new_review', { detail: reviewObj }));
  return updated;
}

/**
 * Get rating and review summary for a specific event
 */
export function getEventRatingSummary(event, allReviews = null) {
  const list = allReviews || getStoredReviews();
  if (!event) return { avgRating: 5.0, count: 0, reviews: [] };

  const eventId = event.id ? String(event.id) : null;
  const eventSlug = event.slug ? String(event.slug) : null;
  const eventTitle = event.title ? String(event.title).toLowerCase().trim() : null;

  const matched = list.filter(r => {
    if (r.status !== 'PUBLISHED') return false;
    const rEventId = r.eventId ? String(r.eventId) : null;
    const rEventTitle = r.event_title ? String(r.event_title).toLowerCase().trim() : null;

    if (eventId && rEventId === eventId) return true;
    if (eventSlug && rEventId === eventSlug) return true;
    if (eventTitle && rEventTitle && (eventTitle.includes(rEventTitle) || rEventTitle.includes(eventTitle))) return true;
    return false;
  });

  if (matched.length === 0) {
    return { avgRating: 4.9, count: 0, reviews: [] };
  }

  const sum = matched.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  const avg = Number((sum / matched.length).toFixed(1));

  return {
    avgRating: avg,
    count: matched.length,
    reviews: matched,
  };
}

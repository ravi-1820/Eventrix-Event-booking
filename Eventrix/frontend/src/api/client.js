const BASE_URL = 'http://localhost:8000/api';

function getAuthHeaders() {
  const token = localStorage.getItem('eventrix_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async login(username, password) {
    const res = await fetch(`${BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to login');
    }
    const data = await res.json();
    localStorage.setItem('eventrix_token', data.token);
    localStorage.setItem('eventrix_user', JSON.stringify(data.user));
    return data;
  },

  async register(userData) {
    const res = await fetch(`${BASE_URL}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let errorMsg = 'Registration failed';
      if (typeof err === 'string') {
        errorMsg = err;
      } else if (err && typeof err === 'object') {
        const keys = Object.keys(err);
        if (keys.length > 0) {
          const firstKey = keys[0];
          const val = err[firstKey];
          const field = firstKey === 'non_field_errors' || firstKey === 'detail' || firstKey === 'error' ? '' : `${firstKey}: `;
          errorMsg = Array.isArray(val) ? `${field}${val.join(', ')}` : `${field}${val}`;
        }
      }
      throw new Error(errorMsg);
    }
    const data = await res.json();
    localStorage.setItem('eventrix_token', data.token);
    localStorage.setItem('eventrix_user', JSON.stringify(data.user));
    return data;
  },

  logout() {
    localStorage.removeItem('eventrix_token');
    localStorage.removeItem('eventrix_user');
  },

  async requestPasswordResetOTP(emailOrUsername) {
    const res = await fetch(`${BASE_URL}/auth/forgot-password/request-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrUsername }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send OTP code.');
    }
    return data;
  },

  async verifyPasswordResetOTP(emailOrUsername, otp) {
    const res = await fetch(`${BASE_URL}/auth/forgot-password/verify-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrUsername, otp }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid or expired OTP code.');
    }
    return data;
  },

  async resetPasswordWithOTP(emailOrUsername, otp, newPassword) {
    const res = await fetch(`${BASE_URL}/auth/forgot-password/reset/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrUsername, otp, new_password: newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password.');
    }
    return data;
  },

  getCurrentUser() {
    const user = localStorage.getItem('eventrix_user');
    return user ? JSON.parse(user) : null;
  },

  async getProfile() {
    try {
      const res = await fetch(`${BASE_URL}/auth/profile/`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        api.logout();
        return null;
      }
      if (!res.ok) throw new Error('Failed to fetch profile');
      const user = await res.json();
      localStorage.setItem('eventrix_user', JSON.stringify(user));
      return user;
    } catch (_err) {
      return null;
    }
  },

  async updateProfile(data) {
    const res = await fetch(`${BASE_URL}/auth/profile/`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || 'Failed to update profile');
    }
    const user = await res.json();
    localStorage.setItem('eventrix_user', JSON.stringify(user));
    return user;
  },

  async deleteProfile() {
    const res = await fetch(`${BASE_URL}/auth/profile/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || 'Failed to delete profile');
    }
    api.logout();
    return true;
  },

  // Events & Categories
  async getCategories() {
    const res = await fetch(`${BASE_URL}/categories/`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async getEvents(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category) query.append('category', params.category);
    if (params.type) query.append('type', params.type);
    if (params.status) query.append('status', params.status);
    if (params.featured) query.append('featured', params.featured);
    if (params.organizer) query.append('organizer', 'true');
    if (params.city && params.city !== 'All Cities') query.append('city', params.city);

    const url = `${BASE_URL}/events/${query.toString() ? '?' + query.toString() : ''}`;
    let res = await fetch(url, { headers: getAuthHeaders() });
    if (res.status === 401 && localStorage.getItem('eventrix_token')) {
      api.logout();
      res = await fetch(url, { headers: getAuthHeaders() });
    }
    if (!res.ok) throw new Error('Failed to fetch events');
    const data = await res.json();
    return data.results || data;
  },

  async getEventDetail(slug) {
    const url = `${BASE_URL}/events/${slug}/`;
    let res = await fetch(url, { headers: getAuthHeaders() });
    if (res.status === 401 && localStorage.getItem('eventrix_token')) {
      api.logout();
      res = await fetch(url, { headers: getAuthHeaders() });
    }
    if (!res.ok) throw new Error('Failed to load event details');
    return res.json();
  },

  async createEvent(eventData) {
    const res = await fetch(`${BASE_URL}/events/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(JSON.stringify(err));
    }
    return res.json();
  },

  // Loyalty Discount Engine & Bookings
  async calculateDiscount(eventId, quantity = 1, unitPriceOverride = undefined) {
    const payload = { event_id: eventId, quantity };
    if (unitPriceOverride !== undefined) payload.unit_price_override = unitPriceOverride;
    const res = await fetch(`${BASE_URL}/bookings/calculate-discount/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to compute loyalty discount');
    return res.json();
  },

  async createBooking(payload) {
    const res = await fetch(`${BASE_URL}/bookings/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create booking');
    }
    return res.json();
  },

  async getMyBookings() {
    const res = await fetch(`${BASE_URL}/bookings/my-bookings/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch bookings');
    const data = await res.json();
    return data.results || data;
  },

  async cancelBooking(bookingId) {
    const res = await fetch(`${BASE_URL}/bookings/${bookingId}/cancel/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to cancel booking');
    return res.json();
  },

  // Payments (Razorpay)
  async getRazorpayConfig() {
    const res = await fetch(`${BASE_URL}/payments/razorpay/config/`);
    if (!res.ok) throw new Error('Failed to get Razorpay configuration');
    return res.json();
  },

  async createRazorpayOrder(bookingId) {
    const res = await fetch(`${BASE_URL}/payments/razorpay/create-order/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ booking_id: bookingId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create payment order');
    }
    return res.json();
  },

  async verifyRazorpayPayment(payload) {
    const res = await fetch(`${BASE_URL}/payments/razorpay/verify/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Payment verification failed');
    }
    return res.json();
  },

  // Payments (Cash / Pay at Venue)
  async confirmCashPayment(bookingId) {
    const res = await fetch(`${BASE_URL}/payments/cash-payment/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ booking_id: bookingId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to confirm cash payment');
    }
    return res.json();
  },

  // Payments (Stripe Test Mode)
  async getStripeConfig() {
    const res = await fetch(`${BASE_URL}/payments/config/`);
    if (!res.ok) throw new Error('Failed to get stripe configuration');
    return res.json();
  },

  async createPaymentIntent(bookingId) {
    const res = await fetch(`${BASE_URL}/payments/create-intent/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ booking_id: bookingId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to initialize payment');
    }
    return res.json();
  },

  async confirmPayment(bookingId, paymentIntentId) {
    const res = await fetch(`${BASE_URL}/payments/confirm/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        booking_id: bookingId,
        payment_intent_id: paymentIntentId,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Payment confirmation failed');
    }
    return res.json();
  },

  // Organizer Dashboard
  async getOrganizerDashboard() {
    const res = await fetch(`${BASE_URL}/organizer/dashboard/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load organizer dashboard');
    return res.json();
  },

  async toggleRequirement(requirementId, organizerNotes = '') {
    const res = await fetch(`${BASE_URL}/organizer/requirements/${requirementId}/toggle/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ organizer_notes: organizerNotes }),
    });
    if (!res.ok) throw new Error('Failed to toggle requirement');
    return res.json();
  },

  async updateEventStatus(slug, newStatus) {
    const res = await fetch(`${BASE_URL}/events/${slug}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update event status');
    }
    return res.json();
  },

  async deleteEvent(slug) {
    const res = await fetch(`${BASE_URL}/events/${slug}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete event');
    return true;
  },

  async updateEvent(slug, eventData) {
    const res = await fetch(`${BASE_URL}/events/${slug}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(JSON.stringify(err));
    }
    return res.json();
  },

  // Admin User Management Actions
  async adminGetUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role && params.role !== 'ALL') query.append('role', params.role);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${BASE_URL}/admin/users/${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch users');
    }
    return res.json();
  },

  async adminGetUserDetail(userId) {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load user details');
    }
    return res.json();
  },

  async adminCreateUser(userData) {
    const res = await fetch(`${BASE_URL}/admin/users/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create user');
    }
    return res.json();
  },

  async adminUpdateUser(userId, payload) {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update user');
    }
    return res.json();
  },

  async adminDeleteUser(userId) {
    const res = await fetch(`${BASE_URL}/admin/users/${userId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete user');
    }
    return res.json();
  },


  async adminRefundPayment(paymentId) {
    const res = await fetch(`${BASE_URL}/admin/payments/${paymentId}/refund/`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to process refund');
    }
    return res.json();
  },

  async adminUpdateBookingStatus(bookingId, status) {
    const res = await fetch(`${BASE_URL}/admin/bookings/${bookingId}/status/`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update booking status');
    }
    return res.json();
  },
};

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, MessageSquare, ThumbsUp, Sparkles, Filter, 
  CheckCircle2, User, Calendar, Plus, Trash2, X, Send, 
  ShieldCheck, Eye, EyeOff, Edit3, Search, Tag, Check 
} from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

import { getStoredReviews, saveReviews } from '../../../lib/reviewsStorage';

export function AdminReviewsView({ events = [], bookings = [], showToast }) {
  const { t, translateEvent } = useLanguage();
  const [selectedEventId, setSelectedEventId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  // Load genuine reviews from persistent storage
  const [reviews, setReviews] = useState(() => getStoredReviews());

  // Sync reviews to localStorage and dispatch event
  const persistReviews = (updatedList) => {
    setReviews(updatedList);
    saveReviews(updatedList);
  };

  // Listen for real reviews submitted across the app
  useEffect(() => {
    const handleNewReview = (e) => {
      if (e.detail) {
        setReviews((prev) => {
          const exists = prev.some(r => r.id === e.detail.id);
          if (exists) return prev;
          const next = [e.detail, ...prev];
          try {
            localStorage.setItem('eventrix_event_reviews', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    };

    const handleSync = () => {
      try {
        const stored = localStorage.getItem('eventrix_event_reviews');
        if (stored) setReviews(JSON.parse(stored));
      } catch {}
    };

    window.addEventListener('eventrix:new_review', handleNewReview);
    window.addEventListener('eventrix:reviews_updated', handleSync);
    return () => {
      window.removeEventListener('eventrix:new_review', handleNewReview);
      window.removeEventListener('eventrix:reviews_updated', handleSync);
    };
  }, []);

  // Form states for Add / Edit
  const [newReviewEventId, setNewReviewEventId] = useState('');
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const safeEvents = Array.isArray(events) ? events : [];

  // Filter reviews by selected event, status, rating, and search query
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      // Event filter
      if (selectedEventId !== 'ALL' && String(r.eventId) !== String(selectedEventId)) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'ALL' && (r.status || 'PUBLISHED') !== selectedStatus) {
        return false;
      }
      // Rating filter
      if (selectedRatingFilter !== 'ALL' && String(r.rating) !== String(selectedRatingFilter)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const authorMatch = (r.author || '').toLowerCase().includes(q);
        const commentMatch = (r.comment || '').toLowerCase().includes(q);
        const titleMatch = (r.event_title || '').toLowerCase().includes(q);
        const bookingMatch = (r.booking_id || '').toLowerCase().includes(q);
        if (!authorMatch && !commentMatch && !titleMatch && !bookingMatch) return false;
      }
      return true;
    });
  }, [reviews, selectedEventId, selectedStatus, selectedRatingFilter, searchQuery]);

  // Compute genuine average score
  const averageScore = useMemo(() => {
    const publishedList = reviews.filter(r => (r.status || 'PUBLISHED') === 'PUBLISHED');
    if (publishedList.length === 0) return '0.0';
    const sum = publishedList.reduce((acc, r) => acc + Number(r.rating || 5), 0);
    return (sum / publishedList.length).toFixed(1);
  }, [reviews]);

  // Handle delete
  const handleDeleteReview = (reviewId) => {
    if (window.confirm(t('admin.reviews.deleteConfirm', 'Are you sure you want to delete this review?'))) {
      const updated = reviews.filter(r => r.id !== reviewId);
      persistReviews(updated);
      if (showToast) showToast('Review deleted successfully.');
    }
  };

  // Toggle Published / Hidden status (CRUDE / Publish management)
  const handleToggleStatus = (reviewId) => {
    const updated = reviews.map(r => {
      if (r.id === reviewId) {
        const nextStatus = (r.status || 'PUBLISHED') === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
        return { ...r, status: nextStatus };
      }
      return r;
    });
    persistReviews(updated);
    const target = updated.find(r => r.id === reviewId);
    if (showToast) {
      showToast(target.status === 'PUBLISHED' ? 'Review published to public.' : 'Review hidden from public.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (review) => {
    setEditingReview(review);
    setNewReviewEventId(review.eventId || '');
    setNewReviewAuthor(review.author || '');
    setNewReviewRating(review.rating || 5);
    setNewReviewComment(review.comment || '');
  };

  // Handle Add Review submission
  const handleAddReviewSubmit = (e) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) {
      if (showToast) showToast('Please enter attendee name and review feedback.');
      return;
    }

    const matchedEvent = safeEvents.find(ev => String(ev.id || ev.slug) === String(newReviewEventId)) || safeEvents[0];
    const eventTitle = matchedEvent ? matchedEvent.title : 'Eventrix Hosted Experience';
    const eventIdVal = matchedEvent ? (matchedEvent.id || matchedEvent.slug) : 'general';

    const newRev = {
      id: `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      author: newReviewAuthor.trim(),
      rating: Number(newReviewRating),
      eventId: eventIdVal,
      event_title: eventTitle,
      comment: newReviewComment.trim(),
      status: 'PUBLISHED',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      helpful: 1,
      isVerified: true,
    };

    const nextList = [newRev, ...reviews];
    persistReviews(nextList);
    setIsAddModalOpen(false);
    setNewReviewAuthor('');
    setNewReviewComment('');
    setNewReviewRating(5);
    if (showToast) showToast('Original review published successfully!');
  };

  // Handle Save Edited Review
  const handleSaveEditSubmit = (e) => {
    e.preventDefault();
    if (!editingReview || !newReviewAuthor.trim() || !newReviewComment.trim()) return;

    const matchedEvent = safeEvents.find(ev => String(ev.id || ev.slug) === String(newReviewEventId));
    const eventTitle = matchedEvent ? matchedEvent.title : editingReview.event_title;
    const eventIdVal = matchedEvent ? (matchedEvent.id || matchedEvent.slug) : editingReview.eventId;

    const updated = reviews.map(r => {
      if (r.id === editingReview.id) {
        return {
          ...r,
          author: newReviewAuthor.trim(),
          rating: Number(newReviewRating),
          eventId: eventIdVal,
          event_title: eventTitle,
          comment: newReviewComment.trim(),
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    });

    persistReviews(updated);
    setEditingReview(null);
    if (showToast) showToast('Review updated successfully!');
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {t('admin.reviewsTitle', 'Reviews & Feedback Management')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/70 uppercase tracking-wider">
              {t('admin.suiteBadge', 'Eventrix Suite')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {t('admin.reviewsDesc', 'Manage attendee reviews, moderate feedback, and publish verified participant ratings')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Average Rating Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold font-mono">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <span>{averageScore} / 5.0 ({reviews.length} {t('admin.totalReviews', 'Total Reviews')})</span>
          </div>

          {/* Add Review Button */}
          <button
            type="button"
            onClick={() => {
              if (safeEvents.length > 0) {
                setNewReviewEventId(safeEvents[0].id || safeEvents[0].slug);
              }
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>{t('admin.reviews.writeReview', 'Write Review')}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('admin.reviews.searchPlaceholder', 'Search attendee name, comment, or event...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Event Filter */}
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-sky-500 shadow-xs cursor-pointer"
          >
            <option value="ALL">{t('admin.reviews.allEvents', 'All Events')} ({safeEvents.length})</option>
            {safeEvents.map((e) => (
              <option key={e.id || e.slug} value={e.id || e.slug}>
                {e.title}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-sky-500 shadow-xs cursor-pointer"
          >
            <option value="ALL">{t('admin.reviews.allStatuses', 'All Statuses')}</option>
            <option value="PUBLISHED">🟢 {t('admin.reviews.statusPublished', 'Published')}</option>
            <option value="HIDDEN">🔒 {t('admin.reviews.statusHidden', 'Hidden')}</option>
          </select>

          {/* Star Filter */}
          <select
            value={selectedRatingFilter}
            onChange={(e) => setSelectedRatingFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-sky-500 shadow-xs cursor-pointer"
          >
            <option value="ALL">{t('admin.reviews.allRatings', 'All Ratings')}</option>
            <option value="5">⭐️⭐️⭐️⭐️⭐️ 5 Stars</option>
            <option value="4">⭐️⭐️⭐️⭐️ 4 Stars</option>
            <option value="3">⭐️⭐️⭐️ 3 Stars</option>
            <option value="2">⭐️⭐️ 2 Stars</option>
            <option value="1">⭐️ 1 Star</option>
          </select>
        </div>
      </div>

      {/* Reviews Cards Grid */}
      {filteredReviews.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <MessageSquare size={26} />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            {t('admin.reviews.noReviews', 'No real reviews recorded yet')}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {t('admin.reviews.noReviewsDesc', 'Attendee reviews and ratings submitted from the My Bookings page will automatically appear here.')}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (safeEvents.length > 0) {
                  setNewReviewEventId(safeEvents[0].id || safeEvents[0].slug);
                }
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>{t('admin.reviews.writeReview', 'Write First Review')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((rev) => {
            const isPublished = (rev.status || 'PUBLISHED') === 'PUBLISHED';

            return (
              <div key={rev.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3 relative group">
                
                {/* Top Row: Author, Date, Rating, and Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {rev.author[0]?.toUpperCase() || 'A'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">{rev.author}</p>
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          isPublished 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        }`}>
                          {isPublished ? t('admin.reviews.statusPublished', 'Published') : t('admin.reviews.statusHidden', 'Hidden')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">{rev.date || 'Recent'}</p>
                    </div>
                  </div>

                  {/* Rating Stars & Action Icons */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>

                    {/* Quick Publish / Hide Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(rev.id)}
                      className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                        isPublished
                          ? 'text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 border-slate-200'
                          : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                      }`}
                      title={isPublished ? 'Hide from public' : 'Publish to public'}
                    >
                      {isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(rev)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 border border-slate-200 transition-colors cursor-pointer"
                      title="Edit review"
                    >
                      <Edit3 size={13} />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(rev.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                      title="Delete review"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Event Name */}
                <p className="text-xs font-semibold text-sky-700 truncate">
                  {translateEvent({ title: rev.event_title }).title || rev.event_title}
                </p>

                {/* Review Comment Content */}
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                  "{rev.comment}"
                </p>

                {/* Footer details: Helpful count, Verified badge, Booking ID */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <ThumbsUp size={12} />
                      <span>{rev.helpful || 1} {t('admin.reviews.helpfulCount', 'found helpful')}</span>
                    </span>
                    {rev.booking_id && (
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {rev.booking_id}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 text-[10px] inline-flex items-center gap-1">
                    <ShieldCheck size={11} />
                    <span>{t('admin.reviews.verifiedAttendee', 'Verified Attendee')}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD / WRITE REVIEW MODAL ── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Star size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{t('admin.reviews.writeReview', 'Write Real Attendee Review')}</h3>
                    <p className="text-[11px] text-slate-500">Publish genuine feedback for any platform experience</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddReviewSubmit} className="space-y-4">
                {/* Event Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Event
                  </label>
                  <select
                    value={newReviewEventId}
                    onChange={(e) => setNewReviewEventId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500"
                  >
                    {safeEvents.map(ev => (
                      <option key={ev.id || ev.slug} value={ev.id || ev.slug}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Author Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Attendee Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={newReviewAuthor}
                    onChange={(e) => setNewReviewAuthor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Star Rating Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Star Rating (1 to 5)
                  </label>
                  <div className="flex items-center gap-1.5 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReviewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-125 cursor-pointer"
                      >
                        <Star
                          size={22}
                          className={`${
                            (hoverRating || newReviewRating) >= star
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">
                      {newReviewRating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Review Comment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Attendee Feedback & Review
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write detailed attendee review comments regarding event acoustics, seating, speaker lineup, check-in experience..."
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#075985] hover:bg-[#0369A1] transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Send size={13} />
                    <span>Publish Review</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EDIT REVIEW MODAL (CRUD MANAGEMENT) ── */}
      <AnimatePresence>
        {editingReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Edit3 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{t('admin.reviews.edit', 'Edit Attendee Review')}</h3>
                    <p className="text-[11px] text-slate-500">Update rating, author name or feedback comment</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditSubmit} className="space-y-4">
                {/* Event Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event
                  </label>
                  <select
                    value={newReviewEventId}
                    onChange={(e) => setNewReviewEventId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500"
                  >
                    {safeEvents.map(ev => (
                      <option key={ev.id || ev.slug} value={ev.id || ev.slug}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Author Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Attendee Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newReviewAuthor}
                    onChange={(e) => setNewReviewAuthor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Star Rating Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Star Rating (1 to 5)
                  </label>
                  <div className="flex items-center gap-1.5 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReviewRating(star)}
                        className="p-1 transition-transform hover:scale-125 cursor-pointer"
                      >
                        <Star
                          size={22}
                          className={`${
                            newReviewRating >= star
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">
                      {newReviewRating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Review Comment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Feedback Comment
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingReview(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#075985] hover:bg-[#0369A1] transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Check size={14} />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

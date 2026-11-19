import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Calendar, MapPin, Users, Sparkles, CheckCircle2, 
  AlertCircle, Upload, Image as ImageIcon, DollarSign, Clock, 
  Globe, Building2, Monitor, Star, ShieldCheck, Tag, Eye,
  ChevronRight, Save, Rocket, Compass, Info
} from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency, formatDate } from '../../lib/utils';

const PRESET_BANNERS = [
  {
    label: 'Tech & AI Summit',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
    category: 'tech-ai'
  },
  {
    label: 'Music & Arts',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
    category: 'music-arts'
  },
  {
    label: 'Business & Leadership',
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&auto=format&fit=crop&q=80',
    category: 'business-startups'
  },
  {
    label: 'Creative & Design',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80',
    category: 'design-creative'
  },
  {
    label: 'Wellness & Biohacking',
    url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80',
    category: 'health-biohacking'
  },
  {
    label: 'Startup Pitch & Demo Day',
    url: 'https://images.unsplash.com/photo-1559223607-a43c990c692c?w=1200&auto=format&fit=crop&q=80',
    category: 'business-startups'
  }
];

const POPULAR_CITIES = [
  'Ahmedabad', 'Mumbai', 'Bengaluru', 'Delhi NCR', 'Pune', 'Hyderabad', 'Surat', 'Chennai', 'Jaipur'
];

export function AddEventPage({ currentUser, categories = [], onNavigate, onSuccess, showToast }) {
  // Helper for formatting tomorrow's date for defaults
  const getDefaultDates = () => {
    const start = new Date();
    start.setDate(start.getDate() + 7);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(18, 0, 0, 0);
    
    // Format YYYY-MM-DDTHH:mm
    const toLocalISO = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    return {
      start: toLocalISO(start),
      end: toLocalISO(end)
    };
  };

  const defaultDates = getDefaultDates();

  const [form, setForm] = useState({
    title: '',
    short_description: '',
    description: '',
    event_type: 'IN_PERSON',
    category: categories[0]?.id ? String(categories[0].id) : '',
    venue_name: '',
    city: 'Ahmedabad',
    location_or_link: '',
    start_time: defaultDates.start,
    end_time: defaultDates.end,
    ticket_price: '499',
    is_free: false,
    capacity: '150',
    banner_url: PRESET_BANNERS[0].url,
    status: 'PUBLISHED',
    is_featured: false,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'preview'

  // If categories load late, select first category
  useEffect(() => {
    if (!form.category && categories.length > 0) {
      setForm((prev) => ({ ...prev, category: String(categories[0].id) }));
    }
  }, [categories, form.category]);

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'is_free') {
        if (value) next.ticket_price = '0';
        else if (prev.ticket_price === '0') next.ticket_price = '499';
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Calculate duration
  const getDurationText = () => {
    if (!form.start_time || !form.end_time) return null;
    const s = new Date(form.start_time);
    const e = new Date(form.end_time);
    const diffMs = e - s;
    if (diffMs <= 0) return 'Invalid time range';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${mins} mins`;
    if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${hours} hr${hours > 1 ? 's' : ''} ${mins} mins`;
  };

  const selectedCategoryObj = categories.find((c) => String(c.id) === String(form.category));

  // Form completion steps calculation
  const checklist = [
    { label: 'Event Title', done: !!form.title.trim() },
    { label: 'Category Assigned', done: !!form.category },
    { label: 'Full Description', done: !!form.description.trim() },
    { label: 'Venue & Location', done: !!form.venue_name.trim() && !!form.city.trim() },
    { label: 'Schedule & Time', done: !!form.start_time && !!form.end_time && new Date(form.end_time) > new Date(form.start_time) },
    { label: 'Capacity & Pricing', done: parseInt(form.capacity, 10) > 0 },
    { label: 'Cover Banner', done: !!form.banner_url.trim() },
  ];

  const completedSteps = checklist.filter((item) => item.done).length;
  const progressPercent = Math.round((completedSteps / checklist.length) * 100);

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Event title is required.';
    if (!form.description.trim()) errs.description = 'Please provide a full description for attendees.';
    if (!form.venue_name.trim()) errs.venue_name = 'Venue or hosting platform name is required.';
    if (!form.city.trim()) errs.city = 'City is required.';
    if (!form.start_time) errs.start_time = 'Start date and time are required.';
    if (!form.end_time) errs.end_time = 'End date and time are required.';
    if (form.start_time && form.end_time && new Date(form.end_time) <= new Date(form.start_time)) {
      errs.end_time = 'End time must be strictly after the start time.';
    }
    if (form.is_free) {
      // Free is 0
    } else {
      const price = parseFloat(form.ticket_price);
      if (isNaN(price) || price < 0) {
        errs.ticket_price = 'Please enter a valid ticket price (0 or higher).';
      }
    }
    const cap = parseInt(form.capacity, 10);
    if (isNaN(cap) || cap < 1) {
      errs.capacity = 'Capacity must be at least 1 attendee.';
    }
    return errs;
  };

  const handleSubmit = async (submitStatus = 'PUBLISHED') => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error
      const firstKey = Object.keys(errs)[0];
      const el = document.getElementById(`field-${firstKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (showToast) showToast('Please fix the highlighted errors before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const toISO = (dt) => {
        if (!dt) return dt;
        return dt.length === 16 ? `${dt}:00` : dt;
      };

      const payload = {
        title: form.title.trim(),
        short_description: form.short_description.trim() || form.title.trim(),
        description: form.description.trim(),
        event_type: form.event_type,
        venue_name: form.venue_name.trim(),
        city: form.city.trim(),
        location_or_link: form.location_or_link.trim() || `${form.venue_name.trim()}, ${form.city.trim()}`,
        banner_url: form.banner_url.trim() || PRESET_BANNERS[0].url,
        status: submitStatus,
        is_featured: form.is_featured,
        ticket_price: form.is_free ? 0 : parseFloat(form.ticket_price) || 0,
        capacity: parseInt(form.capacity, 10) || 150,
        category: form.category ? parseInt(form.category, 10) : null,
        start_time: toISO(form.start_time),
        end_time: toISO(form.end_time),
      };

      const created = await api.createEvent(payload);
      if (showToast) {
        showToast(
          submitStatus === 'PUBLISHED' 
            ? `🎉 Event "${created.title}" published successfully!`
            : `📝 Event "${created.title}" saved as Draft!`
        );
      }
      if (onSuccess) onSuccess(created);
      if (onNavigate) onNavigate('dashboard');
    } catch (err) {
      console.error('Failed to create event:', err);
      let errMsg = 'Failed to create event. Please verify all fields.';
      try {
        const parsed = JSON.parse(err.message);
        const msgs = Object.values(parsed).flat();
        if (msgs.length) errMsg = msgs.join(', ');
      } catch {
        if (err.message) errMsg = err.message;
      }
      setErrors((prev) => ({ ...prev, global: errMsg }));
      if (showToast) showToast(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24 font-sans animate-in fade-in duration-200">
      
      {/* Top Sticky Header */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-3.5 flex items-center justify-between gap-4">
          
          {/* Breadcrumbs & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
              title="Return to Organizer Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            <div className="h-4 w-px bg-slate-200 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                  Create New Event
                </h1>
                <span className={`hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                  form.status === 'PUBLISHED' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${form.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {form.status === 'PUBLISHED' ? 'Ready to Publish' : 'Draft Mode'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                Design and launch your experience on Eventrix
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={submitting}
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('DRAFT')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit('PUBLISHED')}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#075985] hover:bg-[#0369A1] shadow-md shadow-[#075985]/25 hover:shadow-lg hover:shadow-[#075985]/35 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-3.5 h-3.5 text-white" />
                  <span>Publish Event</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-6">
        
        {/* Global Error Banner */}
        {errors.global && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Cannot Publish Event</p>
              <p className="text-xs text-rose-600 mt-0.5">{errors.global}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================= LEFT COLUMN: FORM SECTIONS (7 or 8 Cols) ================= */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            {/* CARD 1: BASIC INFORMATION */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E0F2FE] to-[#BAE6FD]/40 flex items-center justify-center text-[#075985]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">1. Event Overview</h2>
                  <p className="text-xs text-slate-500">Provide the core identity and summary for your event</p>
                </div>
              </div>

              {/* Title */}
              <div id="field-title" className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Event Title <span className="text-[#FF4F70]">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">{form.title.length}/120</span>
                </div>
                <input
                  type="text"
                  maxLength={120}
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g. India FinTech & AI Innovation Summit 2026"
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all ${
                    errors.title ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-[#075985] focus:ring-2 focus:ring-[#075985]/10'
                  }`}
                />
                {errors.title && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.title}
                  </p>
                )}
              </div>

              {/* Tagline / Short Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Short Tagline <span className="text-slate-400 font-normal lowercase">(teaser for event cards)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">{form.short_description.length}/250</span>
                </div>
                <input
                  type="text"
                  maxLength={250}
                  value={form.short_description}
                  onChange={(e) => handleChange('short_description', e.target.value)}
                  placeholder="e.g. Join 500+ leaders, founders, and engineers shaping tomorrow's technology."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#075985] focus:bg-white focus:ring-2 focus:ring-[#075985]/10 transition-all"
                />
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Event Category <span className="text-[#FF4F70]">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {categories.map((cat) => {
                    const isSelected = String(form.category) === String(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => handleChange('category', String(cat.id))}
                        className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#E0F2FE] border-[#075985] text-[#075985] shadow-sm ring-1 ring-[#075985]'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                          isSelected ? 'bg-[#075985] text-white' : 'bg-white text-slate-500 border border-slate-200'
                        }`}>
                          <Tag className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate leading-tight">{cat.name}</p>
                          <span className="text-[10px] text-slate-400 block truncate">{cat.slug}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Description */}
              <div id="field-description" className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Full Event Description <span className="text-[#FF4F70]">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Markdown & bullets supported</span>
                </div>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Share the full event agenda, guest speakers, key takeaways, who should attend, and what to expect on the day..."
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all leading-relaxed ${
                    errors.description ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-[#075985] focus:ring-2 focus:ring-[#075985]/10'
                  }`}
                />
                {errors.description && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 font-medium mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.description}
                  </p>
                )}
              </div>
            </div>

            {/* CARD 2: FORMAT & VENUE LOCATION */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">2. Event Format & Venue</h2>
                  <p className="text-xs text-slate-500">Specify whether attendees join physically or virtually</p>
                </div>
              </div>

              {/* Event Type Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Event Format <span className="text-[#FF4F70]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'IN_PERSON',
                      label: 'In-Person',
                      desc: 'Physical venue gathering',
                      icon: Building2,
                    },
                    {
                      id: 'VIRTUAL',
                      label: 'Virtual / Online',
                      desc: 'Livestream or Zoom meet',
                      icon: Monitor,
                    },
                    {
                      id: 'HYBRID',
                      label: 'Hybrid Mode',
                      desc: 'In-person + live stream',
                      icon: Globe,
                    },
                  ].map((type) => {
                    const isSelected = form.event_type === type.id;
                    const IconComp = type.icon;
                    return (
                      <button
                        type="button"
                        key={type.id}
                        onClick={() => handleChange('event_type', type.id)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <IconComp className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                          <span className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                            {type.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{type.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Venue Name & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div id="field-venue_name" className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Venue / Host Name <span className="text-[#FF4F70]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.venue_name}
                    onChange={(e) => handleChange('venue_name', e.target.value)}
                    placeholder={form.event_type === 'VIRTUAL' ? 'e.g. Zoom Webinar Room' : 'e.g. Jio World Convention Centre'}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all ${
                      errors.venue_name ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                    }`}
                  />
                  {errors.venue_name && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.venue_name}
                    </p>
                  )}
                </div>

                <div id="field-city" className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    City <span className="text-[#FF4F70]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="e.g. Ahmedabad, Mumbai, Bengaluru"
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all ${
                      errors.city ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                    }`}
                  />
                  {errors.city && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.city}
                    </p>
                  )}
                </div>
              </div>

              {/* City quick chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick pick:</span>
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleChange('city', c)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      form.city.toLowerCase() === c.toLowerCase()
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Address or Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Full Address / Google Maps or Stream Link
                </label>
                <input
                  type="text"
                  value={form.location_or_link}
                  onChange={(e) => handleChange('location_or_link', e.target.value)}
                  placeholder={
                    form.event_type === 'VIRTUAL' 
                      ? 'https://meet.google.com/xyz-abcd-efg or Zoom link' 
                      : 'e.g. G Block, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051'
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* CARD 3: DATE & TIME SCHEDULE */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">3. Date & Schedule</h2>
                  <p className="text-xs text-slate-500">Set start and end times for ticket sales and calendar invitations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Date & Time */}
                <div id="field-start_time" className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    Start Date & Time <span className="text-[#FF4F70]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={(e) => handleChange('start_time', e.target.value)}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs text-slate-800 focus:outline-none focus:bg-white transition-all ${
                      errors.start_time ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                    }`}
                  />
                  {errors.start_time && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.start_time}
                    </p>
                  )}
                </div>

                {/* End Date & Time */}
                <div id="field-end_time" className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    End Date & Time <span className="text-[#FF4F70]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={(e) => handleChange('end_time', e.target.value)}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs text-slate-800 focus:outline-none focus:bg-white transition-all ${
                      errors.end_time ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                    }`}
                  />
                  {errors.end_time && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.end_time}
                    </p>
                  )}
                </div>
              </div>

              {/* Duration pill badge */}
              {getDurationText() && (
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold">Calculated Event Duration:</span>
                    <span className="font-bold text-amber-800">{getDurationText()}</span>
                  </div>
                  <span className="text-[11px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full font-bold">
                    Indian Standard Time (IST)
                  </span>
                </div>
              )}
            </div>

            {/* CARD 4: TICKETS, PRICING & CAPACITY */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">4. Tickets & Seating Capacity</h2>
                  <p className="text-xs text-slate-500">Define admission pricing and maximum attendee limits</p>
                </div>
              </div>

              {/* Free vs Paid Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('is_free', false)}
                  className={`flex-1 py-2.5 px-4 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    !form.is_free 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Paid Admission Ticket</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('is_free', true)}
                  className={`flex-1 py-2.5 px-4 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    form.is_free 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Free RSVP / Community Event</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Ticket Price */}
                <div id="field-ticket_price" className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    Ticket Price (₹ INR) <span className="text-[#FF4F70]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                      ₹
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={form.is_free}
                      value={form.is_free ? '0' : form.ticket_price}
                      onChange={(e) => handleChange('ticket_price', e.target.value)}
                      placeholder="e.g. 499"
                      className={`w-full pl-8 pr-4 py-2.5 bg-slate-50 border rounded-2xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-400 ${
                        errors.ticket_price ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                      }`}
                    />
                  </div>
                  {errors.ticket_price && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.ticket_price}
                    </p>
                  )}
                </div>

                {/* Capacity */}
                <div id="field-capacity" className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    Total Capacity (Seats) <span className="text-[#FF4F70]">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) => handleChange('capacity', e.target.value)}
                    placeholder="e.g. 150"
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white transition-all ${
                      errors.capacity ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                    }`}
                  />
                  {errors.capacity && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.capacity}
                    </p>
                  )}
                </div>
              </div>

              {/* Loyalty discount feature callout */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Automated Returning Patron Discounts:</span>
                  <p className="text-[11px] text-indigo-700 mt-0.5 leading-relaxed">
                    Eventrix loyalty engine automatically applies 10%–20% discounts to verified repeat customers at checkout. You receive the full settlement.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 5: MEDIA & COVER ARTWORK */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] flex items-center justify-center text-[#075985]">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">5. Cover Artwork & Imagery</h2>
                  <p className="text-xs text-slate-500">Pick a high-resolution 16:9 banner to attract attendees</p>
                </div>
              </div>

              {/* Banner URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cover Image URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={form.banner_url}
                    onChange={(e) => handleChange('banner_url', e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#075985] focus:bg-white focus:ring-2 focus:ring-[#075985]/10 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const random = PRESET_BANNERS[Math.floor(Math.random() * PRESET_BANNERS.length)];
                      handleChange('banner_url', random.url);
                    }}
                    className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shrink-0"
                    title="Pick random cover"
                  >
                    Shuffle
                  </button>
                </div>
              </div>

              {/* Preset Gallery */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Quick Preset Wallpapers:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRESET_BANNERS.map((preset, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => handleChange('banner_url', preset.url)}
                      className={`group relative h-20 rounded-2xl overflow-hidden border text-left transition-all ${
                        form.banner_url === preset.url
                          ? 'border-[#075985] ring-2 ring-[#075985] shadow-md'
                          : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                      <span className="absolute bottom-1.5 left-2 right-2 text-[10px] font-bold text-white truncate drop-shadow">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD 6: PUBLISHING OPTIONS */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">6. Publishing & Visibility</h2>
                  <p className="text-xs text-slate-500">Configure event status and homepage promotion</p>
                </div>
              </div>

              {/* Status Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('status', 'PUBLISHED')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    form.status === 'PUBLISHED'
                      ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-emerald-900">Publish Immediately</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Visible immediately on Eventrix Explore, search, and available for attendee booking.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('status', 'DRAFT')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    form.status === 'DRAFT'
                      ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-amber-900">Save as Draft</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Only you and organizers can view and edit this event in the Organizer Dashboard.
                  </p>
                </button>
              </div>

              {/* Featured toggle */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-950">Feature on Homepage Hero</p>
                    <p className="text-[11px] text-purple-700">Display this event prominently on the featured carousel banner</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => handleChange('is_featured', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN: STICKY LIVE PREVIEW & READINESS (4 or 5 Cols) ================= */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-36">
            
            {/* LIVE CARD PREVIEW WIDGET */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#075985]" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Live Event Preview
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#075985] text-[10px] font-bold">
                  Card View
                </span>
              </div>

              {/* Exact Styled Replica of StitchEventCard */}
              <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm transition-all flex flex-col justify-between font-sans">
                <div>
                  {/* Media Header */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={form.banner_url || PRESET_BANNERS[0].url}
                      alt={form.title || 'Event preview'}
                      className="w-full h-full object-cover transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = PRESET_BANNERS[0].url;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

                    {/* Category Chip */}
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full bg-white/95 text-[#075985] font-bold text-xs shadow-sm backdrop-blur-md">
                        {selectedCategoryObj?.name || 'Event'}
                      </span>
                    </div>

                    {/* Remaining Capacity Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 text-white text-[11px] font-semibold backdrop-blur-md flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#38BDF8]" />
                        {form.capacity || '150'} seats
                      </span>
                    </div>

                    {/* Date Tag */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[11px] font-bold backdrop-blur-md">
                        {form.start_time ? formatDate(form.start_time) : 'Upcoming'}
                      </span>
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-bold text-[#0F172A] line-clamp-2 leading-snug">
                      {form.title || 'Your Event Title Will Appear Here'}
                    </h3>

                    <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#075985] shrink-0" />
                      <span className="truncate">
                        {form.venue_name || 'Venue Name'} ({form.city || 'City'})
                      </span>
                    </p>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {form.short_description || form.description || 'Add a tagline or description to help attendees discover and register for your event.'}
                    </p>
                  </div>
                </div>

                {/* Footer Price & Action */}
                <div className="p-4 pt-0 mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Starting from</span>
                    <span className="text-base font-extrabold font-mono text-[#0F172A]">
                      {form.is_free ? 'FREE' : formatCurrency(parseFloat(form.ticket_price) || 0)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="h-8 px-3 rounded-full text-xs font-bold bg-[#075985] text-white flex items-center gap-1 shadow-sm"
                  >
                    <span>View Event</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* LAUNCH READINESS CHECKLIST */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Launch Readiness
                </h3>
                <span className="text-xs font-bold text-[#075985]">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#075985] to-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Checklist items */}
              <div className="space-y-2 pt-1">
                {checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs">
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span className={item.done ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* PRO TIPS WIDGET */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 sm:p-6 text-white shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Organizer Pro Tips</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>16:9 Landscape Artwork:</strong> High-res photography boosts click-throughs by up to 45%.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Precise Landmark:</strong> Adding metro / highway landmarks reduces attendee arrival friction.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Early Bird Buzz:</strong> Announce your event at least 14 days in advance for maximum attendance.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

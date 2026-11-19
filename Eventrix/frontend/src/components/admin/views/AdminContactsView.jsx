import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Mail, Phone, Calendar, Search, Filter, 
  CheckCircle2, Clock, AlertCircle, Trash2, Send, 
  Sparkles, Lightbulb, ChevronRight, X, User, ArrowUpRight,
  RefreshCw, ShieldCheck, Tag, Copy, Check, MessageCircle
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// Demo IDs to purge from legacy storage
const MOCK_DEMO_IDS = new Set([
  'INQ-2026-8941', 'INQ-2026-7832', 'INQ-2026-6519', 'INQ-2026-5412', 'INQ-2026-4190'
]);

export function AdminContactsView({ showToast }) {
  const { t } = useLanguage();

  // Load ONLY real persisted messages from localStorage, removing any legacy mock seeds & duplicates
  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem('eventrix_contact_messages');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const seen = new Set();
          const realMessages = parsed.filter(m => {
            if (!m || !m.id) return false;
            if (MOCK_DEMO_IDS.has(m.id)) return false;
            if (m.is_demo_seed) return false;
            // Deduplicate by ID
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
          localStorage.setItem('eventrix_contact_messages', JSON.stringify(realMessages));
          return realMessages;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Filters & Search
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'advice' | 'ticket' | 'partner' | 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Selected Detail Modal / Drawer
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Sync to localStorage
  const persistMessages = (updatedList) => {
    setMessages(updatedList);
    try {
      localStorage.setItem('eventrix_contact_messages', JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('eventrix:contact_messages_updated', { detail: updatedList }));
    } catch (err) {
      console.warn('Storage sync error:', err);
    }
  };

  // Listen for live contact messages sent from public site
  useEffect(() => {
    const handleNewMessage = (e) => {
      if (e.detail) {
        setMessages((prev) => {
          const exists = prev.some(m => m.id === e.detail.id);
          if (exists) return prev;
          const next = [e.detail, ...prev];
          try {
            localStorage.setItem('eventrix_contact_messages', JSON.stringify(next));
          } catch {}
          return next;
        });
        if (showToast) {
          showToast(`📩 New ${e.detail.inquiryType || 'contact message'} received from ${e.detail.name}!`);
        }
      }
    };

    window.addEventListener('eventrix:new_contact_message', handleNewMessage);
    return () => window.removeEventListener('eventrix:new_contact_message', handleNewMessage);
  }, [showToast]);

  // Handle opening detail modal
  const handleOpenDetail = (msg) => {
    setSelectedMessage(msg);
    setAdminNotes(msg.notes || '');
    setReplyText('');
  };

  // Update status
  const handleStatusChange = (msgId, newStatus) => {
    const updated = messages.map(m => m.id === msgId ? { ...m, status: newStatus } : m);
    persistMessages(updated);
    if (selectedMessage && selectedMessage.id === msgId) {
      setSelectedMessage(prev => ({ ...prev, status: newStatus }));
    }
    if (showToast) showToast(t('common.success', 'Status updated successfully!'));
  };

  // Save admin notes
  const handleSaveNotes = () => {
    if (!selectedMessage) return;
    const updated = messages.map(m => m.id === selectedMessage.id ? { ...m, notes: adminNotes } : m);
    persistMessages(updated);
    setSelectedMessage(prev => ({ ...prev, notes: adminNotes }));
    if (showToast) showToast(t('admin.contacts.saveNotes', 'Notes saved!'));
  };

  // Send official reply
  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMessage) return;

    const newReply = {
      sender: 'Eventrix Admin Support',
      text: replyText.trim(),
      date: new Date().toISOString()
    };

    const updatedReplies = [...(selectedMessage.replies || []), newReply];
    const updated = messages.map(m => {
      if (m.id === selectedMessage.id) {
        return {
          ...m,
          status: 'REPLIED',
          replies: updatedReplies,
          notes: adminNotes
        };
      }
      return m;
    });

    persistMessages(updated);
    setSelectedMessage(prev => ({
      ...prev,
      status: 'REPLIED',
      replies: updatedReplies,
      notes: adminNotes
    }));
    setReplyText('');
    if (showToast) showToast(`Reply sent to ${selectedMessage.email}!`);
  };

  // Delete message
  const handleDeleteMessage = (msgId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      const updated = messages.filter(m => m.id !== msgId);
      persistMessages(updated);
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage(null);
      }
      if (showToast) showToast('Message deleted.');
    }
  };

  // Copy Reference ID
  const handleCopyId = (id) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (showToast) showToast(`Copied ${id}`);
  };

  // Quick reply template applier
  const applyTemplate = (type) => {
    if (type === 'advice') {
      setReplyText(`Hi ${selectedMessage?.name?.split(' ')[0] || 'there'},\n\nThank you so much for sharing your valuable advice and suggestions with us! We have forwarded your idea to our core product & engineering team. Your feedback helps make Eventrix even better for everyone.\n\nWarm regards,\nEventrix Community Team`);
    } else if (type === 'ticket') {
      setReplyText(`Hi ${selectedMessage?.name?.split(' ')[0] || 'there'},\n\nWe have reviewed your booking details. Your pass has been refreshed in our system, and a verified QR entry pass has been emailed to you. Please let us know if you need any further assistance!\n\nBest,\nEventrix Support Team`);
    } else if (type === 'partner') {
      setReplyText(`Dear ${selectedMessage?.name || 'Organizer'},\n\nThank you for reaching out regarding hosting your event with Eventrix. We would love to collaborate! Our partnership team will schedule a quick 10-minute onboarding call with you.\n\nBest regards,\nEventrix Partnerships`);
    }
  };

  // Filtered dataset
  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      // Tab filter
      if (activeTab === 'unread' && m.status !== 'NEW') return false;
      if (activeTab === 'advice' && m.inquiryType !== 'User Advice & Suggestions') return false;
      if (activeTab === 'ticket' && m.inquiryType !== 'Ticket Booking Support') return false;
      if (activeTab === 'partner' && m.inquiryType !== 'Event Organizer Partnership') return false;
      if (activeTab === 'resolved' && m.status !== 'RESOLVED') return false;

      // Status dropdown
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;

      // Type dropdown
      if (typeFilter !== 'ALL' && m.inquiryType !== typeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.name?.toLowerCase().includes(q);
        const matchesEmail = m.email?.toLowerCase().includes(q);
        const matchesSubject = m.subject?.toLowerCase().includes(q);
        const matchesBody = m.message?.toLowerCase().includes(q);
        const matchesId = m.id?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesSubject && !matchesBody && !matchesId) return false;
      }

      return true;
    });
  }, [messages, activeTab, statusFilter, typeFilter, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = messages.length;
    const unread = messages.filter(m => m.status === 'NEW').length;
    const advice = messages.filter(m => m.inquiryType === 'User Advice & Suggestions').length;
    const resolved = messages.filter(m => m.status === 'RESOLVED' || m.status === 'REPLIED').length;
    const resRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
    return { total, unread, advice, resolved, resRate };
  }, [messages]);

  // Helper for category badge styling
  const getCategoryBadge = (type) => {
    switch (type) {
      case 'User Advice & Suggestions':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
          icon: Lightbulb,
          label: t('admin.contacts.typeAdvice', 'User Advice & Suggestions')
        };
      case 'Ticket Booking Support':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
          icon: Tag,
          label: t('admin.contacts.typeTicket', 'Ticket / Booking Help')
        };
      case 'Event Organizer Partnership':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          icon: Sparkles,
          label: t('admin.contacts.typeOrganizer', 'Event Organizer Partner')
        };
      case 'Corporate / Brand Sponsorship':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          icon: ShieldCheck,
          label: t('admin.contacts.typeSponsorship', 'Sponsorship & Brand')
        };
      case 'Technical Feedback':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
          icon: AlertCircle,
          label: t('admin.contacts.typeFeedback', 'App Feedback / Bug')
        };
      default:
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200/80',
          icon: MessageSquare,
          label: t('admin.contacts.typeGeneral', 'General Inquiry')
        };
    }
  };

  // Helper for status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return { bg: 'bg-amber-500 text-white shadow-amber-500/20', label: t('admin.contacts.statusNew', 'New') };
      case 'IN_PROGRESS':
        return { bg: 'bg-sky-500 text-white shadow-sky-500/20', label: t('admin.contacts.statusInProgress', 'In Progress') };
      case 'REPLIED':
        return { bg: 'bg-indigo-600 text-white shadow-indigo-500/20', label: t('admin.contacts.statusReplied', 'Replied') };
      case 'RESOLVED':
        return { bg: 'bg-emerald-600 text-white shadow-emerald-500/20', label: t('admin.contacts.statusResolved', 'Resolved') };
      default:
        return { bg: 'bg-slate-500 text-white', label: status };
    }
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300">
      
      {/* ── TOP KPI OVERVIEW CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Inquiries */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('admin.contacts.totalMessages', 'Total Received')}
            </span>
            <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 shadow-xs">
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">{stats.total}</span>
            <span className="text-xs font-semibold text-slate-500">messages</span>
          </div>
        </div>

        {/* Unread & Action Required */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('admin.contacts.unreadCount', 'Unread Inquiries')}
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-xs">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-600">{stats.unread}</span>
            {stats.unread > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200/80 animate-pulse">
                Needs Reply
              </span>
            )}
          </div>
        </div>

        {/* User Advice & Suggestions */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('admin.contacts.communityAdvice', 'Advice & Ideas')}
            </span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-xs">
              <Lightbulb size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-purple-700">{stats.advice}</span>
            <span className="text-xs font-semibold text-purple-600/80">user suggestions</span>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('admin.contacts.resolutionRate', 'Resolution Rate')}
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600">{stats.resRate}%</span>
            <span className="text-xs font-semibold text-slate-500">{stats.resolved} answered</span>
          </div>
        </div>

      </div>

      {/* ── MAIN INBOX CONTAINER ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Navigation Tabs Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/70 hover:bg-slate-100'
              }`}
            >
              {t('admin.contacts.allMessages', 'All Messages')} ({messages.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-amber-700 border border-slate-200/70 hover:bg-amber-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{t('admin.contacts.unread', 'New / Unread')}</span>
              {stats.unread > 0 && <span className="text-[10px] bg-amber-600/30 px-1.5 py-0.2 rounded-full font-mono">{stats.unread}</span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advice')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'advice'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-purple-700 border border-slate-200/70 hover:bg-purple-50'
              }`}
            >
              <Lightbulb size={13} />
              <span>{t('admin.contacts.adviceSuggestions', 'User Advice & Ideas')}</span>
              {stats.advice > 0 && <span className="text-[10px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded-full font-mono font-bold">{stats.advice}</span>}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ticket')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ticket'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-rose-700 border border-slate-200/70 hover:bg-rose-50'
              }`}
            >
              {t('admin.contacts.ticketSupport', 'Ticket Help')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('partner')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'partner'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-emerald-700 border border-slate-200/70 hover:bg-emerald-50'
              }`}
            >
              {t('admin.contacts.partnerships', 'Organizer Proposals')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resolved')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'resolved'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/70 hover:bg-slate-100'
              }`}
            >
              {t('admin.contacts.resolved', 'Resolved')}
            </button>
          </div>

          {/* Clear / Refresh Action */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all contact messages?')) {
                  persistMessages([]);
                  if (showToast) showToast('Cleared all contact messages.');
                }
              }}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition-colors cursor-pointer"
              title="Clear all messages"
            >
              <Trash2 size={12} />
              <span>Clear All</span>
            </button>
          )}
        </div>

        {/* Search & Filter Subbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('admin.contacts.searchPlaceholder', 'Search sender name, email, subject, or advice...')}
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
            {/* Status dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-sky-500 shadow-xs cursor-pointer"
            >
              <option value="ALL">{t('admin.contacts.statusAll', 'All Statuses')}</option>
              <option value="NEW">{t('admin.contacts.statusNew', 'New / Unread')}</option>
              <option value="IN_PROGRESS">{t('admin.contacts.statusInProgress', 'In Progress')}</option>
              <option value="REPLIED">{t('admin.contacts.statusReplied', 'Replied')}</option>
              <option value="RESOLVED">{t('admin.contacts.statusResolved', 'Resolved')}</option>
            </select>

            {/* Category dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-sky-500 shadow-xs cursor-pointer"
            >
              <option value="ALL">{t('admin.contacts.typeAll', 'All Categories')}</option>
              <option value="User Advice & Suggestions">💡 {t('admin.contacts.typeAdvice', 'User Advice & Suggestions')}</option>
              <option value="General Inquiry">💬 {t('admin.contacts.typeGeneral', 'General Inquiry')}</option>
              <option value="Ticket Booking Support">🎟️ {t('admin.contacts.typeTicket', 'Ticket / Booking Help')}</option>
              <option value="Event Organizer Partnership">🤝 {t('admin.contacts.typeOrganizer', 'Event Organizer Partner')}</option>
              <option value="Corporate / Brand Sponsorship">💼 {t('admin.contacts.typeSponsorship', 'Sponsorship & Brand')}</option>
              <option value="Technical Feedback">⚡ {t('admin.contacts.typeFeedback', 'App Feedback / Bug')}</option>
            </select>
          </div>
        </div>

        {/* ── MESSAGES LIST TABLE / CARDS ── */}
        <div className="divide-y divide-slate-100 overflow-x-auto">
          {filteredMessages.length === 0 ? (
            <div className="py-16 text-center px-4 flex flex-col items-center">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                {t('admin.contacts.noMessages', 'No contact messages found')}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {t('admin.contacts.noMessagesDesc', 'User messages and community advice sent from the public website will appear here in real-time.')}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const catBadge = getCategoryBadge(msg.inquiryType);
              const statusBadge = getStatusBadge(msg.status);
              const IconComp = catBadge.icon;
              const formattedDate = new Date(msg.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={msg.id}
                  className={`p-4 sm:p-5 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer ${
                    msg.status === 'NEW' ? 'bg-amber-50/20' : ''
                  }`}
                  onClick={() => handleOpenDetail(msg)}
                >
                  {/* Left info */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Avatar with Sender initial */}
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {msg.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                          {msg.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          • {msg.email}
                        </span>
                        
                        {/* Category Badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catBadge.bg}`}>
                          <IconComp size={11} />
                          <span>{catBadge.label}</span>
                        </span>

                        {/* Priority Badge */}
                        {msg.priority === 'HIGH' && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Urgent
                          </span>
                        )}
                      </div>

                      {/* Subject */}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate mb-1">
                        {msg.subject}
                      </h4>

                      {/* Message preview */}
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {msg.message}
                      </p>

                      {/* Reply indicator */}
                      {msg.replies && msg.replies.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-indigo-700 font-medium">
                          <MessageCircle size={12} />
                          <span>{msg.replies.length} official reply sent</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right metadata & actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block shadow-xs ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium mt-1">
                        {formattedDate}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(msg);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                      title="View conversation"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ── MESSAGE DETAIL & REPLY MODAL ── */}
      <AnimatePresence>
        {selectedMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMessage(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black tracking-tight">
                      {t('admin.contacts.messageDetail', 'Inquiry & Advice Details')}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-sky-300 border border-white/10">
                      {selectedMessage.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyId(selectedMessage.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Copy Reference ID"
                  >
                    {copiedId === selectedMessage.id ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMessage(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
                
                {/* Sender Metadata Bar */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sender</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{selectedMessage.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Contact</span>
                    <a href={`mailto:${selectedMessage.email}`} className="text-xs sm:text-sm font-bold text-sky-700 hover:underline">
                      {selectedMessage.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 font-mono">{selectedMessage.phone || 'N/A'}</span>
                  </div>
                </div>

                {/* Category & Status Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Category:</span>
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${getCategoryBadge(selectedMessage.inquiryType).bg}`}>
                      {selectedMessage.inquiryType}
                    </span>
                  </div>

                  {/* Status Toggle buttons */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600 mr-1">Status:</span>
                    {['NEW', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusChange(selectedMessage.id, st)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedMessage.status === st
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Original Message Box */}
                <div className="space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    {t('admin.contacts.messageBody', 'Original Message / User Advice')}
                  </span>
                  <div className="p-4 rounded-2xl bg-sky-50/40 border border-sky-200/70 space-y-2">
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {selectedMessage.subject}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {selectedMessage.message}
                    </p>
                  </div>
                </div>

                {/* Replies Thread */}
                {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-700">
                      Sent Replies ({selectedMessage.replies.length})
                    </span>
                    {selectedMessage.replies.map((rep, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/70 text-xs text-indigo-950 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700">
                          <span>{rep.sender}</span>
                          <span className="font-mono text-slate-400">{new Date(rep.date).toLocaleString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{rep.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Composer Form */}
                <form onSubmit={handleSendReply} className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      {t('admin.contacts.replyComposer', 'Official Email Reply Composer')}
                    </span>

                    {/* Quick Template buttons */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">Templates:</span>
                      <button
                        type="button"
                        onClick={() => applyTemplate('advice')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
                      >
                        💡 Thank Advice
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplate('ticket')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                      >
                        🎟️ Ticket Help
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplate('partner')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                      >
                        🤝 Partner
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    placeholder={t('admin.contacts.replyPlaceholder', 'Type official response to attendee...')}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-none"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(selectedMessage.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>{t('admin.contacts.deleteMessage', 'Delete')}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send size={13} />
                      <span>{t('admin.contacts.sendOfficialReply', 'Send Official Reply')}</span>
                    </button>
                  </div>
                </form>

                {/* Admin Internal Notes */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      {t('admin.contacts.internalNotes', 'Admin Internal Notes')}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="text-[11px] font-bold text-sky-700 hover:underline cursor-pointer"
                    >
                      {t('admin.contacts.saveNotes', 'Save Notes')}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Private notes (only visible to platform admins)..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

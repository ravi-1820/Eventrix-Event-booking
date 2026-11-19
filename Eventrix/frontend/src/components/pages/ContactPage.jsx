import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Phone, MapPin, Send, MessageSquare, Clock, 
  ShieldCheck, CheckCircle2, ChevronDown, Sparkles, HelpCircle,
  Headphones, Building, ArrowRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function ContactPage({ onNavigate, showToast }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: 'General Inquiry',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const contactMethods = [
    {
      icon: Mail,
      title: t('contact.emailUs', 'Email Us Directly'),
      detail: 'support@eventrix.live',
      sub: t('contact.emailSub', 'Response within 2 hours'),
      color: '#075985',
      action: 'mailto:support@eventrix.live'
    },
    {
      icon: Phone,
      title: t('contact.callSupport', 'Call Support Line'),
      detail: '+91 79 4890 2200',
      sub: t('contact.callSub', 'Mon - Sat (9 AM - 8 PM IST)'),
      color: '#FF4F70',
      action: 'tel:+917948902200'
    },
    {
      icon: MapPin,
      title: t('contact.headquarters', 'Headquarters'),
      detail: t('contact.hqAddress', 'Sindhu Bhavan Marg, Bodakdev'),
      sub: t('contact.hqCity', 'Ahmedabad, Gujarat 380054'),
      color: '#0284C7',
      action: null
    },
    {
      icon: Headphones,
      title: t('contact.liveChat', 'Live Chat & Helpdesk'),
      detail: t('contact.liveChatDetail', 'Available 24/7'),
      sub: t('contact.liveChatSub', 'Instant booking assistance'),
      color: '#10B981',
      action: null
    }
  ];

  const faqs = [
    {
      q: t('contact.faq1Q', 'How do I receive my tickets after booking?'),
      a: t('contact.faq1A', 'Your ticket is generated instantly upon payment confirmation. You can access it anytime under "My Bookings" on Eventrix, and an official PDF pass with QR code is sent directly to your registered email.')
    },
    {
      q: t('contact.faq2Q', 'What payment methods are supported on Eventrix?'),
      a: t('contact.faq2A', 'We support all major payment modes including UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards, Net Banking, Eventrix Digital Wallet, and Cash at Venue for select partner gatherings.')
    },
    {
      q: t('contact.faq3Q', 'How can event creators list events on Eventrix?'),
      a: t('contact.faq3A', 'Organizers and venue partners can click "Dashboard" to create verified events. Our team verifies the event details within 4 hours before making it live to thousands of city socialites.')
    },
    {
      q: t('contact.faq4Q', 'Can I cancel or transfer my ticket?'),
      a: t('contact.faq4A', 'Yes, tickets can be cancelled or transferred up to 24 hours before the event start time. Refunds are credited instantly to your original payment method or Eventrix wallet with 0% penalty.')
    }
  ];

  const [submittedRefId, setSubmittedRefId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      if (showToast) showToast(t('contact.fillRequired', 'Please complete all required fields.'));
      return;
    }

    setIsSubmitting(true);
    const refId = `INQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newContactMessage = {
      id: refId,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone?.trim() || 'N/A',
      inquiryType: formData.inquiryType,
      subject: formData.subject?.trim() || (formData.inquiryType === 'User Advice & Suggestions' ? 'User Platform Advice & Feedback' : `${formData.inquiryType} Request`),
      message: formData.message.trim(),
      status: 'NEW',
      priority: formData.inquiryType === 'Ticket Booking Support' ? 'HIGH' : (formData.inquiryType === 'User Advice & Suggestions' ? 'NORMAL' : 'NORMAL'),
      createdAt: new Date().toISOString(),
      replies: [],
      notes: ''
    };

    try {
      const existing = JSON.parse(localStorage.getItem('eventrix_contact_messages') || '[]');
      const updated = [newContactMessage, ...existing];
      localStorage.setItem('eventrix_contact_messages', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('eventrix:new_contact_message', { detail: newContactMessage }));
    } catch (err) {
      console.warn('Failed to persist contact message:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedRefId(refId);
      setIsSubmitted(true);
      if (showToast) showToast(t('contact.messageReceived', 'Message received! Tracking Reference: ' + refId));
    }, 700);
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] pb-16 font-sans">
      {/* ── HEADER SECTION ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E0F2FE]/70 via-[#F8FAFC] to-[#F8FAFC] pt-12 pb-16 border-b border-slate-200/80">
        <div className="absolute inset-0 bg-[radial-gradient(#075985_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#BAE6FD] shadow-sm text-xs font-bold text-[#075985] mb-5">
            <Sparkles className="w-3.5 h-3.5 text-[#FF4F70]" />
            <span>{t('contact.badge', '24/7 Dedicated Event Support')}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight leading-tight font-['Plus_Jakarta_Sans',sans-serif]">
            {t('contact.titleStart', "Let's Start a")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#075985] to-[#FF4F70]">{t('contact.titleEnd', 'Conversation.')}</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            {t('contact.subtitle', 'Have questions about booking tickets, partnering your festival, or technical support? Our friendly concierge team is always here to assist.')}
          </p>
        </div>
      </section>

      {/* ── CONTACT METHODS CARDS ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 -mt-8 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {contactMethods.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-md shadow-slate-200/40 flex flex-col justify-between hover:border-[#BAE6FD] hover:shadow-lg transition-all"
              >
                <div>
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${m.color}15`, color: m.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {m.title}
                  </h3>
                  <p className="text-sm font-extrabold text-[#0F172A] mt-1 truncate">
                    {m.detail}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {m.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── MAIN FORM & FAQ SPLIT ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 mt-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Contact Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl">
            <div className="mb-6">
              <span className="text-xs font-black uppercase tracking-wider text-[#075985]">{t('contact.sendMessage', 'Send A Message')}</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight mt-1">
                {t('contact.formTitle', 'How Can We Help You Today?')}
              </h2>
            </div>

            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#0F172A]">{t('contact.successTitle', 'Message Sent Successfully!')}</h3>
                
                {submittedRefId && (
                  <div className="mt-3 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200/80 text-sky-800 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
                    <span>{t('admin.contacts.referenceId', 'Reference ID')}:</span>
                    <span className="text-sky-900 font-extrabold">{submittedRefId}</span>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-3 leading-relaxed">
                  {t('contact.successDesc', 'Thank you, {name}. A confirmation has been sent to your email. We will reach back within 2 business hours.').replace('{name}', formData.name)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setSubmittedRefId('');
                    setFormData({ name: '', email: '', phone: '', inquiryType: 'User Advice & Suggestions', subject: '', message: '' });
                  }}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#075985] to-[#0284C7] text-white text-xs font-bold hover:shadow-md transition-all cursor-pointer"
                >
                  {t('contact.sendAnother', 'Send Another Message')}
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('contact.fullName', 'Your Full Name *')}</label>
                    <input
                      type="text"
                      required
                      placeholder={t('contact.namePlaceholder', 'e.g. Rahul Patel')}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('contact.emailAddress', 'Email Address *')}</label>
                    <input
                      type="email"
                      required
                      placeholder={t('contact.emailPlaceholder', 'rahul@example.com')}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('contact.phone', 'Phone Number (Optional)')}</label>
                    <input
                      type="tel"
                      placeholder={t('contact.phonePlaceholder', '+91 98765 43210')}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t('contact.reason', 'Reason for Contact / Category')}</label>
                    <select
                      value={formData.inquiryType}
                      onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all cursor-pointer font-medium"
                    >
                      <option value="User Advice & Suggestions">💡 {t('admin.contacts.typeAdvice', 'User Advice & Suggestions')}</option>
                      <option value="General Inquiry">💬 {t('contact.generalInquiry', 'General Inquiry')}</option>
                      <option value="Ticket Booking Support">🎟️ {t('contact.ticketSupport', 'Ticket / Booking Support')}</option>
                      <option value="Event Organizer Partnership">🤝 {t('contact.organizerPartner', 'Event Organizer / Host')}</option>
                      <option value="Corporate / Brand Sponsorship">💼 {t('contact.sponsorship', 'Sponsorship & Brand Partner')}</option>
                      <option value="Technical Feedback">⚡ {t('contact.feedback', 'App / Website Feedback')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('contact.subject', 'Subject')}</label>
                  <input
                    type="text"
                    placeholder={t('contact.subjectPlaceholder', 'Brief summary of your query')}
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('contact.message', 'Message *')}</label>
                  <textarea
                    rows={4}
                    required
                    placeholder={t('contact.messagePlaceholder', 'Please write the details of your inquiry...')}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#075985]/30 focus:border-[#075985] transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF4F70] to-[#E11D48] hover:from-[#E11D48] hover:to-[#BE123C] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#FF4F70]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>{t('contact.submitting', 'Sending your message...')}</span>
                  ) : (
                    <>
                      <span>{t('contact.submit', 'Submit Message')}</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right: Instant FAQ & Help */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="w-5 h-5 text-[#075985]" />
                <h3 className="text-base font-bold text-[#0F172A]">{t('contact.faqsTitle', 'Frequently Asked Questions')}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                {t('contact.faqsSubtitle', 'Got quick questions? Here are instant answers to our most common queries:')}
              </p>

              <div className="space-y-2.5">
                {faqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div 
                      key={index}
                      className="border border-slate-200/80 rounded-2xl overflow-hidden transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="w-full text-left p-3.5 text-xs font-bold text-[#0F172A] flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="px-3.5 pb-3.5 pt-1 text-[11px] sm:text-xs text-slate-500 leading-relaxed border-t border-slate-100">
                              {faq.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Organizer Callout */}
            <div className="bg-gradient-to-br from-[#075985] to-[#0284C7] rounded-3xl p-6 text-white shadow-lg">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Building className="w-4 h-4 text-[#BAE6FD]" />
                {t('contact.organizerTitle', 'Are you an Event Organizer?')}
              </h4>
              <p className="text-xs text-[#E0F2FE] mt-1.5 leading-relaxed">
                {t('contact.organizerDesc', 'Host your summits, festivals, and concerts with seamless ticketing, QR check-in scanner apps, and instant settlement.')}
              </p>
              <button
                onClick={() => onNavigate('dashboard')}
                className="mt-4 px-4 py-2 rounded-xl bg-white text-[#075985] font-bold text-xs hover:bg-[#E0F2FE] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>{t('contact.goToDashboard', 'Go to Organizer Dashboard')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

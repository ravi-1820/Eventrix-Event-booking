import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Compass, MapPin, Users, ShieldCheck, 
  Calendar, Ticket, ArrowRight, Heart, Award, Globe, Zap 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function AboutPage({ onNavigate }) {
  const { t } = useLanguage();

  const stats = [
    { label: t('about.eventsHosted', 'Live Events Hosted'), value: '1,500+', icon: Calendar, color: '#075985' },
    { label: t('about.happyAttendees', 'Happy Attendees'), value: '85,000+', icon: Users, color: '#FF4F70' },
    { label: t('about.indianCities', 'Indian Cities'), value: '15+', icon: MapPin, color: '#0284C7' },
    { label: t('about.customerSat', 'Customer Satisfaction'), value: '99.4%', icon: Award, color: '#10B981' },
  ];

  const pillars = [
    {
      icon: Compass,
      title: t('about.pillar1Title', 'Geographic Discovery'),
      description: t('about.pillar1Desc', 'Find concerts, tech meetups, and underground gigs within minutes using real-time interactive neighborhood mapping.'),
      accent: '#075985',
      badge: t('about.pillar1Badge', 'Interactive Map')
    },
    {
      icon: Ticket,
      title: t('about.pillar2Title', 'Frictionless Digital Passes'),
      description: t('about.pillar2Desc', 'Instant ticket generation with QR validation, seamless offline wallets, and real-time seat reservation confirmation.'),
      accent: '#FF4F70',
      badge: t('about.pillar2Badge', 'Zero Waiting')
    },
    {
      icon: ShieldCheck,
      title: t('about.pillar3Title', 'Trust & Guaranteed Access'),
      description: t('about.pillar3Desc', 'End-to-end encrypted bookings, verified organizer partnerships, and 100% money-back booking protection.'),
      accent: '#0284C7',
      badge: t('about.pillar3Badge', 'Bank-Grade Security')
    },
    {
      icon: Zap,
      title: t('about.pillar4Title', 'Instant Local Community'),
      description: t('about.pillar4Desc', 'Discover who is going, check live crowd density, and connect with fellow enthusiasts who share your passions.'),
      accent: '#8B5CF6',
      badge: t('about.pillar4Badge', 'Social Vibes')
    }
  ];

  const teamMembers = [
    {
      name: 'Aarav Mehta',
      role: 'Founder & CEO',
      city: 'Ahmedabad',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      quote: 'Building the pulse of Indian weekend entertainment.'
    },
    {
      name: 'Priya Sharma',
      role: 'Head of Product Design',
      city: 'Bengaluru',
      image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      quote: 'Designing fluid, joyful discovery experiences.'
    },
    {
      name: 'Kabir Varma',
      role: 'Chief Technology Architect',
      city: 'Mumbai',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      quote: 'High-concurrency ticketing with sub-second checkout.'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] pb-16 font-sans">
      {/* ── HERO BANNER ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E0F2FE]/70 via-[#F8FAFC] to-[#F8FAFC] pt-12 pb-20 border-b border-slate-200/80">
        <div className="absolute inset-0 bg-[radial-gradient(#075985_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#BAE6FD] shadow-sm text-xs font-bold text-[#075985] mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF4F70]" />
            <span>{t('about.badge', 'Redefining Live Experiences Across India')}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight leading-tight max-w-3xl mx-auto font-['Plus_Jakarta_Sans',sans-serif]"
          >
            {t('about.heroTitleStart', 'Connecting people with the')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#075985] to-[#FF4F70]">{t('about.heroTitleEnd', 'moments that matter.')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
          >
            {t('about.heroDesc', 'Eventrix is an experiential discovery and ticketing platform built for spontaneous music lovers, tech pioneers, and cultural explorers. We turn your weekends into unforgettable stories.')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              onClick={() => onNavigate('explore')}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FF4F70] to-[#E11D48] hover:from-[#E11D48] hover:to-[#BE123C] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#FF4F70]/25 hover:shadow-xl hover:shadow-[#FF4F70]/35 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>{t('about.exploreEvents', 'Explore Live Events')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="px-6 py-3 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200/90 shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>{t('about.getInTouch', 'Get in Touch')}</span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── KEY METRICS / STATS ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 -mt-10 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-lg shadow-slate-200/50 flex flex-col items-center text-center"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-inner"
                  style={{ backgroundColor: `${s.color}15`, color: s.color }}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#0F172A] tracking-tight">
                  {s.value}
                </span>
                <span className="text-xs font-semibold text-slate-500 mt-1">
                  {s.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── OUR MISSION & PILLARS ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 mt-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-black uppercase tracking-widest text-[#075985]">{t('about.philosophyTag', 'Our Philosophy')}</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight mt-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
            {t('about.philosophyTitle', 'Why Creators & Attendees Choose Eventrix')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            {t('about.philosophySubtitle', 'Every feature is crafted to make discovering and booking an event as exhilarating as the experience itself.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-xl hover:shadow-[#075985]/8 hover:border-[#BAE6FD] transition-all relative overflow-hidden group"
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5 transition-all"
                  style={{ backgroundColor: item.accent }}
                />

                <div className="flex items-center justify-between mb-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: `${item.accent}15`, color: item.accent }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span 
                    className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider"
                    style={{ backgroundColor: `${item.accent}15`, color: item.accent }}
                  >
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#0F172A] group-hover:text-[#075985] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mt-2">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── THE TEAM / STORY ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 mt-24">
        <div className="bg-gradient-to-br from-[#075985] to-[#0C4A6E] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 bottom-0 w-96 h-96 bg-[#FF4F70]/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl">
            <span className="px-3 py-1 rounded-full bg-white/15 text-[#BAE6FD] text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md">
              {t('about.journeyTag', 'Our Journey')}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black mt-4 tracking-tight leading-tight">
              {t('about.journeyTitle', 'Crafted in Ahmedabad, Empowering Socialites Nationwide')}
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm mt-3 leading-relaxed">
              {t('about.journeyDesc', 'We started with a simple frustration: why was it so hard to find out what was happening this Friday night in our own city? Traditional ticketing portals were cluttered with ads and movies. Eventrix was created to be the dedicated home for live culture, authentic gatherings, and unforgettable weekend memories.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 relative z-10">
            {teamMembers.map((m) => (
              <div key={m.name} className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15">
                <img 
                  src={m.image} 
                  alt={m.name} 
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/40 mb-3 shadow-md"
                />
                <h4 className="text-sm font-bold text-white">{m.name}</h4>
                <p className="text-xs text-[#BAE6FD] font-medium">{m.role}</p>
                <p className="text-[11px] text-slate-300 italic mt-2">"{m.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION FOOTER BANNER ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 mt-20 text-center">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#BAE6FD] shadow-xl flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#E0F2FE] text-[#075985] flex items-center justify-center mb-3">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
            {t('about.ctaTitle', 'Ready to explore your city this weekend?')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1 mb-6">
            {t('about.ctaDesc', 'Join over 85,000+ happy attendees finding concerts, food pop-ups, and summits every week.')}
          </p>
          <button
            onClick={() => onNavigate('explore')}
            className="px-7 py-3 rounded-full bg-[#FF4F70] hover:bg-[#E11D48] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#FF4F70]/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>{t('about.browseAllEvents', 'Browse All Events')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}

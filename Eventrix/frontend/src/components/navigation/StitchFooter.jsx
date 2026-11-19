import React from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';
import { EventrixLogo } from '../common/EventrixLogo';
import { useLanguage } from '../../context/LanguageContext';

export function StitchFooter({ onNavigate }) {
  const { t } = useLanguage();

  const handleNav = (p) => {
    if (onNavigate) {
      onNavigate(p);
    } else {
      window.location.hash = `#${p}`;
    }
  };

  return (
    <footer className="w-full relative overflow-hidden mt-auto select-none">
      {/* Top Wave Curve Transition */}
      <div className="w-full overflow-hidden leading-none pointer-events-none -mb-px">
        <svg 
          className="relative block w-full h-8 sm:h-12 md:h-16 text-[#07152B]" 
          viewBox="0 0 1440 90" 
          fill="none" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,35 C380,95 1060,95 1440,20 L1440,90 L0,90 Z" 
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="w-full bg-[#07152B] text-slate-300 relative">
        {/* Bottom Right Wave Accent matching reference image */}
        <div className="absolute right-0 bottom-0 w-[460px] h-[340px] pointer-events-none overflow-hidden">
          <svg 
            className="absolute right-0 bottom-0 w-full h-full text-[#1E3A8A]" 
            viewBox="0 0 460 340" 
            fill="none" 
          >
            <path 
              d="M100,340 C170,220 280,160 460,110 L460,340 Z" 
              fill="currentColor"
              fillOpacity="0.45"
            />
            <path 
              d="M210,340 C270,240 350,190 460,160 L460,340 Z" 
              fill="#2563EB" 
              fillOpacity="0.28"
            />
          </svg>
        </div>

        <div className="w-full px-6 sm:px-8 lg:px-12 xl:px-16 py-10 sm:py-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 pb-10">
            
            {/* Brand & Address Column */}
            <div className="lg:col-span-2 flex flex-col gap-5 pr-2">
              <button onClick={() => handleNav('explore')} className="text-left cursor-pointer group inline-flex items-center">
                <EventrixLogo size="md" variant="header" textColor="text-white" subTextColor="text-sky-400" />
              </button>
              
              <div className="flex flex-col gap-3 text-sm text-slate-400 max-w-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                  <span className="leading-snug text-slate-300">{t('footer.address', 'Sindhu Bhavan Marg, Bodakdev, Ahmedabad, Gujarat 380054, India')}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                  <a href="tel:+917948902200" className="text-slate-300 hover:text-sky-400 transition-colors">+91 79 4890 2200</a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                  <a href="mailto:support@eventrix.live" className="text-slate-300 hover:text-sky-400 transition-colors">support@eventrix.live</a>
                </div>
              </div>

              {/* Social Media Badges */}
              <div className="flex items-center gap-2.5 mt-1">
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-sky-600 hover:text-white text-slate-300 border border-slate-700/50 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                  </svg>
                </a>
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noreferrer"
                  aria-label="Twitter / X"
                  className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-sky-600 hover:text-white text-slate-300 border border-slate-700/50 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a 
                  href="https://youtube.com" 
                  target="_blank" 
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-sky-600 hover:text-white text-slate-300 border border-slate-700/50 flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
                    <polygon points="10 15 15 12 10 9 10 15"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Discover Column */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white mb-1">{t('footer.discover', 'Discover')}</span>
              <button onClick={() => handleNav('explore')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.liveMusicConcerts', 'Live Music & Concerts')}</button>
              <button onClick={() => handleNav('explore')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.rooftops', 'Rooftops & Cocktails')}</button>
              <button onClick={() => handleNav('explore')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.nightMarkets', 'Night Markets & Food')}</button>
              <button onClick={() => handleNav('explore')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.comedyShows', 'Comedy Shows')}</button>
              <button onClick={() => handleNav('explore')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.artPopups', 'Art Pop-ups')}</button>
            </div>

            {/* Company & Support Column */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white mb-1">{t('footer.companySupport', 'Company & Support')}</span>
              <button onClick={() => handleNav('about')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.aboutEventrix', 'About Eventrix')}</button>
              <button onClick={() => handleNav('contact')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.contactSupport', 'Contact & Support')}</button>
              <button onClick={() => handleNav('about')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.communityStory', 'Community Story')}</button>
              <button onClick={() => handleNav('contact')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.helpFaqs', 'Help & FAQs')}</button>
              <button onClick={() => handleNav('contact')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.trustSafety', 'Trust & Safety')}</button>
            </div>

            {/* For Organizers Column */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white mb-1">{t('footer.forOrganizers', 'For Organizers')}</span>
              <button onClick={() => handleNav('dashboard')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.hostEvent', 'Host an Event')}</button>
              <button onClick={() => handleNav('dashboard')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.organizerDashboard', 'Organizer Dashboard')}</button>
              <button onClick={() => handleNav('my-bookings')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.attendeePortal', 'Attendee Portal')}</button>
              <button onClick={() => handleNav('about')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.verifiedETickets', 'Verified E-Tickets')}</button>
              <button onClick={() => handleNav('contact')} className="text-left text-sm text-slate-400 hover:text-sky-300 transition-colors cursor-pointer">{t('footer.partnerInquiries', 'Partner Inquiries')}</button>
            </div>
          </div>

          {/* Bottom Centered Copyright */}
          <div className="pt-8 border-t border-slate-800/80 flex items-center justify-center text-center">
            <span className="text-xs text-slate-500 font-medium tracking-wide">{t('footer.rightsReserved', '© 2026 Eventrix Entertainment Inc. All rights reserved.')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

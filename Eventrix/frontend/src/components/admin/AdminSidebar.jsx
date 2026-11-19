import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Calendar, Ticket, Users, CreditCard, 
  BarChart3, Star, Bell, Settings, HelpCircle, LogOut, 
  ChevronLeft, ChevronRight, Plus, ExternalLink, ShieldCheck,
  Layers, UserCheck, MessageSquare
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function AdminSidebar({
  activeView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  currentUser: _currentUser,
  onLogout,
  onNavigateToPublic,
  mobileOpen,
  onCloseMobile,
  pendingRequirementsCount = 0,
  unreadContactsCount = 0,
}) {
  const { t } = useLanguage();

  const navItems = [
    { id: 'dashboard', label: t('admin.dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'events', label: t('admin.events', 'Events'), icon: Calendar },
    { id: 'bookings', label: t('admin.bookings', 'Bookings'), icon: Ticket },
    { id: 'users', label: t('admin.users', 'Users'), icon: UserCheck },
    { id: 'attendees', label: t('admin.attendees', 'Attendees'), icon: Users },
    { id: 'payments', label: t('admin.payments', 'Payments'), icon: CreditCard },
    { id: 'analytics', label: t('admin.analytics', 'Analytics'), icon: BarChart3 },
    { 
      id: 'requirements', 
      label: t('admin.requirements', 'Requirements'), 
      icon: Layers, 
      badge: pendingRequirementsCount > 0 ? pendingRequirementsCount : null 
    },
    { 
      id: 'contacts', 
      label: t('admin.contacts', 'Contact & Advice'), 
      icon: MessageSquare, 
      badge: unreadContactsCount > 0 ? unreadContactsCount : null 
    },
    { id: 'reviews', label: t('admin.reviews', 'Reviews'), icon: Star },
    { id: 'notifications', label: t('admin.notifications', 'Notifications'), icon: Bell },
    { id: 'settings', label: t('admin.settings', 'Settings'), icon: Settings },
  ];


  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0B0F1A] via-[#0E1526] to-[#090D16] text-slate-300 font-sans select-none border-r border-slate-800/60 shadow-2xl">
      
      {/* Modern Brand Header */}
      <div className={`h-[76px] flex items-center border-b border-slate-800/60 shrink-0 bg-slate-950/30 backdrop-blur-md ${
        collapsed ? 'px-2 justify-center relative' : 'px-5 justify-between'
      }`}>
        {collapsed ? (
          /* Short Sidebar: Only Logo Mark */
          <div className="flex items-center justify-center w-full relative">
            <div 
              onClick={() => onSelectView('dashboard')}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/60 flex items-center justify-center p-2 shadow-inner cursor-pointer hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/20 transition-all group"
              title="Eventrix Admin Dashboard"
            >
              <img 
                src="/logo_mark.png" 
                alt="Eventrix Logo" 
                className="w-full h-full object-contain drop-shadow group-hover:scale-110 transition-transform duration-300" 
              />
            </div>

            {/* Desktop Expand Toggle Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white items-center justify-center shadow-lg shadow-sky-500/30 border-2 border-[#0B0F1A] transition-transform hover:scale-110 z-30 cursor-pointer"
              title="Expand sidebar"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        ) : (
          /* Full Sidebar: Full Logo With Text */
          <>
            <div 
              onClick={() => onSelectView('dashboard')}
              className="flex items-center gap-3 overflow-hidden cursor-pointer group transition-transform min-w-0"
              title="Eventrix Admin Dashboard"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/70 flex items-center justify-center p-1.5 shadow-md shadow-black/40 group-hover:scale-105 group-hover:border-sky-500/40 transition-all shrink-0">
                <img 
                  src="/logo_mark.png" 
                  alt="Eventrix Logo" 
                  className="w-full h-full object-contain drop-shadow" 
                />
              </div>
              <div className="flex flex-col justify-center leading-none min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-white text-base tracking-tight leading-none group-hover:text-sky-400 transition-colors">
                    EVENTRIX
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-rose-500/30 animate-pulse shrink-0" />
                </div>
                <span className="text-[9px] font-bold text-sky-400/90 uppercase tracking-wider leading-none mt-1.5 truncate">
                  {t('admin.systemName', 'Events Management System')}
                </span>
              </div>
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex w-7 h-7 rounded-xl items-center justify-center text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 transition-colors shrink-0 ml-2 cursor-pointer"
              title="Collapse sidebar"
            >
              <ChevronLeft size={15} />
            </button>
          </>
        )}
      </div>

      {/* Main Navigation Items with custom smooth scroll */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all duration-200 group relative cursor-pointer overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500/[0.16] via-sky-500/[0.08] to-transparent text-white border border-sky-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_20px_rgba(56,189,248,0.12)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] hover:border hover:border-white/[0.06] border border-transparent hover:translate-x-1'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              {/* Active Left Neon Glow Bar */}
              {isActive && (
                <motion.div
                  layoutId="activeSidebarNeonBar"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-sky-400 via-cyan-300 to-indigo-400 rounded-r-full shadow-[0_0_10px_#38bdf8,0_0_20px_#38bdf8]"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}

              {/* Inactive Hover Indicator Accent */}
              {!isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-sky-400/0 group-hover:bg-sky-400/60 rounded-r-full transition-all duration-200" />
              )}

              {/* Icon Container with subtle glow */}
              <div className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-sky-500/20 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                  : 'text-slate-400 group-hover:text-sky-300 group-hover:bg-white/[0.06]'
              }`}>
                <IconComp 
                  size={16} 
                  className={`transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'group-hover:scale-110'
                  }`} 
                />
              </div>
              
              {!collapsed && (
                <>
                  <span className={`truncate flex-1 text-left tracking-wide ${
                    isActive ? 'font-semibold text-white' : 'font-medium group-hover:text-white'
                  }`}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0F172A] text-white text-[11px] font-bold rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 shadow-2xl border border-slate-700/80 z-50 flex items-center gap-1.5">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/30 text-amber-300">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-slate-800/60 space-y-1.5 shrink-0 bg-slate-950/60 backdrop-blur-md">
        
        {/* Return to Customer Site */}
        <button
          type="button"
          onClick={onNavigateToPublic}
          title={collapsed ? t('admin.publicWebsite', 'View Public Site') : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border hover:border-white/[0.08] border border-transparent transition-all duration-200 cursor-pointer group ${
            collapsed ? 'justify-center px-0' : 'hover:translate-x-1'
          }`}
        >
          <div className="w-6 h-6 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
            <ExternalLink size={14} className="text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0" />
          </div>
          {!collapsed && <span className="truncate">{t('admin.publicWebsite', 'View Public Website')}</span>}
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? t('admin.signOut', 'Sign Out') : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-400/90 hover:text-rose-200 hover:bg-rose-500/[0.12] hover:border hover:border-rose-500/20 border border-transparent transition-all duration-200 cursor-pointer group ${
            collapsed ? 'justify-center px-0' : 'hover:translate-x-1'
          }`}
        >
          <div className="w-6 h-6 rounded-lg flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
            <LogOut size={14} className="shrink-0 group-hover:text-rose-300" />
          </div>
          {!collapsed && <span>{t('admin.signOut', 'Sign Out')}</span>}
        </button>

      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:block fixed top-0 left-0 bottom-0 z-40 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

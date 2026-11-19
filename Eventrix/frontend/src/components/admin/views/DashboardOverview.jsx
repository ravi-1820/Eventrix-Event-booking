import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarDays, Ticket, DollarSign, BarChart3, TrendingUp, 
  ArrowUpRight, Users, Clock, MapPin, Eye, Pencil, CheckCircle2,
  AlertCircle, ChevronRight, Sparkles, CreditCard, RotateCcw,
  Layers, ArrowRight, Calendar, Filter, ChevronDown, Check
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

export function DashboardOverview({
  dashData,
  onNavigateView,
  onSelectEvent,
  onEditEvent,
  onViewBooking,
  currentUser
}) {
  const { t, translateEvent, translateCity } = useLanguage();
  const stats = dashData?.stats || {};
  const events = dashData?.events || [];
  const bookings = dashData?.bookings || [];
  const payments = dashData?.payments || [];

  // ----------------------------------------------------
  // Interactive Chart Timeframe & Date-to-Date Filters
  // ----------------------------------------------------
  const [timeFilter, setTimeFilter] = useState('month'); // 'days' | 'week' | 'month' | 'custom'
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Default custom range: Last 14 days to Today
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const fourteenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  }, []);

  const [customStart, setCustomStart] = useState(fourteenDaysAgoStr);
  const [customEnd, setCustomEnd] = useState(todayStr);
  const [appliedCustom, setAppliedCustom] = useState(null);

  // Filter upcoming events (future date or published status)
  const now = new Date();
  const upcomingEvents = events.filter((e) => {
    return new Date(e.start_time) >= now || e.status === 'PUBLISHED' || e.status === 'ONGOING';
  }).slice(0, 6);

  const recentBookings = bookings.slice(0, 7);

  // ----------------------------------------------------
  // Dynamic Chart Dataset: Real Time-Series Aggregation from Bookings & Payments
  // ----------------------------------------------------
  const chartDataset = useMemo(() => {
    const validBookings = Array.isArray(bookings) ? bookings.filter(b => b && b.status !== 'CANCELLED') : [];
    const validPayments = Array.isArray(payments) ? payments.filter(p => p && p.status === 'SUCCEEDED') : [];

    if (timeFilter === 'days') {
      // Last 7 Calendar Days
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);

        const dayBookings = validBookings.filter(b => {
          if (!b?.booked_at && !b?.created_at) return false;
          const bDate = new Date(b.booked_at || b.created_at);
          return bDate >= d && bDate < nextD;
        });

        const dayPayments = validPayments.filter(p => {
          if (!p?.created_at && !p?.payment_date) return false;
          const pDate = new Date(p.created_at || p.payment_date);
          return pDate >= d && pDate < nextD;
        });

        const dayAmount = dayBookings.reduce((sum, b) => sum + Number(b?.total_price || 0), 0);
        const dayTickets = dayBookings.reduce((sum, b) => sum + Number(b?.quantity || 1), 0);
        const daySettled = dayPayments.reduce((sum, p) => sum + Number(p?.amount || 0), 0);

        days.push({
          label: `${dayNames[d.getDay()]} ${d.getDate()}`,
          subLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: dayAmount,
          tickets: dayTickets,
          settled: daySettled > 0 ? daySettled : dayAmount,
        });
      }
      return days;
    }

    if (timeFilter === 'week') {
      // Last 4 Weeks
      const weeks = [];
      for (let w = 3; w >= 0; w--) {
        const start = new Date();
        start.setDate(start.getDate() - (w + 1) * 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setDate(end.getDate() - w * 7);
        end.setHours(23, 59, 59, 999);

        const wBookings = validBookings.filter(b => {
          if (!b?.booked_at && !b?.created_at) return false;
          const bDate = new Date(b.booked_at || b.created_at);
          return bDate >= start && bDate <= end;
        });
        const wPayments = validPayments.filter(p => {
          if (!p?.created_at && !p?.payment_date) return false;
          const pDate = new Date(p.created_at || p.payment_date);
          return pDate >= start && pDate <= end;
        });

        const wAmount = wBookings.reduce((sum, b) => sum + Number(b?.total_price || 0), 0);
        const wTickets = wBookings.reduce((sum, b) => sum + Number(b?.quantity || 1), 0);
        const wSettled = wPayments.reduce((sum, p) => sum + Number(p?.amount || 0), 0);

        weeks.push({
          label: `Week ${4 - w}`,
          subLabel: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          amount: wAmount,
          tickets: wTickets,
          settled: wSettled > 0 ? wSettled : wAmount,
        });
      }
      return weeks;
    }

    if (timeFilter === 'custom' && appliedCustom) {
      const start = new Date(appliedCustom.start || Date.now() - 14 * 86400000);
      start.setHours(0, 0, 0, 0);
      const end = new Date(appliedCustom.end || Date.now());
      end.setHours(23, 59, 59, 999);

      const diffTime = Math.max(end - start, 86400000);
      const diffDays = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);
      const segments = Math.min(Math.max(diffDays, 2), 8);
      const points = [];

      for (let i = 0; i < segments; i++) {
        const segStart = new Date(start.getTime() + (diffTime / segments) * i);
        const segEnd = new Date(start.getTime() + (diffTime / segments) * (i + 1));

        const segBookings = validBookings.filter(b => {
          if (!b?.booked_at && !b?.created_at) return false;
          const bDate = new Date(b.booked_at || b.created_at);
          return bDate >= segStart && bDate <= segEnd;
        });
        const segPayments = validPayments.filter(p => {
          if (!p?.created_at && !p?.payment_date) return false;
          const pDate = new Date(p.created_at || p.payment_date);
          return pDate >= segStart && pDate <= segEnd;
        });

        const segAmount = segBookings.reduce((sum, b) => sum + Number(b?.total_price || 0), 0);
        const segTickets = segBookings.reduce((sum, b) => sum + Number(b?.quantity || 1), 0);
        const segSettled = segPayments.reduce((sum, p) => sum + Number(p?.amount || 0), 0);

        points.push({
          label: segStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          subLabel: segStart.toISOString().split('T')[0],
          amount: segAmount,
          tickets: segTickets,
          settled: segSettled > 0 ? segSettled : segAmount,
        });
      }
      return points;
    }

    // Default: Last 6 Calendar Months
    const months = [];
    const monthKeyNames = [
      'admin.analytics.monthJan', 'admin.analytics.monthFeb', 'admin.analytics.monthMar',
      'admin.analytics.monthApr', 'admin.analytics.monthMay', 'admin.analytics.monthJun',
      'admin.analytics.monthJul', 'admin.analytics.monthAug', 'admin.analytics.monthSep',
      'admin.analytics.monthOct', 'admin.analytics.monthNov', 'admin.analytics.monthDec'
    ];
    const defaultMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const nowD = new Date();

    for (let m = 5; m >= 0; m--) {
      const d = new Date(nowD.getFullYear(), nowD.getMonth() - m, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();

      const mStart = new Date(year, monthIdx, 1);
      const mEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);

      const mBookings = validBookings.filter(b => {
        if (!b?.booked_at && !b?.created_at) return false;
        const bDate = new Date(b.booked_at || b.created_at);
        return bDate >= mStart && bDate <= mEnd;
      });
      const mPayments = validPayments.filter(p => {
        if (!p?.created_at && !p?.payment_date) return false;
        const pDate = new Date(p.created_at || p.payment_date);
        return pDate >= mStart && pDate <= mEnd;
      });

      const mAmount = mBookings.reduce((sum, b) => sum + Number(b?.total_price || 0), 0);
      const mTickets = mBookings.reduce((sum, b) => sum + Number(b?.quantity || 1), 0);
      const mSettled = mPayments.reduce((sum, p) => sum + Number(p?.amount || 0), 0);

      months.push({
        label: t(monthKeyNames[monthIdx] || 'admin.analytics.monthJan', defaultMonthNames[monthIdx] || 'Jan'),
        subLabel: `${year}`,
        amount: mAmount,
        tickets: mTickets,
        settled: mSettled > 0 ? mSettled : mAmount,
      });
    }
    return months;
  }, [timeFilter, appliedCustom, bookings, payments, t]);

  const maxPointAmount = useMemo(() => {
    return Math.max(...chartDataset.map(d => d.amount), 100);
  }, [chartDataset]);

  const periodTotalRevenue = useMemo(() => {
    return chartDataset.reduce((sum, d) => sum + d.amount, 0);
  }, [chartDataset]);

  const periodAvg = useMemo(() => {
    return chartDataset.length > 0 ? Math.round(periodTotalRevenue / chartDataset.length) : 0;
  }, [periodTotalRevenue, chartDataset]);

  // Safe array references
  const safeEvents = Array.isArray(events) ? events : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  // Real Top KPI Cards config
  const kpis = [
    {
      id: 'revenue',
      title: t('admin.totalRevenue', 'Total Revenue'),
      value: formatCurrency(stats.total_revenue || 0),
      change: `${safePayments.filter(p => p && p.status === 'SUCCEEDED').length} settled`,
      trend: 'up',
      subtitle: t('admin.vsLastMonth', 'total lifetime settled'),
      icon: DollarSign,
      accent: '#10B981',
      bgLight: 'bg-emerald-50',
      borderLight: 'border-emerald-200/70',
      textColor: 'text-emerald-700',
      gradient: 'from-emerald-500/10 via-transparent to-transparent',
    },
    {
      id: 'bookings',
      title: t('admin.totalBookings', 'Total Bookings'),
      value: (stats.total_tickets_sold || 0).toLocaleString(),
      change: `${safeBookings.length} reservations`,
      trend: 'up',
      subtitle: t('admin.ticketsIssued', 'tickets issued'),
      icon: Ticket,
      accent: '#F43F5E',
      bgLight: 'bg-rose-50',
      borderLight: 'border-rose-200/70',
      textColor: 'text-rose-700',
      gradient: 'from-rose-500/10 via-transparent to-transparent',
    },
    {
      id: 'events',
      title: t('admin.totalEvents', 'Total Events'),
      value: (stats.total_events || safeEvents.length || 0).toString(),
      change: `${safeEvents.filter(e => e && e.status === 'PUBLISHED').length} active`,
      trend: 'up',
      subtitle: `${safeEvents.filter(e => e && e.status === 'PUBLISHED').length} ${t('admin.activeLive', 'active live')}`,
      icon: CalendarDays,
      accent: '#0284C7',
      bgLight: 'bg-sky-50',
      borderLight: 'border-sky-200/70',
      textColor: 'text-sky-700',
      gradient: 'from-sky-500/10 via-transparent to-transparent',
    },
    {
      id: 'capacity',
      title: t('admin.capacityFill', 'Seating Fill Rate'),
      value: `${stats.utilization_rate || 0}%`,
      change: `${stats.total_tickets_sold || 0} / ${stats.total_capacity || 0}`,
      trend: 'up',
      subtitle: `${stats.total_capacity || 0} ${t('admin.totalSeats', 'total seats')}`,
      icon: BarChart3,
      accent: '#8B5CF6',
      bgLight: 'bg-purple-50',
      borderLight: 'border-purple-200/70',
      textColor: 'text-purple-700',
      gradient: 'from-purple-500/10 via-transparent to-transparent',
    },
  ];

  // ----------------------------------------------------
  // Chart View Mode: Spline Area vs Modern Columns
  // ----------------------------------------------------
  const [chartMode, setChartMode] = useState('spline'); // 'spline' | 'bar'

  // Helper for generating smooth cubic Bézier SVG path
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 24;

  const { linePath, areaPath, coords, maxVal } = useMemo(() => {
    if (!chartDataset || chartDataset.length === 0) {
      return { linePath: '', areaPath: '', coords: [], maxVal: 100 };
    }
    const graphWidth = svgWidth - paddingX * 2;
    const graphHeight = svgHeight - paddingY * 2;
    const max = Math.max(...chartDataset.map(d => d.amount), 100);

    const calculatedCoords = chartDataset.map((p, i) => {
      const x = paddingX + (i / Math.max(chartDataset.length - 1, 1)) * graphWidth;
      const y = svgHeight - paddingY - (p.amount / max) * graphHeight;
      return { x, y, ...p, index: i };
    });

    if (calculatedCoords.length === 1) {
      const p = calculatedCoords[0];
      return {
        linePath: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`,
        areaPath: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${svgHeight - paddingY} L ${p.x - 20} ${svgHeight - paddingY} Z`,
        coords: calculatedCoords,
        maxVal: max,
      };
    }

    let lPath = `M ${calculatedCoords[0].x.toFixed(1)},${calculatedCoords[0].y.toFixed(1)}`;
    for (let i = 0; i < calculatedCoords.length - 1; i++) {
      const p0 = calculatedCoords[i === 0 ? 0 : i - 1];
      const p1 = calculatedCoords[i];
      const p2 = calculatedCoords[i + 1];
      const p3 = calculatedCoords[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;

      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      lPath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const lastP = calculatedCoords[calculatedCoords.length - 1];
    const firstP = calculatedCoords[0];
    const aPath = `${lPath} L ${lastP.x.toFixed(1)},${svgHeight - paddingY} L ${firstP.x.toFixed(1)},${svgHeight - paddingY} Z`;

    return { linePath: lPath, areaPath: aPath, coords: calculatedCoords, maxVal: max };
  }, [chartDataset, svgWidth, svgHeight, paddingX, paddingY]);

  // Active hover point state for interactive cursor
  const activeHover = hoveredPoint || (coords.length > 0 ? coords[coords.length - 1] : null);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. TOP KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const IconComp = kpi.icon;
          return (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
              whileHover={{ y: -3 }}
              className="relative overflow-hidden bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300 flex flex-col justify-between group"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${kpi.gradient} rounded-full blur-2xl pointer-events-none`} />

              <div className="flex items-center justify-between relative z-10">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className={`w-10 h-10 rounded-2xl ${kpi.bgLight} border ${kpi.borderLight} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                  <IconComp size={19} style={{ color: kpi.accent }} />
                </div>
              </div>

              <div className="mt-4 relative z-10">
                <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                  {kpi.value}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${kpi.bgLight} ${kpi.textColor} border ${kpi.borderLight}`}>
                    <TrendingUp size={12} />
                    {kpi.change}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {kpi.subtitle}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 2. REVENUE CHART & BOOKING STATS (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left: Premium Spline Area Chart with Filter Controls */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
          
          {/* Header & Filter Controls */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    {t('admin.revenueAnalytics', 'Revenue Velocity')}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60 shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    +18.4% YoY
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{t('admin.revenueAnalyticsSubtitle', 'Interactive ticketing telemetry & sales volume')}</p>
              </div>

              {/* Timeframe Filter Switcher & Chart Mode */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Timeframe Pills */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => {
                      setTimeFilter('days');
                      setShowCustomPicker(false);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      timeFilter === 'days'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {t('admin.filterDays', 'Days')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimeFilter('week');
                      setShowCustomPicker(false);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      timeFilter === 'week'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {t('admin.filterWeek', 'Week')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimeFilter('month');
                      setShowCustomPicker(false);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      timeFilter === 'month'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {t('admin.filterMonth', 'Month')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimeFilter('custom');
                      setShowCustomPicker(!showCustomPicker);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      timeFilter === 'custom'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Calendar size={12} />
                    <span>{t('admin.filterCustomDate', 'Date to Date')}</span>
                  </button>
                </div>

                {/* View Mode Toggle (Spline vs Bar) */}
                <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setChartMode('spline')}
                    title="Spline Area Wave"
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      chartMode === 'spline' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    📈
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('bar')}
                    title="Columns"
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      chartMode === 'bar' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    📊
                  </button>
                </div>

              </div>
            </div>

            {/* Custom Date-to-Date Filter Drawer */}
            <AnimatePresence>
              {(timeFilter === 'custom' || showCustomPicker) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="p-3.5 bg-gradient-to-r from-sky-50/90 via-indigo-50/70 to-slate-50 rounded-2xl border border-sky-200/80 shadow-xs flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">{t('admin.fromDate', 'From')}:</span>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-sky-500 shadow-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">{t('admin.toDate', 'To')}:</span>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-sky-500 shadow-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCustom({ start: customStart, end: customEnd });
                          setTimeFilter('custom');
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-sm transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Check size={13} />
                        <span>{t('admin.applyFilter', 'Apply Range')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomStart(fourteenDaysAgoStr);
                          setCustomEnd(todayStr);
                          setAppliedCustom(null);
                          setTimeFilter('month');
                          setShowCustomPicker(false);
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-white/80 transition-colors cursor-pointer"
                      >
                        {t('admin.resetFilter', 'Reset')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Metric Summary Strip */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50 rounded-2xl border border-slate-100 text-center mb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('admin.periodRevenue', 'Period Total')}
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-slate-900">
                  {formatCurrency(periodTotalRevenue)}
                </span>
              </div>
              <div className="border-x border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('admin.periodAverage', 'Avg / Point')}
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-sky-700">
                  {formatCurrency(periodAvg)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('admin.totalBookings', 'Tickets Issued')}
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-emerald-600">
                  {chartDataset.reduce((sum, d) => sum + d.tickets, 0)} {t('admin.tickets', 'tickets')}
                </span>
              </div>
            </div>
          </div>

          {/* World-Class Professional Chart Canvas */}
          <div className="relative pt-2 pb-2 w-full overflow-hidden select-none">
            
            {/* Active Floating Tooltip Pill */}
            {activeHover && (
              <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-900/90 backdrop-blur-md text-white rounded-xl border border-slate-800 shadow-xl transition-all">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                  <span className="text-xs font-bold text-sky-300 font-mono">{activeHover.label} ({activeHover.subLabel})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-black text-white">{formatCurrency(activeHover.amount)}</span>
                  <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                    {activeHover.tickets} tickets · {formatCurrency(activeHover.settled)} settled
                  </span>
                </div>
              </div>
            )}

            {/* SVG Spline / Column View */}
            <div className="relative w-full h-52">
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Glowing Area Fill Gradient */}
                  <linearGradient id="areaGlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284C7" stopOpacity="0.35" />
                    <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Neon Line Gradient */}
                  <linearGradient id="neonLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0284C7" />
                    <stop offset="50%" stopColor="#0EA5E9" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>

                  {/* Filter glow */}
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0284C7" floodOpacity="0.35" />
                  </filter>
                </defs>

                {/* Horizontal Cartesian Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const yPos = paddingY + (1 - ratio) * (svgHeight - paddingY * 2);
                  const val = Math.round(maxVal * ratio);
                  return (
                    <g key={ratio}>
                      <line
                        x1={paddingX}
                        y1={yPos}
                        x2={svgWidth - paddingX}
                        y2={yPos}
                        stroke="#E2E8F0"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={paddingX - 8}
                        y={yPos + 3}
                        textAnchor="end"
                        className="text-[9px] font-mono fill-slate-400 font-bold"
                      >
                        ₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                      </text>
                    </g>
                  );
                })}

                {/* 1. Spline Mode */}
                {chartMode === 'spline' && (
                  <>
                    {/* Area Glow Fill */}
                    <path
                      d={areaPath}
                      fill="url(#areaGlowGradient)"
                      className="transition-all duration-500"
                    />

                    {/* Smooth Spline Neon Curve Line */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke="url(#neonLineGradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#neonGlow)"
                      className="transition-all duration-500"
                    />

                    {/* Interactive Curve Data Beacons */}
                    {coords.map((pt, i) => {
                      const isHovered = hoveredPoint?.index === i;
                      return (
                        <g 
                          key={i} 
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          {/* Invisible hover hotspot */}
                          <circle cx={pt.x} cy={pt.y} r={18} fill="transparent" />

                          {/* Outer Pulsing Beacon */}
                          {isHovered && (
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={10}
                              fill="#0284C7"
                              fillOpacity="0.25"
                              className="animate-ping"
                            />
                          )}

                          {/* Inner glowing dot */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 6 : 4}
                            fill="#FFFFFF"
                            stroke="#0284C7"
                            strokeWidth={isHovered ? 3 : 2}
                            className="transition-all duration-200 shadow-sm"
                          />
                        </g>
                      );
                    })}
                  </>
                )}

                {/* 2. Modern Column Mode */}
                {chartMode === 'bar' && (
                  coords.map((pt, i) => {
                    const isHovered = hoveredPoint?.index === i;
                    const colWidth = Math.min((svgWidth - paddingX * 2) / coords.length * 0.5, 36);
                    const colHeight = svgHeight - paddingY - pt.y;
                    return (
                      <g 
                        key={i} 
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        <rect
                          x={pt.x - colWidth / 2}
                          y={pt.y}
                          width={colWidth}
                          height={Math.max(colHeight, 4)}
                          rx="6"
                          fill={isHovered ? 'url(#neonLineGradient)' : '#38BDF8'}
                          fillOpacity={isHovered ? 1 : 0.75}
                          className="transition-all duration-200"
                        />
                      </g>
                    );
                  })
                )}
              </svg>
            </div>

            {/* X-Axis Labels */}
            <div className="flex items-center justify-between px-6 pt-1 text-slate-500 font-bold text-[11px]">
              {chartDataset.map((d, i) => (
                <span 
                  key={i} 
                  className={`transition-colors cursor-pointer ${
                    hoveredPoint?.index === i ? 'text-sky-700 font-black scale-105' : 'text-slate-500'
                  }`}
                  onMouseEnter={() => setHoveredPoint({ ...d, index: i })}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>

          {/* Footer Telemetry Legend */}
          <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600 ring-2 ring-sky-200" />
                <span>{t('admin.ticketSalesInr', 'Ticket Sales (₹)')}</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                <span>{t('admin.razorpaySettled', 'Razorpay Settled')}</span>
              </span>
            </div>
            <span className="font-mono text-slate-400 font-semibold">
              {timeFilter === 'custom' && appliedCustom 
                ? `${appliedCustom.start} → ${appliedCustom.end}` 
                : t('admin.allFiguresInr', 'All figures in INR')}
            </span>
          </div>
        </div>

        {/* Right: Booking Statistics & Seating Fill (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">


          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">{t('admin.bookingStatistics', 'Booking Statistics')}</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('admin.liveStatus', 'Live Status')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{t('admin.attendeeRegistrationsDesc', 'Attendee registrations and capacity')}</p>
          </div>

          {/* Occupancy card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/40 border border-slate-200/70 text-center space-y-2">
            <div className="flex items-center justify-center gap-1 text-3xl font-black font-mono text-slate-900">
              <span>{stats.utilization_rate || 0}%</span>
            </div>
            <p className="text-xs font-bold text-slate-600">{t('admin.totalSeatingOccupancy', 'Total Seating Occupancy')}</p>
            <div className="w-full bg-slate-200/90 rounded-full h-2.5 overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(stats.utilization_rate || 0, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full rounded-full"
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-1 font-mono font-medium">
              <span>{stats.total_tickets_sold || 0} {t('admin.booked', 'Booked')}</span>
              <span>{stats.total_capacity || 0} {t('admin.maxCapacity', 'Max Capacity')}</span>
            </div>
          </div>

          {/* Quick breakdown list */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">{t('admin.platformEvents', 'Platform Events')}</span>
              <span className="font-bold text-slate-900 font-mono">{stats.total_events || 0}</span>
            </div>
            <div 
              onClick={() => onNavigateView('users')}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-sky-50/70 hover:border-sky-200/60 transition-all cursor-pointer group"
              title="Manage Platform Users"
            >
              <span className="font-medium text-slate-600 group-hover:text-sky-700">{t('admin.registeredUsers', 'Registered Users')}</span>
              <span className="font-bold font-mono text-slate-900 group-hover:text-sky-700 flex items-center gap-1">
                {stats.total_users || 0}
                <ChevronRight size={14} className="text-slate-400 group-hover:text-sky-600" />
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600 font-medium">{t('admin.confirmedReservations', 'Confirmed Reservations')}</span>
              <span className="font-bold text-emerald-600 font-mono">{stats.total_tickets_sold || 0}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateView('analytics')}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{t('admin.exploreAnalytics', 'Explore Deep Analytics')}</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>

      {/* 3. UPCOMING EVENTS SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('admin.upcomingEvents', 'Upcoming Events')}</h2>
            <p className="text-xs text-slate-500">{t('admin.upcomingEventsDesc', 'Live experiences currently taking registrations')}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateView('events')}
            className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
          >
            <span>{t('admin.viewAll', 'View All')} ({events.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-50 text-slate-400" />
            <p className="text-xs font-medium">{t('admin.noUpcomingEvents', 'No upcoming events scheduled')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcomingEvents.map((rawEvent) => {
              const event = translateEvent(rawEvent);
              return (
                <div
                  key={event.id || event.slug}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-sky-300 hover:shadow-md hover:shadow-sky-500/5 transition-all duration-200 group flex flex-col justify-between bg-white"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={event.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600'}
                      alt={event.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform duration-300 border border-slate-100 shadow-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          event.status === 'PUBLISHED' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {event.status}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-0.5">
                          <MapPin size={10} className="text-slate-400 shrink-0" />
                          {translateCity(event.city)}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1 mt-1 group-hover:text-sky-700 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock size={11} className="text-slate-400 shrink-0" />
                        {formatDate(event.start_time)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">{t('admin.bookings', 'Bookings')}</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {event.booked_count || 0} / {event.capacity} {t('admin.seats', 'seats')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectEvent(rawEvent)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="View event details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditEvent(rawEvent)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                        title="Edit event"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. RECENT BOOKINGS TABLE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('admin.recentBookings', 'Recent Bookings')}</h2>
            <p className="text-xs text-slate-500">{t('admin.recentBookingsDesc', 'Latest tickets purchased and reservations created')}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateView('bookings')}
            className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
          >
            <span>{t('admin.viewAll', 'View All')} ({bookings.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/70">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">{t('admin.colBookingId', 'Booking ID')}</th>
                <th className="py-3 px-4">{t('admin.colAttendee', 'Attendee')}</th>
                <th className="py-3 px-4">{t('admin.colEvent', 'Event')}</th>
                <th className="py-3 px-4">{t('admin.colDate', 'Date')}</th>
                <th className="py-3 px-4">{t('admin.colAmount', 'Amount')}</th>
                <th className="py-3 px-4">{t('admin.colPayment', 'Payment')}</th>
                <th className="py-3 px-4">{t('admin.colStatus', 'Status')}</th>
                <th className="py-3 px-4 text-right">{t('admin.colAction', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {t('admin.noRecentBookings', 'No recent bookings recorded yet')}
                  </td>
                </tr>
              ) : (
                recentBookings.map((b) => (
                  <tr key={b.id || b.booking_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-[11px]">
                        {b.booking_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs">
                          {b.attendee_name ? b.attendee_name[0].toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{b.attendee_name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{b.attendee_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 line-clamp-1 max-w-[200px]" title={b.event_title}>
                      {b.event_title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {formatDate(b.booked_at)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {b.total_price === 0 ? t('admin.free', 'FREE') : formatCurrency(b.total_price)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/60">
                        {b.total_price === 0 ? t('admin.freeRsvp', 'Free RSVP') : 'Razorpay'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : b.status === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${
                          b.status === 'CONFIRMED' ? 'bg-emerald-500' : b.status === 'CANCELLED' ? 'bg-rose-500' : 'bg-amber-500'
                        }`} />
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onViewBooking(b)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                      >
                        {t('admin.details', 'Details')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}


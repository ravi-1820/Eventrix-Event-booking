import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, TrendingUp, DollarSign, Ticket, Calendar, 
  MapPin, PieChart, Users, ArrowUpRight, Check, Sparkles,
  Layers, ShieldCheck, Activity
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { useLanguage } from '../../../context/LanguageContext';

export function AdminAnalyticsView({ dashData }) {
  const { t, translateCity, translateCategory } = useLanguage();
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
  const [chartMode, setChartMode] = useState('spline'); // 'spline' | 'bar'

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

  // Safe array references
  const safeEvents = Array.isArray(events) ? events : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  // Group events by city
  const cityDistribution = useMemo(() => {
    const counts = {};
    safeEvents.forEach(e => {
      if (!e) return;
      const city = e.city || 'Other';
      counts[city] = (counts[city] || 0) + 1;
    });
    return Object.entries(counts).map(([city, count]) => ({ city, count }));
  }, [safeEvents]);

  // Group events by category
  const categoryDistribution = useMemo(() => {
    const counts = {};
    safeEvents.forEach(e => {
      if (!e) return;
      const cat = e.category_details?.name || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([cat, count]) => ({ cat, count }));
  }, [safeEvents]);

  // Payment statuses
  const paymentStatuses = useMemo(() => {
    const counts = { SUCCEEDED: 0, PENDING: 0, REFUNDED: 0, FAILED: 0 };
    safePayments.forEach(p => {
      if (p && counts[p.status] !== undefined) counts[p.status]++;
    });
    return counts;
  }, [safePayments]);

  // ----------------------------------------------------
  // Dynamic Chart Dataset: Real Time-Series Aggregation from Bookings & Payments
  // ----------------------------------------------------
  const chartDataset = useMemo(() => {
    const validBookings = safeBookings.filter(b => b && b.status !== 'CANCELLED');
    const validPayments = safePayments.filter(p => p && p.status === 'SUCCEEDED');

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
          const bDate = new Date(b.booked_at || b.created_at);
          return bDate >= d && bDate < nextD;
        });

        const dayPayments = validPayments.filter(p => {
          const pDate = new Date(p.created_at || p.payment_date);
          return pDate >= d && pDate < nextD;
        });

        const dayAmount = dayBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
        const dayTickets = dayBookings.reduce((sum, b) => sum + Number(b.quantity || 1), 0);
        const daySettled = dayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

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
          const bDate = new Date(b.booked_at || b.created_at);
          return bDate >= start && bDate <= end;
        });
        const wPayments = validPayments.filter(p => {
          const pDate = new Date(p.created_at || p.payment_date);
          return pDate >= start && pDate <= end;
        });

        const wAmount = wBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
        const wTickets = wBookings.reduce((sum, b) => sum + Number(b.quantity || 1), 0);
        const wSettled = wPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

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
      const start = new Date(appliedCustom.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(appliedCustom.end);
      end.setHours(23, 59, 59, 999);

      const diffTime = Math.max(end - start, 86400000);
      const diffDays = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);
      const segments = Math.min(Math.max(diffDays, 2), 8);
      const points = [];

      for (let i = 0; i < segments; i++) {
        const segStart = new Date(start.getTime() + (diffTime / segments) * i);
        const segEnd = new Date(start.getTime() + (diffTime / segments) * (i + 1));

        const segBookings = validBookings.filter(b => {
          const bDate = new Date(b.booked_at || b.created_at);
          return bDate >= segStart && bDate <= segEnd;
        });
        const segPayments = validPayments.filter(p => {
          const pDate = new Date(p.created_at || p.payment_date);
          return pDate >= segStart && pDate <= segEnd;
        });

        const segAmount = segBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
        const segTickets = segBookings.reduce((sum, b) => sum + Number(b.quantity || 1), 0);
        const segSettled = segPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

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
        const bDate = new Date(b.booked_at || b.created_at);
        return bDate >= mStart && bDate <= mEnd;
      });
      const mPayments = validPayments.filter(p => {
        const pDate = new Date(p.created_at || p.payment_date);
        return pDate >= mStart && pDate <= mEnd;
      });

      const mAmount = mBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
      const mTickets = mBookings.reduce((sum, b) => sum + Number(b.quantity || 1), 0);
      const mSettled = mPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      months.push({
        label: t(monthKeyNames[monthIdx], defaultMonthNames[monthIdx]),
        subLabel: `${year}`,
        amount: mAmount,
        tickets: mTickets,
        settled: mSettled > 0 ? mSettled : mAmount,
      });
    }
    return months;
  }, [timeFilter, appliedCustom, bookings, payments, t]);

  const periodTotalRevenue = useMemo(() => {
    return chartDataset.reduce((sum, d) => sum + d.amount, 0);
  }, [chartDataset]);

  const periodAvg = useMemo(() => {
    return chartDataset.length > 0 ? Math.round(periodTotalRevenue / chartDataset.length) : 0;
  }, [periodTotalRevenue, chartDataset]);

  // Helper for generating smooth cubic Bézier SVG path
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingX = 45;
  const paddingY = 25;

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

  const activeHover = hoveredPoint || (coords.length > 0 ? coords[coords.length - 1] : null);

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {t('admin.analytics.title', 'Platform Performance Analytics')}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/70 uppercase tracking-wider">
              {t('admin.suiteBadge', 'Eventrix Suite')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {t('admin.analytics.subtitle', 'Real-time trends for gross revenues, ticket volume, and attendee demographics')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-2xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80 font-mono shadow-xs">
            {t('admin.analytics.currency', 'Currency: INR (₹)')}
          </span>
        </div>
      </div>

      {/* Main Spline Velocity Chart Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
        
        {/* Header & Filter Controls */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {t('admin.analytics.revenueVelocity', 'Revenue Velocity & Ticketing Flow')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60 shadow-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {t('admin.analytics.grossRevenueSub', 'Gross revenue volume settled via Razorpay and RSVP passes')}
              </p>
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
          <div className="grid grid-cols-3 gap-2 p-3.5 bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50 rounded-2xl border border-slate-100 text-center mb-4">
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
            <div className="flex items-center justify-between px-3.5 py-2 mb-2 bg-slate-900/90 backdrop-blur-md text-white rounded-xl border border-slate-800 shadow-xl transition-all">
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
          <div className="relative w-full h-60">
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Glowing Area Fill Gradient */}
                <linearGradient id="analyticsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284C7" stopOpacity="0.38" />
                  <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>

                {/* Neon Line Gradient */}
                <linearGradient id="analyticsLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0284C7" />
                  <stop offset="50%" stopColor="#0EA5E9" />
                  <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>

                {/* Filter glow */}
                <filter id="analyticsNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
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
                    fill="url(#analyticsAreaGradient)"
                    className="transition-all duration-500"
                  />

                  {/* Smooth Spline Neon Curve Line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke="url(#analyticsLineGradient)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#analyticsNeonGlow)"
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
                        <circle cx={pt.x} cy={pt.y} r={20} fill="transparent" />

                        {/* Outer Pulsing Beacon */}
                        {isHovered && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={11}
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
                  const colWidth = Math.min((svgWidth - paddingX * 2) / coords.length * 0.5, 40);
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
                        fill={isHovered ? 'url(#analyticsLineGradient)' : '#38BDF8'}
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

      {/* Grid: Seat Utilization, Events by City, Events by Category, Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Capacity & Seating Fill Rate (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">{t('admin.analytics.occupancyUtilization', 'Occupancy & Seat Utilization')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('admin.analytics.bookedCapacitySub', 'Booked capacity versus venue allocations')}</p>
            </div>
            <span className="text-base font-black font-mono text-sky-700">
              {stats.utilization_rate || 0}% {t('admin.analytics.fillRate', 'Fill Rate')}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/40 border border-slate-200/70 space-y-3">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>{t('admin.analytics.overallUtilization', 'Overall Utilization:')}</span>
              <span className="font-mono">{stats.total_tickets_sold || 0} / {stats.total_capacity || 0} {t('admin.analytics.seats', 'Seats')}</span>
            </div>
            <div className="w-full bg-slate-200/90 rounded-full h-3 overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(stats.utilization_rate || 0, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full rounded-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">{t('admin.analytics.totalIssued', 'Total Issued')}</span>
              <p className="text-xl font-black font-mono text-sky-900 mt-0.5">{stats.total_tickets_sold || 0}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">{t('admin.analytics.settledTransactions', 'Settled Transactions')}</span>
              <p className="text-xl font-black font-mono text-emerald-900 mt-0.5">{payments.length}</p>
            </div>
          </div>
        </div>

        {/* Payment Gateway Distribution (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
          <div className="flex items-center gap-2">
            <PieChart size={18} className="text-purple-600" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">{t('admin.analytics.paymentBreakdown', 'Payment Breakdown')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('admin.analytics.paymentBreakdownDesc', 'Settlement telemetry by transaction state')}</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-900 font-semibold">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {t('admin.analytics.succeededBreakdown', 'Succeeded (Paid & Verified)')}
              </span>
              <span className="font-mono font-bold text-emerald-800 text-sm">{paymentStatuses.SUCCEEDED}</span>
            </div>
            <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-900 font-semibold">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {t('admin.analytics.pendingConfirmation', 'Pending Confirmation')}
              </span>
              <span className="font-mono font-bold text-amber-800 text-sm">{paymentStatuses.PENDING}</span>
            </div>
            <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-purple-50 border border-purple-200/60 text-purple-900 font-semibold">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                {t('admin.analytics.refundedTransactions', 'Refunded Transactions')}
              </span>
              <span className="font-mono font-bold text-purple-800 text-sm">{paymentStatuses.REFUNDED}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Grid 2: Demographics (Events by City & Categories) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Events by City */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-sky-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">{t('admin.analytics.eventsByCity', 'Events by City')}</h2>
          </div>
          <div className="space-y-2 pt-1">
            {cityDistribution.length === 0 ? (
              <p className="text-xs text-slate-400">{t('admin.analytics.noCityData', 'No city data available')}</p>
            ) : (
              cityDistribution.map(({ city, count }) => (
                <div key={city} className="flex items-center justify-between text-xs p-2.5 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-colors">
                  <span className="text-slate-700 font-semibold">{translateCity(city)}</span>
                  <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-xl border border-sky-200/60">
                    {count} {t('admin.analytics.eventsUnit', 'events')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Events by Category */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-indigo-600" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">{t('admin.analytics.eventsByCategory', 'Events by Category')}</h2>
          </div>
          <div className="space-y-2 pt-1">
            {categoryDistribution.length === 0 ? (
              <p className="text-xs text-slate-400">{t('admin.analytics.noCategories', 'No categories assigned')}</p>
            ) : (
              categoryDistribution.map(({ cat, count }) => (
                <div key={cat} className="flex items-center justify-between text-xs p-2.5 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-colors">
                  <span className="text-slate-700 font-semibold">{translateCategory(cat)}</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-xl border border-indigo-200/60">
                    {count} {t('admin.analytics.eventsUnit', 'events')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}


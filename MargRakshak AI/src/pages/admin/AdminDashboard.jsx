import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import RiskBadge from '../../components/common/RiskBadge';
import Button from '../../components/common/Button';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  MapPin, 
  Activity, 
  Bell, 
  Calendar, 
  ArrowUpRight, 
  Layers, 
  ChevronRight,
  Shield,
  FileText,
  Clock,
  Car,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getAccidents, getHotspots } from '../../services/api';
import { getFallbackHotspots } from '../../data/hotspots';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedYearRange, setSelectedYearRange] = useState('2022 - 2025');
  const [activeTrendTab, setActiveTrendTab] = useState('Yearly');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Live Backend Stats State
  const [stats, setStats] = useState({
    totalAccidents: null,
    totalFatalities: null,
    highRiskHotspots: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Fetch real statistics from backend
  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('margrakshak_token') : null;
      if (!token) {
        throw new Error('Not authenticated: No active token found in localStorage. Please log out and log back in as admin.');
      }

      const [accidentsRes, hotspotsRes] = await Promise.all([
        getAccidents({ limit: 100 }),
        getHotspots({ limit: 100 }),
      ]);

      // 1. Total Accidents: from response 'total' or items count
      const totalAccidents = typeof accidentsRes?.total === 'number'
        ? accidentsRes.total
        : (Array.isArray(accidentsRes?.items) ? accidentsRes.items.length : (Array.isArray(accidentsRes) ? accidentsRes.length : 0));

      // 2. Total Fatalities: sum of fatalities field across accident items
      const accidentItems = Array.isArray(accidentsRes?.items)
        ? accidentsRes.items
        : (Array.isArray(accidentsRes) ? accidentsRes : []);
      const totalFatalities = accidentItems.reduce((sum, item) => sum + (Number(item.fatalities) || 0), 0);

      // 3. High-Risk Hotspot Count: hotspots with risk level HIGH or CRITICAL
      const hotspotItems = Array.isArray(hotspotsRes?.items)
        ? hotspotsRes.items
        : (Array.isArray(hotspotsRes) ? hotspotsRes : []);
      const highRiskHotspots = hotspotItems.filter((spot) => {
        const level = (spot.risk_level || spot.riskLevel || '').toUpperCase();
        return level === 'HIGH' || level === 'CRITICAL';
      }).length;

      setStats({
        totalAccidents,
        totalFatalities,
        highRiskHotspots,
      });
    } catch (err) {
      console.warn('Backend unreachable in AdminDashboard, using unified blackspots dataset for stats:', err);
      const fallbackList = getFallbackHotspots();
      const totalAccidents = fallbackList.reduce((sum, h) => sum + (h.accidentCount || 0), 0);
      const totalFatalities = fallbackList.reduce((sum, h) => sum + (h.fatalities || 0), 0);
      const highRiskHotspots = fallbackList.filter(h => h.riskLevel === 'HIGH' || h.riskLevel === 'CRITICAL').length;
      setStats({
        totalAccidents,
        totalFatalities,
        highRiskHotspots,
      });
      setFetchError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Format dynamic stat values or fallback indicators
  const getDisplayValue = (dynamicKey) => {
    if (isLoading) {
      return '...';
    }
    if (fetchError) {
      return '—';
    }
    const val = stats[dynamicKey];
    return val != null ? val.toLocaleString() : '—';
  };

  // 5 KPI Cards Data: dynamic values for accidents, fatalities, and hotspots; static for accuracy & alerts
  const kpis = [
    {
      id: 'accidents',
      title: t('admin.dashboard.kpiTotalAccidents'),
      value: getDisplayValue('totalAccidents'),
      isDynamic: true,
      period: t('admin.dashboard.kpiPeriodAccidents'),
      change: '+4.2%',
      trend: 'up',
      icon: Car,
      color: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-100 dark:border-red-900/40',
    },
    {
      id: 'fatalities',
      title: t('admin.dashboard.kpiTotalFatalities'),
      value: getDisplayValue('totalFatalities'),
      isDynamic: true,
      period: t('admin.dashboard.kpiPeriodFatalities'),
      change: '-1.8%',
      trend: 'down',
      icon: ShieldAlert,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border-orange-100 dark:border-orange-900/40',
    },
    {
      id: 'hotspots',
      title: t('admin.dashboard.kpiHighRiskHotspots'),
      value: getDisplayValue('highRiskHotspots'),
      isDynamic: true,
      period: t('admin.dashboard.kpiPeriodHotspots'),
      change: t('admin.dashboard.kpiChangeCritical'),
      trend: 'neutral',
      icon: MapPin,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-100 dark:border-amber-900/40',
    },
    {
      id: 'accuracy',
      title: t('admin.dashboard.kpiPredictionAccuracy'),
      value: '92.6%',
      isDynamic: false,
      period: t('admin.dashboard.kpiPeriodAccuracy'),
      change: t('admin.dashboard.kpiChangeBoost'),
      trend: 'up',
      icon: Activity,
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40',
    },
    {
      id: 'alerts',
      title: t('admin.dashboard.kpiActiveAlerts'),
      value: '12',
      isDynamic: false,
      period: t('admin.dashboard.kpiPeriodAlerts'),
      change: t('admin.dashboard.kpiChangeLive'),
      trend: 'neutral',
      icon: Bell,
      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    },
  ];

  // Accident Trend chart points
  const trendData = [
    { year: '2022', count: 521, x: 50, y: 155 },
    { year: '2023', count: 612, x: 190, y: 122 },
    { year: '2024', count: 689, x: 330, y: 94 },
    { year: '2025', count: 636, x: 470, y: 113 },
  ];

  const trendTabs = [
    { id: 'Yearly', label: t('admin.dashboard.tabYearly') },
    { id: 'Quarterly', label: t('admin.dashboard.tabQuarterly') },
    { id: 'Monthly', label: t('admin.dashboard.tabMonthly') },
  ];

  const recentAlerts = [
    {
      id: 1,
      title: 'High risk zone ahead on Mumbai Agra Highway',
      subtext: 'Distance: 600 m • Severity: High',
      time: '2 mins ago',
      level: 'CRITICAL',
    },
    {
      id: 2,
      title: 'Accident reported near CBS Circle',
      subtext: 'Distance: 1.8 km • Heavy congestion',
      time: '15 mins ago',
      level: 'HIGH',
    },
    {
      id: 3,
      title: 'Traffic congestion detected near Panchavati',
      subtext: 'Distance: 3.2 km • Slow movement',
      time: '32 mins ago',
      level: 'MEDIUM',
    },
    {
      id: 4,
      title: 'Road condition alert on College Road',
      subtext: 'Distance: 2.1 km • Monsoon surface risk',
      time: '1 hour ago',
      level: 'LOW',
    },
    {
      id: 5,
      title: 'Accident logs synchronized for Dwarka Naka',
      subtext: 'System Update • 18 records verified',
      time: '2 hours ago',
      level: 'INFO',
    },
  ];

  // Dynamic welcome message with logged-in user's name or generic fallback
  const userName = user?.full_name?.trim();
  const welcomeMessage = userName
    ? t('admin.dashboard.welcomeBack', { name: userName }).replace('{name}', userName)
    : (t('admin.dashboard.welcomeBackGeneric') || t('admin.dashboard.welcomeBack').replace(', {name}', '').replace('{name}', '').trim());

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Header with Welcome & Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {welcomeMessage}
            </h1>
            <Badge variant="success" dot pulse size="sm">
              {t('admin.dashboard.liveFeed')}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('admin.dashboard.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedYearRange}
              onChange={(e) => setSelectedYearRange(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 text-xs sm:text-sm font-semibold rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151821] text-gray-900 dark:text-white shadow-subtle hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition cursor-pointer"
            >
              <option value="2022 - 2025">2022 - 2025 ({t('admin.dashboard.historical')})</option>
              <option value="2025 - 2026">2025 - 2026 ({t('admin.dashboard.liveProject')})</option>
              <option value="YTD 2026">YTD 2026</option>
            </select>
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <Button
            variant="primary"
            size="sm"
            pill
            icon={ArrowUpRight}
            iconPosition="right"
            onClick={() => navigate('/admin/map')}
          >
            {t('admin.dashboard.openMap')}
          </Button>
        </div>
      </div>

      {/* Loading Banner */}
      {isLoading && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Synchronizing live accident statistics and hotspot metrics from database...</span>
        </div>
      )}

      {/* Backend Fetch Error Banner */}
      {fetchError && (
        <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 text-red-800 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900 dark:text-red-100">
                Failed to load live backend statistics
              </h4>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5 font-mono">
                {fetchError}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {fetchError.toLowerCase().includes('authenticated') && (
              <Button
                variant="primary"
                size="xs"
                pill
                onClick={() => navigate('/login', { state: { role: 'admin' } })}
              >
                Log In Again
              </Button>
            )}
            <Button
              variant="secondary"
              size="xs"
              pill
              icon={RefreshCw}
              onClick={fetchDashboardStats}
            >
              Retry Connection
            </Button>
          </div>
        </div>
      )}

      {/* 5 KPI Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.id} padding="p-5" hover className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl border ${kpi.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {kpi.trend === 'up' && (
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-0.5">
                      <TrendingUp className="w-3.5 h-3.5" /> {kpi.change}
                    </span>
                  )}
                  {kpi.trend === 'down' && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <TrendingDown className="w-3.5 h-3.5" /> {kpi.change}
                    </span>
                  )}
                  {kpi.trend === 'neutral' && (
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      {kpi.change}
                    </span>
                  )}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center min-h-[36px]">
                  {isLoading && kpi.isDynamic ? (
                    <span className="inline-flex items-center gap-2 text-gray-400 dark:text-gray-500 text-lg font-mono">
                      <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                      <span className="text-sm">Loading...</span>
                    </span>
                  ) : fetchError && kpi.isDynamic ? (
                    <span className="text-red-500 dark:text-red-400 font-mono text-xl" title={fetchError}>
                      —
                    </span>
                  ) : (
                    kpi.value
                  )}
                </div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                  {kpi.title}
                </div>
              </div>
              <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800/80 pt-2.5 mt-3">
                {kpi.period}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Grid: Charts & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Accidents Trend Area Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>{t('admin.dashboard.accidentsTrend')}</span>
                  <span className="text-xs text-gray-400 font-normal">({selectedYearRange})</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('admin.dashboard.trendSubtitle')}
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-[#151821] rounded-full border border-gray-200/80 dark:border-gray-800">
                {trendTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTrendTab(tab.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeTrendTab === tab.id
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive SVG Trend Chart */}
            <div className="relative border border-gray-100 dark:border-gray-800/80 rounded-2xl p-4 bg-gray-50/60 dark:bg-[#151821]/40 overflow-hidden">
              <svg viewBox="0 0 520 220" className="w-full h-56 overflow-visible">
                <defs>
                  <linearGradient id="uberTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[20, 60, 100, 140, 180].map((y) => (
                  <line
                    key={y}
                    x1="30"
                    y1={y}
                    x2="500"
                    y2={y}
                    stroke="currentColor"
                    className="text-gray-200 dark:text-gray-800"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                ))}

                {/* Y-Axis labels */}
                <text x="20" y="24" className="text-[10px] fill-gray-400 font-mono text-right">1000</text>
                <text x="20" y="64" className="text-[10px] fill-gray-400 font-mono text-right">750</text>
                <text x="20" y="104" className="text-[10px] fill-gray-400 font-mono text-right">500</text>
                <text x="20" y="144" className="text-[10px] fill-gray-400 font-mono text-right">250</text>
                <text x="20" y="184" className="text-[10px] fill-gray-400 font-mono text-right">0</text>

                {/* Area Gradient Fill */}
                <polygon
                  points="50,180 50,155 190,122 330,94 470,113 470,180"
                  fill="url(#uberTrendGradient)"
                />

                {/* Spline Line */}
                <polyline
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="50,155 190,122 330,94 470,113"
                />

                {/* Data Points */}
                {trendData.map((pt, idx) => {
                  const isHovered = hoveredPoint === idx;
                  return (
                    <g key={pt.year} className="cursor-pointer">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? '7' : '5'}
                        className="fill-white dark:fill-[#111319] stroke-emerald-600 transition-all duration-200"
                        strokeWidth="3"
                        onMouseEnter={() => setHoveredPoint(idx)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                      {/* Value callout */}
                      <text
                        x={pt.x}
                        y={pt.y - 12}
                        textAnchor="middle"
                        className="text-[11px] font-bold fill-gray-900 dark:fill-white font-mono"
                      >
                        {pt.count}
                      </text>
                      {/* Year label */}
                      <text
                        x={pt.x}
                        y="202"
                        textAnchor="middle"
                        className="text-xs font-semibold fill-gray-500 dark:fill-gray-400"
                      >
                        {pt.year}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  {t('admin.dashboard.chartFooter')}
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {t('admin.dashboard.chartPeak')}
                </span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="secondary"
                size="sm"
                pill
                icon={Layers}
                onClick={() => navigate('/admin/map')}
                className="w-full"
              >
                {t('admin.dashboard.inspectGis')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                pill
                icon={FileText}
                onClick={() => navigate('/admin/reports')}
                className="w-full"
              >
                {t('admin.dashboard.spatialReports')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                pill
                icon={Activity}
                onClick={() => navigate('/admin/analysis')}
                className="w-full"
              >
                {t('admin.dashboard.aiModelMetrics')}
              </Button>
            </div>
          </Card>

          {/* Bottom Card: Risk Zone Distribution Donut Chart */}
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                  {t('admin.dashboard.riskZoneDistribution')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('admin.dashboard.riskZoneSubtitle')}
                </p>
              </div>
              <Button variant="ghost" size="xs" onClick={() => navigate('/admin/hotspots')}>
                {t('admin.dashboard.viewHotspotDirectory')}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Donut Chart SVG */}
              <div className="md:col-span-5 flex justify-center">
                <div className="relative w-44 h-44">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {/* High Risk: 35% -> strokeDasharray 35 65 */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#EF4444"
                      strokeWidth="14"
                      strokeDasharray="35 65"
                      strokeDashoffset="0"
                      className="transition-all duration-300"
                    />
                    {/* Medium Risk: 42% -> strokeDasharray 42 58 */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#F59E0B"
                      strokeWidth="14"
                      strokeDasharray="42 58"
                      strokeDashoffset="-35"
                      className="transition-all duration-300"
                    />
                    {/* Low Risk: 23% -> strokeDasharray 23 77 */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#16A34A"
                      strokeWidth="14"
                      strokeDasharray="23 77"
                      strokeDashoffset="-77"
                      className="transition-all duration-300"
                    />
                  </svg>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">80</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('admin.dashboard.totalZones')}</span>
                  </div>
                </div>
              </div>

              {/* Breakdown Legend */}
              <div className="md:col-span-7 space-y-3">
                <div className="p-3 rounded-xl border border-red-100 dark:border-red-950/50 bg-red-50/50 dark:bg-red-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">{t('admin.dashboard.highRiskLabel')}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">Dwarka, Mumbai Agra Hwy</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-red-600 dark:text-red-400">28 (35%)</div>
                    <div className="text-[10px] text-gray-400">{t('admin.dashboard.critical')}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-amber-100 dark:border-amber-950/50 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">{t('admin.dashboard.mediumRiskLabel')}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">Panchavati, CBS Circle</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-amber-600 dark:text-amber-400">34 (42%)</div>
                    <div className="text-[10px] text-gray-400">{t('admin.dashboard.moderate')}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-950/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">{t('admin.dashboard.lowRiskLabel')}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">Gangapur Road, BYK Circle</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">18 (23%)</div>
                    <div className="text-[10px] text-gray-400">{t('admin.dashboard.stable')}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Recent Alerts Feed & System Notice */}
        <div className="space-y-6">
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-600" /> {t('admin.dashboard.recentAlerts')}
                </h3>
                <span className="text-[11px] text-gray-400">{t('admin.dashboard.recentAlertsSubtitle')}</span>
              </div>
              <Button variant="ghost" size="xs" onClick={() => navigate('/user/alerts')}>
                {t('admin.dashboard.viewAll')}
              </Button>
            </div>

            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => navigate('/admin/map')}
                  className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-[#151821]/70 hover:border-gray-300 dark:hover:border-gray-700 transition cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 transition leading-snug">
                      {alert.title}
                    </span>
                    <RiskBadge level={alert.level} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{alert.subtext}</span>
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {alert.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              pill
              className="w-full mt-4"
              onClick={() => navigate('/admin/hotspots')}
            >
              {t('admin.dashboard.reviewAllHotspots')}
            </Button>
          </Card>

          {/* Emergency SOS Banner (112) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white shadow-elevated">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-extrabold opacity-80">{t('admin.dashboard.trafficCommandDispatch')}</div>
                <div className="text-base font-black">{t('admin.dashboard.emergencySos')}</div>
              </div>
            </div>
            <p className="text-xs text-red-100 leading-relaxed mb-4">
              {t('admin.dashboard.emergencyDesc')}
            </p>
            <a
              href="tel:112"
              className="w-full inline-flex items-center justify-center py-2 px-4 rounded-full bg-white text-red-700 font-bold text-xs hover:bg-red-50 transition shadow-sm"
            >
              {t('admin.dashboard.dial112')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

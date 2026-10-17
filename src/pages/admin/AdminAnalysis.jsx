import React, { useState } from 'react';
import { mockModelPerformance, mockRiskFactors, mockClusteringMethods, mockTemporalTrends } from '../../data/analytics';
import NotificationToast from '../../components/common/NotificationToast';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { 
  Cpu, 
  RefreshCw, 
  BarChart2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Sliders,
  TrendingUp
} from 'lucide-react';

export default function AdminAnalysis() {
  const [selectedHour, setSelectedHour] = useState(18); // default to evening peak 18:00
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('info');
  const [isRetraining, setIsRetraining] = useState(false);

  // Key Factors Contributing to Accidents matching user mockup
  const keyFactors = [
    { label: 'High Traffic Density', percentage: 28, color: 'bg-red-500' },
    { label: 'Poor Road Condition', percentage: 24, color: 'bg-orange-500' },
    { label: 'Overspeeding', percentage: 21, color: 'bg-amber-500' },
    { label: 'Weather Condition (Monsoon)', percentage: 15, color: 'bg-emerald-500' },
    { label: 'Others (Blind Curves, Signs)', percentage: 12, color: 'bg-gray-400' },
  ];

  const handleRetrain = () => {
    setIsRetraining(true);
    setToastType('warning');
    setToastMessage("Initiating ML Pipeline Retraining... Connecting to Nashik geospatial model server...");
    
    // Simulate training progress
    setTimeout(() => {
      setIsRetraining(false);
      setToastType('success');
      setToastMessage("Model retraining complete! Metrics updated to XGBoost-v2.5 (Accuracy: 92.6%).");
    }, 2200);
  };

  const getIncidentsForHour = (hr) => {
    const record = mockTemporalTrends.find(item => item.hour === hr);
    return record ? record.incidents : 0;
  };

  // SVG Chart Dimensions
  const chartHeight = 160;
  const chartWidth = 500;
  const maxIncidents = Math.max(...mockTemporalTrends.map(t => t.incidents));

  // Compute SVG Points for the trends line
  const points = mockTemporalTrends.map((t, index) => {
    const x = (index / 24) * chartWidth + 10;
    const y = chartHeight - (t.incidents / maxIncidents) * (chartHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  const formatHourString = (hr) => {
    return `${hr.toString().padStart(2, '0')}:00`;
  };

  const currentIncidents = getIncidentsForHour(selectedHour);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <NotificationToast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setToastMessage(null)} 
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 dark:border-gray-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              AI Analytics & Spatio-Temporal Prediction
            </h1>
            <Badge variant="success" size="sm" dot>
              XGBoost Classifier
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Model hyper-parameters, 24-hour peak collision distributions & risk causal factors.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          pill
          loading={isRetraining}
          icon={RefreshCw}
          onClick={handleRetrain}
        >
          {isRetraining ? 'Retraining ML Pipeline...' : 'Retrain AI Predictor'}
        </Button>
      </div>

      {/* Top 4 KPI Cards matching user mockup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="p-5" hover>
          <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">
            Model Architecture
          </div>
          <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
            XGBoost Classifier
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Spatial HDBSCAN Embeddings
          </div>
        </Card>

        <Card padding="p-5" hover>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">
              Prediction Accuracy
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> 92.6%
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight">
            92.6%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Cross-validation on Nashik logs
          </div>
        </Card>

        <Card padding="p-5" hover>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">
              Precision Metric
            </span>
            <span className="text-xs font-semibold text-gray-400">Optimal</span>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white mt-1 tracking-tight">
            91.3%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Low false-positive warning rate
          </div>
        </Card>

        <Card padding="p-5" hover>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">
              Recall Sensitivity
            </span>
            <span className="text-xs font-semibold text-gray-400">High</span>
          </div>
          <div className="text-3xl font-black text-gray-900 dark:text-white mt-1 tracking-tight">
            93.1%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Hazard detection coverage
          </div>
        </Card>
      </div>

      {/* AI Insight Box matching user mockup */}
      <div className="p-4 rounded-2xl bg-black text-white dark:bg-white dark:text-black shadow-card flex items-center gap-3.5">
        <div className="p-2.5 rounded-xl bg-white/20 dark:bg-black/10 shrink-0">
          <Sparkles className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
        </div>
        <div className="flex-1 text-xs sm:text-sm">
          <span className="font-extrabold uppercase tracking-wider text-emerald-400 dark:text-emerald-600 mr-2">
            AI Predictive Insight:
          </span>
          <span className="font-medium opacity-90">
            Mumbai Agra Highway and CBS Circle have the highest probability of accident clustering during evening peak hours (17:00 – 19:30). Recommended dynamic traffic patrol.
          </span>
        </div>
      </div>

      {/* Main Grid: 24h Trend Chart & Contributing Factors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Spatio-Temporal 24-Hour Distribution */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-600" /> Hourly Accident Frequency
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Drag the slider below to inspect incident volumes throughout the 24-hour cycle.
                </p>
              </div>
              <Badge variant="neutral" size="sm">
                24-Hour Cycle
              </Badge>
            </div>

            {/* SVG Chart */}
            <div className="relative border border-gray-100 dark:border-gray-800/80 rounded-2xl p-4 bg-gray-50/50 dark:bg-[#151821]/40">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-44 overflow-visible"
              >
                {/* Horizontal grid lines */}
                <line x1="0" y1="10" x2={chartWidth} y2="10" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeDasharray="3" />
                <line x1="0" y1="80" x2={chartWidth} y2="80" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeDasharray="3" />
                <line x1="0" y1="150" x2={chartWidth} y2="150" stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="1.5" />
                
                {/* Graph line */}
                <polyline
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />

                {/* Highlight selected hour point */}
                {(() => {
                  const x = (selectedHour / 24) * chartWidth + 10;
                  const y = chartHeight - (currentIncidents / maxIncidents) * (chartHeight - 20) - 10;
                  return (
                    <g>
                      <circle cx={x} cy={y} r="6" className="fill-red-500 stroke-white dark:stroke-[#111319]" strokeWidth="2.5" />
                      <line x1={x} y1={y} x2={x} y2="150" stroke="#EF4444" strokeDasharray="3" strokeWidth="1.5" />
                    </g>
                  );
                })()}
              </svg>

              {/* X Axis Labels */}
              <div className="flex justify-between text-[10px] text-gray-400 font-semibold px-1 mt-1 font-mono">
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>23:59</span>
              </div>
            </div>

            {/* Time Slider Control */}
            <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-[#151821] border border-gray-100 dark:border-gray-800 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" /> Inspected Time: {formatHourString(selectedHour)}
                </span>
                <span className="text-red-600 dark:text-red-400 font-extrabold text-sm">
                  {currentIncidents} Incidents Recorded
                </span>
              </div>
              <div className="flex items-center space-x-3 pt-1">
                <span className="text-xs text-gray-400 font-mono">00:00</span>
                <input 
                  type="range" 
                  min="0" 
                  max="23" 
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                  className="flex-grow h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white"
                />
                <span className="text-xs text-gray-400 font-mono">23:59</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 italic text-center pt-1">
                Dwarka Circle and Mumbai Naka reach maximum density between 17:00 and 19:30 due to highway freight traffic.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Columns: Key Contributing Factors & Cluster Methods */}
        <div className="space-y-6">
          {/* Key Contributing Factors matching user mockup */}
          <Card padding="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-1">
              Key Contributing Factors
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Derived from GIS correlation analysis
            </p>

            <div className="space-y-3.5">
              {keyFactors.map((factor) => (
                <div key={factor.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-700 dark:text-gray-300">{factor.label}</span>
                    <span className="text-gray-900 dark:text-white font-bold">{factor.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`${factor.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${factor.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Clustering Algorithm Comparison */}
          <Card padding="p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-1">
              Clustering Algorithms
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Geospatial cluster engines evaluation
            </p>

            <div className="space-y-2.5">
              {mockClusteringMethods.map((method) => (
                <div 
                  key={method.name} 
                  className={`p-3 rounded-xl border transition-all ${
                    method.active 
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/50' 
                      : 'bg-gray-50 dark:bg-[#151821] border-gray-200/80 dark:border-gray-800 opacity-75'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{method.name}</span>
                    {method.active && (
                      <Badge variant="success" size="sm">
                        Active Engine
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                    {method.details}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

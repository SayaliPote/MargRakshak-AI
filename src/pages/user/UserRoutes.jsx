import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '../../components/MapView';
import { mockRoutes } from '../../data/routes';
import { mockHotspots } from '../../data/hotspots';
import RiskBadge from '../../components/common/RiskBadge';
import NotificationToast from '../../components/common/NotificationToast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { 
  Compass, 
  ShieldCheck, 
  ChevronRight, 
  Navigation, 
  Milestone,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingDown
} from 'lucide-react';

export default function UserRoutes() {
  const navigate = useNavigate();
  const [selectedRoute, setSelectedRoute] = useState(mockRoutes[0]); // Default to Route 1 (safest)
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const handleSelectRoute = (route) => {
    setSelectedRoute(route);
    setToastType('info');
    setToastMessage(`Switched map projection to: ${route.name}`);
  };

  const handleNavigateSafely = () => {
    setToastType('success');
    setToastMessage(`Pre-selecting ${selectedRoute.label}... Launching navigator.`);
    
    setTimeout(() => {
      // Redirect to UserNavigation page and pass the selected route's info
      navigate('/user/navigation', { state: { routeId: selectedRoute.id } });
    }, 1000);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <NotificationToast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setToastMessage(null)} 
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-uber-muted dark:text-uber-mutedDark">Route Analytics</span>
            <span className="text-gray-300 dark:text-uber-borderDark">•</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Risk Scored
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-uber-text dark:text-white tracking-tight">
            Route Comparison & Risk Matrix
          </h1>
          <p className="text-sm text-uber-muted dark:text-uber-mutedDark mt-1">
            Compare route options using predictive machine learning risk scores rather than transit duration alone.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral">
            <Compass className="w-3.5 h-3.5 mr-1" />
            {mockRoutes.length} Feasible Options
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Route Comparison Matrix */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-start">
          
          {/* Preferred Route Cards */}
          <Card 
            title="Available Corridors" 
            subtitle="Ranked by safety clearance and accident probability"
          >
            <div className="space-y-3">
              {mockRoutes.map((route) => {
                const isSelected = selectedRoute.id === route.id;
                return (
                  <div 
                    key={route.id}
                    onClick={() => handleSelectRoute(route)}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left ${
                      isSelected 
                        ? 'border-black dark:border-white bg-black/5 dark:bg-white/5 ring-1 ring-black dark:ring-white shadow-card scale-[1.01]' 
                        : 'border-gray-200 dark:border-uber-borderDark hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-uber-cardDark'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <span className="text-sm font-bold text-uber-text dark:text-white block">
                          {route.name}
                        </span>
                        <span className="text-[11px] text-uber-muted dark:text-uber-mutedDark font-medium">
                          {route.label}
                        </span>
                      </div>
                      <RiskBadge level={route.riskLevel} />
                    </div>
                    
                    {/* Metrics strip */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-gray-50/80 dark:bg-uber-dark border border-gray-100 dark:border-uber-borderDark mb-3 text-xs">
                      <div>
                        <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark block font-bold uppercase">
                          Risk
                        </span>
                        <span className={`font-mono font-bold ${
                          route.riskScore > 0.7 ? 'text-red-600 dark:text-red-400' : route.riskScore > 0.3 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {route.riskScore}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark block font-bold uppercase">
                          Distance
                        </span>
                        <span className="text-uber-text dark:text-white font-bold">{route.distance}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark block font-bold uppercase">
                          Hotspots
                        </span>
                        <span className={`font-bold ${route.totalHotspots === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {route.totalHotspots}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-uber-muted dark:text-uber-mutedDark leading-relaxed">
                      {route.details}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Selection Stats and Navigation Actions */}
          <Card 
            title="Selected Route Profile"
            subtitle="AI Safety & Time Tradeoff Analysis"
          >
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-uber-dark border border-gray-100 dark:border-uber-borderDark space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200/80 dark:border-uber-borderDark">
                  <span className="font-bold text-uber-muted dark:text-uber-mutedDark uppercase">Path Selected:</span>
                  <span className="font-bold text-uber-text dark:text-white">{selectedRoute.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark font-bold uppercase block">
                      Travel Duration
                    </span>
                    <span className="text-base font-extrabold text-uber-text dark:text-white">
                      {selectedRoute.time}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark font-bold uppercase block">
                      Safety Clearance
                    </span>
                    <span className="text-sm font-bold text-uber-text dark:text-white block mt-0.5">
                      {selectedRoute.totalHotspots === 0 ? '🟢 100% Hazard Free' : `⚠️ ${selectedRoute.totalHotspots} Cluster(s)`}
                    </span>
                  </div>
                </div>

                {/* Tradeoff commentary */}
                <div className="pt-2 text-xs">
                  {selectedRoute.id === 1 && (
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      <span>Safest Option: +1.5 km (+4 mins vs Highway)</span>
                    </div>
                  )}
                  {selectedRoute.id === 2 && (
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Moderate Option: +0.3 km (+2 mins vs Highway)</span>
                    </div>
                  )}
                  {selectedRoute.id === 3 && (
                    <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Fastest but High Risk: Traverses Dwarka bottleneck</span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNavigateSafely}
                className="w-full justify-center py-3"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Navigate Safely
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Leaflet Map */}
        <div className="lg:col-span-2 h-[600px] flex flex-col rounded-2xl overflow-hidden border border-gray-200/80 dark:border-uber-borderDark shadow-card">
          <MapView 
            hotspots={mockHotspots}
            selectedRoute={selectedRoute}
            userLocation={{ latitude: 20.0084, longitude: 73.7635, speed: 0 }} // Center on College Road start point
            showPins={true}
            showKde={true}
            showSpeedLimits={false}
            zoom={13}
          />
        </div>
      </div>
    </div>
  );
}

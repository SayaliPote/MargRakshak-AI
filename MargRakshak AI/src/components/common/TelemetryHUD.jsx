import React, { useState, useEffect } from 'react';
import { 
  Gauge, 
  Compass, 
  Radio, 
  Crosshair, 
  Footprints, 
  Car, 
  Bike, 
  ShieldAlert, 
  ChevronUp, 
  ChevronDown, 
  Activity,
  AlertTriangle
} from 'lucide-react';

/**
 * Precision Telemetry HUD (Heads-Up Display)
 * Inspired by TrackPulse production-grade 1-second GPS architecture
 */
export default function TelemetryHUD({
  speed = 0,
  speedLimit = 40,
  heading = 0,
  cardinal = 'NORTH',
  accuracy = 8,
  latitude = 20.0084,
  longitude = 73.7635,
  isLiveTracking = true,
  heartbeatTick = 0,
  vehicleType = 'car',
  onChangeVehicleType = () => {},
  followUser = false,
  onToggleFollowUser = () => {},
  showBreadcrumbs = true,
  onToggleBreadcrumbs = () => {},
  className = ''
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [heartbeatActive, setHeartbeatActive] = useState(false);

  // Trigger heartbeat LED flash effect when heartbeatTick changes
  useEffect(() => {
    if (heartbeatTick > 0) {
      setHeartbeatActive(true);
      const timer = setTimeout(() => setHeartbeatActive(false), 280);
      return () => clearTimeout(timer);
    }
  }, [heartbeatTick]);

  // Speedometer Gauge Math: radius = 38, circumference = 2 * PI * 38 ~= 238.76
  const maxScaleSpeed = Math.max(120, (speedLimit || 50) * 1.5);
  const currentSpeed = Math.max(0, Math.round(speed || 0));
  const progressRatio = Math.min(1, currentSpeed / maxScaleSpeed);
  const strokeDashoffset = 238.76 - progressRatio * 238.76;

  const isOverSpeed = speedLimit > 0 && currentSpeed > speedLimit;
  const isNearLimit = speedLimit > 0 && currentSpeed > speedLimit * 0.85;

  const speedStrokeColor = isOverSpeed 
    ? '#EF4444' // Red
    : isNearLimit 
      ? '#F59E0B' // Amber
      : '#38BDF8'; // Vibrant Sky Cyan

  const roundedHeading = Math.round(((heading % 360) + 360) % 360);

  return (
    <div className={`pointer-events-auto transition-all duration-300 ${className}`}>
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200/90 dark:border-slate-800 shadow-2xl rounded-2xl p-3.5 sm:p-4 text-slate-800 dark:text-white transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-gray-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${heartbeatActive ? 'animate-ping bg-emerald-400' : 'bg-emerald-500'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLiveTracking ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span className="font-bold tracking-wider text-[11px] uppercase flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isLiveTracking ? 'Live GPS Stream' : 'Simulation Mode'}</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
              accuracy <= 15 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                : accuracy <= 35 
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' 
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
            }`}>
              ±{accuracy ? Math.round(accuracy) : 5}m
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Vehicle Type Selector */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 border border-gray-200 dark:border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => onChangeVehicleType('car')}
                className={`p-1 rounded-md transition-colors ${vehicleType === 'car' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                title="Car Mode"
              >
                <Car className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChangeVehicleType('bike')}
                className={`p-1 rounded-md transition-colors ${vehicleType === 'bike' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                title="Two-Wheeler / Bike Mode"
              >
                <Bike className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChangeVehicleType('emergency')}
                className={`p-1 rounded-md transition-colors ${vehicleType === 'emergency' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                title="Emergency Ambulance Mode"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Collapse Button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title={isCollapsed ? 'Expand HUD' : 'Collapse HUD'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* HUD Content Body */}
        {!isCollapsed && (
          <div className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 items-center">
              {/* Dial 1: Speedometer Gauge */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800/80">
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 88 88">
                    {/* Background track circle */}
                    <circle
                      cx="44"
                      cy="44"
                      r="38"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-gray-200 dark:text-slate-700/60"
                      fill="transparent"
                    />
                    {/* Colored Speed Progress Arc */}
                    <circle
                      cx="44"
                      cy="44"
                      r="38"
                      stroke={speedStrokeColor}
                      strokeWidth="6"
                      strokeDasharray="238.76"
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black tracking-tight leading-none">
                      {currentSpeed}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">km/h</span>
                  </div>
                </div>

                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Speedometer
                  </span>
                  {speedLimit > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${
                        isOverSpeed 
                          ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse' 
                          : 'border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400'
                      }`}>
                        LIMIT {speedLimit}
                      </span>
                    </div>
                  )}
                  {isOverSpeed && (
                    <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Slow Down!</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Dial 2: Compass Rose */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800/80">
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center bg-white dark:bg-slate-900 rounded-full border border-gray-200 dark:border-slate-700 shadow-inner">
                  {/* Cardinal marks */}
                  <span className="absolute top-1 text-[8px] font-black text-red-500">N</span>
                  <span className="absolute right-1 text-[8px] font-black text-gray-400">E</span>
                  <span className="absolute bottom-1 text-[8px] font-black text-gray-400">S</span>
                  <span className="absolute left-1 text-[8px] font-black text-gray-400">W</span>

                  {/* Rotating Compass Needle */}
                  <div
                    className="absolute w-full h-full flex items-center justify-center transition-transform duration-200 will-change-transform"
                    style={{ transform: `rotate(${roundedHeading}deg)` }}
                  >
                    <div className="w-1.5 h-10 relative flex flex-col items-center">
                      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[18px] border-b-red-500 drop-shadow-sm" />
                      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[18px] border-t-slate-400" />
                    </div>
                  </div>
                  {/* Center pin */}
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white border-2 border-white dark:border-slate-900 z-10" />
                </div>

                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Azimuth
                  </span>
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400 block leading-tight">
                    {roundedHeading}°
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block truncate">
                    {cardinal}
                  </span>
                </div>
              </div>
            </div>

            {/* Coordinates & Quick Map Action Toggles */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-slate-800 text-[11px]">
              <div className="font-mono text-[10px] text-gray-500 dark:text-slate-400 truncate">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onToggleFollowUser}
                  className={`px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[10px] transition-colors border ${
                    followUser 
                      ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800' 
                      : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                  title="Auto-center camera on moving vehicle"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Camera Lock</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

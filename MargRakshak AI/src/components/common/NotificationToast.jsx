import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

/**
 * Accessible notification toast.
 * - Mobile: appears at top of screen (above content, below status bar)
 * - Desktop: slides up from bottom-right
 * - Auto-dismisses after 4.5s with progress indicator
 * - ARIA live region for screen readers
 */
export default function NotificationToast({ message, type = 'info', onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Tiny delay so the CSS transition fires
    const show = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 4500);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(timer);
    };
  }, [onClose]);

  const config = {
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-500/40',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      progress: 'bg-emerald-500',
      label: 'Success',
    },
    warning: {
      icon: AlertTriangle,
      border: 'border-amber-500/40',
      iconBg: 'bg-amber-50 dark:bg-amber-950/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      progress: 'bg-amber-500',
      label: 'Warning',
    },
    error: {
      icon: AlertCircle,
      border: 'border-red-500/40',
      iconBg: 'bg-red-50 dark:bg-red-950/50',
      iconColor: 'text-red-600 dark:text-red-400',
      progress: 'bg-red-500',
      label: 'Error',
    },
    info: {
      icon: Info,
      border: 'border-slate-300/40 dark:border-slate-700/40',
      iconBg: 'bg-slate-100 dark:bg-slate-800/60',
      iconColor: 'text-slate-600 dark:text-slate-400',
      progress: 'bg-slate-500',
      label: 'Information',
    },
  };

  const current = config[type] || config.info;
  const IconComponent = current.icon;

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label={`${current.label}: ${message}`}
      className={`
        fixed z-[60] flex items-center gap-3 pr-3
        bg-white dark:bg-[#1a1d27] text-gray-900 dark:text-white
        border ${current.border} rounded-2xl shadow-elevated
        max-w-[calc(100vw-2rem)] sm:max-w-md
        overflow-hidden
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 sm:translate-y-2'}
        top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0
        sm:bottom-6 sm:right-6 sm:top-auto
        w-full mx-4 sm:mx-0 sm:w-auto
      `}
      style={{ minWidth: '280px' }}
    >
      {/* Icon */}
      <div className={`p-3.5 shrink-0 self-stretch flex items-center ${current.iconBg}`}>
        <IconComponent className={`w-5 h-5 ${current.iconColor}`} aria-hidden="true" />
      </div>

      {/* Message */}
      <p className="flex-1 text-xs sm:text-sm font-medium leading-snug py-3.5">
        {message}
      </p>

      {/* Dismiss button */}
      <button 
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800">
        <div 
          className={`h-full ${current.progress} opacity-60`}
          style={{
            animation: 'progress-shrink 4.5s linear forwards',
            width: '100%',
          }}
        />
      </div>

      <style>{`
        @keyframes progress-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

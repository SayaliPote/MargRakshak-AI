import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

/**
 * Uber-inspired Notification Toast
 * Floating bottom-right badge, smooth slide-up, auto-dismiss
 */
export default function NotificationToast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      icon: CheckCircle2,
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    },
    warning: {
      icon: AlertTriangle,
      border: 'border-amber-500/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    },
    error: {
      icon: AlertCircle,
      border: 'border-red-500/30',
      iconColor: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
    },
    info: {
      icon: Info,
      border: 'border-slate-400/30',
      iconColor: 'text-slate-600 dark:text-slate-400',
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    },
  };

  const current = config[type] || config.info;
  const IconComponent = current.icon;

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 p-3.5 pr-3 bg-white dark:bg-[#151821] text-gray-900 dark:text-white border ${current.border} rounded-2xl shadow-elevated max-w-md animate-slide-up`}>
      <div className={`p-2 rounded-xl shrink-0 ${current.badge}`}>
        <IconComponent className="w-4 h-4" />
      </div>
      <div className="flex-1 text-xs sm:text-sm font-medium leading-snug">
        {message}
      </div>
      <button 
        onClick={onClose}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

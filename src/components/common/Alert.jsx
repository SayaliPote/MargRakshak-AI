import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Uber-inspired Alert Component
 * Used for inline banners, feedback, and warning callouts
 */
export default function Alert({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
  icon: CustomIcon,
}) {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    danger: AlertCircle,
  };

  const IconComponent = CustomIcon || icons[type] || Info;

  const styles = {
    info: 'bg-slate-100/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 text-slate-900 dark:text-slate-200',
    success: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200',
    warning: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200',
    danger: 'bg-red-50/80 dark:bg-red-950/30 border-red-200/80 dark:border-red-900/60 text-red-900 dark:text-red-200',
  };

  const iconColors = {
    info: 'text-slate-600 dark:text-slate-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${styles[type]} ${className}`}>
      <div className={`shrink-0 mt-0.5 ${iconColors[type]}`}>
        <IconComponent className="w-5 h-5" />
      </div>
      <div className="flex-1 text-sm">
        {title && <h5 className="font-bold text-sm tracking-tight mb-0.5">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 p-1 text-current opacity-60 hover:opacity-100 transition-opacity rounded-lg"
          aria-label="Close alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

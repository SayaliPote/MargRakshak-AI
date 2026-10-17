import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Modern Uber-style Risk Level Pill Badge
 * Displays risk level (CRITICAL, HIGH, MEDIUM, LOW) with status dot and WCAG compliant colors
 */
export default function RiskBadge({ level, size = 'md' }) {
  const { t } = useLanguage();
  const normLevel = (level || '').toUpperCase();

  const config = {
    CRITICAL: {
      bg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200/80 dark:border-red-900/60',
      dot: 'bg-red-500',
      pulse: true,
      label: t('common.risk.critical'),
    },
    HIGH: {
      bg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-900/60',
      dot: 'bg-orange-500',
      pulse: false,
      label: t('common.risk.high'),
    },
    MEDIUM: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60',
      dot: 'bg-amber-500',
      pulse: false,
      label: t('common.risk.medium'),
    },
    MODERATE: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60',
      dot: 'bg-amber-500',
      pulse: false,
      label: t('common.risk.medium'),
    },
    LOW: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/60',
      dot: 'bg-emerald-500',
      pulse: false,
      label: t('common.risk.low'),
    },
  };

  const current = config[normLevel] || {
    bg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    dot: 'bg-gray-400',
    pulse: false,
    label: level || 'Unknown',
  };

  const sizeClass = size === 'sm' ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${sizeClass} ${current.bg} transition-colors`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {current.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dot}`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`}></span>
      </span>
      <span>{current.label}</span>
    </span>
  );
}

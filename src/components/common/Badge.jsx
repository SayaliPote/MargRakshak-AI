import React from 'react';

/**
 * Uber-inspired Pill Badge Component
 * Clean pill badges with optional indicator dot
 */
export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
  ...props
}) {
  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 font-medium gap-1.5',
    md: 'text-xs px-3 py-1 font-semibold gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 font-semibold gap-2',
  };

  const variantStyles = {
    neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/80',
    primary: 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80',
    danger: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/80 dark:border-red-800/80',
    info: 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80',
  };

  const dotColors = {
    neutral: 'bg-gray-400 dark:bg-gray-400',
    primary: 'bg-white dark:bg-black',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-slate-500',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-wide transition-colors ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          {pulse && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[variant]}`}></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[variant]}`}></span>
        </span>
      )}
      <span>{children}</span>
    </span>
  );
}

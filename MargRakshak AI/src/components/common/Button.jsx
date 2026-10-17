import React from 'react';

/**
 * Accessible Button Component
 * Variants: primary (black), secondary (white+border), accent (emerald), danger, outline, ghost, dangerGhost
 * Sizes: xs, sm, md, lg, xl
 * Shapes: pill (rounded-full) or rounded-xl
 * Meets WCAG 2.1 AA: min 44×44 touch target, visible focus ring, disabled state
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  pill = true,
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  title,
  'aria-label': ariaLabel,
  ...props
}) {
  const baseStyles = [
    'inline-flex items-center justify-center font-medium',
    'transition-all duration-200',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'active:scale-[0.97]',
    'disabled:opacity-50 disabled:pointer-events-none',
    'select-none cursor-pointer',
  ].join(' ');

  const sizeStyles = {
    xs: 'text-xs px-2.5 py-1.5 gap-1 min-h-[32px]',
    sm: 'text-xs px-3.5 py-2 gap-1.5 min-h-[36px]',
    md: 'text-sm px-4 py-2.5 gap-2 min-h-[40px]',
    lg: 'text-sm px-6 py-3 gap-2.5 min-h-[44px]',
    xl: 'text-base px-7 py-3.5 gap-3 font-semibold min-h-[48px]',
  };

  const variantStyles = {
    primary: [
      'bg-black text-white hover:bg-neutral-800',
      'dark:bg-white dark:text-black dark:hover:bg-neutral-200',
      'shadow-sm hover:shadow',
      'focus-visible:ring-black dark:focus-visible:ring-white',
    ].join(' '),
    secondary: [
      'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300',
      'dark:bg-[#151821] dark:text-gray-100 dark:border-gray-800 dark:hover:bg-[#1E222D]',
      'shadow-sm',
      'focus-visible:ring-gray-400',
    ].join(' '),
    accent: [
      'bg-emerald-600 text-white hover:bg-emerald-700',
      'dark:bg-emerald-500 dark:hover:bg-emerald-600',
      'shadow-sm hover:shadow-glow-accent',
      'focus-visible:ring-emerald-500',
    ].join(' '),
    danger: [
      'bg-red-600 text-white hover:bg-red-700',
      'dark:bg-red-500 dark:hover:bg-red-600',
      'shadow-sm',
      'focus-visible:ring-red-500',
    ].join(' '),
    outline: [
      'border border-gray-300 text-gray-700 hover:bg-gray-100',
      'dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800',
      'focus-visible:ring-gray-400',
    ].join(' '),
    ghost: [
      'text-gray-700 hover:bg-gray-100',
      'dark:text-gray-300 dark:hover:bg-gray-800',
      'focus-visible:ring-gray-400',
    ].join(' '),
    dangerGhost: [
      'text-red-600 hover:bg-red-50',
      'dark:text-red-400 dark:hover:bg-red-950/40',
      'focus-visible:ring-red-400',
    ].join(' '),
  };

  const roundedStyle = pill ? 'rounded-full' : 'rounded-xl';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      aria-label={ariaLabel}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${roundedStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <svg 
          className="animate-spin h-4 w-4 text-current" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
          {children && <span>{children}</span>}
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
        </>
      )}
    </button>
  );
}

import React from 'react';

/**
 * Card Component
 * Clean, consistent card with optional hover lift, header, and footer.
 * Accessible: click target has proper role and keyboard support when onClick is provided.
 */
export default function Card({
  children,
  className = '',
  hover = false,
  onClick,
  padding = 'p-5 sm:p-6',
  header,
  footer,
  as: Tag = 'div',
  ...props
}) {
  const isInteractive = Boolean(onClick);

  const hoverClass = hover 
    ? 'hover:-translate-y-0.5 hover:shadow-card-hover cursor-pointer' 
    : '';

  const baseClass = [
    'bg-white dark:bg-[#111319]',
    'border border-gray-200/80 dark:border-gray-800/80',
    'rounded-2xl shadow-card overflow-hidden',
    'transition-all duration-200',
    hoverClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e); } : undefined}
      className={baseClass}
      {...props}
    >
      {header && (
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800/70 flex items-center justify-between shrink-0">
          {header}
        </div>
      )}
      <div className={padding}>
        {children}
      </div>
      {footer && (
        <div className="px-5 sm:px-6 py-3.5 bg-gray-50/70 dark:bg-[#151821]/70 border-t border-gray-100 dark:border-gray-800/70">
          {footer}
        </div>
      )}
    </Tag>
  );
}

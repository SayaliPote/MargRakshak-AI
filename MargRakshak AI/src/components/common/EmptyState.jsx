import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

/**
 * Uber-inspired Empty State Component
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There is currently no data to display for this view or query.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-[#151821] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4 shadow-subtle">
        <Icon className="w-7 h-7 stroke-[1.5]" />
      </div>
      <h4 className="text-base font-bold text-gray-900 dark:text-white tracking-tight mb-1">
        {title}
      </h4>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

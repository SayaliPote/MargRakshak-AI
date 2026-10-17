import React from 'react';

/**
 * Uber-inspired Skeleton Loader
 * Minimalist pulsing placeholders for loading states
 */
export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}) {
  const baseClass = 'bg-gray-200/80 dark:bg-gray-800/60 animate-pulse rounded-lg';

  const variants = {
    text: 'h-4 w-full rounded',
    title: 'h-6 w-3/4 rounded-lg',
    circle: 'rounded-full',
    card: 'h-32 w-full rounded-2xl',
    chart: 'h-64 w-full rounded-2xl',
  };

  const elements = Array.from({ length: count });

  return (
    <div className="space-y-2.5 w-full">
      {elements.map((_, index) => (
        <div
          key={index}
          className={`${baseClass} ${variants[variant] || ''} ${className}`}
          style={{
            width: width,
            height: height,
          }}
        />
      ))}
    </div>
  );
}

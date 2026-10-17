import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Uber-inspired Dropdown Component
 * Rounded-xl/full trigger, sleek menu with subtle hover states
 */
export default function Dropdown({
  trigger,
  items = [],
  align = 'right',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <div 
          className={`absolute ${alignClass} mt-2 w-56 rounded-2xl bg-white dark:bg-[#151821] border border-gray-200/90 dark:border-gray-800/90 shadow-elevated z-50 py-2 animate-scale-up`}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="my-1.5 border-t border-gray-100 dark:border-gray-800" />;
            }

            const ItemIcon = item.icon;

            return (
              <button
                key={index}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-colors ${
                  item.danger 
                    ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/70'
                } ${item.disabled ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {ItemIcon && <ItemIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

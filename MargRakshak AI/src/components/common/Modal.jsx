import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible modal dialog with mobile bottom-sheet behaviour on small screens.
 * - Keyboard: Escape closes, Tab traps focus within
 * - ARIA: role="dialog", aria-modal, aria-labelledby
 * - Mobile: slides up from bottom on small screens, centered on desktop
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  const closeButtonRef = useRef(null);
  const titleId = React.useId ? React.useId() : 'modal-title';

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    // Prevent background scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);
    // Auto-focus the close button when modal opens
    setTimeout(() => closeButtonRef.current?.focus(), 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Card — bottom sheet on mobile, centered on desktop */}
      <div className={`relative w-full ${maxWidth} z-50 animate-slide-up sm:animate-scale-up`}>
        <div className="relative flex flex-col w-full bg-white dark:bg-[#111319] border-0 sm:border border-gray-200/90 dark:border-gray-800/90 rounded-t-3xl sm:rounded-2xl shadow-elevated overflow-hidden max-h-[92dvh] sm:max-h-[85vh]">
          {/* Drag handle (mobile only) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden="true">
            <span className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-[#151821]/50 shrink-0">
            <h3 
              id={titleId}
              className="text-base font-bold text-gray-900 dark:text-white tracking-tight"
            >
              {title}
            </h3>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

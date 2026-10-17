import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const SEVERITY_COLORS = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MODERATE: 'bg-amber-500',
  LOW: 'bg-emerald-500',
  INFO: 'bg-blue-500',
};

export default function NotificationBell({ notifications = [] }) {
  const { t } = useLanguage();
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

  const upcoming = notifications.filter((n) => n.status === 'upcoming');
  const recent = notifications.filter((n) => n.status === 'past');
  const hasNotifications = notifications.length > 0;

  // Resolve notification fields: support both i18n keys (titleKey/messageKey/timeKey)
  // and plain strings (title/message/time) for backward compatibility.
  const resolveTitle = (n) => (n.titleKey ? t(n.titleKey) : n.title) || '';
  const resolveMessage = (n) => (n.messageKey ? t(n.messageKey) : n.message) || '';
  const resolveTime = (n) => (n.timeKey ? t(n.timeKey) : n.time) || '';

  const renderItem = (n) => (
    <div
      key={n.id}
      className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-b-0"
    >
      <div className="flex items-start gap-2.5">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${SEVERITY_COLORS[n.severity] || 'bg-gray-400'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900 dark:text-white leading-snug">{resolveTitle(n)}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{resolveMessage(n)}</p>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-1 block">{resolveTime(n)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        title={t('common.notifications.title')}
      >
        <Bell className="w-5 h-5" />
        {hasNotifications && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[340px] sm:w-80 sm:max-w-none rounded-2xl bg-white dark:bg-[#151821] border border-gray-200/90 dark:border-gray-800/90 shadow-elevated z-50 animate-scale-up overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              {t('common.notifications.title')}
            </h4>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {!hasNotifications ? (
              <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                {t('common.notifications.noNotifications')}
              </div>
            ) : (
              <>
                {/* Upcoming Section */}
                {upcoming.length > 0 && (
                  <div>
                    <div className="px-5 pt-3 pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        {t('common.notifications.upcoming')}
                      </span>
                    </div>
                    {upcoming.map(renderItem)}
                  </div>
                )}

                {/* Recent Section */}
                {recent.length > 0 && (
                  <div>
                    <div className="px-5 pt-3 pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        {t('common.notifications.recent')}
                      </span>
                    </div>
                    {recent.map(renderItem)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

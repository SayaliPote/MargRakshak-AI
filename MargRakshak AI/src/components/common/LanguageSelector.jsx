import React, { useEffect, useRef, useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Reusable English language switcher.
 * variant="light"  -> for light backgrounds (Landing navbar, white headers)
 * variant="dark"   -> for dark surfaces (dark sidebars, footers)
 */
export default function LanguageSelector({ variant = 'light', className = '' }) {
  const { language, setLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = languages.find((l) => l.code === language) || languages[0];

  const trigger =
    variant === 'dark'
      ? 'text-slate-300 hover:text-white border-white/15 hover:bg-white/5'
      : 'text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-sm border rounded-full px-3 py-1.5 transition-colors ${trigger}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="w-4 h-4" />
        {current.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                language === lang.code
                  ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {lang.label}
              {language === lang.code && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, LANGUAGES } from '../i18n/translations';
import { saveLanguage } from '../utils/i18n';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'margrakshak-language';

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && translations[saved]) return saved;
    } catch (e) {
      /* ignore read errors */
    }
    return 'en';
  });

  const setLanguage = (code) => {
    if (!translations[code]) return;
    setLanguageState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {
      /* ignore write errors */
    }
    // Keep the voice-alert language (used by Navigation/Alerts pages) in
    // sync with the site-wide language, so there is one language setting.
    saveLanguage(code);
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  /**
   * t('landing.hero.title1') -> looks up the key in the active language,
   * falling back to English, then to the key itself so missing translations
   * never render as a blank string.
   */
  const t = (key, params) => {
    let value = getNested(translations[language], key);
    if (value === undefined) {
      value = getNested(translations.en, key);
    }
    if (value === undefined) return key;
    if (typeof value === 'string' && params && typeof params === 'object') {
      return Object.entries(params).reduce((str, [k, v]) => {
        return str.replace(new RegExp(`\\{${k}\\}`, 'g'), v !== undefined && v !== null ? v : '');
      }, value);
    }
    return value;
  };

  const speechLang = LANGUAGES.find((l) => l.code === language)?.speechLang || 'en-IN';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES, speechLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

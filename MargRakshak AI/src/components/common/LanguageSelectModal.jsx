import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { ALERT_LANGUAGES } from '../../utils/i18n';
import { Languages } from 'lucide-react';

/**
 * "Choose Your Preferred Language" selector.
 * - mode="onboarding": shown once after first login (no close button, no backdrop dismiss).
 * - mode="settings": shown from the Settings menu to change the preference later.
 */
export default function LanguageSelectModal({ isOpen, mode = 'onboarding', initialLang = 'en', onConfirm, onClose }) {
  const [selected, setSelected] = useState(initialLang);

  const isOnboarding = mode === 'onboarding';

  const handleConfirm = () => {
    onConfirm(selected);
  };

  if (!isOpen) return null;

  if (isOnboarding) {
    // Lightweight standalone overlay (no dismiss) so first-time users must pick a language.
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm z-50 animate-scale-up">
          <div className="bg-white dark:bg-[#111319] border border-gray-200/90 dark:border-gray-800/90 rounded-2xl shadow-elevated overflow-hidden p-6 text-center">
            <div className="flex justify-center mb-3">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-400 text-slate-900">
                <Languages className="w-6 h-6" />
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight mb-1">
              Choose Your Preferred Language
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">
              Safety alerts and voice warnings will be delivered in this language.
            </p>

            <div className="space-y-2 mb-5">
              {ALERT_LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelected(code)}
                  className={`w-full py-2.5 px-4 rounded-lg border text-sm font-semibold transition ${
                    selected === code
                      ? 'bg-amber-400 border-amber-400 text-slate-900'
                      : 'bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button variant="primary" size="md" className="w-full justify-center" onClick={handleConfirm}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Voice Alert Language" maxWidth="max-w-sm">
      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
        Choose the language used for accident hotspot alerts and voice warnings.
      </p>
      <div className="space-y-2 mb-5">
        {ALERT_LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => setSelected(code)}
            className={`w-full py-2.5 px-4 rounded-lg border text-sm font-semibold transition ${
              selected === code
                ? 'bg-amber-400 border-amber-400 text-slate-900'
                : 'bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleConfirm}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

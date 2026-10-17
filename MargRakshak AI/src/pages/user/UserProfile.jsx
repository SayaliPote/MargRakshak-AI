import React, { useState, useRef } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import NotificationToast from '../../components/common/NotificationToast';
import { UserCircle2, Camera, BellRing, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function UserProfile() {
  const { t, language, setLanguage, languages } = useLanguage();
  const [fullName, setFullName] = useState('Driver User');
  const [email, setEmail] = useState('driveruser@gmail.com');
  const [mobile, setMobile] = useState('+91 98765 43210');
  const [memberSince] = useState('18 Mar 2024');

  const [voiceAlerts, setVoiceAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [vibration, setVibration] = useState(true);

  const [toastMessage, setToastMessage] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleChangePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToastMessage(t('user.profile.toastInvalidImage'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result);
      setToastMessage(t('user.profile.toastPhotoUpdated'));
    };
    reader.readAsDataURL(file);

    // allow re-selecting the same file later
    e.target.value = '';
  };

  const handleSaveChanges = () => {
    setToastMessage(t('user.profile.toastPreferencesSaved'));
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {toastMessage && (
        <NotificationToast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      <div>
        <h1 className="font-display text-xl font-bold text-navy-900 dark:text-white tracking-tight">{t('user.profile.title')}</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm">{t('user.profile.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Avatar */}
        <Card className="md:col-span-3 flex flex-col items-center justify-center text-center py-8">
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mb-4 overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 className="w-16 h-16" />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelected}
            className="hidden"
          />
          <Button variant="secondary" size="sm" icon={Camera} onClick={handleChangePhotoClick}>
            {t('user.profile.changePhoto')}
          </Button>
        </Card>

        {/* Profile fields */}
        <Card className="md:col-span-5">
          <h2 className="text-sm font-bold text-navy-950 dark:text-white uppercase border-b border-gray-100 dark:border-slate-700 pb-2 mb-4">
            {t('user.profile.profileDetails')}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('user.profile.fullName')}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('user.profile.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('user.profile.mobileNumber')}</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('user.profile.preferredLanguage')}</label>
              <input
                type="text"
                value={languages.find((l) => l.code === language)?.label || 'English'}
                disabled
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('user.profile.memberSince')}</label>
              <input
                type="text"
                value={memberSince}
                disabled
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        </Card>

        {/* Alert preferences */}
        <Card className="md:col-span-4">
          <h2 className="text-sm font-bold text-navy-950 dark:text-white uppercase border-b border-gray-100 dark:border-slate-700 pb-2 mb-4 flex items-center gap-1.5">
            <BellRing className="w-4 h-4 text-amber-500" /> {t('user.profile.alertPreferences')}
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('user.profile.voiceAlerts')}</span>
              <ToggleSwitch checked={voiceAlerts} onChange={setVoiceAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('user.profile.soundAlerts')}</span>
              <ToggleSwitch checked={soundAlerts} onChange={setSoundAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('user.profile.vibration')}</span>
              <ToggleSwitch checked={vibration} onChange={setVibration} />
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('user.profile.language')}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              >
                {languages.map(({ code, label }) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveChanges}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-semibold py-3 rounded-lg transition-colors shadow-sm shadow-amber-400/30 flex items-center justify-center gap-2 mt-2"
            >
              <Check className="w-4 h-4" /> {t('user.profile.saveChanges')}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

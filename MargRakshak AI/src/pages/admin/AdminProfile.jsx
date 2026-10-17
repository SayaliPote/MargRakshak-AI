import React, { useState, useRef } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import NotificationToast from '../../components/common/NotificationToast';
import { UserCircle2, Camera, KeyRound, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export default function AdminProfile() {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || 'Admin User');
  const [email, setEmail] = useState(user?.email || 'admin@margrakshak.in');
  const [mobile, setMobile] = useState(user?.mobile || '+91 12345 67890');
  const [role] = useState(user?.role === 'admin' ? 'Administrator' : (user?.role || 'Administrator'));
  const [department, setDepartment] = useState('Traffic Police - Nashik');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
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
      setToastMessage(t('admin.profile.toastInvalidImage'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result);
      setToastMessage(t('admin.profile.toastPhotoUpdated'));
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('admin.profile.errFillAll'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('admin.profile.errMismatch'));
      return;
    }
    setPasswordError('');
    setPasswordSaved(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setToastMessage(t('admin.profile.toastPasswordUpdated'));
    setTimeout(() => setPasswordSaved(false), 1500);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {toastMessage && (
        <NotificationToast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      <div>
        <h1 className="font-display text-xl font-bold text-navy-900 dark:text-white tracking-tight">{t('admin.profile.title')}</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm">{t('admin.profile.subtitle')}</p>
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
            {t('admin.profile.changePhoto')}
          </Button>
        </Card>

        {/* Profile fields */}
        <Card className="md:col-span-5">
          <h2 className="text-sm font-bold text-navy-950 dark:text-white uppercase border-b border-gray-100 dark:border-slate-700 pb-2 mb-4">
            {t('admin.profile.profileDetails')}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('admin.profile.fullName')}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('admin.profile.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('admin.profile.mobileNumber')}</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('admin.profile.role')}</label>
              <input
                type="text"
                value={role}
                disabled
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('admin.profile.department')}</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              />
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  updateUser({ full_name: fullName, email, mobile, department });
                  setToastMessage(t('admin.profile.toastPhotoUpdated') ? 'Profile updated successfully.' : 'Saved');
                }}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Change password */}
        <Card className="md:col-span-4">
          <h2 className="text-sm font-bold text-navy-950 dark:text-white uppercase border-b border-gray-100 dark:border-slate-700 pb-2 mb-4 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-amber-500" /> {t('admin.profile.changePassword')}
          </h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('admin.profile.currentPassword')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('admin.profile.currentPasswordPh')}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('admin.profile.newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('admin.profile.newPasswordPh')}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('admin.profile.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('admin.profile.confirmPasswordPh')}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
              />
            </div>

            {passwordError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{passwordError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-semibold py-3 rounded-lg transition-colors shadow-sm shadow-amber-400/30 flex items-center justify-center gap-2"
            >
              {passwordSaved ? (
                <>
                  <Check className="w-4 h-4" /> {t('admin.profile.passwordUpdated')}
                </>
              ) : (
                t('admin.profile.updatePassword')
              )}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

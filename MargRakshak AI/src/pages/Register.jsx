import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, ShieldAlert, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import LanguageSelector from '../components/common/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';
import { registerUser } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMobile = mobile.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    // 1. Client-side Validations
    if (!trimmedName || !trimmedEmail || !trimmedPassword || !trimmedConfirm) {
      setError(t('register.errorRequired'));
      return;
    }

    if (trimmedName.length < 2) {
      setError(t('register.errorNameShort'));
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(t('register.errorInvalidEmail'));
      return;
    }

    // Password length (backend UserCreate requires min_length=6)
    if (trimmedPassword.length < 6) {
      setError(t('register.errorPasswordShort'));
      return;
    }

    // Password match check
    if (trimmedPassword !== trimmedConfirm) {
      setError(t('register.errorPasswordMismatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        mobile: trimmedMobile || undefined,
        preferred_language: language || 'en',
        role: 'user', // Hardcoded: driver self-registration only
        voice_alerts: true,
        sound_alerts: true,
        vibration_alerts: true,
      };

      await registerUser(payload);

      setSuccessMessage(t('register.successRedirect'));

      // Redirect after a brief moment so user sees the confirmation
      setTimeout(() => {
        navigate('/login', {
          state: {
            role: 'user',
            registeredEmail: trimmedEmail,
            message: t('register.loginRedirectMessage'),
          },
        });
      }, 1000);
    } catch (err) {
      console.error('Registration failed:', err);
      // Display the specific backend error message
      const errMsg = err?.message || t('register.errorGeneric');
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-start sm:items-center justify-center p-4 sm:p-5 transition-colors">
      <div className="w-full max-w-md mt-6 sm:mt-0">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('register.backToHome')}
          </button>
          <LanguageSelector variant="light" />
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-7 transition-colors">
          {/* Logo */}
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-400 text-slate-900 shadow-sm shadow-amber-400/20">
              <ShieldAlert className="w-6 h-6" />
            </span>
          </div>

          <h1 className="text-center font-display text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
            {t('register.title')}
          </h1>
          <p className="text-center text-sm text-slate-400 dark:text-slate-400 mt-1 mb-6">
            {t('register.subtitle')}
          </p>

          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5 mb-4 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('register.fullNameLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('register.fullNamePlaceholder')}
                required
                disabled={isSubmitting}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition disabled:opacity-60"
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('register.emailLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('register.emailPlaceholder')}
                required
                disabled={isSubmitting}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition disabled:opacity-60"
                autoComplete="email"
              />
            </div>

            {/* Mobile (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('register.mobileLabel')} <span className="text-slate-400 font-normal">{t('register.optional')}</span>
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder={t('register.mobilePlaceholder')}
                disabled={isSubmitting}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition disabled:opacity-60"
                autoComplete="tel"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('register.passwordLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('register.passwordPlaceholder')}
                  required
                  disabled={isSubmitting}
                  className="w-full text-sm px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition disabled:opacity-60"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('register.confirmPasswordLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('register.confirmPasswordPlaceholder')}
                  required
                  disabled={isSubmitting}
                  className="w-full text-sm px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition disabled:opacity-60"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label={showConfirmPassword ? t('register.hidePassword') : t('register.showPassword')}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-semibold py-3 rounded-lg transition-colors shadow-sm shadow-amber-400/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('register.submitting')}</span>
                </>
              ) : (
                t('register.submitButton')
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('register.alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => navigate('/login', { state: { role: 'user' } })}
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
              >
                {t('register.signIn')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

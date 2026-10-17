import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, ShieldAlert, Mail, CheckCircle2, KeyRound } from 'lucide-react';
import LanguageSelectModal from '../components/common/LanguageSelectModal';
import LanguageSelector from '../components/common/LanguageSelector';
import Modal from '../components/common/Modal';
import { getSavedLanguage, saveLanguage } from '../utils/i18n';
import { useLanguage } from '../context/LanguageContext';
import { useAuth, formatNameFromIdentifier } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { t } = useLanguage();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState(routerLocation.state?.registeredEmail || routerLocation.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(routerLocation.state?.message || '');
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false);

  // Forgot Password flow
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const openForgotPassword = () => {
    setResetEmail(identifier.includes('@') ? identifier : '');
    setResetError('');
    setResetSent(false);
    setShowForgotModal(true);
  };

  const closeForgotPassword = () => {
    setShowForgotModal(false);
  };

  const handleSendResetLink = (e) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setResetError(t('login.forgot.invalidEmail'));
      return;
    }
    setResetError('');
    setResetSent(true);
  };

  const enterPortal = () => {
    navigate('/user/navigation');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setError(t('login.errorRequired'));
      return;
    }
    setError('');

    // Prepare normalized email
    const normalizedEmail = (identifier.includes('@')
      ? identifier.trim()
      : `${identifier.trim().toLowerCase()}@margrakshak.in`
    ).toLowerCase();

    const derivedName = formatNameFromIdentifier(identifier, 'user');
    let authUser = {
      full_name: derivedName,
      email: normalizedEmail,
      role: 'user',
    };

    try {
      const loginPayload = JSON.stringify({
        email: normalizedEmail,
        password: password.trim(),
      });

      let res;
      try {
        res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: loginPayload,
        });
      } catch {
        res = await fetch('http://localhost:8000/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: loginPayload,
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          authUser = {
            ...authUser,
            ...data.user,
            full_name: data.user.full_name || derivedName,
            role: 'user',
          };
        }
        const token = data.access_token || data.token || null;
        login(authUser, token);
      } else if (res.status === 401) {
        setError("Incorrect email or password.");
        return;
      } else if (res.status === 422) {
        const errData = await res.json().catch(() => ({}));
        const detailMsg = Array.isArray(errData.detail)
          ? errData.detail.map((d) => d.msg || d).join(', ')
          : (errData.detail || 'Validation error on login credentials.');
        setError(detailMsg);
        return;
      } else if (res.status >= 500) {
        throw new Error('Backend server unreachable');
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || "Authentication failed. Please check your credentials.");
        return;
      }
    } catch (err) {
      // Backend not running or network error: fallback for offline session
      console.warn('Backend unreachable during user login, using local driver session:', err);
      if (!identifier.trim() || !password.trim()) {
        setError(t('login.errorRequired'));
        return;
      }
      login(authUser);
    }

    // First-time driver login: ask for a preferred alert language once, then
    // remember it (localStorage) so it's never asked again on future logins.
    if (!getSavedLanguage()) {
      setShowLanguagePrompt(true);
      return;
    }

    enterPortal();
  };

  const handleLanguageConfirm = (code) => {
    saveLanguage(code);
    setShowLanguagePrompt(false);
    enterPortal();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-start sm:items-center justify-center p-4 sm:p-5 transition-colors">
      <div className="w-full max-w-sm mt-6 sm:mt-0">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('login.backToHome')}
          </button>
          <LanguageSelector variant="light" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-7 transition-colors">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-400 text-slate-900">
              <ShieldAlert className="w-6 h-6" />
            </span>
          </div>

          <h1 className="text-center font-display text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
            {t('login.heading1')}<br />{t('login.heading2')}
          </h1>
          <p className="text-center text-sm text-slate-400 dark:text-slate-400 mt-1.5 mb-6">{t('login.subtitle')}</p>
          {infoMessage && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2.5 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Mobile */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('login.emailLabel')}</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError('');
                }}
                placeholder={t('login.emailPlaceholder')}
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
                autoComplete="username"
                inputMode="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('login.passwordLabel')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder={t('login.passwordPlaceholder')}
                  className="w-full text-sm px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-amber-500 focus:ring-amber-400/40"
                />
                {t('login.rememberMe')}
              </label>
              <button
                type="button"
                onClick={openForgotPassword}
                className="text-amber-600 dark:text-amber-400 font-medium hover:underline"
              >
                {t('login.forgotPassword')}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Login button */}
            <button
              type="submit"
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-semibold py-3 rounded-lg transition-colors shadow-sm shadow-amber-400/30"
            >
              {t('login.loginButton')}
            </button>

            {/* New Driver Sign Up Link */}
            <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                New driver?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>

      <LanguageSelectModal
        isOpen={showLanguagePrompt}
        mode="onboarding"
        onConfirm={handleLanguageConfirm}
      />

      <Modal isOpen={showForgotModal} onClose={closeForgotPassword} title={t('login.forgot.title')} maxWidth="max-w-sm">
        {resetSent ? (
          <div className="text-center py-2">
            <div className="flex justify-center mb-3">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t('login.forgot.sentTitle')}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('login.forgot.sentDesc')} <span className="font-semibold text-slate-700 dark:text-slate-200">{resetEmail}</span>{t('login.forgot.sentDescSuffix')}
            </p>
            <button
              type="button"
              onClick={closeForgotPassword}
              className="mt-5 w-full bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              {t('login.forgot.backToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendResetLink} className="space-y-4">
            <div className="flex justify-center mb-1">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-400 text-slate-900">
                <KeyRound className="w-5 h-5" />
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              {t('login.forgot.instructions')}
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t('login.emailLabel')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  className="w-full text-sm pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
                />
              </div>
            </div>

            {resetError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">{resetError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-semibold py-2.5 rounded-lg transition-colors shadow-sm shadow-amber-400/30"
            >
              {t('login.forgot.sendButton')}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}

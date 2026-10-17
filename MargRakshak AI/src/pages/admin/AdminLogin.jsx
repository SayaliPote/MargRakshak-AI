import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, ShieldAlert, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import LanguageSelector from '../../components/common/LanguageSelector';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_ADMIN_EMAIL = 'admin@margrakshak.in';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login } = useAuth();

  // Auto-fill fields for Admin Login ONLY per Requirement 3
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError(t('login.errorRequired') || 'Email and password are required.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    const normalizedEmail = email.trim().toLowerCase();

    // Enforce that only the authorized admin email is permitted
    if (normalizedEmail !== DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      setError(t('login.adminRestricted') || 'Admin access is restricted to the authorized administrator account.');
      setIsSubmitting(false);
      return;
    }

    let authUser = {
      full_name: 'System Administrator',
      email: normalizedEmail,
      role: 'admin',
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
            role: 'admin',
          };
        }
        const token = data.access_token || data.token || null;
        login(authUser, token);
        navigate('/admin/dashboard');
        return;
      } else if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Admin access is restricted to authorized credentials.');
        setIsSubmitting(false);
        return;
      } else if (res.status === 401) {
        setError('Incorrect email or password.');
        setIsSubmitting(false);
        return;
      } else if (res.status >= 500) {
        throw new Error('Backend server unreachable');
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Authentication failed. Please check server status.');
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      // Offline fallback when backend is not running
      console.warn('Backend unreachable during admin login, falling back to local authorized session:', err);
      if (password.trim() !== DEFAULT_ADMIN_PASSWORD) {
        setError('Incorrect email or password.');
        setIsSubmitting(false);
        return;
      }
      login(authUser);
      navigate('/admin/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-start sm:items-center justify-center p-4 sm:p-5 transition-colors">
      <div className="w-full max-w-sm mt-6 sm:mt-0">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('login.backToHome') || 'Back to Home'}
          </button>
          <LanguageSelector variant="dark" />
        </div>

        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 p-7 transition-colors">
          {/* Logo & Portal Badge */}
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20">
              <ShieldCheck className="w-7 h-7" />
            </span>
          </div>

          <div className="text-center mb-6">
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full mb-2">
              Authorized Authority Access
            </span>
            <h1 className="font-display text-xl font-extrabold text-white leading-snug">
              Admin Portal Login
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Municipal Corporation & Traffic Police Command
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="admin@margrakshak.in"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition"
                autoComplete="email"
                required
              />
            </div>

            {/* Admin Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter admin password"
                  className="w-full text-sm px-3.5 py-2.5 pr-10 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-400/40"
                />
                Remember admin session
              </label>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                TLS 256-bit Encrypted
              </span>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/50 border border-red-900/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 text-sm font-bold py-3 rounded-lg transition-colors shadow-lg shadow-amber-400/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In as Admin'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

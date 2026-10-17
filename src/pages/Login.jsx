import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Plus, Circle, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [role, setRole] = useState(routerLocation.state?.role === 'admin' ? 'admin' : 'user');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter both email/mobile number and password.');
      return;
    }
    setError('');

    // No backend auth yet -- route straight into the matching portal.
    if (role === 'admin') {
      navigate('/admin/map');
    } else {
      navigate('/user/navigation');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-400 text-slate-900">
              <ShieldAlert className="w-6 h-6" />
            </span>
          </div>

          <h1 className="text-center font-display text-lg font-extrabold text-slate-900 leading-snug">
            AI-Based Accident<br />Spot Detection System
          </h1>
          <p className="text-center text-sm text-slate-400 mt-1.5 mb-6">Login to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Mobile */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your email or mobile number"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full text-sm px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400/40"
                />
                Remember me
              </label>
              <button type="button" className="text-amber-600 font-medium hover:underline">
                Forgot Password?
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Login button */}
            <button
              type="submit"
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-semibold py-3 rounded-lg transition-colors shadow-sm shadow-amber-400/30"
            >
              Login
            </button>

            {/* Role toggle */}
            <div>
              <p className="text-center text-xs text-slate-400 mb-2.5">Login as</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-lg border transition-colors ${
                    role === 'admin'
                      ? 'bg-amber-400 border-amber-400 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-lg border transition-colors ${
                    role === 'user'
                      ? 'bg-amber-400 border-amber-400 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Circle className="w-3.5 h-3.5" />
                  User
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

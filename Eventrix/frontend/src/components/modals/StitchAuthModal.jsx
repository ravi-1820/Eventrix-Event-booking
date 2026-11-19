import React, { useState, useEffect } from 'react';
import { 
  User, Lock, AlertCircle, Mail, CheckCircle2, ArrowRight, Eye, EyeOff, Phone 
} from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { api } from '../../api/client';
import { ForgotPasswordFlow } from '../auth/ForgotPasswordFlow';
import { useLanguage } from '../../context/LanguageContext';

export function StitchAuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'login');
      setUsername('');
      setPassword('');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, initialMode]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(username, password);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        first_name: regFirstName.trim(),
        last_name: regLastName.trim(),
        phone: regPhone.trim(),
        role: 'PARTICIPANT',
      };

      const res = await api.register(payload);
      setSuccessMsg(`Account created successfully! Confirmation email sent to ${regEmail}.`);
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        isOpen={isOpen} 
        onClose={onClose} 
        maxWidth="max-w-md" 
        className="p-6 sm:p-7 max-h-[92vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4 shadow-2xl"
      >
        {/* Mode Switcher Tabs */}
        {mode !== 'forgot' ? (
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('nav.signIn', 'Sign In')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('auth.signUp', 'Create Account')}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-slate-100 px-3.5 py-2 rounded-xl">
            <span className="text-xs font-bold text-slate-800">Account Recovery</span>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className="text-xs font-semibold text-[#075985] hover:underline cursor-pointer"
            >
              &larr; Back to Sign In
            </button>
          </div>
        )}

        {/* Modal Header */}
        <div className="text-center flex flex-col items-center justify-center space-y-1">
          <img 
            src="/logo_mark.png" 
            alt="Eventrix Logo" 
            className="h-12 w-auto object-contain mb-1.5 drop-shadow-sm" 
          />
          <h3 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
            {mode === 'login' && t('auth.signIn', 'Sign in to Eventrix')}
            {mode === 'register' && t('auth.signUp', 'Join Eventrix')}
            {mode === 'forgot' && 'Reset Your Password'}
          </h3>
          <p className="text-xs text-slate-500">
            {mode === 'login' && 'Welcome back! Sign in to access your bookings & tickets.'}
            {mode === 'register' && 'Create an account to book events, save favorites & earn perks.'}
            {mode === 'forgot' && 'Enter your registered email to receive a 6-digit OTP code.'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* ===================== FORGOT PASSWORD VIEW ===================== */}
        {mode === 'forgot' && (
          <ForgotPasswordFlow 
            onBackToLogin={() => {
              setMode('login');
              setError('');
            }}
            onSuccess={() => {
              setMode('login');
              setSuccessMsg('Password reset successfully! You can now log in.');
            }}
          />
        )}

        {/* ===================== LOGIN VIEW ===================== */}
        {mode === 'login' && (
          <div className="space-y-4">
            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5" autoComplete="off">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {t('auth.email', 'Email Address')}
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    {t('auth.password', 'Password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                    }}
                    className="text-[11px] font-semibold text-[#075985] hover:text-[#0369A1] hover:underline cursor-pointer"
                  >
                    {t('auth.forgotPassword', 'Forgot Password?')}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                loading={loading} 
                className="w-full bg-[#075985] hover:bg-[#0369A1] text-white shadow-md shadow-[#075985]/20 cursor-pointer"
              >
                {t('nav.signIn', 'Sign In')}
              </Button>
            </form>

            {/* Bottom Toggle Link */}
            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              {t('auth.dontHaveAccount', "Don't have an account?")}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                className="font-bold text-[#075985] hover:underline cursor-pointer"
              >
                {t('auth.registerNow', 'Register now')}
              </button>
            </div>
          </div>
        )}

        {/* ===================== REGISTER VIEW ===================== */}
        {mode === 'register' && (
          <div className="space-y-4">
            {/* Registration Form */}
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              {/* Username & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Enter email"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">First Name</label>
                  <input
                    type="text"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Last Name</label>
                  <input
                    type="text"
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder="Enter last name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
                />
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Confirm *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className={`w-full pl-3 pr-9 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none transition-colors ${
                        regConfirmPassword && regPassword !== regConfirmPassword
                          ? 'border-rose-300 focus:border-rose-500'
                          : 'border-slate-200 focus:border-[#075985] focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                loading={loading} 
                className="w-full bg-[#075985] hover:bg-[#0369A1] text-white shadow-md shadow-[#075985]/20 cursor-pointer flex items-center justify-center gap-2 mt-1"
              >
                {t('auth.signUp', 'Create Account')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Bottom Toggle Link */}
            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className="font-bold text-[#075985] hover:underline cursor-pointer"
              >
                {t('auth.loginNow', 'Sign in here')}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Mail, Lock, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, 
  AlertCircle, Eye, EyeOff, RefreshCw, ShieldCheck 
} from 'lucide-react';
import { Button } from '../ui/button';
import { api } from '../../api/client';

export function ForgotPasswordFlow({ onBackToLogin, onSuccess }) {
  // Steps: 'email' (Step 1) | 'otp' (Step 2) | 'password' (Step 3) | 'success' (Step 4)
  const [step, setStep] = useState('email');
  
  const [emailInput, setEmailInput] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  
  // OTP state
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // New password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Request OTP
  const handleRequestOTP = async (e) => {
    e?.preventDefault();
    if (!emailInput.trim()) {
      setError('Please enter your registered email or username.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await api.requestPasswordResetOTP(emailInput.trim());
      setMaskedEmail(res.masked_email || res.email);
      setInfoMsg(res.message || 'Verification code sent to your email.');
      setStep('otp');
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.requestPasswordResetOTP(emailInput.trim());
      setInfoMsg('A new verification code has been sent to your email.');
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e?.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.verifyPasswordResetOTP(emailInput.trim(), cleanOtp);
      setInfoMsg('');
      setStep('password');
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e?.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPasswordWithOTP(emailInput.trim(), otp.trim(), newPassword);
      setInfoMsg(res.message || 'Password reset successful!');
      setStep('success');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert Messages */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {infoMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{infoMsg}</span>
        </div>
      )}

      {/* ================= STEP 1: ENTER EMAIL ================= */}
      {step === 'email' && (
        <form onSubmit={handleRequestOTP} className="space-y-4" autoComplete="off">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              Registered Email or Username
            </label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="off"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. user@example.com or username"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
            />
            <p className="text-[11px] text-slate-500 pt-0.5">
              We'll send a 6-digit one-time password (OTP) to your registered email address.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full bg-[#075985] hover:bg-[#0369A1] text-white shadow-md shadow-[#075985]/20 cursor-pointer"
          >
            Send Verification Code &rarr;
          </Button>

          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            Remember your password?{' '}
            <button
              type="button"
              onClick={onBackToLogin}
              className="font-bold text-[#075985] hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </form>
      )}

      {/* ================= STEP 2: ENTER OTP ================= */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOTP} className="space-y-4" autoComplete="off">
          <div className="p-3.5 bg-[#E0F2FE]/70 border border-[#BAE6FD] rounded-xl text-xs text-[#075985] flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-[#075985] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              We sent a 6-digit verification code to <strong className="text-slate-900 font-bold">{maskedEmail}</strong>. Please check your inbox and spam folder.
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>6-Digit Verification Code</span>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setError('');
                }}
                className="text-[11px] text-[#075985] font-semibold hover:underline cursor-pointer"
              >
                Change email
              </button>
            </label>
            <input
              type="text"
              maxLength={6}
              required
              autoFocus
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full text-center tracking-[8px] font-mono text-lg py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full bg-[#075985] hover:bg-[#0369A1] text-white shadow-md shadow-[#075985]/20 cursor-pointer"
          >
            Verify Code & Continue &rarr;
          </Button>

          {/* Resend OTP */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Didn't receive the code?</span>
            <button
              type="button"
              disabled={resendCooldown > 0 || loading}
              onClick={handleResendOTP}
              className={`font-semibold flex items-center gap-1 cursor-pointer ${
                resendCooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-[#075985] hover:underline'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>

          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              &larr; Back to Sign In
            </button>
          </div>
        </form>
      )}

      {/* ================= STEP 3: NEW PASSWORD ================= */}
      {step === 'password' && (
        <form onSubmit={handleResetPassword} className="space-y-3.5" autoComplete="off">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#075985] focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            Save New Password &rarr;
          </Button>

          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              &larr; Cancel and Back to Sign In
            </button>
          </div>
        </form>
      )}

      {/* ================= STEP 4: SUCCESS ================= */}
      {step === 'success' && (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">
              Password Reset Successfully!
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Your new password is now active. You can log in securely to your Eventrix account.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={() => {
              if (onSuccess) onSuccess();
              onBackToLogin();
            }}
            className="w-full bg-[#075985] hover:bg-[#0369A1] text-white shadow-md shadow-[#075985]/20 cursor-pointer"
          >
            Sign In with New Password &rarr;
          </Button>
        </div>
      )}
    </div>
  );
}

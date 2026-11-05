import React, { useState } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Info
} from 'lucide-react';
import { sound } from '../../utils/sound.ts';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
  onBackToSite: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToSite }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forced first-time password rotation state
  const [requireRotation, setRequireRotation] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rotationSuccess, setRotationSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    sound.playClick();

    const trimmedEmail = email.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        if (data?.errorCode === 'UNAUTHORIZED_EMAIL') {
          throw new Error('هذا الحساب غير مصرح له بإدارة الموقع.');
        }
        if (data?.errorCode === 'INVALID_CREDENTIALS') {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        }
        throw new Error(data?.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      }

      sound.playSuccess();

      if (data.mustChangePassword) {
        // Enforce mandatory password rotation
        setRequireRotation(true);
        setTempToken(data.token);
        setCurrentPassword(password);
      } else {
        localStorage.setItem('zork_admin_token', data.token);
        onLoginSuccess(data.token);
      }
    } catch (err: any) {
      sound.playError();
      if (
        err.name === 'TypeError' ||
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Failed to fetch')
      ) {
        setError('تعذر الاتصال بخدمة تسجيل الدخول. تحقق من اتصال الإنترنت وحاول مرة أخرى.');
      } else {
        setError(err.message || 'حدث خطأ أثناء محاولة تسجيل الدخول.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (newPassword.length < 8) {
      setError('يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف أو أرقام.');
      sound.playError();
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة غير متطابقة مع التأكيد.');
      sound.playError();
      return;
    }

    setLoading(true);
    sound.playClick();

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'تعذر تغيير كلمة المرور.');
      }

      sound.playSuccess();
      setRotationSuccess(true);
      localStorage.setItem('zork_admin_token', tempToken!);

      setTimeout(() => {
        onLoginSuccess(tempToken!);
      }, 1200);
    } catch (err: any) {
      sound.playError();
      if (
        err.name === 'TypeError' ||
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError')
      ) {
        setError('تعذر الاتصال بخدمة تسجيل الدخول. تحقق من اتصال الإنترنت وحاول مرة أخرى.');
      } else {
        setError(err.message || 'حدث خطأ أثناء تحديث كلمة المرور.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4" dir="rtl">
      <div
        className="relative w-full max-w-md bg-[#101018] border border-[#C5CBD5]/20 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
        style={{
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(39, 11, 24, 0.6)'
        }}
      >
        {/* Top Back Action */}
        <button
          onClick={() => {
            sound.playClick();
            onBackToSite();
          }}
          className="flex items-center gap-1.5 text-xs text-[#C5CBD5]/60 hover:text-white transition-colors mb-6 active:scale-95"
        >
          <ArrowRight size={14} />
          <span>العودة للموقع الرئيسي</span>
        </button>

        {/* Lock Icon Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#270B18] border border-[#FF284A]/40 flex items-center justify-center text-[#FF284A] shadow-[0_0_20px_rgba(255,40,74,0.3)] mb-3">
            <Lock size={26} />
          </div>
          <h1 className="font-heading text-xl font-bold text-white">
            {requireRotation ? 'تحديث كلمة المرور الإلزامية' : 'بوابة إدارة المالك'}
          </h1>
          <p className="text-xs text-[#C5CBD5]/60 mt-1">
            {requireRotation
              ? 'يرجى استبدال كلمة المرور المؤقتة بكلمة مرور جديدة قوية لمتابعة الدخول'
              : 'منطقة سرية ومحمية مخصصة لمالك منصة ZORK CRAFT فقط'}
          </p>
        </div>

        {/* Authorized Owner Banner */}
        <div className="mb-5 p-2.5 rounded-xl bg-[#07070B] border border-[#C5CBD5]/10 flex items-center justify-between text-[11px] text-[#C5CBD5]/70">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#35D16F]" />
            <span>المالك المعتمد:</span>
          </div>
          <span className="font-mono text-white/90 text-[10px] sm:text-xs">zorkal3ab@gmail.com</span>
        </div>

        {error && (
          <div
            id="admin-error-message"
            className="mb-5 p-3 rounded-xl bg-[#270B18]/70 border border-[#FF284A]/40 text-xs text-[#FF284A] flex items-center gap-2"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {rotationSuccess ? (
          <div className="p-4 rounded-xl bg-[#0D381D] border border-[#35D16F]/50 text-xs text-[#35D16F] flex items-center gap-2.5 justify-center">
            <CheckCircle2 size={18} />
            <span className="font-bold">تم تغيير كلمة المرور بنجاح! جاري تحويلك للوحة التحكم...</span>
          </div>
        ) : !requireRotation ? (
          /* Normal Owner Login Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#C5CBD5]/90 mb-1.5 text-right">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="owner-email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="أدخل البريد الإلكتروني الخاص بالمالك"
                  required
                  autoComplete="email"
                  className="w-full bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#FF284A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#C5CBD5]/40 outline-none transition-all pr-10 text-right"
                />
                <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C5CBD5]/40 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C5CBD5]/90 mb-1.5 text-right">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="owner-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور للدخول"
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#FF284A] rounded-xl px-10 py-3 text-sm text-white placeholder-[#C5CBD5]/40 outline-none transition-all pr-10 text-right font-sans"
                />
                <KeyRound size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C5CBD5]/40 pointer-events-none" />
                <button
                  type="button"
                  id="toggle-show-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5CBD5]/60 hover:text-white transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="submit-login-btn"
              disabled={loading}
              className="w-full mt-4 py-3 rounded-xl font-heading font-bold text-sm text-white bg-gradient-to-r from-[#FF284A] to-[#FF791F] hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,40,74,0.35)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري التحقق من الهوية...</span>
                </>
              ) : (
                <span>تسجيل الدخول</span>
              )}
            </button>
          </form>
        ) : (
          /* First Login Password Rotation Form */
          <form onSubmit={handlePasswordRotation} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#C5CBD5]/90 mb-1.5 text-right">
                كلمة المرور الحالية (المؤقتة)
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="current-password-input"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  className="w-full bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#FF284A] rounded-xl px-10 py-2.5 text-sm text-white outline-none text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  aria-label={showCurrentPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C5CBD5]/60 hover:text-white transition-colors p-1"
                >
                  {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C5CBD5]/90 mb-1.5 text-right">
                كلمة المرور الجديدة (8 أحرف أو أكثر)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="new-password-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور قوية جديدة"
                  required
                  className="w-full bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#35D16F] rounded-xl px-10 py-2.5 text-sm text-white placeholder-[#C5CBD5]/40 outline-none text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C5CBD5]/60 hover:text-white transition-colors p-1"
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#C5CBD5]/90 mb-1.5 text-right">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirm-password-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  required
                  className="w-full bg-[#07070B] border border-[#C5CBD5]/20 focus:border-[#35D16F] rounded-xl px-10 py-2.5 text-sm text-white placeholder-[#C5CBD5]/40 outline-none text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C5CBD5]/60 hover:text-white transition-colors p-1"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="submit-rotation-btn"
              disabled={loading}
              className="w-full mt-4 py-3 rounded-xl font-heading font-bold text-sm text-white bg-gradient-to-r from-[#35D16F] to-[#24A855] hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(53,209,111,0.35)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري حفظ كلمة المرور...</span>
                </>
              ) : (
                <span>حفظ كلمة المرور والمتابعة</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

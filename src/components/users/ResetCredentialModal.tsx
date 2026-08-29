import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserAccount } from '../../types';
import { X, KeyRound, Lock, Eye, EyeOff, AlertTriangle, Check } from 'lucide-react';

interface ResetCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  mode: 'PASSWORD' | 'PIN';
}

export const ResetCredentialModal: React.FC<ResetCredentialModalProps> = ({
  isOpen,
  onClose,
  user,
  mode,
}) => {
  const { language, resetUserPassword, resetUserPin } = useApp();
  const isBangla = language === 'bn';

  const [credential, setCredential] = useState('');
  const [confirmCredential, setConfirmCredential] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const isPassword = mode === 'PASSWORD';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanVal = credential.trim();
    if (!cleanVal) {
      setError(
        isBangla
          ? `${isPassword ? 'পাসওয়ার্ড' : 'পিন'} প্রদান করা আবশ্যক।`
          : `${isPassword ? 'Password' : 'PIN'} is required.`
      );
      return;
    }

    if (isPassword && cleanVal.length < 4) {
      setError(
        isBangla
          ? 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।'
          : 'Password must be at least 4 characters.'
      );
      return;
    }

    if (!isPassword && cleanVal.length < 4) {
      setError(
        isBangla
          ? 'পিন কমপক্ষে ৪ সংখ্যার হতে হবে।'
          : 'PIN must be at least 4 digits.'
      );
      return;
    }

    if (cleanVal !== confirmCredential.trim()) {
      setError(
        isBangla
          ? `${isPassword ? 'পাসওয়ার্ড' : 'পিন'} দুটি মিলছে না।`
          : `${isPassword ? 'Passwords' : 'PINs'} do not match.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (isPassword) {
        const res = await resetUserPassword(user.userId, cleanVal);
        if (res.success) {
          onClose();
        } else {
          setError(res.message);
        }
      } else {
        const res = await resetUserPin(user.userId, cleanVal);
        if (res.success) {
          onClose();
        } else {
          setError(res.message);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update credential');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              {isPassword ? (
                <Lock className="w-5 h-5 text-emerald-400" />
              ) : (
                <KeyRound className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isPassword
                  ? isBangla
                    ? 'পাসওয়ার্ড রিসেট'
                    : 'Reset User Password'
                  : isBangla
                  ? 'পিন রিসেট'
                  : 'Reset User PIN'}
              </h2>
              <p className="text-xs text-slate-300 font-mono">
                {user.fullName} ({user.username})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            id="close-reset-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isBangla
                ? `নতুন ${isPassword ? 'পাসওয়ার্ড' : 'পিন'} *`
                : `New ${isPassword ? 'Password' : 'PIN'} *`}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                maxLength={isPassword ? 32 : 6}
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                placeholder={isPassword ? '••••••••' : '1234'}
                id="reset-credential-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isBangla
                ? `${isPassword ? 'পাসওয়ার্ড' : 'পিন'} নিশ্চিত করুন *`
                : `Confirm ${isPassword ? 'Password' : 'PIN'} *`}
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              maxLength={isPassword ? 32 : 6}
              value={confirmCredential}
              onChange={(e) => setConfirmCredential(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
              placeholder={isPassword ? '••••••••' : '1234'}
              id="reset-confirm-credential-input"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              id="cancel-reset-btn"
            >
              {isBangla ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-200 flex items-center gap-2 transition-all"
              id="confirm-reset-btn"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isBangla ? 'সংরক্ষণ করুন' : 'Confirm Reset'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

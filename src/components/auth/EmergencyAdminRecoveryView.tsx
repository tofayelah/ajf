import React, { useState } from 'react';
import { ShieldAlert, KeyRound, AlertTriangle, ArrowLeft, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface EmergencyAdminRecoveryViewProps {
  onBack: () => void;
}

export const EmergencyAdminRecoveryView: React.FC<EmergencyAdminRecoveryViewProps> = ({ onBack }) => {
  const { activeUser } = useApp();
  const [recoverySecret, setRecoverySecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [resetPassword, setResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    designatedAdmin?: { username: string; status: string };
  } | null>(null);

  // User/Member Protection: if an authenticated member accesses this page, block them
  if (activeUser && activeUser.role === 'MEMBER') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-rose-500/40 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-300 text-sm mb-6">
            Members are strictly forbidden from accessing Emergency Administrator Recovery.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessResult(null);

    if (resetPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/emergency-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recoverySecret,
          confirmationPhrase,
          resetPassword,
          newPassword: resetPassword ? newPassword : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Emergency recovery verification failed.');
      } else {
        setSuccessResult({
          message: data.message || 'Emergency recovery executed successfully.',
          designatedAdmin: data.designatedAdmin
        });
        setRecoverySecret('');
        setConfirmationPhrase('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('Emergency recovery request failed. Please check network connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg">
        {/* Header with Back button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Login</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3.5 mb-5 pb-5 border-b border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">
                Emergency Admin Recovery
              </h1>
              <p className="text-xs font-medium text-amber-400/90">
                জরুরি অ্যাডমিন রিকভারি (Break-Glass Access)
              </p>
            </div>
          </div>

          {/* Mandatory Security Warning Banner */}
          <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold block text-amber-300 mb-0.5">
                Restricted Break-Glass Procedure
              </strong>
              This is an emergency break-glass operation. Use only when all normal administrator access is unavailable.
            </div>
          </div>

          {/* Success Message Banner */}
          {successResult && (
            <div className="mb-6 p-5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200">
              <div className="flex items-center gap-2 font-bold text-emerald-300 mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Recovery Successful</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 mb-4">
                {successResult.message}
              </p>
              {successResult.designatedAdmin && (
                <div className="text-xs bg-slate-950/60 p-3 rounded-lg border border-emerald-900/50 mb-4 space-y-1">
                  <div><span className="text-slate-400">Designated Admin:</span> <strong className="text-white">{successResult.designatedAdmin.username}</strong></div>
                  <div><span className="text-slate-400">Account Status:</span> <strong className="text-emerald-400">{successResult.designatedAdmin.status}</strong></div>
                </div>
              )}
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-colors"
              >
                Proceed to Login with Designated Admin
              </button>
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!successResult && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Emergency Recovery Secret */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Emergency Recovery Secret
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={recoverySecret}
                    onChange={(e) => setRecoverySecret(e.target.value)}
                    required
                    autoComplete="off"
                    placeholder="Enter break-glass recovery secret"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm font-mono placeholder:text-slate-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmation Phrase */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirmation Phrase
                </label>
                <input
                  type="text"
                  value={confirmationPhrase}
                  onChange={(e) => setConfirmationPhrase(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder="EMERGENCY RECOVERY AJF ADMIN"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white rounded-xl px-3.5 py-2.5 text-sm font-mono placeholder:text-slate-600 transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Type exactly: <span className="font-mono text-amber-300 select-all">EMERGENCY RECOVERY AJF ADMIN</span>
                </p>
              </div>

              {/* Optional Password Reset Checkbox */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={resetPassword}
                    onChange={(e) => setResetPassword(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Reset Administrator Password as part of recovery</span>
                </label>
              </div>

              {/* Collapsible Password Fields */}
              {resetPassword && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      New Password (Min 8 chars, A-Z, 0-9, special)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new strong password"
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-mono pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isLoading || !recoverySecret || confirmationPhrase !== 'EMERGENCY RECOVERY AJF ADMIN'}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>Recover Administrator Access</span>
                </button>
              </div>
            </form>
          )}

          {/* Footer Security Note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500 leading-normal">
              Server-authoritative break-glass recovery. Financial ledgers, transaction records, and member accounts are completely isolated from recovery operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, KeyRound, LogIn, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AJFLogo } from '../common/AJFLogo';

export const LoginView: React.FC = () => {
  const { login, language, db } = useApp();
  const isBangla = language === 'bn';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const success = await login(username, password);
      if (!success) {
        setError(isBangla ? 'ভুল ইউজারনেম বা পাসওয়ার্ড' : 'Invalid username or password');
        setIsLoading(false);
      }
    } catch {
      setError(isBangla ? 'লগইন করতে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন' : 'Authentication error, please try again');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 select-none font-sans">
      <div className="w-full max-w-[420px] my-auto">
        {/* Main Login Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/90 p-6 sm:p-8 transition-all">
          
          {/* Header Section */}
          <div className="flex flex-col items-center justify-center text-center mb-6">
            {/* Official AJF Logo */}
            <div className="mb-3 flex justify-center">
              <AJFLogo variant="login" />
            </div>

            {/* Application Branding */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-none">
              AJF
            </h1>
            <p className="text-xs sm:text-sm font-bold text-emerald-800 tracking-widest uppercase mt-1">
              MANAGEMENT SYSTEM
            </p>

            {/* Configured Society Name */}
            <div className="text-xs sm:text-sm text-slate-600 font-medium mt-2 max-w-xs mx-auto leading-relaxed">
              {isBangla ? (
                <span>{db.settings.orgNameBangla || 'তাতরগাঁও জাগরণী ক্লাব ব্যবসায়িক তহবিল ও কল্যাণ সমিতি'}</span>
              ) : (
                <span>{db.settings.orgName}</span>
              )}
            </div>

            <p className="text-[11px] sm:text-xs text-slate-400 font-normal mt-1">
              {isBangla ? 'সিস্টেমে প্রবেশ করতে লগইন করুন' : 'Login to access the system'}
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div
              id="login-error-alert"
              role="alert"
              className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm font-semibold text-center flex items-center justify-center gap-2 animate-shake"
            >
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            {/* Username / Mobile Field */}
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                {isBangla ? 'মোবাইল / ইউজারনেম' : 'Mobile / Username'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 sm:pl-11 w-full bg-slate-50 hover:bg-slate-50/80 border border-slate-300 focus:bg-white rounded-xl px-3.5 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all"
                  placeholder={isBangla ? 'আপনার ইউজারনেম লিখুন' : 'Enter your username'}
                />
              </div>
            </div>

            {/* Password / PIN Field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                {isBangla ? 'পাসওয়ার্ড / পিন' : 'Password / PIN'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 sm:pl-11 pr-11 w-full bg-slate-50 hover:bg-slate-50/80 border border-slate-300 focus:bg-white rounded-xl px-3.5 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  id="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="btn-login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-70 text-white rounded-xl py-3.5 px-4 text-sm sm:text-base font-bold shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                <span>
                  {isLoading
                    ? isBangla
                      ? 'অপেক্ষা করুন...'
                      : 'Authenticating...'
                    : isBangla
                    ? 'লগইন করুন'
                    : 'Login'}
                </span>
              </button>
            </div>
          </form>

          {/* Footer Security Badge & Developer Credit */}
          <div className="mt-7 pt-5 border-t border-slate-100 flex flex-col items-center justify-center text-center space-y-2">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isBangla ? 'সুরক্ষিত ক্লাউড ডাটাবেজ অ্যান্ড এনক্রিপশন' : 'Secure Cloud Database & Encryption'}</span>
            </div>
            
            <div className="pt-1 text-xs text-slate-400 font-medium">
              <span>Software development by - </span>
              <span className="font-semibold text-slate-700">Tofayel Ahmed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


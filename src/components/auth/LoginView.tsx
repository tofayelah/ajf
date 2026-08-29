import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, User, KeyRound, LogIn } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, language, db } = useApp();
  const isBangla = language === 'bn';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (!success) {
      setError(isBangla ? 'ভুল ইউজারনেম বা পাসওয়ার্ড' : 'Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            {isBangla ? db.settings.orgNameBangla : db.settings.orgName}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {isBangla ? 'সিস্টেমে প্রবেশ করতে লগইন করুন' : 'Login to access the system'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isBangla ? 'মোবাইল / ইউজারনেম' : 'Mobile / Username'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder={isBangla ? 'আপনার ইউজারনেম লিখুন' : 'Enter your username'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isBangla ? 'পাসওয়ার্ড / পিন' : 'Password / PIN'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-emerald-200 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <LogIn className="w-5 h-5" />
            <span>{isBangla ? 'লগইন করুন' : 'Login'}</span>
          </button>
        </form>

        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-800 font-bold mb-2">Demo Credentials:</p>
          <ul className="text-[11px] text-amber-700 space-y-1">
            <li>Admin: <span className="font-mono bg-white px-1 rounded border border-amber-300">admin</span> / <span className="font-mono bg-white px-1 rounded border border-amber-300">123456</span></li>
            <li>Member: Create a login from Member Profile</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

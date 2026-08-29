import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell } from 'lucide-react';

export const MemberNotificationsView: React.FC = () => {
  const { language } = useApp();
  const isBangla = language === 'bn';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-6">
        <Bell className="w-6 h-6 text-emerald-600" />
        <span>{isBangla ? 'নোটিফিকেশন' : 'Notifications'}</span>
      </h1>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
        <Bell className="w-12 h-12 mx-auto text-slate-300 mb-4" />
        <p>{isBangla ? 'আপনার কোনো নতুন নোটিফিকেশন নেই।' : 'You have no new notifications.'}</p>
      </div>
    </div>
  );
};

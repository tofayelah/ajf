import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Plus,
  X,
  UserPlus,
  Receipt,
  PiggyBank,
  HandCoins,
  ArrowDownToLine,
  TrendingUp,
  TrendingDown,
  HeartHandshake
} from 'lucide-react';

interface SpeedDialFabProps {
  onQuickAction: (action: string) => void;
}

export const SpeedDialFab: React.FC<SpeedDialFabProps> = ({ onQuickAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, activeUser } = useApp();
  const isBangla = language === 'bn';

  if (activeUser?.role === 'MEMBER') return null;


  const actions = [
    {
      id: 'NEW_MEMBER',
      labelBn: 'নতুন সদস্য ভর্তি',
      labelEn: 'New Member',
      icon: UserPlus,
      color: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    {
      id: 'COLLECT_MONTHLY',
      labelBn: 'মাসিক চাঁদা আদায়',
      labelEn: 'Collect Monthly',
      icon: Receipt,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    },
    {
      id: 'CAPITAL_DEPOSIT',
      labelBn: 'মূলধন জমা ভাউচার',
      labelEn: 'Capital Deposit',
      icon: PiggyBank,
      color: 'bg-indigo-600 hover:bg-indigo-700 text-white'
    },
    {
      id: 'LOAN_APPLICATION',
      labelBn: 'ঋণ আবেদন ও বিতরণ',
      labelEn: 'Loan Management',
      icon: HandCoins,
      color: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    {
      id: 'LOAN_REPAYMENT',
      labelBn: 'ঋণ কিস্তি আদায়',
      labelEn: 'Loan Repayment',
      icon: ArrowDownToLine,
      color: 'bg-teal-600 hover:bg-teal-700 text-white'
    },
    {
      id: 'RECORD_INCOME',
      labelBn: 'বিবিধ আয় রেকর্ড',
      labelEn: 'Record Income',
      icon: TrendingUp,
      color: 'bg-green-600 hover:bg-green-700 text-white'
    },
    {
      id: 'RECORD_EXPENSE',
      labelBn: 'ব্যয় ভাউচার এন্ট্রি',
      labelEn: 'Record Expense',
      icon: TrendingDown,
      color: 'bg-rose-600 hover:bg-rose-700 text-white'
    },
    {
      id: 'WELFARE_PAYMENT',
      labelBn: 'কল্যাণ ও জরুরী অনুদান',
      labelEn: 'Welfare Grant',
      icon: HeartHandshake,
      color: 'bg-purple-600 hover:bg-purple-700 text-white'
    }
  ];

  return (
    <div className="fixed bottom-16 right-4 sm:right-6 z-40 flex flex-col items-end">
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-30 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Speed Dial Menu Items */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2.5 mb-3 z-40 animate-in slide-in-from-bottom-5 duration-200">
          {actions.map(act => {
            const Icon = act.icon;
            return (
              <div key={act.id} className="flex items-center gap-2 group">
                <span className="bg-slate-900/90 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-md border border-slate-700 whitespace-nowrap">
                  {isBangla ? act.labelBn : act.labelEn}
                </span>
                <button
                  id={`btn-speed-dial-${(act.id || "").toLowerCase()}`}
                  onClick={() => {
                    onQuickAction(act.id);
                    setIsOpen(false);
                  }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${act.color}`}
                  aria-label={act.labelEn}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        id="btn-main-fab"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 z-40 ${
          isOpen
            ? 'bg-rose-600 hover:bg-rose-700 text-white rotate-90 scale-105'
            : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/40 hover:scale-105'
        }`}
        aria-label="Quick Actions Speed Dial"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-7 h-7" />}
      </button>
    </div>
  );
};

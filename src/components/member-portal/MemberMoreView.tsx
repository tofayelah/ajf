import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LineChart,
  Bell,
  Receipt,
  BookOpen,
  User,
  Globe,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const MemberMoreView: React.FC = () => {
  const { db, activeUser, language, setLanguage, logout, navigateTo } = useApp();
  const isBangla = language === 'bn';

  // Identify member record
  const member = (db.members || []).find(m => m.memberId === activeUser?.linkedMemberId);

  const moreSections = [
    {
      titleBn: 'সমিতি ও আর্থিক বিবরণী',
      titleEn: 'Society & Financial Information',
      items: [
        {
          id: 'FINANCIAL_SUMMARY',
          titleBn: 'সমিতির আর্থিক অবস্থা',
          titleEn: 'Society Financial Summary',
          descBn: 'সমিতির মূলধন, আদায়, মোট বিনিয়োগ ও রিজার্ভের সারসংক্ষেপ',
          descEn: 'Overview of society capital, collection, investment & reserves',
          icon: LineChart,
          badgeBn: 'লাইভ',
          badgeEn: 'Live',
          badgeColor: 'bg-emerald-100 text-emerald-800',
          onClick: () => navigateTo('MEMBER_FINANCIAL_SUMMARY' as any)
        },
        {
          id: 'NOTIFICATIONS',
          titleBn: 'নোটিফিকেশন ও ঘোষণা',
          titleEn: 'Notice & Announcements',
          descBn: 'সমিতির সাম্প্রতিক নোটিশ ও গুরুত্বপূর্ণ বার্তা',
          descEn: 'Latest announcements and official notices',
          icon: Bell,
          badgeBn: 'বিজ্ঞপ্তি',
          badgeEn: 'Notices',
          badgeColor: 'bg-blue-100 text-blue-800',
          onClick: () => navigateTo('NOTIFICATIONS' as any)
        }
      ]
    },
    {
      titleBn: 'আমার হিসাব ও পোর্টাল',
      titleEn: 'My Accounts & Portal',
      items: [
        {
          id: 'MEMBER_CHANDA_PAYMENT',
          titleBn: 'চাঁদা পরিশোধের অনুরোধ',
          titleEn: 'Chanda Payment Requests',
          descBn: 'অনলাইন ও অফলাইন চাঁদা জমাদান এবং জমার স্ট্যাটাস',
          descEn: 'Submit and track your monthly chanda payment requests',
          icon: Receipt,
          onClick: () => navigateTo('MEMBER_CHANDA_PAYMENT' as any)
        },
        {
          id: 'MEMBER_LEDGER',
          titleBn: 'আমার খতিয়ান',
          titleEn: 'My Member Ledger',
          descBn: 'মাসিক চাঁদা, মূলধন ও কল্যাণ ফান্ডের পূর্ণাঙ্গ লেনদেন বিবরণী',
          descEn: 'Complete financial ledger statement for your membership',
          icon: BookOpen,
          onClick: () => navigateTo('MEMBER_LEDGER' as any)
        },
        {
          id: 'MEMBER_PROFILE',
          titleBn: 'আমার প্রোফাইল',
          titleEn: 'My Member Profile',
          descBn: 'ব্যক্তিগত তথ্য, যোগাযোগ ঠিকানা ও নমিনি তথ্য হালনাগাদ',
          descEn: 'View and update your personal and contact details',
          icon: User,
          onClick: () => navigateTo('MEMBER_PROFILE' as any)
        }
      ]
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Member Profile Quick Card */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-700/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            {member?.photo ? (
              <img
                src={member.photo}
                alt={member.fullName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="w-8 h-8 text-white/80" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white truncate">
                {member?.fullName || activeUser?.fullName || 'Member'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                {member?.memberId || activeUser?.linkedMemberId || 'AJF-MEMBER'}
              </span>
            </div>
            <p className="text-emerald-200/90 text-xs sm:text-sm mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isBangla ? 'সাধারণ সদস্য • সক্রিয় সদস্যপদ' : 'General Member • Active Membership'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      {moreSections.map((section, sIdx) => (
        <div key={sIdx} className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            {isBangla ? section.titleBn : section.titleEn}
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {section.items.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  id={`btn-more-${item.id.toLowerCase()}`}
                  onClick={item.onClick}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-800 transition-colors">
                          {isBangla ? item.titleBn : item.titleEn}
                        </span>
                        {item.badgeBn && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.badgeColor}`}>
                            {isBangla ? item.badgeBn : item.badgeEn}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {isBangla ? item.descBn : item.descEn}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* App Preferences & Logout */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          {isBangla ? 'সিস্টেম ও পছন্দসমূহ' : 'Preferences & Session'}
        </h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {/* Language Switch */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800 block">
                  {isBangla ? 'অ্যাপের ভাষা' : 'App Language'}
                </span>
                <span className="text-xs text-slate-500">
                  {isBangla ? 'বর্তমানে: বাংলা' : 'Current: English'}
                </span>
              </div>
            </div>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                id="btn-more-lang-bn"
                type="button"
                onClick={() => setLanguage('bn')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  isBangla ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                বাংলা
              </button>
              <button
                id="btn-more-lang-en"
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  !isBangla ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Logout Action */}
          <button
            id="btn-more-logout"
            type="button"
            onClick={() => {
              if (window.confirm(isBangla ? 'আপনি কি নিশ্চিত যে লগআউট করতে চান?' : 'Are you sure you want to log out?')) {
                logout();
              }
            }}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-rose-50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-100 transition-colors">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-rose-700">
                  {isBangla ? 'লগআউট করুন' : 'Sign Out'}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  {isBangla ? 'আপনার মেম্বার সেশন নিরাপদে শেষ করুন' : 'Securely end your member session'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-rose-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </div>
      </div>

      {/* Organization Footer Note */}
      <div className="text-center py-2 text-xs text-slate-400">
        <p className="font-semibold text-slate-500">
          {isBangla ? 'আহমেদাবাদ যুব ফাউন্ডেশন (AJF)' : 'Ahmedabad Jubo Foundation (AJF)'}
        </p>
        <p className="text-[11px] mt-0.5">
          {isBangla ? 'সদস্য ব্যবস্থাপনা ও হিসাব পোর্টাল' : 'Member Management & Accounting Portal'}
        </p>
      </div>
    </div>
  );
};

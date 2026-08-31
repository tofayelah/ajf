import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Globe,
  Bell,
  Smartphone,
  Monitor,
  Menu,
  ShieldAlert,
  UserCheck,
  Building2,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../../types';
import { AJFLogo } from '../common/AJFLogo';
import { RuntimeStatus } from '../common/RuntimeStatus';

interface TopAppBarProps {
  onOpenDrawer: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({ onOpenDrawer }) => {
  const {
    db,
    activeUser,
    language,
    setLanguage,
    isMobileDeviceView,
    toggleMobileDeviceView,
    setIsSearchOpen,
    switchUserRole,
    loadDemoData,
    logout,
    navigateTo
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const isBangla = language === 'bn';

  const roles: { role: UserRole; labelBn: string; labelEn: string }[] = [
    { role: 'ADMIN', labelBn: 'সুপার এডমিন', labelEn: 'Super Admin' },
    { role: 'ADMIN', labelBn: 'সভাপতি', labelEn: 'President' },
    { role: 'ADMIN', labelBn: 'সাধারণ সম্পাদক', labelEn: 'General Secretary' },
    { role: 'ACCOUNTANT', labelBn: 'কোষাধ্যক্ষ', labelEn: 'Treasurer' },
    { role: 'ACCOUNTANT', labelBn: 'হিসাবরক্ষক', labelEn: 'Accountant' },
    { role: 'COLLECTION_OFFICER', labelBn: 'চাঁদা আদায়কারী', labelEn: 'Collector' },
    { role: 'AUDITOR', labelBn: 'কমিটি সদস্য', labelEn: 'Committee Member' },
    { role: 'AUDITOR', labelBn: 'পরিদর্শক', labelEn: 'Viewer' }
  ];

  return (
    <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-30">
      {/* Organization Banner / Notification Stripe */}
      {db.settings.isDemoMode && (
        <div className="bg-amber-500 text-slate-900 text-xs font-bold px-3 py-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="bg-black text-white px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase">
              DEMO MODE
            </span>
            <span>{isBangla ? 'পরীক্ষামূলক ডেমো ডেটা মোড চালু আছে' : 'Demo Mode Active'}</span>
          </div>
          <button
            onClick={() => navigateTo('SETTINGS')}
            className="underline hover:text-white transition-colors"
          >
            {isBangla ? 'সেটিংস' : 'Settings'}
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section: Navigation Toggle, Brand Identity & Dynamic Runtime Status */}
        <div className="flex items-center justify-start gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Navigation Drawer Button (Mobile/Tablet) */}
          <button
            id="btn-app-drawer"
            onClick={onOpenDrawer}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-emerald-700 active:bg-emerald-900 transition-colors focus:outline-none lg:hidden shrink-0"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>

          {/* Logo & Brand Info */}
          <div
            onClick={() => navigateTo('DASHBOARD')}
            className="cursor-pointer select-none flex items-center gap-2 sm:gap-2.5 min-w-0"
          >
            <AJFLogo variant="header" className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="font-bold text-xs sm:text-sm md:text-base leading-tight tracking-tight whitespace-nowrap">
                  {isBangla ? db.settings.orgShortName : 'AJ Welfare Society'}
                </h1>
                <span className="hidden xl:inline-block text-[10px] bg-emerald-700/90 text-emerald-100 px-1.5 py-0.5 rounded-full border border-emerald-600/60 shrink-0">
                  {db.settings.location}
                </span>
                <RuntimeStatus className="shrink-0" hideTextOnMobile={true} />
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-200/90 leading-none truncate max-w-[140px] sm:max-w-[260px] md:max-w-[360px] mt-0.5">
                "{isBangla ? db.settings.slogan : db.settings.sloganEnglish}"
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Header Utilities & User Profile Actions */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Search */}
          <button
            id="btn-global-search"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-700/80 hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg text-xs transition-colors border border-emerald-600/50"
            title="গ্লোবাল অনুসন্ধান (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-emerald-200" />
            <span className="hidden sm:inline text-emerald-100">
              {isBangla ? 'অনুসন্ধান...' : 'Search...'}
            </span>
          </button>

          {/* Language Switch */}
          <button
            id="btn-toggle-lang"
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1 bg-emerald-900/60 hover:bg-emerald-900 px-2 py-1.5 rounded-lg text-xs font-semibold border border-emerald-700 transition-colors"
            title="ভাষা পরিবর্তন / Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-300" />
            <span>{language === 'bn' ? 'বাং' : 'EN'}</span>
          </button>

          {/* Toggle Device Frame View */}
          <button
            id="btn-toggle-device-view"
            onClick={toggleMobileDeviceView}
            className={`p-1.5 rounded-lg border transition-colors hidden sm:flex items-center justify-center ${
              isMobileDeviceView
                ? 'bg-amber-400 text-slate-900 border-amber-300'
                : 'bg-emerald-900/60 hover:bg-emerald-900 text-white border-emerald-700'
            }`}
            title={
              isMobileDeviceView
                ? 'ডেস্কটপ ফুল স্ক্রিন মোডে যান'
                : 'অ্যান্ড্রয়েড মোবাইল ফ্রেম সিমুলেশন'
            }
          >
            {isMobileDeviceView ? (
              <Monitor className="w-4 h-4" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
          </button>

          {/* Role Switcher */}
          <div className="relative">
            <button
              id="btn-switch-role-menu"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-1.5 bg-emerald-900/80 hover:bg-emerald-900 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-700 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden md:inline max-w-[110px] truncate">
                {isBangla ? (activeUser?.fullName?.split(' ')[0] || activeUser?.username) : activeUser?.role}
              </span>
              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                {activeUser.role === 'ADMIN' ? 'Admin' : activeUser.role.slice(0, 5)}
              </span>
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">
                    {isBangla ? 'বর্তমান ব্যবহারকারী ও পদবী:' : 'Active Role:'}
                  </p>
                  <p className="text-sm font-bold text-emerald-800">{activeUser?.fullName || activeUser?.username}</p>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {(roles || []).map((r, idx) => (
                    <button
                      key={`${r.role}-${r.labelEn}-${idx}`}
                      onClick={() => {
                        switchUserRole(r.role);
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                        activeUser.role === r.role
                          ? 'bg-emerald-100/70 text-emerald-900 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      <span>{isBangla ? r.labelBn : r.labelEn}</span>
                      {activeUser.role === r.role && (
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-100 flex flex-col gap-1">
                  {!db.settings.isDemoMode && (
                    <button
                      onClick={() => {
                        loadDemoData();
                        setIsRoleDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-1.5 px-2 rounded-lg transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isBangla ? 'ডেমো ডেটা লোড করুন' : 'Load Demo Data'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      navigateTo('USERS');
                      setIsRoleDropdownOpen(false);
                    }}
                    className="w-full text-center text-xs text-emerald-700 hover:underline py-1"
                  >
                    {isBangla ? 'ব্যবহারকারী ও রোল সেটিংস' : 'Manage Users & Permissions'}
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setIsRoleDropdownOpen(false);
                    }}
                    className="w-full text-center text-xs text-rose-700 hover:bg-rose-50 font-bold py-1.5 rounded-lg transition-colors mt-1"
                  >
                    {isBangla ? 'লগআউট' : 'Logout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { useApp, MainNavTab } from '../../context/AppContext';
import { Home, User, Receipt, BookOpen, MoreHorizontal } from 'lucide-react';

export const BottomNavigationBar: React.FC = () => {
  const { activeNavTab, activeScreen, setNavTab, language } = useApp();
  const isBangla = language === 'bn';

  // EXACT FIXED ORDER:
  // 1. Home
  // 2. Profile
  // 3. Collection
  // 4. Ledger
  // 5. More
  const navItems: {
    id: MainNavTab;
    labelBn: string;
    labelEn: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'HOME',
      labelBn: 'হোম',
      labelEn: 'Home',
      icon: Home
    },
    {
      id: 'PROFILE',
      labelBn: 'প্রোফাইল',
      labelEn: 'Profile',
      icon: User
    },
    {
      id: 'COLLECTION',
      labelBn: 'চাঁদা',
      labelEn: 'Collection',
      icon: Receipt
    },
    {
      id: 'LEDGER',
      labelBn: 'খতিয়ান',
      labelEn: 'Ledger',
      icon: BookOpen
    },
    {
      id: 'MORE',
      labelBn: 'অন্যান্য',
      labelEn: 'More',
      icon: MoreHorizontal
    }
  ];

  const isItemActive = (id: MainNavTab): boolean => {
    if (id === 'HOME') {
      return activeNavTab === 'HOME' || activeScreen === 'DASHBOARD';
    }
    if (id === 'PROFILE') {
      return (
        activeNavTab === 'PROFILE' ||
        activeNavTab === 'MEMBERS' ||
        ['PROFILE', 'MEMBER_PROFILE', 'MEMBERS', 'MEMBER_DETAIL', 'ADMISSION'].includes(activeScreen as string)
      );
    }
    if (id === 'COLLECTION') {
      return (
        activeNavTab === 'COLLECTION' ||
        ['COLLECTION', 'COLLECTIONS', 'MEMBER_CHANDA_PAYMENT', 'DUE_MANAGEMENT', 'PAYMENT_REQUESTS'].includes(activeScreen as string)
      );
    }
    if (id === 'LEDGER') {
      return (
        activeNavTab === 'LEDGER' ||
        activeNavTab === 'FINANCE' ||
        ['LEDGER', 'MEMBER_LEDGER', 'FINANCE', 'CAPITAL', 'LOANS', 'INVESTMENTS', 'ACCOUNTS', 'CASH_BOOK', 'BANK_BOOK', 'INCOME_EXPENSE', 'WELFARE', 'PROFIT'].includes(activeScreen as string)
      );
    }
    if (id === 'MORE') {
      return (
        activeNavTab === 'MORE' ||
        ['MORE', 'MEMBER_FINANCIAL_SUMMARY', 'FINANCIAL_SUMMARY', 'SOCIETY_FINANCIAL_STATUS', 'FINANCIAL_STATUS', 'NOTIFICATIONS', 'SETTINGS', 'REPORTS', 'USERS', 'AUDIT_LOG', 'INTEGRITY_CHECK', 'BACKUP_RESTORE'].includes(activeScreen as string)
      );
    }
    return false;
  };

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 w-full z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="grid grid-cols-5 items-center w-full max-w-lg mx-auto">
        {navItems.map(item => {
          const isActive = isItemActive(item.id);
          const Icon = item.icon;
          const buttonId = `btn-nav-${item.labelEn.toLowerCase()}`;

          return (
            <button
              key={item.id}
              id={buttonId}
              type="button"
              onClick={() => setNavTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 transition-all relative cursor-pointer select-none ${
                isActive ? 'text-emerald-800 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {/* Material 3 / AJF active pill indicator background */}
              <div
                className={`px-3 sm:px-4 py-1 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-800 scale-105 shadow-xs'
                    : 'bg-transparent text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>

              {/* Label */}
              <span className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight truncate max-w-full px-0.5 leading-tight ${
                isActive ? 'font-bold text-emerald-800' : 'text-slate-500'
              }`}>
                {isBangla ? item.labelBn : item.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

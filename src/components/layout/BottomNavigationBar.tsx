import React from 'react';
import { useApp, MainNavTab } from '../../context/AppContext';
import { LayoutDashboard, Users, Receipt, Landmark, MoreHorizontal } from 'lucide-react';
import { AccountingService } from '../../services/accounting';

export const BottomNavigationBar: React.FC = () => {
  const { activeNavTab, setNavTab, db, language, activeUser } = useApp();
  const isBangla = language === 'bn';

  // Compute live due count badge
  const dueSummary = AccountingService.calculateFinancialSummary(db);
  const dueCount = dueSummary.membersWithDueCount;

  const navItems: {
    id: MainNavTab;
    labelBn: string;
    labelEn: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    {
      id: 'HOME',
      labelBn: 'ড্যাশবোর্ড',
      labelEn: 'Home',
      icon: LayoutDashboard
    },
    {
      id: 'MEMBERS',
      labelBn: activeUser?.role === 'MEMBER' ? 'প্রোফাইল' : 'সদস্য',
      labelEn: activeUser?.role === 'MEMBER' ? 'Profile' : 'Members',
      icon: Users,
      badge: activeUser?.role === 'MEMBER' ? undefined : (db.members || []).length
    },
    {
      id: 'COLLECTION',
      labelBn: 'চাঁদা আদায়',
      labelEn: 'Collection',
      icon: Receipt,
      badge: dueCount > 0 ? dueCount : undefined
    },
    {
      id: 'FINANCE',
      labelBn: activeUser?.role === 'MEMBER' ? 'লেজার' : 'হিসাব বই',
      labelEn: activeUser?.role === 'MEMBER' ? 'Ledger' : 'Finance',
      icon: Landmark
    },
    {
      id: 'MORE',
      labelBn: 'অন্যান্য',
      labelEn: 'More',
      icon: MoreHorizontal
    }
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      className="bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around select-none sticky bottom-0 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
    >
      {navItems.map(item => {
        const isActive = activeNavTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            id={`btn-nav-${(item.id || "").toLowerCase()}`}
            onClick={() => setNavTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative ${
              isActive ? 'text-emerald-800 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {/* Material 3 active pill indicator background */}
            <div
              className={`px-4 py-1 rounded-full flex items-center justify-center transition-all ${
                isActive ? 'bg-emerald-100 text-emerald-800 scale-105' : 'bg-transparent text-slate-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>

            {/* Badge Indicator */}
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={`absolute top-0.5 right-[24%] min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${
                  item.id === 'COLLECTION' ? 'bg-rose-500' : 'bg-emerald-600'
                }`}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}

            <span className="text-[11px] mt-0.5 tracking-tight">
              {isBangla ? item.labelBn : item.labelEn}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

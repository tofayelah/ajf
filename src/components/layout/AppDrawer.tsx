import React, { useState } from 'react';
import { 
  Users, UserPlus, CreditCard, PiggyBank,
  Landmark, ArrowRightLeft, FileText, Settings,
  LogOut, Shield, ChevronLeft, CalendarDays, Receipt,
  BookOpen, Calculator, BarChart3, TrendingUp, HandCoins,
  History, Scale, Key, FileSpreadsheet, PlusCircle,
  Building2, Users2, LineChart, Briefcase, ChevronDown, ChevronRight, UserMinus, ShieldCheck, CheckCircle, HeartHandshake
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AppDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AppDrawer: React.FC<AppDrawerProps> = ({ isOpen = false, onClose }) => {
  const { activeScreen, navigateTo, language, logout, activeUser } = useApp();
  const isBangla = language === 'bn';
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'member-settlement': true
  });

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const sections = [
    {
      title: isBangla ? 'সদস্য ব্যবস্থাপনা' : 'Member Menu',
      roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'],
      items: [
        { id: 'MEMBERS', icon: Users, label: isBangla ? 'সদস্য তালিকা ও রেজিস্টার' : 'Member Master / Register', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'MEMBER_LEDGER', icon: BookOpen, label: isBangla ? 'সদস্য খতিয়ান' : 'Member Ledger', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'COLLECTIONS', icon: CreditCard, label: isBangla ? 'সদস্য চাঁদা ও আদায়' : 'Member Collections', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'CAPITAL', icon: PiggyBank, label: isBangla ? 'সদস্য মূলধন' : 'Member Capital', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'SETTLEMENT_DASHBOARD', icon: Briefcase, label: isBangla ? 'সদস্য নিষ্পত্তি' : 'Member Settlement', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'ADMISSION', icon: UserPlus, label: isBangla ? 'নতুন সদস্য নিবন্ধন' : 'Member Registration', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
      ]
    },
    {
      title: isBangla ? 'সদস্য নিষ্পত্তি মেনু' : 'Settlement Operations',
      id: 'member-settlement',
      roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'],
      items: [
        { id: 'SETTLEMENT_DASHBOARD', icon: Briefcase, label: isBangla ? 'নিষ্পত্তি ড্যাশবোর্ড' : 'Settlement Dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'NORMAL_MEMBER_EXIT', icon: UserMinus, label: isBangla ? 'সাধারণ প্রস্থান' : 'Normal Member Exit', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'EARLY_MEMBER_EXIT', icon: UserMinus, label: isBangla ? 'আগাম প্রস্থান' : 'Early Member Exit', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'EARLY_EXIT_REQUESTS', icon: HandCoins, label: isBangla ? 'আগাম প্রস্থান অনুরোধ' : 'Early Exit Requests', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'DEATH_SETTLEMENT', icon: ShieldCheck, label: isBangla ? 'মৃত্যু নিষ্পত্তি' : 'Death Settlement', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'PENDING_SETTLEMENT_APPROVALS', icon: Shield, label: isBangla ? 'অপেক্ষমাণ অনুমোদন' : 'Pending Approvals', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'COMPLETED_SETTLEMENTS', icon: CheckCircle, label: isBangla ? 'সম্পন্ন নিষ্পত্তি' : 'Completed Settlements', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'SETTLEMENT_REPORTS', icon: FileSpreadsheet, label: isBangla ? 'নিষ্পত্তি রিপোর্ট' : 'Settlement Reports', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
      ]
    },
    {
      title: isBangla ? 'আর্থিক লেনদেন' : 'Financial Operations',
      roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'],
      items: [
        { id: 'COLLECTIONS', icon: CreditCard, label: isBangla ? 'মাসিক জমা' : 'Collection', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'LOANS', icon: HandCoins, label: isBangla ? 'ঋণ ব্যবস্থাপনা' : 'Loan Management', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'CAPITAL', icon: PiggyBank, label: isBangla ? 'মূলধন জমা' : 'Capital Deposit', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'RESERVE_UTILIZATION', icon: TrendingUp, label: isBangla ? 'রিজার্ভ ব্যবহার' : 'Reserve Utilization', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'CASH_BOOK', icon: Landmark, label: isBangla ? 'নগদ হিসাব' : 'Cash Book', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'BANK_BOOK', icon: Building2, label: isBangla ? 'ব্যাংক হিসাব' : 'Bank Book', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'INCOME_EXPENSE', icon: PlusCircle, label: isBangla ? 'আয়-ব্যয় এন্ট্রি' : 'Income & Expense', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
      ]
    },
    {
      title: isBangla ? 'হিসাবরক্ষণ ও রিপোর্ট' : 'Accounting & Reports',
      roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'],
      items: [
        { id: 'CASH_RECONCILIATION', icon: Scale, label: isBangla ? 'ক্যাশ মিলকরণ' : 'Cash Reconciliation', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'BANK_RECONCILIATION', icon: Building2, label: isBangla ? 'ব্যাংক রিকনসিলিয়েশন' : 'Bank Reconciliation', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'ACCOUNTS', icon: Briefcase, label: isBangla ? 'হিসাব খাত' : 'Chart of Accounts', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'LEDGER', icon: FileText, label: isBangla ? 'খতিয়ান' : 'Ledger', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'REPORTS', icon: FileSpreadsheet, label: isBangla ? 'আর্থিক রিপোর্ট ও বিবরণী' : 'Financial Reports', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
        { id: 'PROFIT', icon: Calculator, label: isBangla ? 'মুনাফা বন্টন' : 'Profit Distribution', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER'] },
      ]
    },
    {
      title: isBangla ? 'কল্যাণ তহবিল' : 'Welfare & Others',
      roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'],
      items: [
        { id: 'WELFARE', icon: HeartHandshake, label: isBangla ? 'কল্যাণ তহবিল' : 'Welfare Fund', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'INVESTMENTS', icon: TrendingUp, label: isBangla ? 'বিনিয়োগ' : 'Investment', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'MEETINGS', icon: Users2, label: isBangla ? 'মিটিং' : 'Meetings', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
        { id: 'RESOLUTIONS', icon: FileText, label: isBangla ? 'রেজোলিউশন' : 'Resolutions', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
      ]
    },
    {
      title: isBangla ? 'প্রশাসন ও সেটিং' : 'Admin & Settings',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      items: [
        { id: 'COMMITTEE_MANAGEMENT', icon: Users, label: isBangla ? 'কমিটি ব্যবস্থাপনা' : 'Committee Management', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { id: 'USERS', icon: Shield, label: isBangla ? 'ব্যবহারকারী' : 'User Management', roles: ['SUPER_ADMIN'] },
        { id: 'FINANCIAL_YEAR', icon: CalendarDays, label: isBangla ? 'অর্থবছর' : 'Financial Year', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { id: 'SETTINGS', icon: Settings, label: isBangla ? 'সেটিংস' : 'Settings', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { id: 'AUDIT_LOG', icon: History, label: isBangla ? 'অডিট ট্রেইল' : 'Audit Trail', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { id: 'INTEGRITY_CHECK', icon: ShieldCheck, label: isBangla ? 'অ্যাকাউন্টিং ইন্টিগ্রিটি চেক' : 'Integrity Auditor', roles: ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'] },
      ]
    }
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out flex flex-col h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">Cooperative</h1>
              <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Management System</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors lg:hidden"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 custom-scrollbar">
          {sections.map((section, idx) => {
            const hasAccessToSection = section.roles.includes(activeUser?.role || '');
            if (!hasAccessToSection) return null;

            const visibleItems = section.items.filter(item => 
              item.roles.includes(activeUser?.role || '')
            );

            if (visibleItems.length === 0) return null;

            const isCollapsible = !!section.id;
            const isExpanded = section.id ? expandedMenus[section.id] : true;

            return (
              <div key={idx} className="space-y-1">
                {isCollapsible ? (
                  <button
                    onClick={() => toggleMenu(section.id!)}
                    className="w-full flex items-center justify-between px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-300 transition-colors"
                  >
                    <span>{section.title}</span>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                
                <div className={`space-y-0.5 ${!isExpanded ? 'hidden' : ''}`}>
                  {visibleItems.map((item) => {
                    const isActive = activeScreen === item.id;
                    const Icon = item.icon;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigateTo(item.id as any);
                          if (onClose) onClose();
                        }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200
                          ${isActive 
                            ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                        `}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-700/50 bg-slate-900 mt-auto">
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">
                {activeUser?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{activeUser?.username}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{activeUser?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 rounded-lg text-sm font-medium transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>{isBangla ? 'লগআউট' : 'Logout'}</span>
          </button>
        </div>
      </div>
    </>
  );
};

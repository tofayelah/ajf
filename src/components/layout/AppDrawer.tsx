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
      title: isBangla ? 'আমার পোর্টাল' : 'My Portal',
      roles: ['MEMBER'],
      items: [
        { id: 'DASHBOARD', icon: BarChart3, label: isBangla ? 'আমার ড্যাশবোর্ড' : 'Dashboard', roles: ['MEMBER'] },
        { id: 'MEMBER_FINANCIAL_SUMMARY', icon: LineChart, label: isBangla ? 'সমিতির আর্থিক অবস্থা' : 'Financial Summary', roles: ['MEMBER'] },
        { id: 'MEMBER_PROFILE', icon: Users, label: isBangla ? 'আমার প্রোফাইল' : 'My Profile', roles: ['MEMBER'] },
        { id: 'MEMBER_LEDGER', icon: BookOpen, label: isBangla ? 'আমার খতিয়ান' : 'My Ledger', roles: ['MEMBER'] },
      ]
    },
    {
      title: isBangla ? 'সদস্য ব্যবস্থাপনা' : 'Member Menu',
      roles: ['ADMIN', 'ACCOUNTANT'],
      items: [
        { id: 'MEMBERS', icon: Users, label: isBangla ? 'সদস্য তালিকা ও রেজিস্টার' : 'Member Master / Register', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'MEMBER_LEDGER', icon: BookOpen, label: isBangla ? 'সদস্য খতিয়ান' : 'Member Ledger', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'COLLECTIONS', icon: CreditCard, label: isBangla ? 'সদস্য চাঁদা ও আদায়' : 'Member Collections', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'CAPITAL', icon: PiggyBank, label: isBangla ? 'সদস্য মূলধন' : 'Member Capital', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'SETTLEMENT_DASHBOARD', icon: Briefcase, label: isBangla ? 'সদস্য নিষ্পত্তি' : 'Member Settlement', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'ADMISSION', icon: UserPlus, label: isBangla ? 'নতুন সদস্য নিবন্ধন' : 'Member Registration', roles: ['ADMIN', 'ACCOUNTANT'] },
      ]
    },
    {
      title: isBangla ? 'সদস্য নিষ্পত্তি মেনু' : 'Settlement Operations',
      id: 'member-settlement',
      roles: ['ADMIN', 'ACCOUNTANT'],
      items: [
        { id: 'SETTLEMENT_DASHBOARD', icon: Briefcase, label: isBangla ? 'নিষ্পত্তি ড্যাশবোর্ড' : 'Settlement Dashboard', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'NORMAL_MEMBER_EXIT', icon: UserMinus, label: isBangla ? 'সাধারণ প্রস্থান' : 'Normal Member Exit', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'EARLY_MEMBER_EXIT', icon: UserMinus, label: isBangla ? 'আগাম প্রস্থান' : 'Early Member Exit', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'EARLY_EXIT_REQUESTS', icon: HandCoins, label: isBangla ? 'আগাম প্রস্থান অনুরোধ' : 'Early Exit Requests', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'DEATH_SETTLEMENT', icon: ShieldCheck, label: isBangla ? 'মৃত্যু নিষ্পত্তি' : 'Death Settlement', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'PENDING_SETTLEMENT_APPROVALS', icon: Shield, label: isBangla ? 'অপেক্ষমাণ অনুমোদন' : 'Pending Approvals', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'COMPLETED_SETTLEMENTS', icon: CheckCircle, label: isBangla ? 'সম্পন্ন নিষ্পত্তি' : 'Completed Settlements', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'SETTLEMENT_REPORTS', icon: FileSpreadsheet, label: isBangla ? 'নিষ্পত্তি রিপোর্ট' : 'Settlement Reports', roles: ['ADMIN', 'ACCOUNTANT'] },
      ]
    },
    {
      title: isBangla ? 'আর্থিক লেনদেন' : 'Financial Operations',
      roles: ['ADMIN', 'ACCOUNTANT'],
      items: [
        { id: 'COLLECTIONS', icon: CreditCard, label: isBangla ? 'মাসিক জমা' : 'Collection', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'LOANS', icon: HandCoins, label: isBangla ? 'ঋণ ব্যবস্থাপনা' : 'Loan Management', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'CAPITAL', icon: PiggyBank, label: isBangla ? 'মূলধন জমা' : 'Capital Deposit', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'RESERVE_UTILIZATION', icon: TrendingUp, label: isBangla ? 'রিজার্ভ ব্যবহার' : 'Reserve Utilization', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'CASH_BOOK', icon: Landmark, label: isBangla ? 'নগদ হিসাব' : 'Cash Book', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'BANK_BOOK', icon: Building2, label: isBangla ? 'ব্যাংক হিসাব' : 'Bank Book', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'INCOME_EXPENSE', icon: PlusCircle, label: isBangla ? 'আয়-ব্যয় এন্ট্রি' : 'Income & Expense', roles: ['ADMIN', 'ACCOUNTANT'] },
      ]
    },
    {
      title: isBangla ? 'হিসাবরক্ষণ ও রিপোর্ট' : 'Accounting & Reports',
      roles: ['ADMIN', 'ACCOUNTANT', 'AUDITOR', 'COLLECTION_OFFICER'],
      items: [
        { id: 'FINANCIAL_SUMMARY', icon: LineChart, label: isBangla ? 'মূল আর্থিক সূচক (সারসংক্ষেপ)' : 'Key Financial Indicators', roles: ['ADMIN', 'ACCOUNTANT', 'AUDITOR', 'COLLECTION_OFFICER'] },
        { id: 'CASH_RECONCILIATION', icon: Scale, label: isBangla ? 'ক্যাশ মিলকরণ' : 'Cash Reconciliation', roles: ['ADMIN', 'ACCOUNTANT', 'AUDITOR'] },
        { id: 'BANK_RECONCILIATION', icon: Building2, label: isBangla ? 'ব্যাংক রিকনসিলিয়েশন' : 'Bank Reconciliation', roles: ['ADMIN', 'ACCOUNTANT', 'AUDITOR'] },
        { id: 'ACCOUNTS', icon: Briefcase, label: isBangla ? 'হিসাব খাত' : 'Chart of Accounts', roles: ['ADMIN', 'ACCOUNTANT', 'AUDITOR'] },
        { id: 'LEDGER', icon: FileText, label: isBangla ? 'খতিয়ান' : 'Ledger', roles: ['ADMIN', 'ACCOUNTANT', 'AUDITOR'] },
        { id: 'REPORTS', icon: FileSpreadsheet, label: isBangla ? 'আর্থিক রিপোর্ট ও বিবরণী' : 'Financial Reports', roles: ['ADMIN', 'ACCOUNTANT', 'AUDITOR'] },
        { id: 'PROFIT', icon: Calculator, label: isBangla ? 'মুনাফা বন্টন' : 'Profit Distribution', roles: ['ADMIN', 'ACCOUNTANT'] },
      ]
    },
    {
      title: isBangla ? 'কল্যাণ তহবিল' : 'Welfare & Others',
      roles: ['ADMIN', 'ACCOUNTANT'],
      items: [
        { id: 'WELFARE', icon: HeartHandshake, label: isBangla ? 'কল্যাণ তহবিল' : 'Welfare Fund', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'INVESTMENTS', icon: TrendingUp, label: isBangla ? 'বিনিয়োগ' : 'Investment', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'MEETINGS', icon: Users2, label: isBangla ? 'মিটিং' : 'Meetings', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: 'RESOLUTIONS', icon: FileText, label: isBangla ? 'রেজোলিউশন' : 'Resolutions', roles: ['ADMIN', 'ACCOUNTANT'] },
      ]
    },
    {
      title: isBangla ? 'প্রশাসন ও সেটিং' : 'Admin & Settings',
      roles: ['ADMIN'],
      items: [
        { id: 'COMMITTEE_MANAGEMENT', icon: Users, label: isBangla ? 'কমিটি ব্যবস্থাপনা' : 'Committee Management', roles: ['ADMIN'] },
        { id: 'USERS', icon: Shield, label: isBangla ? 'ব্যবহারকারী' : 'User Management', roles: ['ADMIN'] },
        { id: 'FINANCIAL_YEAR', icon: CalendarDays, label: isBangla ? 'অর্থবছর' : 'Financial Year', roles: ['ADMIN'] },
        { id: 'SETTINGS', icon: Settings, label: isBangla ? 'সেটিংস' : 'Settings', roles: ['ADMIN'] },
        { id: 'AUDIT_LOG', icon: History, label: isBangla ? 'অডিট ট্রেইল' : 'Audit Trail', roles: ['ADMIN'] },
        { id: 'INTEGRITY_CHECK', icon: ShieldCheck, label: isBangla ? 'অ্যাকাউন্টিং ইন্টিগ্রিটি চেক' : 'Integrity Auditor', roles: ['ADMIN', 'ACCOUNTANT'] },
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

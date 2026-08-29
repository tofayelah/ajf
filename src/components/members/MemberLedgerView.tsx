import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { 
  BookOpen, 
  Search, 
  Filter, 
  RotateCcw, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  CreditCard, 
  PiggyBank, 
  UserPlus, 
  TrendingUp, 
  UserMinus, 
  Landmark, 
  Calendar, 
  Phone, 
  IdCard, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  X,
  Eye,
  FileText,
  Clock,
  Building2
} from 'lucide-react';
import { MemberProfileModal } from './MemberProfileModal';

interface MemberLedgerViewProps {
  initialMemberId?: string;
}

export const MemberLedgerView: React.FC<MemberLedgerViewProps> = ({ initialMemberId }) => {
  const { db, language, activeUser, navigateTo } = useApp();
  const isBangla = language === 'bn';

  // Role check: If user is a MEMBER, lock to their linked member ID
  const isMemberRole = activeUser?.role === 'MEMBER';
  const effectiveMemberId = isMemberRole 
    ? (activeUser?.linkedMemberId || '') 
    : (initialMemberId || db.members?.[0]?.memberId || '');

  // Active member selection
  const [currentMemberId, setCurrentMemberId] = useState<string>(effectiveMemberId);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [financialYear, setFinancialYear] = useState<string>('2026-2027');
  const [transactionType, setTransactionType] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Modals
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  // Reference for print container
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync if initialMemberId changes
  React.useEffect(() => {
    if (initialMemberId && initialMemberId !== currentMemberId && !isMemberRole) {
      setCurrentMemberId(initialMemberId);
    }
  }, [initialMemberId, isMemberRole]);

  // All active/registered members for search
  const membersList = useMemo(() => {
    return db.members || [];
  }, [db.members]);

  // Filtered members for autocomplete
  const searchedMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return membersList.slice(0, 15);
    const query = memberSearchQuery.toLowerCase().trim();
    return membersList.filter(m => 
      m.fullName?.toLowerCase().includes(query) ||
      m.memberId?.toLowerCase().includes(query) ||
      m.membershipNo?.toLowerCase().includes(query) ||
      m.mobile?.toLowerCase().includes(query) ||
      m.nid?.toLowerCase().includes(query)
    );
  }, [membersList, memberSearchQuery]);

  // Selected member object
  const selectedMember = useMemo(() => {
    return membersList.find(m => m.memberId === currentMemberId) || membersList[0];
  }, [membersList, currentMemberId]);

  // Compute Comprehensive Member Ledger Data
  const ledgerData = useMemo(() => {
    if (!selectedMember) return null;
    return AccountingService.getComprehensiveMemberLedger(db, selectedMember.memberId, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      transactionType: transactionType !== 'ALL' ? transactionType : undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined
    });
  }, [db, selectedMember, dateFrom, dateTo, transactionType, statusFilter]);

  // Paginated Items
  const paginatedItems = useMemo(() => {
    if (!ledgerData?.items) return [];
    const startIndex = (currentPage - 1) * pageSize;
    return ledgerData.items.slice(startIndex, startIndex + pageSize);
  }, [ledgerData, currentPage, pageSize]);

  const totalPages = Math.ceil((ledgerData?.items?.length || 0) / pageSize) || 1;

  // Formatting helpers
  const formatMoney = (amount: number) => {
    const formatted = (amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    return isBangla ? `৳ ${formatted}` : `BDT ${formatted}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(isBangla ? 'bn-BD' : 'en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Transaction type labels and badges
  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'ADMISSION_FEE':
      case 'ADMISSION':
        return {
          label: isBangla ? 'ভর্তি ফি' : 'Admission Fee',
          bg: 'bg-amber-100 text-amber-900 border-amber-300'
        };
      case 'CAPITAL_DEPOSIT':
        return {
          label: isBangla ? 'মূলধন জমা' : 'Capital Deposit',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300'
        };
      case 'MONTHLY_COLLECTION':
        return {
          label: isBangla ? 'মাসিক চাঁদা' : 'Monthly Subscription',
          bg: 'bg-blue-100 text-blue-900 border-blue-300'
        };
      case 'LATE_FEE':
      case 'LATE_FINE':
        return {
          label: isBangla ? 'বিলম্ব ফি' : 'Late Fee',
          bg: 'bg-orange-100 text-orange-900 border-orange-300'
        };
      case 'DISCOUNT':
        return {
          label: isBangla ? 'ছাড় / মওকুফ' : 'Discount',
          bg: 'bg-purple-100 text-purple-900 border-purple-300'
        };
      case 'BENEFIT':
      case 'WELFARE_GRANT':
        return {
          label: isBangla ? 'কল্যাণ অনুদান' : 'Welfare Benefit',
          bg: 'bg-teal-100 text-teal-900 border-teal-300'
        };
      case 'PROFIT_DISTRIBUTION':
      case 'PROFIT_SHARE':
        return {
          label: isBangla ? 'লভ্যাংশ বণ্টন' : 'Profit Share',
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-300'
        };
      case 'LOAN_DISBURSED':
        return {
          label: isBangla ? 'ঋণ বিতরণ' : 'Loan Disbursed',
          bg: 'bg-rose-100 text-rose-900 border-rose-300'
        };
      case 'LOAN_REPAYMENT':
        return {
          label: isBangla ? 'ঋণ কিস্তি আদায়' : 'Loan Repayment',
          bg: 'bg-cyan-100 text-cyan-900 border-cyan-300'
        };
      case 'NORMAL_EXIT':
      case 'EARLY_EXIT':
      case 'DEATH_SETTLEMENT':
      case 'SETTLEMENT_PAYMENT':
        return {
          label: isBangla ? 'নিষ্পত্তি পরিশোধ' : 'Settlement Payout',
          bg: 'bg-pink-100 text-pink-900 border-pink-300'
        };
      case 'ADJUSTMENT':
      case 'REVERSAL':
        return {
          label: isBangla ? 'সমন্বয় এন্ট্রি' : 'Adjustment',
          bg: 'bg-slate-100 text-slate-800 border-slate-300'
        };
      default:
        return {
          label: type,
          bg: 'bg-slate-100 text-slate-800 border-slate-300'
        };
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'POSTED':
      case 'ACTIVE':
      case 'APPROVED':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            {isBangla ? 'সম্পন্ন' : 'Posted'}
          </span>
        );
      case 'REVERSED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            {isBangla ? 'বাতিল' : 'Reversed'}
          </span>
        );
      case 'PENDING':
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            {isBangla ? 'অপেক্ষমাণ' : 'Pending'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setFinancialYear('2026-2027');
    setTransactionType('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (!selectedMember || !ledgerData?.items) return;

    const headers = [
      'Sl',
      'Date',
      'Voucher / Receipt No',
      'Transaction Type',
      'Particulars',
      'Debit (BDT)',
      'Credit (BDT)',
      'Running Balance (BDT)',
      'Reference',
      'Status'
    ];

    const rows = ledgerData.items.map((item, index) => [
      index + 1,
      item.date || '',
      `"${item.voucherNo || item.receiptNo || ''}"`,
      `"${item.transactionType || ''}"`,
      `"${(item.particulars || '').replace(/"/g, '""')}"`,
      item.debit || 0,
      item.credit || 0,
      item.balance || 0,
      `"${item.reference || ''}"`,
      item.status || 'POSTED'
    ]);

    const summaryRows = [
      [],
      ['Member Summary Information'],
      ['Member Name', `"${selectedMember.fullName}"`],
      ['Member ID', `"${selectedMember.memberId}"`],
      ['AJM Number', `"${selectedMember.membershipNo || '-'}"`],
      ['Mobile', `"${selectedMember.mobile || '-'}"`],
      ['Joining Date', `"${selectedMember.joiningDate || '-'}"`],
      ['Total Capital', ledgerData.totalCapital],
      ['Total Monthly Subscription', ledgerData.totalMonthlySubscription],
      ['Total Admission Fee', ledgerData.totalAdmissionFee],
      ['Total Benefit / Profit', ledgerData.totalBenefitProfit],
      ['Total Settlement', ledgerData.totalSettlement],
      ['Current Member Balance', ledgerData.currentMemberBalance],
      ['Statement Generated Date', new Date().toISOString()]
    ];

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(e => e.join(',')),
      ...summaryRows.map(e => e.join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Member_Ledger_${selectedMember?.membershipNo || selectedMember?.memberId || 'Statement'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If there are no members in the database (e.g. fresh production DB), display clean empty-state
  if (membersList.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
        {/* TOP HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isBangla ? 'সদস্য খতিয়ান' : 'Member Ledger'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {isBangla 
                  ? 'সদস্যের সকল জমা, চাঁদা, মূলধন, সুবিধা ও সমন্বয়ের বিস্তারিত হিসাব' 
                  : 'Complete statement of member deposits, subscriptions, capital, benefits and balances'}
              </p>
            </div>
          </div>
        </div>

        {/* CLEAN EMPTY STATE MESSAGE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-10 sm:p-14 text-center shadow-sm max-w-2xl mx-auto space-y-5">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {isBangla ? 'কোনো সদস্য নিবন্ধিত নেই' : 'No Members Registered'}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              {isBangla 
                ? 'ডাটাবেজে বর্তমানে কোনো নিবন্ধিত সদস্য নেই। নতুন সদস্য নিবন্ধিত হলে এবং মূলধন জমা বা চাঁদা আদায়ের মতো আর্থিক লেনদেন এন্ট্রি হলে এখানে স্বয়ংক্রিয়ভাবে প্রতিটি সদস্যের পূর্ণাঙ্গ খতিয়ান ও রানিং ব্যালেন্স হিসাব প্রস্তুত ও প্রদর্শিত হবে।' 
                : 'There are currently no registered members in the database. When the first member is registered and accounting transactions are posted, their comprehensive ledger statement and running balance will automatically appear here.'}
            </p>
          </div>

          {!isMemberRole && (
            <div className="pt-2">
              <button
                onClick={() => navigateTo('ADMISSION')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isBangla ? 'নতুন সদস্য নিবন্ধন করুন' : 'Register New Member'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      
      {/* 1. TOP HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isBangla ? 'সদস্য খতিয়ান' : 'Member Ledger'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {isBangla 
                  ? 'সদস্যের সকল জমা, চাঁদা, মূলধন, সুবিধা ও সমন্বয়ের বিস্তারিত হিসাব' 
                  : 'Complete statement of member deposits, subscriptions, capital, benefits and balances'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            title={isBangla ? 'খতিয়ান প্রিন্ট করুন' : 'Print Ledger Statement'}
          >
            <Printer className="w-4 h-4" />
            <span>{isBangla ? 'প্রিন্ট' : 'Print'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            title={isBangla ? 'পিডিএফ ফরম্যাটে ডাউনলোড করুন' : 'Download PDF'}
          >
            <Download className="w-4 h-4" />
            <span>{isBangla ? 'পিডিএফ' : 'PDF'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            title={isBangla ? 'এক্সেল / সিএসভি ফাইল ডাউনলোড করুন' : 'Export Excel / CSV'}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isBangla ? 'এক্সেল' : 'Excel'}</span>
          </button>
        </div>
      </div>

      {/* 2. MEMBER SEARCH & FILTER PANEL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          
          {/* Member Search / Selector */}
          <div className="md:col-span-4 relative">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isBangla ? 'সদস্য নির্বাচন (নাম / আইডি / মোবাইল):' : 'Select Member (Name / ID / Mobile):'}</span>
            </label>

            {isMemberRole ? (
              <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 flex items-center justify-between">
                <span>{selectedMember?.fullName || activeUser?.fullName}</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-mono">
                  {selectedMember?.membershipNo || selectedMember?.memberId}
                </span>
              </div>
            ) : (
              <div className="relative">
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 cursor-pointer flex items-center justify-between hover:border-emerald-500 transition-colors"
                >
                  <div className="truncate">
                    <span className="font-semibold text-slate-900">{selectedMember?.fullName || 'Select Member'}</span>
                    <span className="text-xs text-slate-500 ml-2 font-mono">({selectedMember?.membershipNo || selectedMember?.memberId})</span>
                  </div>
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                {/* Dropdown popup */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 space-y-2 max-h-72 flex flex-col">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="text"
                        autoFocus
                        placeholder={isBangla ? 'নাম, আইডি বা মোবাইল লিখুন...' : 'Search name, ID or phone...'}
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="overflow-y-auto space-y-1 flex-1 custom-scrollbar">
                      {searchedMembers.length === 0 ? (
                        <div className="p-3 text-xs text-center text-slate-400">
                          {isBangla ? 'কোনো সদস্য পাওয়া যায়নি' : 'No members found'}
                        </div>
                      ) : (
                        searchedMembers.map((m) => (
                          <div
                            key={m.memberId}
                            onClick={() => {
                              setCurrentMemberId(m.memberId);
                              setIsDropdownOpen(false);
                              setMemberSearchQuery('');
                              setCurrentPage(1);
                            }}
                            className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              m.memberId === selectedMember?.memberId
                                ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="truncate">
                              <p className="font-semibold text-slate-900 truncate">{m.fullName}</p>
                              <p className="text-[11px] text-slate-500 font-mono">{m.membershipNo || m.memberId} • {m.mobile || 'No Mobile'}</p>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {m.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date From */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isBangla ? 'তারিখ হতে (From):' : 'Date From:'}
            </label>
            <input 
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Date To */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isBangla ? 'তারিখ পর্যন্ত (To):' : 'Date To:'}
            </label>
            <input 
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Transaction Type Filter */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isBangla ? 'লেনদেনের ধরণ:' : 'Transaction Type:'}
            </label>
            <select
              value={transactionType}
              onChange={(e) => {
                setTransactionType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
            >
              <option value="ALL">{isBangla ? 'সব লেনদেন (All)' : 'All Types'}</option>
              <option value="ADMISSION_FEE">{isBangla ? 'ভর্তি ফি (Admission Fee)' : 'Admission Fee'}</option>
              <option value="CAPITAL_DEPOSIT">{isBangla ? 'মূলধন জমা (Capital Deposit)' : 'Capital Deposit'}</option>
              <option value="MONTHLY_COLLECTION">{isBangla ? 'মাসিক চাঁদা (Monthly Sub)' : 'Monthly Subscription'}</option>
              <option value="LATE_FEE">{isBangla ? 'বিলম্ব ফি (Late Fee)' : 'Late Fee'}</option>
              <option value="BENEFIT">{isBangla ? 'কল্যাণ সুবিধা (Benefit)' : 'Benefit'}</option>
              <option value="PROFIT_DISTRIBUTION">{isBangla ? 'লভ্যাংশ বণ্টন (Profit Share)' : 'Profit Distribution'}</option>
              <option value="LOAN_DISBURSED">{isBangla ? 'ঋণ বিতরণ (Loan Disbursed)' : 'Loan Disbursed'}</option>
              <option value="LOAN_REPAYMENT">{isBangla ? 'ঋণ কিস্তি (Loan Repayment)' : 'Loan Repayment'}</option>
              <option value="SETTLEMENT_PAYMENT">{isBangla ? 'নিষ্পত্তি (Settlement)' : 'Settlement'}</option>
              <option value="ADJUSTMENT">{isBangla ? 'সমন্বয় (Adjustment)' : 'Adjustment'}</option>
            </select>
          </div>

          {/* Status Filter & Reset */}
          <div className="md:col-span-2 flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isBangla ? 'স্ট্যাটাস:' : 'Status:'}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
              >
                <option value="ALL">{isBangla ? 'সকল' : 'All'}</option>
                <option value="POSTED">{isBangla ? 'সম্পন্ন (Posted)' : 'Posted'}</option>
                <option value="ACTIVE">{isBangla ? 'সক্রিয় (Active)' : 'Active'}</option>
                <option value="REVERSED">{isBangla ? 'বাতিল (Reversed)' : 'Reversed'}</option>
              </select>
            </div>

            <button
              onClick={handleResetFilters}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer self-end mb-0.5"
              title={isBangla ? 'ফিল্টার রিসেট' : 'Reset Filters'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* 3. SELECTED MEMBER CARD & SUMMARY INFO */}
      {selectedMember && (
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-800/50 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            
            {/* Member Details */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-black text-xl shadow-inner shrink-0">
                {selectedMember.fullName ? selectedMember.fullName.charAt(0).toUpperCase() : 'M'}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    {selectedMember.fullName}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedMember.status === 'ACTIVE' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}>
                    {selectedMember.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs text-emerald-100/80 font-mono">
                  <div className="flex items-center gap-1.5">
                    <IdCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>AJM: <strong className="text-white">{selectedMember.membershipNo || 'AJM-000001'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>ID: <strong className="text-white">{selectedMember.memberId}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{selectedMember.mobile || '01712345678'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{isBangla ? 'যোগদান: ' : 'Joined: '}{formatDate(selectedMember.joiningDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions for this Member */}
            <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
              <button
                onClick={() => setViewingProfileId(selectedMember.memberId)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isBangla ? 'প্রোফাইল' : 'Profile'}</span>
              </button>

              {!isMemberRole && (
                <>
                  <button
                    onClick={() => navigateTo('COLLECTIONS', selectedMember.memberId)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{isBangla ? 'চাঁদা আদায়' : 'Collect Due'}</span>
                  </button>

                  <button
                    onClick={() => navigateTo('CAPITAL', selectedMember.memberId)}
                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <PiggyBank className="w-3.5 h-3.5" />
                    <span>{isBangla ? 'মূলধন জমা' : 'Deposit Capital'}</span>
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4. SUMMARY CARDS (6 Key Metrics) */}
      {ledgerData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 print:grid-cols-3">
          
          {/* 1. Total Capital */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isBangla ? 'মোট মূলধন' : 'Total Capital'}
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-black text-emerald-700 tracking-tight">
                {formatMoney(ledgerData.totalCapital)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isBangla ? 'সদস্য শেয়ার মূলধন' : 'Member Equity Share'}
              </p>
            </div>
          </div>

          {/* 2. Total Monthly Subscription */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isBangla ? 'মোট মাসিক চাঁদা' : 'Monthly Sub'}
              </span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-black text-blue-700 tracking-tight">
                {formatMoney(ledgerData.totalMonthlySubscription)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isBangla ? 'নিয়মিত মাসিক চাঁদা' : 'Regular Subscription'}
              </p>
            </div>
          </div>

          {/* 3. Total Admission Fee */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isBangla ? 'ভর্তি ফি' : 'Admission Fee'}
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-black text-amber-700 tracking-tight">
                {formatMoney(ledgerData.totalAdmissionFee)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isBangla ? 'ভর্তি বাবদ আয়' : 'Admission Revenue'}
              </p>
            </div>
          </div>

          {/* 4. Total Benefit / Profit */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isBangla ? 'মুনাফা / সুবিধা' : 'Benefit / Profit'}
              </span>
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-black text-purple-700 tracking-tight">
                {formatMoney(ledgerData.totalBenefitProfit)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isBangla ? 'লভ্যাংশ ও অনুদান' : 'Distributed Benefits'}
              </p>
            </div>
          </div>

          {/* 5. Total Settlement */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isBangla ? 'মোট নিষ্পত্তি' : 'Total Settlement'}
              </span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                <UserMinus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-black text-rose-700 tracking-tight">
                {formatMoney(ledgerData.totalSettlement)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isBangla ? 'প্রস্থান ফেরত প্রদান' : 'Exit Settlement'}
              </p>
            </div>
          </div>

          {/* 6. Current Member Balance */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border-2 border-emerald-300 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                {isBangla ? 'বর্তমান স্থিতি' : 'Member Balance'}
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-black text-emerald-900 tracking-tight">
                {formatMoney(ledgerData.currentMemberBalance)}
              </p>
              <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                {isBangla ? 'মোট জমা ও মূলধন' : 'Deposits + Capital'}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 5. LEDGER TABLE SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" ref={printAreaRef}>
        
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              {isBangla ? 'খতিয়ান হিসাব বহি (Ledger Transactions)' : 'Ledger Transactions'}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
              {ledgerData?.items?.length || 0} {isBangla ? 'টি লেনদেন' : 'Entries'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">{isBangla ? 'প্রতি পৃষ্ঠায়:' : 'Rows per page:'}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* The Accounting Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200 text-[11px]">
                <th className="py-3 px-3.5 text-center w-12">#</th>
                <th className="py-3 px-3.5">{isBangla ? 'তারিখ' : 'Date'}</th>
                <th className="py-3 px-3.5">{isBangla ? 'ভাউচার / রশিদ নং' : 'Voucher / Receipt'}</th>
                <th className="py-3 px-3.5">{isBangla ? 'লেনদেনের ধরণ' : 'Transaction Type'}</th>
                <th className="py-3 px-3.5 min-w-[200px]">{isBangla ? 'বিবরণ (Particulars)' : 'Particulars'}</th>
                <th className="py-3 px-3.5 text-right font-mono">{isBangla ? 'ডেবিট (টাকা)' : 'Debit (BDT)'}</th>
                <th className="py-3 px-3.5 text-right font-mono">{isBangla ? 'ক্রেডিট (টাকা)' : 'Credit (BDT)'}</th>
                <th className="py-3 px-3.5 text-right font-mono font-bold">{isBangla ? 'চলতি স্থিতি (টাকা)' : 'Running Balance'}</th>
                <th className="py-3 px-3.5 text-center">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">
                      {isBangla ? 'কোনো খতিয়ান লেনদেন পাওয়া যায়নি' : 'No ledger transactions found'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isBangla ? 'ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন' : 'Try adjusting the filters'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const badge = getTransactionTypeBadge(item.transactionType);
                  const serialNo = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono">
                        {serialNo}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-900 whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-emerald-800 font-bold whitespace-nowrap">
                        {item.voucherNo || item.receiptNo || '-'}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 font-medium">
                        {item.particulars}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-rose-700 font-semibold whitespace-nowrap">
                        {item.debit > 0 ? formatMoney(item.debit) : '-'}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">
                        {item.credit > 0 ? formatMoney(item.credit) : '-'}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap bg-slate-50/50">
                        {formatMoney(item.balance)}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            
            {/* Table Footer Totals */}
            {ledgerData && ledgerData.items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300">
                  <td colSpan={5} className="py-3 px-3.5 text-right">
                    {isBangla ? 'সর্বমোট (Total Filtered):' : 'Total Filtered:'}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-rose-700">
                    {formatMoney(ledgerData.totalDebit)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-emerald-700">
                    {formatMoney(ledgerData.totalCredit)}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-emerald-900 bg-emerald-50">
                    {formatMoney(ledgerData.closingBalance)}
                  </td>
                  <td className="py-3 px-3.5"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white text-xs print:hidden">
            <span className="text-slate-500">
              {isBangla 
                ? `পৃষ্ঠা ${currentPage} / ${totalPages} (মোট ${ledgerData?.items?.length || 0} টি রেকর্ড)`
                : `Page ${currentPage} of ${totalPages} (${ledgerData?.items?.length || 0} total records)`}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title={isBangla ? 'পূর্ববর্তী পৃষ্ঠা' : 'Previous Page'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title={isBangla ? 'পরবর্তী পৃষ্ঠা' : 'Next Page'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 6. FORMAL PRINT-ONLY STATEMENT TEMPLATE */}
      <div className="hidden print:block font-serif text-slate-900 p-8 space-y-6 bg-white">
        
        {/* Institutional Header */}
        <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
          <h1 className="text-2xl font-black tracking-wide text-slate-950 uppercase">
            AJ Welfare Society
          </h1>
          <h2 className="text-lg font-bold text-slate-800">
            আটারগাঁও জাগরণী ক্লাব ও এজে ওয়েলফেয়ার সোসাইটি
          </h2>
          <p className="text-xs text-slate-600">
            {db.settings?.address || (db.settings as any)?.addressBangla || 'আটারগাঁও, ডাকঘর: আটারগাঁও, উপজেলা: রাণীশংকৈল, জেলা: ঠাকুরগাঁও'}
          </p>
          <div className="inline-block mt-2 px-4 py-1 bg-slate-100 rounded-full border border-slate-300 text-xs font-bold tracking-wider uppercase">
            সদস্য পূর্ণাঙ্গ খতিয়ান বিবরণী (Member Financial Ledger Statement)
          </div>
        </div>

        {/* Member Details & Statement Meta */}
        <div className="grid grid-cols-2 gap-4 border border-slate-300 p-4 rounded-lg text-xs">
          <div className="space-y-1">
            <p><strong>সদস্যের নাম (Name):</strong> {selectedMember?.fullName}</p>
            <p><strong>সদস্য আইডি (Member ID):</strong> {selectedMember?.memberId}</p>
            <p><strong>এজেএম নম্বর (AJM No):</strong> {selectedMember?.membershipNo || 'AJM-000001'}</p>
            <p><strong>মোবাইল (Mobile):</strong> {selectedMember?.mobile || '-'}</p>
          </div>
          <div className="space-y-1 text-right">
            <p><strong>অর্থবছর (FY):</strong> {financialYear}</p>
            <p><strong>যোগদানের তারিখ (Joining Date):</strong> {formatDate(selectedMember?.joiningDate)}</p>
            <p><strong>বিবরণীর সময়কাল (Period):</strong> {dateFrom ? formatDate(dateFrom) : '2026-07-01'} to {dateTo ? formatDate(dateTo) : '2027-06-30'}</p>
            <p><strong>প্রিন্টের তারিখ (Date):</strong> {new Date().toLocaleDateString('bn-BD')}</p>
          </div>
        </div>

        {/* Financial Summary Box */}
        {ledgerData && (
          <div className="grid grid-cols-4 gap-2 border border-slate-300 p-3 rounded-lg text-xs text-center bg-slate-50">
            <div>
              <p className="text-slate-500">মোট মূলধন জমা</p>
              <p className="font-bold text-sm text-slate-900">{formatMoney(ledgerData.totalCapital)}</p>
            </div>
            <div>
              <p className="text-slate-500">মোট মাসিক চাঁদা</p>
              <p className="font-bold text-sm text-slate-900">{formatMoney(ledgerData.totalMonthlySubscription)}</p>
            </div>
            <div>
              <p className="text-slate-500">ভর্তি ফি</p>
              <p className="font-bold text-sm text-slate-900">{formatMoney(ledgerData.totalAdmissionFee)}</p>
            </div>
            <div>
              <p className="text-slate-500 font-bold">বর্তমান মোট স্থিতি</p>
              <p className="font-black text-sm text-emerald-800">{formatMoney(ledgerData.currentMemberBalance)}</p>
            </div>
          </div>
        )}

        {/* All Printable Transactions Table */}
        <table className="w-full text-xs border border-slate-400 border-collapse">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-400">
              <th className="p-2 border-r border-slate-400 text-center">#</th>
              <th className="p-2 border-r border-slate-400">তারিখ</th>
              <th className="p-2 border-r border-slate-400">ভাউচার / রশিদ</th>
              <th className="p-2 border-r border-slate-400">লেনদেনের ধরণ</th>
              <th className="p-2 border-r border-slate-400">বিবরণ</th>
              <th className="p-2 border-r border-slate-400 text-right">ডেবিট (টাকা)</th>
              <th className="p-2 border-r border-slate-400 text-right">ক্রেডিট (টাকা)</th>
              <th className="p-2 text-right">স্থিতি (টাকা)</th>
            </tr>
          </thead>
          <tbody>
            {ledgerData?.items?.map((item, index) => (
              <tr key={index} className="border-b border-slate-300">
                <td className="p-1.5 border-r border-slate-300 text-center">{index + 1}</td>
                <td className="p-1.5 border-r border-slate-300">{formatDate(item.date)}</td>
                <td className="p-1.5 border-r border-slate-300 font-mono">{item.voucherNo || item.receiptNo || '-'}</td>
                <td className="p-1.5 border-r border-slate-300">{item.transactionType}</td>
                <td className="p-1.5 border-r border-slate-300">{item.particulars}</td>
                <td className="p-1.5 border-r border-slate-300 text-right">{item.debit > 0 ? formatMoney(item.debit) : '-'}</td>
                <td className="p-1.5 border-r border-slate-300 text-right">{item.credit > 0 ? formatMoney(item.credit) : '-'}</td>
                <td className="p-1.5 text-right font-bold">{formatMoney(item.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
              <td colSpan={5} className="p-2 text-right">সর্বমোট:</td>
              <td className="p-2 text-right border-r border-slate-400">{formatMoney(ledgerData?.totalDebit || 0)}</td>
              <td className="p-2 text-right border-r border-slate-400">{formatMoney(ledgerData?.totalCredit || 0)}</td>
              <td className="p-2 text-right">{formatMoney(ledgerData?.closingBalance || 0)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Signature Block */}
        <div className="pt-16 grid grid-cols-3 gap-8 text-center text-xs">
          <div className="border-t border-slate-600 pt-1">
            <p className="font-semibold text-slate-800">হিসাবরক্ষক / প্রস্তুতকারক</p>
            <p className="text-[10px] text-slate-500">Prepared By</p>
          </div>
          <div className="border-t border-slate-600 pt-1">
            <p className="font-semibold text-slate-800">সাধারণ সম্পাদক</p>
            <p className="text-[10px] text-slate-500">General Secretary</p>
          </div>
          <div className="border-t border-slate-600 pt-1">
            <p className="font-semibold text-slate-800">সভাপতি</p>
            <p className="text-[10px] text-slate-500">President</p>
          </div>
        </div>

      </div>

      {/* Member Profile Modal */}
      {viewingProfileId && (
        <MemberProfileModal
          memberId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
        />
      )}

    </div>
  );
};

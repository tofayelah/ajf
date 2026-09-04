import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { 
  BookOpen,
  Users,
  AlertTriangle, 
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
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  X,
  Eye,
  FileText,
  Clock,
  ArrowLeft,
  Building2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { MemberProfileModal } from './MemberProfileModal';
import { AJFLogo } from '../common/AJFLogo';

interface MemberLedgerViewProps {
  initialMemberId?: string;
}

export const MemberLedgerView: React.FC<MemberLedgerViewProps> = ({ initialMemberId }) => {
  const { db, language, activeUser, navigateTo } = useApp();
  const isBangla = language === 'bn';

  // State to track RPC update invalidations & force immediate re-render
  const [rpcVersion, setRpcVersion] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Subscribe to RPC updates and global DB context synchronization
  useEffect(() => {
    const handleRpcUpdate = () => {
      setRpcVersion(prev => prev + 1);
    };

    window.addEventListener('app:rpc-update', handleRpcUpdate);
    window.addEventListener('storage', handleRpcUpdate);

    return () => {
      window.removeEventListener('app:rpc-update', handleRpcUpdate);
      window.removeEventListener('storage', handleRpcUpdate);
    };
  }, []);

  // Role check: If user is a MEMBER, lock to their linked member ID
  const isMemberRole = activeUser?.role === 'MEMBER';
  const effectiveMemberId = isMemberRole 
    ? (activeUser?.linkedMemberId || '') 
    : (initialMemberId || '');

  // Active member selection
  const [currentMemberId, setCurrentMemberId] = useState<string>(effectiveMemberId);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [allMembersSearchQuery, setAllMembersSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Filters for single member transaction view
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [financialYear, setFinancialYear] = useState<string>('2026-2027');
  const [transactionType, setTransactionType] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination for single member transactions
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Pagination for all members list
  const [allMembersPage, setAllMembersPage] = useState<number>(1);
  const [allMembersPageSize, setAllMembersPageSize] = useState<number>(15);

  // Modals
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  // Reference for print container
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync if initialMemberId changes
  useEffect(() => {
    if (initialMemberId && initialMemberId !== currentMemberId && !isMemberRole) {
      setCurrentMemberId(initialMemberId);
    }
  }, [initialMemberId, isMemberRole]);

  // All active/registered members from authoritative DB
  const membersList = useMemo(() => {
    return db.members || [];
  }, [db.members, rpcVersion]);

  // Selected member object
  const selectedMember = useMemo(() => {
    if (!currentMemberId) return null;
    return membersList.find(m => m.memberId === currentMemberId || m.membershipNo === currentMemberId || (m as any).id === currentMemberId) || null;
  }, [membersList, currentMemberId, rpcVersion]);

  // Filtered members for top autocomplete
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
  }, [membersList, memberSearchQuery, rpcVersion]);

  // =========================================================================
  // CANONICAL 9-HEAD CALCULATION PER MEMBER & ALL MEMBERS COMBINED
  // =========================================================================
  const memberSummaries = useMemo(() => {
    const list = db.members || [];
    return list.map(m => {
      // Reuse canonical AccountingService.getComprehensiveMemberLedger for 100% calculation parity
      const ledger = AccountingService.getComprehensiveMemberLedger(db, m.memberId);
      
      const totalCapital = ledger?.totalCapital || 0;
      const totalAdmissionFee = ledger?.totalAdmissionFee || 0;
      const totalChandaPaid = ledger?.totalMonthlySubscription || 0;
      const totalChandaDue = ledger?.dueInfo?.totalContributionDue || 0;
      const totalOutstanding = ledger?.dueInfo?.totalDueAmount || 0;
      const totalJorimana = ledger?.totalJorimana || 0;
      const totalBenefitProfit = ledger?.totalBenefitProfit || 0;
      const totalSettlement = ledger?.totalSettlement || 0;
      const currentMemberBalance = ledger?.currentMemberBalance || 0;

      return {
        member: m,
        totalCapital,
        totalAdmissionFee,
        totalChandaPaid,
        totalChandaDue,
        totalOutstanding,
        totalJorimana,
        totalBenefitProfit,
        totalSettlement,
        currentMemberBalance,
        ledger
      };
    });
  }, [db, rpcVersion]);

  // Aggregated 9 Heads for ALL members combined
  const allMembersAggregate = useMemo(() => {
    return memberSummaries.reduce(
      (acc, item) => ({
        totalCapital: acc.totalCapital + item.totalCapital,
        totalAdmissionFee: acc.totalAdmissionFee + item.totalAdmissionFee,
        totalChandaPaid: acc.totalChandaPaid + item.totalChandaPaid,
        totalChandaDue: acc.totalChandaDue + item.totalChandaDue,
        totalOutstanding: acc.totalOutstanding + item.totalOutstanding,
        totalJorimana: acc.totalJorimana + item.totalJorimana,
        totalBenefitProfit: acc.totalBenefitProfit + item.totalBenefitProfit,
        totalSettlement: acc.totalSettlement + item.totalSettlement,
        totalMemberBalance: acc.totalMemberBalance + item.currentMemberBalance,
      }),
      {
        totalCapital: 0,
        totalAdmissionFee: 0,
        totalChandaPaid: 0,
        totalChandaDue: 0,
        totalOutstanding: 0,
        totalJorimana: 0,
        totalBenefitProfit: 0,
        totalSettlement: 0,
        totalMemberBalance: 0,
      }
    );
  }, [memberSummaries]);

  // Filtered member summaries for the All Members Table view
  const filteredMemberSummaries = useMemo(() => {
    if (!allMembersSearchQuery.trim()) return memberSummaries;
    const query = allMembersSearchQuery.toLowerCase().trim();
    return memberSummaries.filter(item => 
      item.member.fullName?.toLowerCase().includes(query) ||
      item.member.memberId?.toLowerCase().includes(query) ||
      item.member.membershipNo?.toLowerCase().includes(query) ||
      item.member.mobile?.toLowerCase().includes(query)
    );
  }, [memberSummaries, allMembersSearchQuery]);

  // Paginated member summaries for table
  const paginatedMemberSummaries = useMemo(() => {
    const startIndex = (allMembersPage - 1) * allMembersPageSize;
    return filteredMemberSummaries.slice(startIndex, startIndex + allMembersPageSize);
  }, [filteredMemberSummaries, allMembersPage, allMembersPageSize]);

  const totalAllMembersPages = Math.ceil(filteredMemberSummaries.length / allMembersPageSize) || 1;

  // Compute Comprehensive Single Member Ledger Data with transaction filters
  const selectedMemberLedgerData = useMemo(() => {
    if (!selectedMember) return null;
    return AccountingService.getComprehensiveMemberLedger(db, selectedMember.memberId, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      transactionType: transactionType !== 'ALL' ? transactionType : undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined
    });
  }, [db, selectedMember, dateFrom, dateTo, transactionType, statusFilter, rpcVersion]);

  // Active 9-head summary object (Either selected member or all members aggregate)
  const activeSummary = useMemo(() => {
    if (selectedMember && selectedMemberLedgerData) {
      return {
        totalCapital: selectedMemberLedgerData.totalCapital,
        totalAdmissionFee: selectedMemberLedgerData.totalAdmissionFee,
        totalChandaPaid: selectedMemberLedgerData.totalMonthlySubscription,
        totalChandaDue: selectedMemberLedgerData.dueInfo?.totalContributionDue || 0,
        totalOutstanding: selectedMemberLedgerData.dueInfo?.totalDueAmount || 0,
        totalJorimana: selectedMemberLedgerData.totalJorimana,
        totalBenefitProfit: selectedMemberLedgerData.totalBenefitProfit,
        totalSettlement: selectedMemberLedgerData.totalSettlement,
        totalMemberBalance: selectedMemberLedgerData.currentMemberBalance,
      };
    }
    return allMembersAggregate;
  }, [selectedMember, selectedMemberLedgerData, allMembersAggregate]);

  // Manual refresh handler to trigger recalculation and invalidation
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRpcVersion(prev => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // Grouped Transactions for Bulk Collection Display
  const groupedSingleMemberItems = useMemo(() => {
    if (!selectedMemberLedgerData?.items) return [];

    const grouped: any[] = [];
    let currentGroup: any = null;

    for (const item of selectedMemberLedgerData.items) {
      const isCollection = item.transactionType === 'MONTHLY_COLLECTION' || item.transactionType === 'LATE_FEE' || item.transactionType === 'LATE_FINE';
      const receiptId = item.receiptNo || (item.voucherNo?.startsWith('REC-') ? item.voucherNo : null);

      if (isCollection && receiptId) {
        if (currentGroup && currentGroup.receiptId === receiptId) {
          currentGroup.items.push(item);
          currentGroup.credit += item.credit || 0;
          currentGroup.debit += item.debit || 0;
          currentGroup.balance = item.balance;
        } else {
          if (currentGroup) grouped.push(currentGroup.groupedItem);
          currentGroup = {
            receiptId,
            items: [item],
            credit: item.credit || 0,
            debit: item.debit || 0,
            balance: item.balance,
            get groupedItem() {
              // We check if this receipt had any discount/waived fees in db.collections
              const sourceCollections = db.collections?.filter(c => {
                const col = c as any;
                return col.receiptNo === this.receiptId || col.voucherNo === this.receiptId;
              }) || [];
              const hasWaivedFee = sourceCollections.some(c => Number(c.discount || 0) > 0);
              
              if (this.items.length === 1 && !hasWaivedFee) {
                return { ...this.items[0], isGrouped: false };
              }
              
              const breakdown = this.items.map((i: any) => {
                 const match = String(i.particulars).match(/(\d{4}-\d{2})/);
                 const m = match ? match[1] : '';
                 const label = (i.transactionType === 'LATE_FEE' || i.transactionType === 'LATE_FINE') ? 'Late Fee' : (m || 'Chanda');
                 return `${label} — BDT ${i.credit}`;
              }).join('\n');
              
              const waivedText = hasWaivedFee ? '\nLate Fee: BDT 0 Waived: YES' : '';
              const finalParticulars = `Total Receipt: BDT ${this.credit}\nBreakdown:\n${breakdown}\nTotal: BDT ${this.credit}${waivedText}`;

              return {
                ...this.items[0],
                credit: this.credit,
                debit: this.debit,
                balance: this.balance,
                isGrouped: true,
                subItems: this.items,
                transactionType: 'BULK_COLLECTION',
                particulars: finalParticulars
              };
            }
          };
        }
      } else {
        if (currentGroup) {
          grouped.push(currentGroup.groupedItem);
          currentGroup = null;
        }
        grouped.push(item);
      }
    }

    if (currentGroup) {
      grouped.push(currentGroup.groupedItem);
    }

    return grouped;
  }, [selectedMemberLedgerData, db.collections]);

  // Paginated Transactions for Single Member (Using Grouped Items)
  const paginatedSingleMemberItems = useMemo(() => {
    if (!groupedSingleMemberItems) return [];
    const startIndex = (currentPage - 1) * pageSize;
    return groupedSingleMemberItems.slice(startIndex, startIndex + pageSize);
  }, [groupedSingleMemberItems, currentPage, pageSize]);

  const totalSingleMemberPages = Math.ceil((groupedSingleMemberItems?.length || 0) / pageSize) || 1;

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
      case 'BULK_COLLECTION':
        return {
          label: isBangla ? 'সম্মিলিত আদায়' : 'Bulk Collection',
          bg: 'bg-blue-100 text-blue-900 border-blue-400'
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

  // Reset all filters for single member
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
    if (selectedMember && selectedMemberLedgerData?.items) {
      // Export Individual Member Ledger
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

      const rows = selectedMemberLedgerData.items.map((item, index) => [
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
        ['Member Summary Information (9 Heads)'],
        ['Member Name', `"${selectedMember.fullName}"`],
        ['Member ID', `"${selectedMember.memberId}"`],
        ['AJM Number', `"${selectedMember.membershipNo || '-'}"`],
        ['Mobile', `"${selectedMember.mobile || '-'}"`],
        ['Joining Date', `"${selectedMember.joiningDate || '-'}"`],
        ['Total Capital', activeSummary.totalCapital],
        ['Total Admission Fee', activeSummary.totalAdmissionFee],
        ['Total Chanda (Paid)', activeSummary.totalChandaPaid],
        ['Total Chanda (Due)', activeSummary.totalChandaDue],
        ['Total Outstanding', activeSummary.totalOutstanding],
        ['Total Jorimana', activeSummary.totalJorimana],
        ['Total Benefit / Profit', activeSummary.totalBenefitProfit],
        ['Total Settlement', activeSummary.totalSettlement],
        ['Total Member Balance', activeSummary.totalMemberBalance],
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
    } else {
      // Export All Members Summary (All 9 Heads)
      const headers = [
        'SL',
        'Member ID',
        'AJM No',
        'Member Name',
        'Mobile',
        'Status',
        'Total Capital (BDT)',
        'Total Admission Fee (BDT)',
        'Total Chanda (Paid) (BDT)',
        'Total Chanda (Due) (BDT)',
        'Total Outstanding (BDT)',
        'Total Jorimana (BDT)',
        'Total Benefit / Profit (BDT)',
        'Total Settlement (BDT)',
        'Total Member Balance (BDT)'
      ];

      const rows = memberSummaries.map((item, index) => [
        index + 1,
        `"${item.member.memberId}"`,
        `"${item.member.membershipNo || '-'}"`,
        `"${item.member.fullName.replace(/"/g, '""')}"`,
        `"${item.member.mobile || '-'}"`,
        item.member.status,
        item.totalCapital,
        item.totalAdmissionFee,
        item.totalChandaPaid,
        item.totalChandaDue,
        item.totalOutstanding,
        item.totalJorimana,
        item.totalBenefitProfit,
        item.totalSettlement,
        item.currentMemberBalance
      ]);

      const totalRow = [
        'TOTAL',
        `"${memberSummaries.length} Members"`,
        '-',
        'All Members Combined',
        '-',
        '-',
        allMembersAggregate.totalCapital,
        allMembersAggregate.totalAdmissionFee,
        allMembersAggregate.totalChandaPaid,
        allMembersAggregate.totalChandaDue,
        allMembersAggregate.totalOutstanding,
        allMembersAggregate.totalJorimana,
        allMembersAggregate.totalBenefitProfit,
        allMembersAggregate.totalSettlement,
        allMembersAggregate.totalMemberBalance
      ];

      const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map(e => e.join(',')),
        totalRow.join(',')
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `All_Members_Ledger_Summary_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // If there are no members in the database, display clean empty-state
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
                  ? 'সদস্যদের সকল জমা, চাঁদা, মূলধন, বকেয়া ও স্থিতির সার্বিক খতিয়ান' 
                  : 'Complete head-wise summary and detailed financial ledger for all members'}
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
                ? 'ডাটাবেজে বর্তমানে কোনো নিবন্ধিত সদস্য নেই। নতুন সদস্য নিবন্ধিত হলে এবং মূলধন জমা বা চাঁদা আদায়ের মতো আর্থিক লেনদেন এন্ট্রি হলে এখানে স্বয়ংক্রিয়ভাবে সকল সদস্যের সারসংক্ষেপ ও খতিয়ান প্রদর্শিত হবে।' 
                : 'There are currently no registered members in the database. When members are registered and accounting transactions are posted, their head-wise summary and ledger statements will automatically appear here.'}
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
      
      {/* 1. TOP HEADER & VIEW SWITCHER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isBangla ? 'সদস্য খতিয়ান' : 'Member Ledger'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedMember ? (
                    isBangla ? `সদস্য: ${selectedMember.fullName}` : `Member: ${selectedMember.fullName}`
                  ) : (
                    isBangla ? 'সকল সদস্যের সারসংক্ষেপ' : 'All Members'
                  )}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                {selectedMember 
                  ? (isBangla 
                      ? `সদস্য আইডি: ${selectedMember.memberId} | এজেএম: ${selectedMember.membershipNo || '-'}` 
                      : `Member ID: ${selectedMember.memberId} | AJM: ${selectedMember.membershipNo || '-'}`)
                  : (isBangla 
                      ? `সমিতির সকল (${membersList.length} জন) সদস্যের খাতভিত্তিক সমন্বিত আর্থিক সারসংক্ষেপ` 
                      : `Head-wise consolidated financial summary for all ${membersList.length} members`)}
              </p>
            </div>
          </div>
        </div>

        {/* Action & Navigation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedMember && !isMemberRole && (
            <button
              onClick={() => {
                setCurrentMemberId('');
                setMemberSearchQuery('');
              }}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title={isBangla ? 'সকল সদস্যের তালিকায় ফিরে যান' : 'Back to All Members Summary'}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isBangla ? 'সকল সদস্য (All Members)' : 'All Members'}</span>
            </button>
          )}

          {/* Member Quick Selector Search */}
          {!isMemberRole && (
            <div className="relative">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input 
                  type="text"
                  placeholder={isBangla ? 'সদস্য সিলেক্ট করুন...' : 'Select member...'}
                  value={memberSearchQuery}
                  onChange={(e) => {
                    setMemberSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-44 sm:w-56"
                />
              </div>

              {isDropdownOpen && searchedMembers.length > 0 && (
                <>
                  <div 
                    className="fixed inset-0 z-20"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                    <button
                      onClick={() => {
                        setCurrentMemberId('');
                        setMemberSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left p-2.5 hover:bg-emerald-50 text-emerald-800 font-bold flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>{isBangla ? 'সকল সদস্যের সারসংক্ষেপ (All Members)' : 'All Members Combined'}</span>
                      </div>
                      {!currentMemberId && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                    {searchedMembers.map(m => (
                      <button
                        key={m.memberId}
                        onClick={() => {
                          setCurrentMemberId(m.memberId);
                          setMemberSearchQuery('');
                          setIsDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left p-2.5 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer ${
                          currentMemberId === m.memberId ? 'bg-emerald-50 font-bold text-emerald-900' : 'text-slate-800'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{m.fullName}</p>
                          <p className="text-[10px] text-slate-500">{m.memberId} | {m.membershipNo || '-'}</p>
                        </div>
                        {currentMemberId === m.memberId && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={handleManualRefresh}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title={isBangla ? 'ডাটাবেজ ও খতিয়ান হিসাব হালনাগাদ করুন' : 'Refresh Ledger Calculations'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isBangla ? 'হালনাগাদ' : 'Refresh'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title={isBangla ? 'বিবরণী প্রিন্ট করুন' : 'Print Statement'}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isBangla ? 'প্রিন্ট' : 'Print'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title={isBangla ? 'এক্সেল / সিএসভি ফাইল ডাউনলোড করুন' : 'Export Excel / CSV'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isBangla ? 'এক্সেল' : 'Excel'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MEMBER LEDGER SUMMARY — 9 EXACT HEADS (FOR ALL MEMBERS OR SELECTED)   */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-800">
              {isBangla ? 'সদস্য খতিয়ান সারসংক্ষেপ' : 'Member Ledger Summary'}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {selectedMember 
                ? (isBangla ? `সদস্য: ${selectedMember.fullName}` : `Member: ${selectedMember.fullName}`) 
                : (isBangla ? 'সকল সদস্য (All Members)' : 'All Members')}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {selectedMember ? (isBangla ? 'একক সদস্যের হিসাব' : 'Individual Member') : (isBangla ? `মোট সদস্য: ${membersList.length} জন` : `Total: ${membersList.length} Members`)}
          </span>
        </div>

        {/* 9 SUMMARY CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4 print:grid-cols-3">
          
          {/* Head 1: Total Capital */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Capital
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-slate-900 tracking-tight">
                {formatMoney(activeSummary.totalCapital)}
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {isBangla ? 'মোট শেয়ার মূলধন জমা' : 'Member Capital Contributions'}
              </p>
            </div>
          </div>

          {/* Head 2: Total Admission Fee */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Admission Fee
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-amber-800 tracking-tight">
                {formatMoney(activeSummary.totalAdmissionFee)}
              </p>
              <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                {isBangla ? 'ভর্তি ফি (অ-ফেরতযোগ্য)' : 'Non-refundable Admission Revenue'}
              </p>
            </div>
          </div>

          {/* Head 3: Total Chanda (Paid) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Chanda (Paid)
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-emerald-700 tracking-tight">
                {formatMoney(activeSummary.totalChandaPaid)}
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {isBangla ? 'আদায়কৃত মাসিক চাঁদা' : 'Collected Monthly Subscriptions'}
              </p>
            </div>
          </div>

          {/* Head 4: Total Chanda (Due) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-orange-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Chanda (Due)
              </span>
              <div className="p-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-100">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-orange-700 tracking-tight">
                {formatMoney(activeSummary.totalChandaDue)}
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {isBangla ? 'বকেয়া মাসিক চাঁদা' : 'Unpaid Monthly Subscriptions'}
              </p>
            </div>
          </div>

          {/* Head 5: Total Outstanding */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Outstanding
              </span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-rose-700 tracking-tight">
                {formatMoney(activeSummary.totalOutstanding)}
              </p>
              <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                {isBangla ? 'সর্বমোট অনাদায়ী বকেয়া ও জরিমানা' : 'Total Outstanding Dues & Fines'}
              </p>
            </div>
          </div>

          {/* Head 6: Total Jorimana */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Jorimana
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-100">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-amber-800 tracking-tight">
                {formatMoney(activeSummary.totalJorimana)}
              </p>
              <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                {isBangla ? 'বিলম্ব ফি (অ-ফেরতযোগ্য)' : 'Late Fines & Penalties'}
              </p>
            </div>
          </div>

          {/* Head 7: Total Benefit / Profit */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Benefit / Profit
              </span>
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-purple-700 tracking-tight">
                {formatMoney(activeSummary.totalBenefitProfit)}
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {isBangla ? 'বণ্টনকৃত লভ্যাংশ ও কল্যাণ সুবিধা' : 'Allocated Profits & Welfare Grants'}
              </p>
            </div>
          </div>

          {/* Head 8: Total Settlement */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Settlement
              </span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
                <UserMinus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-rose-700 tracking-tight">
                {formatMoney(activeSummary.totalSettlement)}
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {isBangla ? 'প্রস্থান ফেরত ও হিসাব নিষ্পত্তি' : 'Member Exit Settlement Payouts'}
              </p>
            </div>
          </div>

          {/* Head 9: Total Member Balance (Standout Card) */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 p-4 rounded-2xl border-2 border-emerald-400 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950">
                Total Member Balance
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-emerald-950 tracking-tight">
                {formatMoney(activeSummary.totalMemberBalance)}
              </p>
              <p className="text-[10px] text-emerald-800 font-bold mt-0.5">
                {isBangla ? 'মূলধন + চাঁদা + লভ্যাংশ - নিষ্পত্তি' : 'Capital + Chanda + Profit - Settlement'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VIEW MODE A: ALL MEMBERS HEAD-WISE TABLE (WHEN NO MEMBER IS SELECTED) */}
      {/* ========================================================================= */}
      {!selectedMember && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:hidden space-y-0">
          
          {/* Table Header & Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50/80">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {isBangla ? 'সকল সদস্যের খতিয়ান তালিকা (All Members Breakdown)' : 'All Members Head-wise Breakdown'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isBangla 
                  ? `মোট ${filteredMemberSummaries.length} জন সদস্য প্রদর্শিত হচ্ছে। বিস্তারিত খতিয়ান দেখতে সারিতে ক্লিক করুন।`
                  : `Showing ${filteredMemberSummaries.length} members. Click on any row to open the detailed ledger.`}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  placeholder={isBangla ? 'নাম, আইডি বা মোবাইল দিয়ে খুঁজুন...' : 'Search by name, ID, phone...'}
                  value={allMembersSearchQuery}
                  onChange={(e) => {
                    setAllMembersSearchQuery(e.target.value);
                    setAllMembersPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-shadow"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs shrink-0">
                <span className="text-slate-500">{isBangla ? 'সারি:' : 'Rows:'}</span>
                <select
                  value={allMembersPageSize}
                  onChange={(e) => {
                    setAllMembersPageSize(Number(e.target.value));
                    setAllMembersPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="10">10</option>
                  <option value="15">15</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </div>

          {/* The All Members 9-Head Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3 min-w-[140px]">{isBangla ? 'সদস্যের বিবরণ' : 'Member'}</th>
                  <th className="py-3 px-3 text-right font-mono font-bold text-slate-800">Total Capital</th>
                  <th className="py-3 px-3 text-right font-mono text-amber-800">Admission Fee</th>
                  <th className="py-3 px-3 text-right font-mono font-bold text-emerald-800">Chanda (Paid)</th>
                  <th className="py-3 px-3 text-right font-mono text-orange-800">Chanda (Due)</th>
                  <th className="py-3 px-3 text-right font-mono text-rose-700">Outstanding</th>
                  <th className="py-3 px-3 text-right font-mono text-amber-900">Jorimana</th>
                  <th className="py-3 px-3 text-right font-mono text-purple-800">Benefit / Profit</th>
                  <th className="py-3 px-3 text-right font-mono text-rose-800">Settlement</th>
                  <th className="py-3 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-50/70 border-l border-emerald-200">
                    Member Balance
                  </th>
                  <th className="py-3 px-3 text-center w-24">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMemberSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">
                        {isBangla ? 'কোনো সদস্যের রেকর্ড পাওয়া যায়নি' : 'No member records found'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {isBangla ? 'অনুসন্ধান ফিল্টার পরিবর্তন করে চেষ্টা করুন' : 'Try adjusting the search query'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedMemberSummaries.map((row, index) => {
                    const serial = (allMembersPage - 1) * allMembersPageSize + index + 1;
                    return (
                      <tr 
                        key={row.member.memberId} 
                        className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                        onClick={() => {
                          setCurrentMemberId(row.member.memberId);
                          setCurrentPage(1);
                        }}
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {serial}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {row.member.fullName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span className="font-bold text-slate-700">{row.member.memberId}</span>
                            <span>•</span>
                            <span>{row.member.membershipNo || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {formatMoney(row.totalCapital)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-800 whitespace-nowrap">
                          {formatMoney(row.totalAdmissionFee)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                          {formatMoney(row.totalChandaPaid)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-orange-700 whitespace-nowrap">
                          {formatMoney(row.totalChandaDue)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-700 font-semibold whitespace-nowrap">
                          {formatMoney(row.totalOutstanding)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-800 whitespace-nowrap">
                          {formatMoney(row.totalJorimana)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-purple-700 whitespace-nowrap">
                          {formatMoney(row.totalBenefitProfit)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-700 whitespace-nowrap">
                          {formatMoney(row.totalSettlement)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-50/70 border-l border-emerald-200 whitespace-nowrap">
                          {formatMoney(row.currentMemberBalance)}
                        </td>
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setCurrentMemberId(row.member.memberId);
                              setCurrentPage(1);
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          >
                            {isBangla ? 'খতিয়ান' : 'View Ledger'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer Total Summary Row */}
              {filteredMemberSummaries.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300 text-xs">
                    <td colSpan={2} className="py-3.5 px-3 text-right uppercase tracking-wider text-[11px]">
                      {isBangla ? 'সর্বমোট (Grand Total):' : 'Grand Total (All):'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-900">
                      {formatMoney(allMembersAggregate.totalCapital)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-amber-800">
                      {formatMoney(allMembersAggregate.totalAdmissionFee)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-800 font-bold">
                      {formatMoney(allMembersAggregate.totalChandaPaid)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-orange-800">
                      {formatMoney(allMembersAggregate.totalChandaDue)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-rose-700">
                      {formatMoney(allMembersAggregate.totalOutstanding)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-amber-900">
                      {formatMoney(allMembersAggregate.totalJorimana)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-purple-800">
                      {formatMoney(allMembersAggregate.totalBenefitProfit)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-rose-800">
                      {formatMoney(allMembersAggregate.totalSettlement)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-100/80 border-l border-emerald-300">
                      {formatMoney(allMembersAggregate.totalMemberBalance)}
                    </td>
                    <td className="py-3.5 px-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Table Pagination */}
          {totalAllMembersPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white text-xs print:hidden">
              <span className="text-slate-500">
                {isBangla 
                  ? `পৃষ্ঠা ${allMembersPage} / ${totalAllMembersPages} (মোট ${filteredMemberSummaries.length} জন সদস্য)`
                  : `Page ${allMembersPage} of ${totalAllMembersPages} (${filteredMemberSummaries.length} total members)`}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={allMembersPage === 1}
                  onClick={() => setAllMembersPage(p => Math.max(1, p - 1))}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(5, totalAllMembersPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setAllMembersPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        allMembersPage === pageNum
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  disabled={allMembersPage === totalAllMembersPages}
                  onClick={() => setAllMembersPage(p => Math.min(totalAllMembersPages, p + 1))}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW MODE B: INDIVIDUAL MEMBER LEDGER (WHEN A MEMBER IS SELECTED)      */}
      {/* ========================================================================= */}
      {selectedMember && (
        <div className="space-y-6">
          
          {/* Member Profile Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-800/50 space-y-4">
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
                      <span>{selectedMember.mobile || '-'}</span>
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

          {/* Member Ledger Filter Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
              
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

          {/* Member Ledger Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" ref={printAreaRef}>
            
            {/* Table Header Controls */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  {isBangla ? 'খতিয়ান হিসাব বহি (Ledger Transactions)' : 'Ledger Transactions'}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                  {selectedMemberLedgerData?.items?.length || 0} {isBangla ? 'টি লেনদেন' : 'Entries'}
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
                  {paginatedSingleMemberItems.length === 0 ? (
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
                    paginatedSingleMemberItems.map((item, idx) => {
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
                          <td className="py-3 px-3.5 text-slate-700 font-medium whitespace-pre-wrap">
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
                {selectedMemberLedgerData && selectedMemberLedgerData.items.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300">
                      <td colSpan={5} className="py-3 px-3.5 text-right">
                        {isBangla ? 'সর্বমোট (Total Filtered):' : 'Total Filtered:'}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-rose-700">
                        {formatMoney(selectedMemberLedgerData.totalDebit)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-emerald-700">
                        {formatMoney(selectedMemberLedgerData.totalCredit)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-emerald-900 bg-emerald-50">
                        {formatMoney(selectedMemberLedgerData.closingBalance)}
                      </td>
                      <td className="py-3 px-3.5"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination Controls */}
            {totalSingleMemberPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white text-xs print:hidden">
                <span className="text-slate-500">
                  {isBangla 
                    ? `পৃষ্ঠা ${currentPage} / ${totalSingleMemberPages} (মোট ${selectedMemberLedgerData?.items?.length || 0} টি রেকর্ড)`
                    : `Page ${currentPage} of ${totalSingleMemberPages} (${selectedMemberLedgerData?.items?.length || 0} total records)`}
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

                  {Array.from({ length: Math.min(5, totalSingleMemberPages) }, (_, i) => {
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
                    disabled={currentPage === totalSingleMemberPages}
                    onClick={() => setCurrentPage(p => Math.min(totalSingleMemberPages, p + 1))}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title={isBangla ? 'পরবর্তী পৃষ্ঠা' : 'Next Page'}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. FORMAL PRINT-ONLY STATEMENT TEMPLATES                                  */}
      {/* ========================================================================= */}
      <div className="hidden print:block font-serif text-slate-900 p-8 space-y-6 bg-white">
        
        {/* Institutional Header */}
        <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
          <div className="flex justify-center mb-2">
            <AJFLogo 
              variant="print" 
              alt={db.settings?.orgNameBangla || 'আতরগাঁও জাগরণী ক্লাব লোগো'} 
              className="w-14 h-14 shrink-0" 
            />
          </div>
          <h1 className="text-2xl font-black tracking-wide text-slate-950 uppercase">
            {db.settings?.orgName || 'AJ Welfare Society'}
          </h1>
          <h2 className="text-lg font-bold text-slate-800">
            {db.settings?.orgNameBangla || 'তাতরগাঁও জাগরণী ক্লাব ব্যবসায়িক তহবিল ও কল্যাণ সমিতি'}
          </h2>
          <p className="text-xs text-slate-600">
            {db.settings?.address || (db.settings as any)?.addressBangla || 'আটারগাঁও, ডাকঘর: আটারগাঁও, উপজেলা: রাণীশংকৈল, জেলা: ঠাকুরগাঁও'}
          </p>
          <div className="inline-block mt-2 px-4 py-1 bg-slate-100 rounded-full border border-slate-300 text-xs font-bold tracking-wider uppercase">
            {selectedMember 
              ? 'সদস্য পূর্ণাঙ্গ খতিয়ান বিবরণী (Member Financial Ledger Statement)'
              : 'সকল সদস্য সমন্বিত খতিয়ান বিবরণী (All Member Head-wise Financial Summary)'}
          </div>
        </div>

        {/* Statement Meta */}
        {selectedMember ? (
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
        ) : (
          <div className="grid grid-cols-2 gap-4 border border-slate-300 p-4 rounded-lg text-xs">
            <div className="space-y-1">
              <p><strong>প্রতিবেদনের ধরণ:</strong> সকল সদস্যের সমন্বিত খতিয়ান বিবরণী</p>
              <p><strong>মোট সদস্য সংখ্যা:</strong> {membersList.length} জন</p>
            </div>
            <div className="space-y-1 text-right">
              <p><strong>অর্থবছর:</strong> {financialYear}</p>
              <p><strong>প্রিন্টের তারিখ:</strong> {new Date().toLocaleDateString('bn-BD')}</p>
            </div>
          </div>
        )}

        {/* 9-Head Summary Print Box */}
        <div className="grid grid-cols-3 gap-2 border border-slate-300 p-3 rounded-lg text-xs text-center bg-slate-50">
          <div className="p-1 border-r border-b border-slate-200">
            <p className="text-slate-500 font-medium">Total Capital</p>
            <p className="font-bold text-sm text-slate-900">{formatMoney(activeSummary.totalCapital)}</p>
          </div>
          <div className="p-1 border-r border-b border-slate-200">
            <p className="text-slate-500 font-medium">Total Admission Fee</p>
            <p className="font-bold text-sm text-slate-900">{formatMoney(activeSummary.totalAdmissionFee)}</p>
          </div>
          <div className="p-1 border-b border-slate-200">
            <p className="text-slate-500 font-medium">Total Chanda (Paid)</p>
            <p className="font-bold text-sm text-slate-900">{formatMoney(activeSummary.totalChandaPaid)}</p>
          </div>
          <div className="p-1 border-r border-b border-slate-200">
            <p className="text-slate-500 font-medium">Total Chanda (Due)</p>
            <p className="font-bold text-sm text-slate-900">{formatMoney(activeSummary.totalChandaDue)}</p>
          </div>
          <div className="p-1 border-r border-b border-slate-200">
            <p className="text-slate-500 font-medium">Total Outstanding</p>
            <p className="font-bold text-sm text-slate-900">{formatMoney(activeSummary.totalOutstanding)}</p>
          </div>
          <div className="p-1 border-b border-slate-200">
            <p className="text-slate-500 font-medium">Total Jorimana</p>
            <p className="font-bold text-sm text-slate-900">{formatMoney(activeSummary.totalJorimana)}</p>
          </div>
          <div className="p-1 border-r border-slate-200">
            <p className="text-slate-500 font-medium">Total Benefit / Profit</p>
            <p className="font-bold text-sm text-slate-900">{formatMoney(activeSummary.totalBenefitProfit)}</p>
          </div>
          <div className="p-1 border-r border-slate-200">
            <p className="text-slate-500 font-medium">Total Settlement</p>
            <p className="font-bold text-sm text-slate-900">{formatMoney(activeSummary.totalSettlement)}</p>
          </div>
          <div className="p-1 bg-emerald-50 rounded">
            <p className="text-emerald-900 font-bold">Total Member Balance</p>
            <p className="font-black text-sm text-emerald-900">{formatMoney(activeSummary.totalMemberBalance)}</p>
          </div>
        </div>

        {/* Printable Data Table */}
        {selectedMember ? (
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
              {selectedMemberLedgerData?.items?.map((item, index) => (
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
                <td className="p-2 text-right border-r border-slate-400">{formatMoney(selectedMemberLedgerData?.totalDebit || 0)}</td>
                <td className="p-2 text-right border-r border-slate-400">{formatMoney(selectedMemberLedgerData?.totalCredit || 0)}</td>
                <td className="p-2 text-right">{formatMoney(selectedMemberLedgerData?.closingBalance || 0)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <table className="w-full text-xs border border-slate-400 border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-400">
                <th className="p-1.5 border-r border-slate-400 text-center">#</th>
                <th className="p-1.5 border-r border-slate-400">সদস্য</th>
                <th className="p-1.5 border-r border-slate-400 text-right">Capital</th>
                <th className="p-1.5 border-r border-slate-400 text-right">Admission</th>
                <th className="p-1.5 border-r border-slate-400 text-right">Chanda (Paid)</th>
                <th className="p-1.5 border-r border-slate-400 text-right">Chanda (Due)</th>
                <th className="p-1.5 border-r border-slate-400 text-right">Outstanding</th>
                <th className="p-1.5 border-r border-slate-400 text-right">Jorimana</th>
                <th className="p-1.5 border-r border-slate-400 text-right">Benefit</th>
                <th className="p-1.5 border-r border-slate-400 text-right">Settlement</th>
                <th className="p-1.5 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {memberSummaries.map((m, index) => (
                <tr key={index} className="border-b border-slate-300">
                  <td className="p-1.5 border-r border-slate-300 text-center">{index + 1}</td>
                  <td className="p-1.5 border-r border-slate-300 font-bold">{m.member.fullName} ({m.member.memberId})</td>
                  <td className="p-1.5 border-r border-slate-300 text-right">{formatMoney(m.totalCapital)}</td>
                  <td className="p-1.5 border-r border-slate-300 text-right">{formatMoney(m.totalAdmissionFee)}</td>
                  <td className="p-1.5 border-r border-slate-300 text-right">{formatMoney(m.totalChandaPaid)}</td>
                  <td className="p-1.5 border-r border-slate-300 text-right">{formatMoney(m.totalChandaDue)}</td>
                  <td className="p-1.5 border-r border-slate-300 text-right">{formatMoney(m.totalOutstanding)}</td>
                  <td className="p-1.5 border-r border-slate-300 text-right">{formatMoney(m.totalJorimana)}</td>
                  <td className="p-1.5 border-r border-slate-300 text-right">{formatMoney(m.totalBenefitProfit)}</td>
                  <td className="p-1.5 border-r border-slate-300 text-right">{formatMoney(m.totalSettlement)}</td>
                  <td className="p-1.5 text-right font-bold">{formatMoney(m.currentMemberBalance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                <td colSpan={2} className="p-2 text-right">সর্বমোট:</td>
                <td className="p-2 text-right border-r border-slate-400">{formatMoney(allMembersAggregate.totalCapital)}</td>
                <td className="p-2 text-right border-r border-slate-400">{formatMoney(allMembersAggregate.totalAdmissionFee)}</td>
                <td className="p-2 text-right border-r border-slate-400">{formatMoney(allMembersAggregate.totalChandaPaid)}</td>
                <td className="p-2 text-right border-r border-slate-400">{formatMoney(allMembersAggregate.totalChandaDue)}</td>
                <td className="p-2 text-right border-r border-slate-400">{formatMoney(allMembersAggregate.totalOutstanding)}</td>
                <td className="p-2 text-right border-r border-slate-400">{formatMoney(allMembersAggregate.totalJorimana)}</td>
                <td className="p-2 text-right border-r border-slate-400">{formatMoney(allMembersAggregate.totalBenefitProfit)}</td>
                <td className="p-2 text-right border-r border-slate-400">{formatMoney(allMembersAggregate.totalSettlement)}</td>
                <td className="p-2 text-right">{formatMoney(allMembersAggregate.totalMemberBalance)}</td>
              </tr>
            </tfoot>
          </table>
        )}

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

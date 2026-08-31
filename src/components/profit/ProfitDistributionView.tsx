import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { PdfService } from '../../services/pdfService';
import { MemberProfileModal } from '../members/MemberProfileModal';
import {
  PieChart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Printer,
  Download,
  Users,
  CheckCircle2,
  AlertCircle,
  PiggyBank,
  ShieldCheck,
  HeartHandshake,
  Lock,
  Search,
  Filter,
  FileSpreadsheet,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Eye,
  FileText,
  ChevronDown,
  Check,
  Coins,
  BadgePercent,
  X,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt
} from 'lucide-react';
import { Member } from '../../types';

export const ProfitDistributionView: React.FC = () => {
  const { db, language, activeUser, finalizeProfit } = useApp();
  const isBangla = language === 'bn';

  // Dynamic Financial Year Selection (Reporting Filter)
  const defaultFY = db.settings.currentFinancialYear || '2026-2027';
  const [selectedFY, setSelectedFY] = useState<string>(defaultFY);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals State
  const [isFinalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [resolutionNo, setResolutionNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState<string | null>(null);
  const [selectedMemberForSlip, setSelectedMemberForSlip] = useState<Member | null>(null);

  // Available Financial Years derived from database state
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    if (db.settings.currentFinancialYear) set.add(db.settings.currentFinancialYear);
    (db.financialYears || []).forEach((fy) => {
      if (fy.yearCode) set.add(fy.yearCode);
    });
    (db.historicalProfits || []).forEach((hp) => {
      if (hp.financialYear) set.add(hp.financialYear);
    });
    if (set.size === 0) {
      set.add('2026-2027');
      set.add('2025-2026');
      set.add('2024-2025');
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [db.settings.currentFinancialYear, db.financialYears, db.historicalProfits]);

  // Check if selected financial year is finalized
  const existingFinalized = useMemo(() => {
    return (db.historicalProfits || []).find((hp) => hp.financialYear === selectedFY);
  }, [db.historicalProfits, selectedFY]);

  const isFinalized = !!existingFinalized;
  const isCurrentYear = selectedFY === db.settings.currentFinancialYear;

  // Calculate live financial summary from books
  const liveSummary = useMemo(() => {
    return AccountingService.calculateFinancialSummary(db);
  }, [db]);

  // Derived financial metrics based on selected year
  const totalIncome = isFinalized
    ? liveSummary.totalIncome
    : isCurrentYear
    ? liveSummary.totalIncome
    : 0;

  const totalExpense = isFinalized
    ? liveSummary.totalExpense
    : isCurrentYear
    ? liveSummary.totalExpense
    : 0;

  const netProfit = isFinalized
    ? existingFinalized.netProfit
    : isCurrentYear
    ? Math.max(0, liveSummary.netProfit || 0)
    : 0;

  // Dynamic percentages: Historical record if finalized, else constitutional settings
  const profitMemberPercent = isFinalized
    ? existingFinalized.memberDistributionPercent !== undefined
      ? existingFinalized.memberDistributionPercent
      : existingFinalized.memberPercent ?? 60
    : db.settings.profitMemberPercent ?? 60;

  const profitWelfarePercent = isFinalized
    ? existingFinalized.welfarePercent ?? 20
    : db.settings.profitWelfarePercent ?? 20;

  const profitEmergencyPercent = isFinalized
    ? existingFinalized.emergencyPercent ?? 10
    : db.settings.profitEmergencyPercent ?? 10;

  const profitReservePercent = isFinalized
    ? existingFinalized.reservePercent ?? 10
    : db.settings.profitReservePercent ?? 10;

  const totalPercentage =
    profitMemberPercent +
    profitWelfarePercent +
    profitEmergencyPercent +
    profitReservePercent;

  // Exact Allocation Amounts with Remainder Balancing for 100% reconciliation
  let memberShareAmount = 0;
  let welfareShareAmount = 0;
  let emergencyShareAmount = 0;
  let reserveShareAmount = 0;

  if (isFinalized) {
    memberShareAmount =
      existingFinalized.memberDistributionAmount !== undefined
        ? existingFinalized.memberDistributionAmount
        : existingFinalized.memberAmount || 0;
    welfareShareAmount = existingFinalized.welfareAmount || 0;
    emergencyShareAmount = existingFinalized.emergencyAmount || 0;
    reserveShareAmount = existingFinalized.reserveAmount || 0;
  } else {
    welfareShareAmount = Math.round((netProfit * profitWelfarePercent) / 100);
    emergencyShareAmount = Math.round((netProfit * profitEmergencyPercent) / 100);
    reserveShareAmount = Math.round((netProfit * profitReservePercent) / 100);

    // Guarantee exact zero residual remainder allocation to members
    if (totalPercentage === 100) {
      memberShareAmount =
        netProfit - (welfareShareAmount + emergencyShareAmount + reserveShareAmount);
    } else {
      memberShareAmount = Math.round((netProfit * profitMemberPercent) / 100);
    }
  }

  // Active regular members eligible for dividend
  const allMembers = db.members || [];
  const activeMembers = useMemo(
    () => allMembers.filter((m) => m.status === 'ACTIVE'),
    [allMembers]
  );
  const activeMembersCount = activeMembers.length;

  const perMemberShare =
    activeMembersCount > 0 && memberShareAmount > 0
      ? Math.floor(memberShareAmount / activeMembersCount)
      : 0;

  // Filtered members for table
  const isMemberRole = activeUser?.role === 'MEMBER';
  const filteredMembers = useMemo(() => {
    let list = allMembers;

    // RBAC: Standard members only see their own record
    if (isMemberRole && activeUser.linkedMemberId) {
      list = list.filter((m) => m.memberId === activeUser.linkedMemberId);
    }

    // Status filter
    if (statusFilter === 'ACTIVE') {
      list = list.filter((m) => m.status === 'ACTIVE');
    } else if (statusFilter === 'INACTIVE') {
      list = list.filter((m) => m.status !== 'ACTIVE');
    }

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.memberId.toLowerCase().includes(q) ||
          (m.mobile && m.mobile.includes(q))
      );
    }

    return list;
  }, [allMembers, isMemberRole, activeUser, statusFilter, searchTerm]);

  // Aggregate eligible capital
  const totalEligibleCapital = useMemo(() => {
    return activeMembers.reduce((acc) => acc + (db.settings.capitalDeposit || 5000), 0);
  }, [activeMembers, db.settings.capitalDeposit]);

  // Handlers
  const handlePrint = () => {
    PdfService.printElement('printable-profit-sheet', `Profit_Distribution_${selectedFY}`);
  };

  const handleExportPdf = () => {
    PdfService.exportToPdf('printable-profit-sheet', `AJ_Profit_Distribution_${selectedFY}.pdf`);
  };

  const handlePrintSlip = () => {
    if (!selectedMemberForSlip) return;
    PdfService.printElement(
      'printable-member-dividend-slip',
      `Dividend_Slip_${selectedMemberForSlip.memberId}_${selectedFY}`
    );
  };

  const handleFinalize = () => {
    if (totalPercentage !== 100) {
      alert('বণ্টনের মোট শতকরা হার অবশ্যই ১০০% হতে হবে।');
      return;
    }

    const hp = {
      id: `HP-${Date.now()}`,
      financialYear: selectedFY,
      netProfit: netProfit,
      welfarePercent: profitWelfarePercent,
      welfareAmount: welfareShareAmount,
      emergencyPercent: profitEmergencyPercent,
      emergencyAmount: emergencyShareAmount,
      reservePercent: profitReservePercent,
      reserveAmount: reserveShareAmount,
      memberDistributionPercent: profitMemberPercent,
      memberDistributionAmount: memberShareAmount,
      finalized: true,
      finalizedAt: new Date().toISOString(),
      finalizedBy: activeUser?.fullName || 'Admin',
      resolutionNo: resolutionNo.trim() || undefined,
      remarks: remarks.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    finalizeProfit(hp);
    setFinalizeModalOpen(false);
  };

  const canFinalize =
    ['ADMIN', 'ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(activeUser?.role || '') &&
    !isFinalized;

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-2 sm:px-4">
      {/* 1. Page Header & Financial Year Selector */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-emerald-700 text-white rounded-xl shadow-xs">
              <PieChart className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {isBangla
                  ? 'বার্ষিক নিট মুনাফা ও লভ্যাংশ বণ্টন'
                  : 'Annual Net Profit & Dividend Allocation'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {isBangla
                  ? 'সমিতির অনুমোদিত গঠনতন্ত্র নীতি (৬০:২০:১০:১০) অনুযায়ী উদ্বৃত্ত বিভাজন ও সদস্য হিস্যা বণ্টন'
                  : 'Constitution-approved profit distribution engine & member dividend distribution'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Toolbar: Dropdown, Badges & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
          {/* Dynamic Financial Year Selector */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs hover:border-slate-300 transition-colors">
            <Calendar className="w-4 h-4 text-emerald-800 mr-2 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-600 mr-1.5 hidden sm:inline">
              {isBangla ? 'অর্থবছর:' : 'FY:'}
            </span>
            <select
              id="select-financial-year"
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer pr-5 appearance-none font-mono"
            >
              {availableYears.map((fy) => (
                <option key={fy} value={fy} className="bg-white text-slate-900">
                  {fy} {fy === db.settings.currentFinancialYear ? '(বর্তমান)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* Status Badge */}
          {isFinalized ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isBangla ? 'চূড়ান্তকৃত (Finalized)' : 'Finalized'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>{isBangla ? 'চলমান খসড়া হিসাব (Draft)' : 'Live Draft'}</span>
            </div>
          )}

          {/* Finalize Action */}
          {canFinalize && (
            <button
              id="btn-finalize-profit"
              onClick={() => setFinalizeModalOpen(true)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isBangla ? 'মুনাফা চূড়ান্ত করুন' : 'Finalize Profit'}</span>
            </button>
          )}

          {/* Print & PDF Actions */}
          <button
            id="btn-print-profit"
            onClick={handlePrint}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 shadow-2xs"
            title="প্রিন্ট প্রিভিউ"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">{isBangla ? 'প্রিন্ট' : 'Print'}</span>
          </button>
          <button
            id="btn-export-pdf-profit"
            onClick={handleExportPdf}
            className="bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isBangla ? 'PDF ডাউনলোড' : 'PDF Export'}</span>
          </button>
        </div>
      </div>

      {/* 2. Financial Summary Overview (4 Modern ERP KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Income (সর্বমোট অর্জিত আয়) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-sm transition-all group">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-emerald-800 tracking-wider uppercase inline-block">
                  Total Income
                </span>
                <h3 className="text-sm font-bold text-slate-800">
                  সর্বমোট অর্জিত আয়
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1">
                <span>৳</span>
                <span>{totalIncome.toLocaleString('en-BD')}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">
              চাঁদা, ভর্তি ফি, বিনিয়োগ ও অন্যান্য
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              <ArrowUpRight className="w-3 h-3" />
              রাজস্ব
            </span>
          </div>
        </div>

        {/* Card 2: Total Expense (সর্বমোট পরিচালন ব্যয়) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-rose-300 hover:shadow-sm transition-all group">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-rose-800 tracking-wider uppercase inline-block">
                  Total Expense
                </span>
                <h3 className="text-sm font-bold text-slate-800">
                  সর্বমোট পরিচালন ব্যয়
                </h3>
              </div>
              <div className="p-2.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 group-hover:bg-rose-100 transition-colors">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1">
                <span>৳</span>
                <span>{totalExpense.toLocaleString('en-BD')}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">
              অনুমোদিত সাংগঠনিক ও দাপ্তরিক ব্যয়
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-900 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              <ArrowDownRight className="w-3 h-3" />
              পরিচালন
            </span>
          </div>
        </div>

        {/* Card 3: Net Profit (বার্ষিক নিট মুনাফা) */}
        <div className="bg-emerald-900 text-white p-5 rounded-2xl border border-emerald-800 shadow-sm flex flex-col justify-between hover:border-emerald-700 transition-all relative overflow-hidden group">
          <div className="z-10">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-emerald-200 tracking-wider uppercase inline-block">
                  Net Profit
                </span>
                <h3 className="text-sm font-bold text-white">
                  বার্ষিক নিট মুনাফা
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-800/90 text-emerald-100 rounded-xl border border-emerald-700/60 group-hover:bg-emerald-800 transition-colors">
                <PiggyBank className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight flex items-baseline gap-1">
                <span>৳</span>
                <span>{netProfit.toLocaleString('en-BD')}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-800/80 flex items-center justify-between text-xs z-10">
            <span className="text-emerald-200 text-[11px]">
              বণ্টনযোগ্য মূল উদ্বৃত্ত (আয় − ব্যয়)
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-100 bg-emerald-800/80 px-2 py-0.5 rounded-md border border-emerald-700/60">
              <Sparkles className="w-3 h-3 text-emerald-300" />
              উদ্বৃত্ত
            </span>
          </div>

          {/* Subtle background glow */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-800/30 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Card 4: Member Dividend (সদস্য প্রতি লভ্যাংশ) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-sm transition-all group">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-emerald-800 tracking-wider uppercase inline-block">
                  Member Dividend
                </span>
                <h3 className="text-sm font-bold text-slate-800">
                  সদস্য প্রতি লভ্যাংশ
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono tracking-tight flex items-baseline gap-1">
                <span>৳</span>
                <span>{perMemberShare.toLocaleString('en-BD')}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">
              {activeMembersCount} জন নিয়মিত সক্রিয় সদস্য
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              <BadgePercent className="w-3 h-3 text-emerald-700" />
              {profitMemberPercent}% হিস্যা
            </span>
          </div>
        </div>
      </div>

      {/* 3. Constitution Policy Allocation (4 Breakdown Cards + Reconciliation Bar) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="space-y-0.5">
            <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-800" />
              <span>গঠনতন্ত্র অনুসারে তহবিল বণ্টন ও বরাদ্দ অনুপাত (Constitution Policy Allocation)</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              অনুমোদিত নীতি: {profitMemberPercent}% সদস্য + {profitWelfarePercent}% কল্যাণ +{' '}
              {profitEmergencyPercent}% জরুরী + {profitReservePercent}% সংরক্ষিত = ১০০%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                totalPercentage === 100
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              মোট বরাদ্দ অনুপাত: {totalPercentage}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Member Dividend (60%) */}
          <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-xl border border-emerald-200/90 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-800" />
                  ১. সদস্য লভ্যাংশ
                </span>
                <span className="bg-emerald-200 text-emerald-950 text-xs font-black px-2 py-0.5 rounded-md">
                  {profitMemberPercent}%
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-950 font-mono tracking-tight">
                ৳{memberShareAmount.toLocaleString()}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-200/80 text-xs text-emerald-900">
              <div className="flex justify-between items-center">
                <span>মাথাপিছু হিস্যা:</span>
                <strong className="font-mono font-bold text-sm">
                  ৳{perMemberShare.toLocaleString()}
                </strong>
              </div>
              <p className="text-[10px] text-emerald-800 mt-1">
                {activeMembersCount} জন নিয়মিত সদস্যের মধ্যে সমবণ্টন
              </p>
            </div>
          </div>

          {/* 2. Welfare Fund (20%) */}
          <div className="bg-purple-50/70 p-4 sm:p-5 rounded-xl border border-purple-200/90 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-purple-950 text-xs flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-purple-800" />
                  ২. কল্যাণ তহবিল
                </span>
                <span className="bg-purple-200 text-purple-950 text-xs font-black px-2 py-0.5 rounded-md">
                  {profitWelfarePercent}%
                </span>
              </div>
              <div className="text-2xl font-black text-purple-950 font-mono tracking-tight">
                ৳{welfareShareAmount.toLocaleString()}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-purple-200/80 text-[11px] text-purple-900">
              <p>চিকিৎসা অনুদান, শিক্ষাবৃত্তি ও মানবিক সহায়তা কার্যক্রমে স্থানান্তর</p>
            </div>
          </div>

          {/* 3. Emergency Fund (10%) */}
          <div className="bg-amber-50/70 p-4 sm:p-5 rounded-xl border border-amber-200/90 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-amber-950 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-800" />
                  ৩. জরুরী তহবিল
                </span>
                <span className="bg-amber-200 text-amber-950 text-xs font-black px-2 py-0.5 rounded-md">
                  {profitEmergencyPercent}%
                </span>
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono tracking-tight">
                ৳{emergencyShareAmount.toLocaleString()}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-amber-200/80 text-[11px] text-amber-900">
              <p>বিপদকালীন আপদ ও আকস্মিক দুর্যোগ মোকাবিলার জন্য সংরক্ষিত</p>
            </div>
          </div>

          {/* 4. Reserve Fund (10%) */}
          <div className="bg-blue-50/70 p-4 sm:p-5 rounded-xl border border-blue-200/90 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-blue-950 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
                  ৪. সংরক্ষিত তহবিল
                </span>
                <span className="bg-blue-200 text-blue-950 text-xs font-black px-2 py-0.5 rounded-md">
                  {profitReservePercent}%
                </span>
              </div>
              <div className="text-2xl font-black text-blue-950 font-mono tracking-tight">
                ৳{reserveShareAmount.toLocaleString()}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200/80 text-[11px] text-blue-900">
              <p>স্থায়ী মূলধন বৃদ্ধি ও সমিতির দীর্ঘমেয়াদী আর্থিক নিরাপত্তা তহবিল</p>
            </div>
          </div>
        </div>

        {/* Reconciliation Check Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-700 gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>
              <strong>হিসাব সমন্বয়:</strong> সদস্য (৳{memberShareAmount.toLocaleString()}) + কল্যাণ (৳
              {welfareShareAmount.toLocaleString()}) + জরুরী (৳{emergencyShareAmount.toLocaleString()}) +
              সংরক্ষিত (৳{reserveShareAmount.toLocaleString()}) ={' '}
              <strong>৳{netProfit.toLocaleString()}</strong>
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100 border border-emerald-200 px-3 py-0.5 rounded-full">
            ১০০% সমীকৃত ও সুরক্ষিত
          </span>
        </div>
      </div>

      {/* 4. Member Dividend Distribution Sheet (Search, Filter, Table, Actions) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4">
        {/* Table Title & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-slate-50/50">
          <div>
            <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
              <span>সদস্যভিত্তিক লভ্যাংশ বণ্টন তালিকা (Member Profit Distribution Sheet)</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              অর্থবছর: {selectedFY} | {db.settings.orgNameBangla}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="সদস্যের নাম / আইডি / মোবাইল..."
                className="pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-700 w-48 sm:w-60 shadow-2xs"
              />
            </div>

            {/* Status Filter */}
            {!isMemberRole && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-xs shadow-2xs">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'ALL'
                      ? 'bg-emerald-800 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  সকল ({allMembers.length})
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'ACTIVE'
                      ? 'bg-emerald-800 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  যোগ্য ({activeMembersCount})
                </button>
                <button
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'INACTIVE'
                      ? 'bg-emerald-800 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  অন্যান্য ({allMembers.length - activeMembersCount})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Member Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-center">ক্রমিক</th>
                <th className="p-3.5">সদস্য আইডি</th>
                <th className="p-3.5">সদস্যের নাম ও মোবাইল</th>
                <th className="p-3.5 text-right">মূলধন আমানত (৳)</th>
                <th className="p-3.5 text-center">সদস্য পদমর্যাদা</th>
                <th className="p-3.5 text-center">লভ্যাংশ প্রাপ্যতা</th>
                <th className="p-3.5 text-right">প্রাপ্য লভ্যাংশ (৳)</th>
                <th className="p-3.5 text-center">বিতরণ স্থিতি</th>
                <th className="p-3.5 text-center">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMembers.map((m, idx) => {
                const isActive = m.status === 'ACTIVE';
                const shareAmount = isActive ? perMemberShare : 0;
                const memberCapital = db.settings.capitalDeposit || 5000;

                return (
                  <tr
                    key={m.memberId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !isActive ? 'bg-slate-50/40 text-slate-400' : ''
                    }`}
                  >
                    <td className="p-3.5 text-center font-mono font-medium text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-900">
                      <button
                        onClick={() => setSelectedMemberForProfile(m.memberId)}
                        className="hover:underline flex items-center gap-1 text-emerald-900"
                        title="সদস্য প্রোফাইল দেখুন"
                      >
                        {m.memberId}
                      </button>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{m.fullName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{m.mobile}</div>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                      ৳{memberCapital.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {isActive ? 'যোগ্য (Eligible)' : 'অনুপযুক্ত (Ineligible)'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-emerald-900 text-sm">
                      ৳{shareAmount.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      {isActive ? (
                        <span className="text-[10px] font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          {isFinalized ? 'বণ্টনযোগ্য (Approved)' : 'খসড়া হিসাব (Draft)'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedMemberForSlip(m)}
                          className="p-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 rounded-lg transition-colors border border-slate-200"
                          title="লভ্যাংশ স্লিপ দেখুন"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedMemberForProfile(m.memberId)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-200"
                          title="প্রোফাইল দেখুন"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    কোনো সদস্যের রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
            {/* Table Footer with Summary */}
            <tfoot className="bg-slate-50 font-bold text-xs border-t-2 border-slate-200 text-slate-900">
              <tr>
                <td colSpan={3} className="p-3.5 text-right font-bold text-slate-700">
                  মোট যোগ্য সদস্য সংখ্যা ({activeMembersCount} জন):
                </td>
                <td className="p-3.5 text-right font-mono text-slate-900 font-bold">
                  ৳{totalEligibleCapital.toLocaleString()}
                </td>
                <td colSpan={2} className="p-3.5 text-right font-bold text-slate-700">
                  সর্বমোট সদস্য লভ্যাংশ হিস্যা:
                </td>
                <td className="p-3.5 text-right font-mono text-emerald-950 text-base font-black">
                  ৳{memberShareAmount.toLocaleString()}
                </td>
                <td colSpan={2} className="p-3.5 text-center text-[10px] text-slate-500">
                  {isFinalized ? 'চূড়ান্ত সমন্বিত' : 'প্রস্তাবিত খসড়া'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Historical Profit Finalizations Archive Section */}
      {db.historicalProfits && db.historicalProfits.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-800" />
              <span>বিগত অর্থবছরসমূহের সংরক্ষিত লভ্যাংশ বণ্টন ইতিহাস (Historical Profit Archive)</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3.5">অর্থবছর (FY)</th>
                  <th className="p-3.5 text-right">নিট মুনাফা</th>
                  <th className="p-3.5 text-center">সদস্য হিস্যা (%)</th>
                  <th className="p-3.5 text-center">কল্যাণ হিস্যা (%)</th>
                  <th className="p-3.5 text-center">জরুরী হিস্যা (%)</th>
                  <th className="p-3.5 text-center">সংরক্ষিত হিস্যা (%)</th>
                  <th className="p-3.5 text-center">স্ট্যাটাস</th>
                  <th className="p-3.5">চূড়ান্তকারী ও তারিখ</th>
                  <th className="p-3.5">রেজুলেশন নং</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {db.historicalProfits.map((hp) => {
                  const memPrc =
                    hp.memberDistributionPercent !== undefined
                      ? hp.memberDistributionPercent
                      : hp.memberPercent || 60;
                  const memAmt =
                    hp.memberDistributionAmount !== undefined
                      ? hp.memberDistributionAmount
                      : hp.memberAmount || 0;

                  return (
                    <tr
                      key={hp.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        hp.financialYear === selectedFY ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="p-3.5 font-bold font-mono text-slate-900">
                        <button
                          onClick={() => setSelectedFY(hp.financialYear)}
                          className="hover:underline text-emerald-900 flex items-center gap-1 font-bold"
                        >
                          {hp.financialYear}
                          {hp.financialYear === selectedFY && (
                            <span className="text-[10px] font-normal text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                              নির্বাচিত
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 text-right font-mono text-emerald-950 font-bold">
                        ৳{(hp.netProfit || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-bold text-emerald-950">{memPrc}%</span>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ৳{memAmt.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-bold text-purple-950">{hp.welfarePercent || 0}%</span>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ৳{(hp.welfareAmount || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-bold text-amber-950">{hp.emergencyPercent || 0}%</span>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ৳{(hp.emergencyAmount || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-bold text-blue-950">{hp.reservePercent || 0}%</span>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ৳{(hp.reserveAmount || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            hp.finalized
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {hp.finalized ? 'FINALIZED' : 'LEGACY'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">
                          {hp.finalizedBy || 'System'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {hp.finalizedAt
                            ? new Date(hp.finalizedAt).toLocaleDateString('bn-BD')
                            : '-'}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-xs text-slate-700">
                        {hp.resolutionNo || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Member Dividend Slip Modal */}
      {selectedMemberForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <FileText className="w-5 h-5 text-emerald-800" />
                <span>সদস্য লভ্যাংশ বিবরণী স্লিপ (Member Dividend Slip)</span>
              </h2>
              <button
                onClick={() => setSelectedMemberForSlip(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div
                id="printable-member-dividend-slip"
                className="p-5 border border-slate-300 rounded-xl bg-white space-y-4 text-xs"
              >
                <div className="text-center border-b pb-3 space-y-1">
                  <h3 className="font-black text-sm text-slate-900">{db.settings.orgNameBangla}</h3>
                  <p className="text-[10px] text-slate-500">{db.settings.location}</p>
                  <p className="text-xs font-bold text-emerald-900 bg-emerald-50 py-0.5 px-3 rounded-full inline-block border border-emerald-200">
                    বার্ষিক লভ্যাংশ বিবরণী (অর্থবছর: {selectedFY})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-500 block">সদস্যের নাম:</span>
                    <strong className="text-slate-900">{selectedMemberForSlip.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">সদস্য আইডি:</span>
                    <strong className="font-mono text-emerald-900">
                      {selectedMemberForSlip.memberId}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">মোবাইল নম্বর:</span>
                    <strong className="font-mono">{selectedMemberForSlip.mobile}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">সদস্য পদমর্যাদা:</span>
                    <strong className="text-emerald-900">{selectedMemberForSlip.status}</strong>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between">
                    <span>সমিতির বার্ষিক নিট মুনাফা:</span>
                    <span className="font-mono font-bold">৳{netProfit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>সদস্য লভ্যাংশ মোট তহবিল ({profitMemberPercent}%):</span>
                    <span className="font-mono font-bold">
                      ৳{memberShareAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>মোট যোগ্য নিয়মিত সদস্য:</span>
                    <span className="font-bold">{activeMembersCount} জন</span>
                  </div>
                  <div className="flex justify-between p-3 bg-emerald-50 text-emerald-950 rounded-lg border border-emerald-200 font-bold text-sm">
                    <span>সদস্যের প্রাপ্য লভ্যাংশ:</span>
                    <span className="font-mono font-black text-base">
                      ৳{perMemberShare.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 text-center text-[10px]">
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold">কোষাধ্যক্ষ / সাধারণ সম্পাদক</p>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold">সদস্যের প্রাপ্তি স্বীকার</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setSelectedMemberForSlip(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={handlePrintSlip}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>স্লিপ প্রিন্ট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Member Profile Modal */}
      {selectedMemberForProfile && (
        <MemberProfileModal
          memberId={selectedMemberForProfile}
          onClose={() => setSelectedMemberForProfile(null)}
        />
      )}

      {/* 8. Finalize Profit Modal */}
      {isFinalizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-800" />
                <span>মুনাফা বণ্টন চূড়ান্তকরণ (Finalize Profit Distribution)</span>
              </h2>
              <button
                onClick={() => setFinalizeModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-emerald-800 font-bold uppercase">অর্থবছর</p>
                  <p className="font-black text-emerald-950 text-base">{selectedFY}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-emerald-800 font-bold uppercase">বার্ষিক নিট মুনাফা</p>
                  <p className="font-black text-emerald-950 text-xl font-mono">
                    ৳{netProfit.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-700">
                    ১. সদস্য লভ্যাংশ ({profitMemberPercent}%)
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    ৳{memberShareAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-700">
                    ২. কল্যাণ তহবিল ({profitWelfarePercent}%)
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    ৳{welfareShareAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-700">
                    ৩. জরুরী তহবিল ({profitEmergencyPercent}%)
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    ৳{emergencyShareAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-700">
                    ৪. সংরক্ষিত তহবিল ({profitReservePercent}%)
                  </span>
                  <span className="font-bold text-slate-900 font-mono">
                    ৳{reserveShareAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm p-3 bg-slate-100 rounded-lg border border-slate-200 mt-2 font-bold text-slate-900">
                  <span>সর্বমোট সমন্বিত বরাদ্দ:</span>
                  <span className="font-black font-mono">
                    ৳{(memberShareAmount + welfareShareAmount + emergencyShareAmount + reserveShareAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    রেজোলিউশন নম্বর (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={resolutionNo}
                    onChange={(e) => setResolutionNo(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-700"
                    placeholder="যেমন: RES-2026-0004"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মন্তব্য (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-700"
                    placeholder="কার্যনির্বাহী পরিষদের বার্ষিক সাধারণ সিদ্ধান্ত..."
                  />
                </div>
              </div>

              {totalPercentage !== 100 && (
                <div className="bg-rose-50 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>শতকরা হারের যোগফল অবশ্যই ১০০% হতে হবে।</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setFinalizeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
              >
                বাতিল (Cancel)
              </button>
              <button
                disabled={totalPercentage !== 100}
                onClick={handleFinalize}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors disabled:opacity-50"
              >
                চূড়ান্ত করুন (Finalize)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Hidden Printable Element for PDF and Native Printing */}
      <div className="hidden">
        <div id="printable-profit-sheet" className="p-8 text-slate-900 bg-white space-y-6">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <h1 className="text-xl font-black">{db.settings.orgNameBangla}</h1>
            <p className="text-xs text-slate-600">{db.settings.orgName}</p>
            <p className="text-xs text-slate-600">{db.settings.location || db.settings.address}</p>
            <div className="pt-2">
              <h2 className="text-base font-bold bg-slate-100 py-1 px-4 inline-block rounded border border-slate-300">
                বার্ষিক নিট মুনাফা ও লভ্যাংশ বণ্টন বিবরণী (অর্থবছর: {selectedFY})
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              প্রস্তুতির তারিখ: {new Date().toLocaleDateString('bn-BD')} | অনুমোদিত নীতি: {profitMemberPercent}:
              {profitWelfarePercent}:{profitEmergencyPercent}:{profitReservePercent}
            </p>
          </div>

          {/* Financial Summary & Breakdown Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-300 p-3 rounded space-y-1.5">
              <h4 className="font-bold border-b pb-1 text-slate-900">আর্থিক স্থিতি ও নিট লাভ</h4>
              <div className="flex justify-between">
                <span>সর্বমোট অর্জিত আয়:</span>
                <span className="font-mono font-bold">৳{totalIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>সর্বমোট পরিচালন ব্যয়:</span>
                <span className="font-mono font-bold">৳{totalExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold text-slate-900">
                <span>বার্ষিক নিট মুনাফা:</span>
                <span className="font-mono">৳{netProfit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>সক্রিয় সদস্য সংখ্যা:</span>
                <span className="font-bold">{activeMembersCount} জন</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>মাথাপিছু লভ্যাংশ:</span>
                <span className="font-mono font-bold">৳{perMemberShare.toLocaleString()}</span>
              </div>
            </div>

            <div className="border border-slate-300 p-3 rounded space-y-1.5">
              <h4 className="font-bold border-b pb-1 text-slate-900">গঠনতন্ত্র অনুসারে তহবিল বরাদ্দ</h4>
              <div className="flex justify-between">
                <span>১. সদস্য হিস্যা ({profitMemberPercent}%):</span>
                <span className="font-mono font-bold">৳{memberShareAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>২. কল্যাণ তহবিল ({profitWelfarePercent}%):</span>
                <span className="font-mono font-bold">৳{welfareShareAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>৩. জরুরী তহবিল ({profitEmergencyPercent}%):</span>
                <span className="font-mono font-bold">৳{emergencyShareAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>৪. সংরক্ষিত তহবিল ({profitReservePercent}%):</span>
                <span className="font-mono font-bold">৳{reserveShareAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold text-slate-900">
                <span>মোট বণ্টন (১০০%):</span>
                <span className="font-mono">৳{netProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Member Detailed Sheet */}
          <div>
            <h4 className="font-bold text-xs mb-2">সদস্যভিত্তিক লভ্যাংশ বণ্টন ও স্বাক্ষর তালিকা:</h4>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-900">
                  <th className="border border-slate-400 p-2 text-center">ক্রমিক</th>
                  <th className="border border-slate-400 p-2 text-left">সদস্য আইডি</th>
                  <th className="border border-slate-400 p-2 text-left">সদস্যের নাম</th>
                  <th className="border border-slate-400 p-2 text-left">মোবাইল</th>
                  <th className="border border-slate-400 p-2 text-right">মূলধন (৳)</th>
                  <th className="border border-slate-400 p-2 text-center">যোগ্যতা</th>
                  <th className="border border-slate-400 p-2 text-right">প্রাপ্য লভ্যাংশ (৳)</th>
                  <th className="border border-slate-400 p-2 text-center w-28">স্বাক্ষর</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((m, idx) => (
                  <tr key={m.memberId}>
                    <td className="border border-slate-400 p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-400 p-2 font-mono font-bold">{m.memberId}</td>
                    <td className="border border-slate-400 p-2 font-medium">{m.fullName}</td>
                    <td className="border border-slate-400 p-2 font-mono">{m.mobile}</td>
                    <td className="border border-slate-400 p-2 text-right font-mono">
                      ৳{(db.settings.capitalDeposit || 5000).toLocaleString()}
                    </td>
                    <td className="border border-slate-400 p-2 text-center text-[10px]">সক্রিয় (যোগ্য)</td>
                    <td className="border border-slate-400 p-2 text-right font-mono font-bold">
                      ৳{perMemberShare.toLocaleString()}
                    </td>
                    <td className="border border-slate-400 p-2 text-center"></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={4} className="border border-slate-400 p-2 text-right">
                    মোট ({activeMembersCount} জন):
                  </td>
                  <td className="border border-slate-400 p-2 text-right font-mono">
                    ৳{totalEligibleCapital.toLocaleString()}
                  </td>
                  <td className="border border-slate-400 p-2 text-center">সর্বমোট</td>
                  <td className="border border-slate-400 p-2 text-right font-mono">
                    ৳{memberShareAmount.toLocaleString()}
                  </td>
                  <td className="border border-slate-400 p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures Block */}
          <div className="grid grid-cols-3 gap-8 pt-12 text-center text-xs">
            <div className="border-t border-slate-500 pt-1">
              <p className="font-bold">কোষাধ্যক্ষ</p>
              <p className="text-[10px] text-slate-500">স্বাক্ষর ও তারিখ</p>
            </div>
            <div className="border-t border-slate-500 pt-1">
              <p className="font-bold">সাধারণ সম্পাদক</p>
              <p className="text-[10px] text-slate-500">স্বাক্ষর ও তারিখ</p>
            </div>
            <div className="border-t border-slate-500 pt-1">
              <p className="font-bold">সভাপতি</p>
              <p className="text-[10px] text-slate-500">স্বাক্ষর ও তারিখ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

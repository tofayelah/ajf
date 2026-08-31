import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { fetchFinancialSummaryAPI } from '../../services/api';
import {
  Users,
  Landmark,
  Building2,
  Smartphone,
  PiggyBank,
  CreditCard,
  UserPlus,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  LineChart,
  HandCoins,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Clock,
  Info,
  Scale,
  Calendar,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export interface KeyFinancialIndicatorsData {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  cashBalance: number;
  totalCashBalance: number;
  bankBalance: number;
  totalBankBalance: number;
  mobileBankBalance: number;
  memberCapital: number;
  totalCapital: number;
  monthlyCollection: number;
  totalMonthlyCollections: number;
  admissionFee: number;
  totalAdmissionFees: number;
  lateFine: number;
  totalLateFine: number;
  totalIncome: number;
  totalExpense: number;
  totalInvestment: number;
  loanDisbursed: number;
  totalLoanDisbursed: number;
  loanRepaid: number;
  totalLoanRepaid: number;
  outstandingDue: number;
  totalOutstandingDue: number;
  outstandingLoan: number;
  totalLoanOutstanding: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netSurplus: number;
  welfareFund: number;
  reserveFund: number;
  emergencyFund: number;
  accountingStatus: string;
  isTrialBalanced: boolean;
  dateFilter?: string;
  filterStart?: string | null;
  filterEnd?: string | null;
  lastUpdated: string;
}

interface KeyFinancialIndicatorsProps {
  showTitle?: boolean;
  compact?: boolean;
}

export const KeyFinancialIndicators: React.FC<KeyFinancialIndicatorsProps> = ({
  showTitle = true,
  compact = false
}) => {
  const { language, activeUser } = useApp();
  const isBangla = language === 'bn';

  const [summary, setSummary] = useState<KeyFinancialIndicatorsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [period, setPeriod] = useState<'all' | 'today' | 'this_month' | 'this_year' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const loadSummary = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params: { period?: string; startDate?: string; endDate?: string } = {};
      if (period !== 'all') {
        if (period === 'custom') {
          if (startDate) params.startDate = startDate;
          if (endDate) params.endDate = endDate;
        } else {
          params.period = period;
        }
      }

      const data = await fetchFinancialSummaryAPI(params);
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load financial indicators:', err);
      setError(
        isBangla
          ? 'আর্থিক সারসংক্ষেপ বর্তমানে লোড করা যাচ্ছে না।'
          : 'Could not load financial summary at this time.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period, startDate, endDate, isBangla]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const formatBDT = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '৳0';
    return `৳${Math.round(amount).toLocaleString('en-US')}`;
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isBangla ? 'bn-BD' : 'en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {showTitle && (
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <LineChart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {isBangla ? 'মূল আর্থিক সূচকসমূহ' : 'Key Financial Indicators'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {isBangla ? 'সমিতির বাস্তব আর্থিক অবস্থা ও স্থিতি' : 'Real-time Society Financial Status'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto">
            {/* Accounting Status Badge */}
            {summary && (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                  summary.isTrialBalanced
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {summary.isTrialBalanced ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>
                  {summary.accountingStatus ||
                    (summary.isTrialBalanced
                      ? isBangla ? 'হিসাব ভারসাম্যপূর্ণ' : 'Balanced'
                      : isBangla ? 'হিসাব যাচাই প্রয়োজন' : 'Needs Review')}
                </span>
              </div>
            )}

            {/* Last Updated */}
            {summary?.lastUpdated && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {isBangla ? 'সর্বশেষ হালনাগাদ:' : 'Last updated:'}{' '}
                  <strong className="font-semibold text-slate-800">
                    {formatDateTime(summary.lastUpdated)}
                  </strong>
                </span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              id="refresh-financial-indicators-btn"
              onClick={() => loadSummary(true)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-emerald-600 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              <span>{isBangla ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Date Filter Tabs */}
        <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{isBangla ? 'সময়কাল:' : 'Period:'}</span>
            </span>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                period === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {isBangla ? 'সব সময় (সর্বমোট)' : 'All Time'}
            </button>
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                period === 'today'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {isBangla ? 'আজ' : 'Today'}
            </button>
            <button
              onClick={() => setPeriod('this_month')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                period === 'this_month'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {isBangla ? 'এই মাস' : 'This Month'}
            </button>
            <button
              onClick={() => setPeriod('this_year')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                period === 'this_year'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {isBangla ? 'এই বছর' : 'This Year'}
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                period === 'custom'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {isBangla ? 'কাস্টম' : 'Custom'}
            </button>
          </div>

          {/* Custom Date Range Picker */}
          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-emerald-500"
              />
              <span className="text-xs text-slate-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-emerald-500"
              />
              <button
                onClick={() => loadSummary()}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {isBangla ? 'প্রয়োগ' : 'Apply'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Member Transparency Banner */}
      {activeUser?.role === 'MEMBER' && (
        <div className="flex items-start gap-3 bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl text-emerald-950 text-xs sm:text-sm leading-relaxed shadow-xs">
          <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900 mb-0.5">
              {isBangla ? 'আর্থিক স্বচ্ছতা নির্দেশিকা' : 'Financial Transparency & Governance Notice'}
            </p>
            <p className="text-emerald-800/90">
              {isBangla
                ? 'এই তথ্যসমূহ সমিতির বর্তমান সামগ্রিক আর্থিক অবস্থার সংক্ষিপ্ত চিত্র। সদস্যদের ব্যক্তিগত বা গোপন তথ্য এখানে প্রদর্শিত হয় না।'
                : 'These indicators represent the aggregate financial position of the cooperative society. Personal and confidential member information is never disclosed.'}
            </p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !summary && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-600 animate-pulse">
            {isBangla
              ? 'আর্থিক তথ্য লোড হচ্ছে...'
              : 'Loading financial indicators...'}
          </p>
        </div>
      )}

      {/* Error View */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 bg-rose-50 rounded-2xl border border-rose-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600" />
          <p className="text-sm font-bold text-rose-900">{error}</p>
          <button
            onClick={() => loadSummary(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {isBangla ? 'পুনরায় চেষ্টা করুন' : 'Retry'}
          </button>
        </div>
      )}

      {summary && (
        <div className="space-y-6">
          {/* SECTION A: 16 KEY FINANCIAL INDICATORS */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{isBangla ? '১৬টি মূল আর্থিক নির্দেশক' : '16 Key Financial Indicators'}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Cash in Hand */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '১. মোট হাতে নগদ' : '1. Cash in Hand'}
                  </span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Landmark className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight">
                  {formatBDT(summary.cashBalance)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'ক্যাশ বুক সমাপনী উদ্বৃত্ত' : 'Cumulative Cash Balance'}
                </p>
              </div>

              {/* 2. Bank Balance */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '২. মোট ব্যাংক ব্যালেন্স' : '2. Bank Balance'}
                  </span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-blue-800 tracking-tight">
                  {formatBDT(summary.bankBalance)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'সকল ব্যাংক হিসাব স্থিতি' : 'All Bank Accounts Total'}
                </p>
              </div>

              {/* 3. Mobile Banking Balance */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-pink-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '৩. মোবাইল ব্যাংকিং ব্যালেন্স' : '3. Mobile Banking Balance'}
                  </span>
                  <div className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                    <Smartphone className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-pink-800 tracking-tight">
                  {formatBDT(summary.mobileBankBalance)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'বিকাশ / নগদ / এমএফএস' : 'bKash / Nagad / MFS'}
                </p>
              </div>

              {/* 4. Total Member Capital */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-violet-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '৪. মোট সদস্য মূলধন' : '4. Total Member Capital'}
                  </span>
                  <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-violet-900 tracking-tight">
                  {formatBDT(summary.memberCapital)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'সদস্যদের স্থায়ী মূলধন আমানত' : 'Aggregated Share Capital'}
                </p>
              </div>

              {/* 5. Total Monthly Subscription */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '৫. মোট মাসিক চাঁদা আদায়' : '5. Monthly Subscription'}
                  </span>
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-teal-800 tracking-tight">
                  {formatBDT(summary.monthlyCollection)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {period === 'all' ? (isBangla ? 'সর্বমোট চাঁদা আদায়' : 'Total subscription') : (isBangla ? 'নির্বাচিত সময়কালের আদায়' : 'Period collections')}
                </p>
              </div>

              {/* 6. Total Admission Fee */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '৬. মোট ভর্তি ফি' : '6. Total Admission Fee'}
                  </span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <UserPlus className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-800 tracking-tight">
                  {formatBDT(summary.admissionFee)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'ভর্তি ফি বাবদ প্রাপ্তি' : 'Total admission receipts'}
                </p>
              </div>

              {/* 7. Total Late Fine Collected */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-orange-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '৭. মোট বিলম্ব ফি / জরিমানা' : '7. Late Fine / Penalties'}
                  </span>
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-orange-800 tracking-tight">
                  {formatBDT(summary.lateFine)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'আদায়কৃত জরিমানা' : 'Total fines collected'}
                </p>
              </div>

              {/* 8. Total Income */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '৮. মোট আয়' : '8. Total Income'}
                  </span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                  {formatBDT(summary.totalIncome)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'অনুমোদিত রাজস্ব আয়' : 'Recognized income'}
                </p>
              </div>

              {/* 9. Total Expense */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '৯. মোট ব্যয়' : '9. Total Expense'}
                  </span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
                  {formatBDT(summary.totalExpense)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'পরিশোধিত পরিচালন ব্যয়' : 'Operating expenditures'}
                </p>
              </div>

              {/* 10. Total Investment */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-sky-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '১০. মোট বিনিয়োগ' : '10. Total Investment'}
                  </span>
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                    <LineChart className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-sky-800 tracking-tight">
                  {formatBDT(summary.totalInvestment)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'প্রকল্পে চলমান মূলধন' : 'Active principal investment'}
                </p>
              </div>

              {/* 11. Total Loan Disbursed */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '১১. মোট ঋণ বিতরণ' : '11. Total Loan Disbursed'}
                  </span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <HandCoins className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-800 tracking-tight">
                  {formatBDT(summary.loanDisbursed)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'বিতরণকৃত ঋণের পরিমাণ' : 'Disbursed principal'}
                </p>
              </div>

              {/* 12. Total Loan Repaid */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '১২. মোট ঋণ আদায়' : '12. Total Loan Repaid'}
                  </span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight">
                  {formatBDT(summary.loanRepaid)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'পরিশোধিত ঋণ আদায়' : 'Principal/Interest repaid'}
                </p>
              </div>

              {/* 13. Total Members */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '১৩. মোট সদস্য' : '13. Total Members'}
                  </span>
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {summary.totalMembers}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {summary.inactiveMembers > 0
                    ? `${summary.inactiveMembers} ${isBangla ? 'জন নিষ্ক্রিয়/প্রাক্তন' : 'inactive/exited'}`
                    : isBangla ? 'নিবন্ধিত সদস্য' : 'Registered members'}
                </p>
              </div>

              {/* 14. Active Members */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '১৪. সক্রিয় সদস্য' : '14. Active Members'}
                  </span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight">
                  {summary.activeMembers}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'নিয়মিত চাঁদা প্রদানকারী' : 'Active participating members'}
                </p>
              </div>

              {/* 15. Total Outstanding Subscription Due */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '১৫. মোট বকেয়া চাঁদা' : '15. Subscription Due'}
                  </span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
                  {formatBDT(summary.outstandingDue)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'সদস্যদের নিকট প্রাপ্য চাঁদা' : 'Outstanding receivables'}
                </p>
              </div>

              {/* 16. Total Outstanding Loan Receivable */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-orange-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? '১৬. মোট ঋণ বকেয়া' : '16. Outstanding Loan'}
                  </span>
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                    <HandCoins className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-orange-700 tracking-tight">
                  {formatBDT(summary.outstandingLoan)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'প্রদত্ত ঋণের বর্তমান বকেয়া' : 'Active loan receivables'}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION B: SOCIETY FINANCIAL POSITION ("সমিতির বর্তমান আর্থিক অবস্থা") */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-slate-500" />
              <span>{isBangla ? 'সমিতির বর্তমান আর্থিক অবস্থা' : 'Society Financial Position'}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Assets */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  {isBangla ? 'মোট সম্পদ' : 'Total Assets'}
                </span>
                <p className="text-2xl font-black text-indigo-900 tracking-tight">
                  {formatBDT(summary.totalAssets)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'নগদ + ব্যাংক + ঋণ + বিনিয়োগ' : 'Cash + Bank + Loans + Investments'}
                </p>
              </div>

              {/* Total Liabilities */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  {isBangla ? 'মোট দায়' : 'Total Liabilities'}
                </span>
                <p className="text-2xl font-black text-slate-800 tracking-tight">
                  {formatBDT(summary.totalLiabilities)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'বহিঃস্থ দায় ও পাওনা' : 'External obligations'}
                </p>
              </div>

              {/* Member Capital */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  {isBangla ? 'সদস্য মূলধন' : 'Member Capital'}
                </span>
                <p className="text-2xl font-black text-violet-900 tracking-tight">
                  {formatBDT(summary.memberCapital)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'সদস্যদের স্থায়ী শেয়ার আমানত' : 'Total member equity'}
                </p>
              </div>

              {/* Net Surplus / Deficit */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  {isBangla ? 'নিট উদ্বৃত্ত / ঘাটতি' : 'Net Surplus / Deficit'}
                </span>
                <p
                  className={`text-2xl font-black tracking-tight ${
                    summary.netSurplus >= 0 ? 'text-teal-800' : 'text-rose-700'
                  }`}
                >
                  {formatBDT(summary.netSurplus)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'আয় ও ব্যয়ের নিট পরিচালন পার্থক্য' : 'Income minus Expense'}
                </p>
              </div>

              {/* Cash in Hand */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  {isBangla ? 'হাতে নগদ' : 'Cash in Hand'}
                </span>
                <p className="text-2xl font-black text-emerald-800 tracking-tight">
                  {formatBDT(summary.cashBalance)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'ক্যাশ স্থিতি' : 'Cash Book balance'}
                </p>
              </div>

              {/* Bank Balance */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  {isBangla ? 'ব্যাংক ব্যালেন্স' : 'Bank Balance'}
                </span>
                <p className="text-2xl font-black text-blue-800 tracking-tight">
                  {formatBDT(summary.bankBalance)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'ব্যাংক হিসাব স্থিতি' : 'Bank Book balance'}
                </p>
              </div>

              {/* Total Income */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  {isBangla ? 'মোট আয়' : 'Total Income'}
                </span>
                <p className="text-2xl font-black text-emerald-700 tracking-tight">
                  {formatBDT(summary.totalIncome)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'স্বীকৃত আয়' : 'Approved income'}
                </p>
              </div>

              {/* Total Expense */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-500 block mb-1">
                  {isBangla ? 'মোট ব্যয়' : 'Total Expense'}
                </span>
                <p className="text-2xl font-black text-rose-700 tracking-tight">
                  {formatBDT(summary.totalExpense)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isBangla ? 'অনুমোদিত ব্যয়' : 'Approved expense'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

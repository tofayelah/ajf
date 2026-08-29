import React from 'react';
import { useApp } from '../../context/AppContext';
import { MemberDashboard } from '../member-portal/MemberDashboard';
import { AccountingService } from '../../services/accounting';
import { SettlementKpiCard } from './SettlementKpiCard';
import {
  Users,
  Receipt,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Landmark,
  AlertTriangle,
  HandCoins,
  HeartHandshake,
  ShieldCheck,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PlusCircle,
  Clock
} from 'lucide-react';

interface DashboardViewProps {
  onQuickAction: (action: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onQuickAction }) => {
  const { db, navigateTo, language, activeUser } = useApp();
  const isBangla = language === 'bn';

  if (activeUser?.role === 'MEMBER') {
    return <MemberDashboard />;
  }

  const summary = AccountingService.calculateFinancialSummary(db);
  const existingFinalized = (db.historicalProfits || []).find(hp => hp.financialYear === db.settings.currentFinancialYear);
  const isFinalized = !!existingFinalized;
  const displayMemberPercent = isFinalized ? existingFinalized.memberDistributionPercent : db.settings.profitMemberPercent;
  const displayWelfarePercent = isFinalized ? existingFinalized.welfarePercent : db.settings.profitWelfarePercent;
  const displayEmergencyPercent = isFinalized ? existingFinalized.emergencyPercent : db.settings.profitEmergencyPercent;
  const displayReservePercent = isFinalized ? existingFinalized.reservePercent : db.settings.profitReservePercent;

  // Compute Member Summary for logged-in user
  const linkedMember = activeUser?.linkedMemberId ? (db.members || []).find(m => m.memberId === activeUser.linkedMemberId) : null;
  let memberActiveLoans = 0;
  let memberTotalSavings = 0;
  let memberNextMeetingDate = '';

  if (linkedMember) {
    memberActiveLoans = (db.loans || []).filter(l => l.memberId === linkedMember.memberId && l.status === 'ACTIVE').reduce((sum, l) => sum + (l.totalOutstanding || 0), 0);
    const memberCapital = (db.capitalDeposits || []).filter(c => c.memberId === linkedMember.memberId && c.status === 'ACTIVE').reduce((sum, c) => sum + c.amount, 0);
    const memberCollections = (db.collections || []).filter(c => c?.memberId === linkedMember.memberId && (c?.status === 'ACTIVE' || !c?.status)).reduce((sum, c) => sum + (c?.paidAmount || 0), 0);
    memberTotalSavings = memberCapital + memberCollections;

    const upcomingMeetings = (db.meetings || []).filter(m => m.status === 'PLANNED').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (upcomingMeetings.length > 0) {
      memberNextMeetingDate = upcomingMeetings[0].date;
    }
  }

  // Compute Alerts
  const pendingLoans = (db.loans || []).filter(l => l.status === 'PENDING');
  const pendingExpenses = (db.expenses || []).filter(e => e.approvalStatus === 'DRAFT' || e.approvalStatus === 'SUBMITTED');
  const pendingResolutions = (db.resolutions || []).filter(r => r.implementationStatus === 'PENDING' || r.implementationStatus === 'IN_PROGRESS');
  const isLowCash = summary.cashBalance < 5000;

  // Recent 8 combined transactions
  const recentActivities: {
    id: string;
    date: string;
    typeBn: string;
    typeEn: string;
    member?: string;
    ref: string;
    amount: number;
    isIncome: boolean;
    user?: string;
  }[] = [];

  (db.collections || []).slice(0, 4).forEach(c => {
    recentActivities.push({
      id: c.collectionId,
      date: c.collectionDate,
      typeBn: 'মাসিক চাঁদা',
      typeEn: 'Monthly Collection',
      member: c.memberName,
      ref: c.receiptNo,
      amount: c.paidAmount,
      isIncome: true,
      user: c.receivedBy
    });
  });

  (db.capitalDeposits || []).slice(0, 2).forEach(c => {
    recentActivities.push({
      id: c.depositId,
      date: c.date,
      typeBn: 'মূলধন জমা',
      typeEn: 'Capital Deposit',
      member: c.memberName,
      ref: c.voucherNo,
      amount: c.amount,
      isIncome: true,
      user: c.createdBy
    });
  });

  (db.loanRepayments || []).slice(0, 2).forEach(r => {
    recentActivities.push({
      id: r.repaymentId,
      date: r.date,
      typeBn: 'ঋণ কিস্তি',
      typeEn: 'Loan Repayment',
      member: r.memberName,
      ref: r.voucherNo,
      amount: r.totalPaid,
      isIncome: true,
      user: r.receivedBy
    });
  });

  (db.expenses || []).slice(0, 2).forEach(e => {
    recentActivities.push({
      id: e.expenseId,
      date: e.date,
      typeBn: 'ব্যয় ভাউচার',
      typeEn: 'Expense',
      member: e.payee,
      ref: e.voucherNo,
      amount: e.amount,
      isIncome: false,
      user: e.createdBy
    });
  });

  // Sort by date desc
  recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Monthly collection summary chart mock data
  const monthNames = ['মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট'];
  const monthValues = [3000, 4000, 5000, 4500, summary.thisMonthCollection || 5000, 6000];
  const maxMonthVal = Math.max(...monthValues, 1);

  return (
    <div className="space-y-5 pb-10">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-emerald-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-700/80 px-2 py-0.5 rounded-md font-mono text-emerald-200">
                অর্থবছর: {db.settings.currentFinancialYear}
              </span>
              <span className="text-xs text-emerald-200">|</span>
              <span className="text-xs text-emerald-200">{db.settings.location}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1 tracking-tight">
              {isBangla ? db.settings.orgNameBangla : db.settings.orgName}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 font-serif italic mt-0.5">
              "{isBangla ? db.settings.slogan : db.settings.sloganEnglish}"
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onQuickAction('COLLECT_MONTHLY')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isBangla ? 'চাঁদা আদায়' : 'Collect Due'}</span>
            </button>
            <button
              onClick={() => navigateTo('REPORTS')}
              className="bg-emerald-950/70 hover:bg-emerald-950 text-emerald-100 px-3 py-2 rounded-xl text-xs border border-emerald-600 transition-colors"
            >
              {isBangla ? 'পূর্ণাঙ্গ রিপোর্ট' : 'Reports'}
            </button>
          </div>
        </div>

        {/* Quick Action Chips */}
        <div className="mt-4 pt-3 border-t border-emerald-700/60 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="text-emerald-300 font-medium whitespace-nowrap">
            {isBangla ? 'দ্রুত সেবা:' : 'Quick Actions:'}
          </span>
          <button
            onClick={() => onQuickAction('NEW_MEMBER')}
            className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors"
          >
            + {isBangla ? 'নতুন সদস্য' : 'New Member'}
          </button>
          <button
            onClick={() => onQuickAction('MEMBER_LEDGER')}
            className="bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-200 border border-emerald-400/30 px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors font-semibold"
          >
            {isBangla ? 'সদস্য খতিয়ান' : 'Member Ledger'}
          </button>
          <button
            onClick={() => onQuickAction('CAPITAL_DEPOSIT')}
            className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors"
          >
            + {isBangla ? 'মূলধন জমা' : 'Capital'}
          </button>
          <button
            onClick={() => onQuickAction('LOAN_APPLICATION')}
            className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors"
          >
            + {isBangla ? 'ঋণ আবেদন' : 'Loan'}
          </button>
          <button
            onClick={() => onQuickAction('LOAN_REPAYMENT')}
            className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors"
          >
            + {isBangla ? 'কিস্তি আদায়' : 'Repayment'}
          </button>
          <button
            onClick={() => onQuickAction('RECORD_INCOME')}
            className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors"
          >
            + {isBangla ? 'আয় এন্ট্রি' : 'Income'}
          </button>
          <button
            onClick={() => onQuickAction('RECORD_EXPENSE')}
            className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors"
          >
            + {isBangla ? 'ব্যয় ভাউচার' : 'Expense'}
          </button>
          <button
            onClick={() => onQuickAction('WELFARE_PAYMENT')}
            className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors"
          >
            + {isBangla ? 'কল্যাণ অনুদান' : 'Welfare'}
          </button>
        </div>
      </div>

      {/* Member Summary Section */}
      {linkedMember && (
        <div className="bg-emerald-50 rounded-2xl p-4 shadow-sm border border-emerald-100">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-emerald-900">{isBangla ? 'আপনার সামারি' : 'Member Summary'}</h3>
            <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">{linkedMember.fullName}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-xl border border-emerald-100/50 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <PiggyBank className="w-4 h-4" />
                <span className="text-xs font-bold">{isBangla ? 'মোট সঞ্চয়' : 'Total Savings'}</span>
              </div>
              <p className="text-lg font-black text-emerald-700">৳{memberTotalSavings.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-100/50 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Landmark className="w-4 h-4" />
                <span className="text-xs font-bold">{isBangla ? 'চলমান ঋণ' : 'Active Loans'}</span>
              </div>
              <p className="text-lg font-black text-amber-600">৳{memberActiveLoans.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-100/50 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold">{isBangla ? 'পরবর্তী সভা' : 'Next Meeting Date'}</span>
              </div>
              <p className="text-lg font-black text-indigo-700">
                {memberNextMeetingDate ? new Date(memberNextMeetingDate).toLocaleDateString() : (isBangla ? 'নির্ধারিত নেই' : 'Not Scheduled')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Critical Dashboard Alerts */}
      {(summary.membersWith6PlusDueCount > 0 ||
        pendingLoans.length > 0 ||
        pendingExpenses.length > 0 ||
        pendingResolutions.length > 0 ||
        isLowCash || (db.cashReconciliations?.filter(r => r.status === 'OPEN' || r.status === 'DIFFERENCE').length > 0) || (db.bankReconciliations?.filter(r => r.status === 'OPEN' || r.status === 'DIFFERENCE').length > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summary.membersWith6PlusDueCount > 0 && (
            <div
              onClick={() => navigateTo('DUE_MANAGEMENT')}
              className="cursor-pointer bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-xl flex items-center justify-between shadow-sm hover:bg-rose-100/70 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-900">
                    {isBangla ? '৬+ মাসের গুরুতর বকেয়া সদস্য' : '6+ Months Overdue Members'}
                  </p>
                  <p className="text-[11px] text-rose-700">
                    {isBangla
                      ? `${summary.membersWith6PlusDueCount} জন সদস্য জরুরি নজরে আছেন`
                      : `${summary.membersWith6PlusDueCount} members overdue`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-700 bg-rose-200 px-2 py-0.5 rounded-full">
                {summary.membersWith6PlusDueCount}
              </span>
            </div>
          )}

          
          {(db.cashReconciliations?.filter(r => r.status === 'OPEN' || r.status === 'DIFFERENCE').length > 0) && (
            <div
              onClick={() => navigateTo('CASH_RECONCILIATION')}
              className="cursor-pointer bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-xl flex items-center justify-between shadow-sm hover:bg-blue-100 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-900">
                    {isBangla ? 'অমীমাংসিত নগদ সমন্বয়' : 'Pending Cash Reconciliation'}
                  </p>
                  <p className="text-[11px] text-blue-700">
                    {isBangla ? 'অনুগ্রহ করে পর্যালোচনা করুন' : 'Needs review and approval'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {(db.bankReconciliations?.filter(r => r.status === 'OPEN' || r.status === 'DIFFERENCE').length > 0) && (
            <div
              onClick={() => navigateTo('BANK_RECONCILIATION')}
              className="cursor-pointer bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-xl flex items-center justify-between shadow-sm hover:bg-blue-100 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Landmark className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-900">
                    {isBangla ? 'অমীমাংসিত ব্যাংক সমন্বয়' : 'Pending Bank Reconciliation'}
                  </p>
                  <p className="text-[11px] text-blue-700">
                    {isBangla ? 'অনুগ্রহ করে পর্যালোচনা করুন' : 'Needs review and approval'}
                  </p>
                </div>
              </div>
            </div>
          )}
          {pendingLoans.length > 0 && (

            <div
              onClick={() => navigateTo('LOANS')}
              className="cursor-pointer bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl flex items-center justify-between shadow-sm hover:bg-amber-100/70 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    {isBangla ? 'ঋণ আবেদন অপেক্ষমাণ' : 'Pending Loan Approvals'}
                  </p>
                  <p className="text-[11px] text-amber-700">
                    {isBangla
                      ? `${pendingLoans.length} টি আবেদন সভাপতি/কমিটি অনুমোদনের অপেক্ষায়`
                      : `${pendingLoans.length} loan requests pending`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
                {pendingLoans.length}
              </span>
            </div>
          )}

          {pendingResolutions.length > 0 && (
            <div
              onClick={() => navigateTo('RESOLUTIONS')}
              className="cursor-pointer bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-xl flex items-center justify-between shadow-sm hover:bg-blue-100/70 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-900">
                    {isBangla ? 'অমীমাংসিত রেজুলেশন' : 'Pending Resolutions'}
                  </p>
                  <p className="text-[11px] text-blue-700">
                    {isBangla
                      ? `${pendingResolutions.length} টি সভার সিদ্ধান্ত বাস্তবায়ন প্রক্রিয়াধীন`
                      : `${pendingResolutions.length} resolutions in progress`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-200 px-2 py-0.5 rounded-full">
                {pendingResolutions.length}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Primary Financial KPI Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-emerald-700" />
            <span>{isBangla ? 'প্রধান আর্থিক ও প্রাতিষ্ঠানিক সূচক (KPI)' : 'Key Financial Indicators'}</span>
          </h3>
          <span className="text-xs text-slate-500">
            {isBangla ? 'রিয়েল-টাইম অটোমেটেড হিসাব' : 'Real-time Accounting'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Members */}
          <div
            onClick={() => navigateTo('MEMBERS')}
            className="cursor-pointer bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">
                {isBangla ? 'মোট সদস্য' : 'Total Members'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-800">{summary.totalMembers} জন</div>
            <div className="flex items-center justify-between text-[11px] mt-1 text-slate-500">
              <span className="text-emerald-700 font-semibold">সক্রিয়: {summary.activeMembers}</span>
              <span>নিষ্ক্রিয়: {summary.inactiveMembers}</span>
            </div>
          </div>

          {/* Monthly Collection */}
          <div
            onClick={() => navigateTo('COLLECTIONS')}
            className="cursor-pointer bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">
                {isBangla ? 'মাসিক চাঁদা আদায়' : 'This Month Collection'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-emerald-800">
              ৳{summary.thisMonthCollection?.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              সর্বমোট আদায়: ৳{summary.totalCollection?.toLocaleString()}
            </div>
          </div>

          {/* Capital Fund */}
          <div
            onClick={() => navigateTo('CAPITAL')}
            className="cursor-pointer bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">
                {isBangla ? 'সদস্য মূলধন তহবিল' : 'Total Capital Fund'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-indigo-900">
              ৳{summary.totalCapital?.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              সদস্য প্রতি ৳{db.settings.capitalDeposit?.toLocaleString()}
            </div>
          </div>

          {/* Cash Balance */}
          <div
            onClick={() => navigateTo('CASH_BOOK')}
            className="cursor-pointer bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">
                {isBangla ? 'হাতে নগদ ব্যালেন্স' : 'Cash Balance'}
              </span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  summary.cashBalance < 5000
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-xl font-bold ${
                summary.cashBalance < 5000 ? 'text-rose-700' : 'text-slate-800'
              }`}
            >
              ৳{summary.cashBalance?.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">নগদান বই (Cash Book)</div>
          </div>

          {/* Bank Balance */}
          <div
            onClick={() => navigateTo('BANK_BOOK')}
            className="cursor-pointer bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">
                {isBangla ? 'ব্যাংক হিসাব স্থিতি' : 'Bank Balance'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-teal-900">
              ৳{summary.bankBalance?.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {db.settings.bankAccountMask}
            </div>
          </div>

          {/* Outstanding Due */}
          <div
            onClick={() => navigateTo('DUE_MANAGEMENT')}
            className="cursor-pointer bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-rose-300 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">
                {isBangla ? 'বকেয়া চাঁদা' : 'Outstanding Due'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-rose-700">
              ৳{summary.outstandingDue?.toLocaleString()}
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-1">
              বকেয়া সদস্য: {summary.membersWithDueCount} জন
            </div>
          </div>

          {/* Outstanding Loan */}
          <div
            onClick={() => navigateTo('LOANS')}
            className="cursor-pointer bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">
                {isBangla ? 'প্রদত্ত বকেয়া ঋণ' : 'Outstanding Loan'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <HandCoins className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-amber-800">
              ৳{summary.outstandingLoan?.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              মোট ঋণ বিতরণ থেকে আদায়যোগ্য
            </div>
          </div>

          {/* Welfare & Emergency Funds */}
          <div
            onClick={() => navigateTo('WELFARE')}
            className="cursor-pointer bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">
                {isBangla ? 'কল্যাণ ও জরুরি তহবিল' : 'Welfare & Funds'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <HeartHandshake className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-purple-900">
              ৳{(summary.welfareFundBalance + summary.emergencyFundBalance + summary.reserveFundBalance)?.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
              <span>কল্যাণ: ৳{summary.welfareFundBalance}</span>
              <span>জরুরি: ৳{summary.emergencyFundBalance}</span>
            </div>
          </div>

          {/* Member Settlement KPI Card */}
          <SettlementKpiCard />
        </div>
      </div>

      {/* Visual Charts & Growth Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Collection Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {isBangla ? 'মাসিক চাঁদা আদায়ের ধারা (২০২৬)' : 'Monthly Collection Trend (2026)'}
              </h4>
              <p className="text-[11px] text-slate-500">
                {isBangla ? 'মাসভিত্তিক সংগৃহীত তহবিলের পরিসংখ্যান' : 'Monthly trend analysis'}
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              ৳{summary.totalCollection?.toLocaleString()} সর্বমোট
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-200">
            {monthNames.map((month, idx) => {
              const val = monthValues[idx];
              const heightPercent = Math.max(15, Math.round((val / maxMonthVal) * 100));
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-bold text-emerald-800 opacity-80 group-hover:opacity-100">
                    ৳{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[36px] bg-gradient-to-t from-emerald-700 to-emerald-500 rounded-t-md transition-all group-hover:from-emerald-800 group-hover:to-teal-400 shadow-sm"
                  />
                  <span className="text-[11px] font-medium text-slate-600 mt-1">{month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
            <span>নিয়মিত চাঁদা হার: ৳{db.settings.monthlyContribution}/মাস</span>
            <span>বিলম্ব ফি হার: ৳{db.settings.lateFine}</span>
          </div>
        </div>

        {/* Financial Distribution Breakdown */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              {isBangla ? 'মুনাফা ও তহবিল বণ্টন অনুপাত' : 'Profit Allocation Policy'}
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              {isBangla ? 'সমিতির অনুমোদিত গঠনতন্ত্র অনুযায়ী' : 'Society Approved Ratio'}
            </p>

            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>সদস্য লভ্যাংশ বণ্টন (Member Share)</span>
                  <span className="text-emerald-700 font-bold">{displayMemberPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{ width: `${displayMemberPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>কল্যাণ তহবিল (Welfare Fund)</span>
                  <span className="text-purple-700 font-bold">{displayWelfarePercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full"
                    style={{ width: `${displayWelfarePercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>জরুরী তহবিল (Emergency Fund)</span>
                  <span className="text-amber-700 font-bold">{displayEmergencyPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${displayEmergencyPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>সংরক্ষিত তহবিল (Reserve Fund)</span>
                  <span className="text-blue-700 font-bold">{displayReservePercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${displayReservePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">সম্ভাব্য বণ্টনযোগ্য লাভ:</span>
            <span className="text-sm font-bold text-emerald-800">
              ৳{summary.distributableProfit?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Transactions Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {isBangla ? 'সাম্প্রতিক আর্থিক লেনদেনসমূহ' : 'Recent Transactions'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isBangla ? 'স্বয়ংক্রিয়ভাবে সমন্বিত সবশেষ ভাউচার ও রসিদ' : 'Real-time updated ledger entries'}
            </p>
          </div>
          <button
            onClick={() => navigateTo('CASH_BOOK')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            {isBangla ? 'সকল লেনদেন দেখুন →' : 'View All Books →'}
          </button>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-3 py-2.5">{isBangla ? 'তারিখ' : 'Date'}</th>
                <th className="px-3 py-2.5">{isBangla ? 'ভাউচার / রসিদ নং' : 'Reference'}</th>
                <th className="px-3 py-2.5">{isBangla ? 'সদস্য / বিবরণ' : 'Party / Desc'}</th>
                <th className="px-3 py-2.5">{isBangla ? 'লেনদেনের ধরন' : 'Type'}</th>
                <th className="px-3 py-2.5 text-right">{isBangla ? 'পরিমাণ (৳)' : 'Amount'}</th>
                <th className="px-3 py-2.5 text-center">{isBangla ? 'এন্ট্রি কারক' : 'Entered By'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-xs">
                    <p className="font-medium text-slate-500 mb-1">
                      {isBangla ? 'কোন আর্থিক লেনদেন রেকর্ড পাওয়া যায়নি' : 'No transaction records found'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isBangla ? 'নতুন চাঁদা আদায়, ভাউচার বা লেনদেন এন্ট্রি করলে এখানে প্রদর্শিত হবে।' : 'New collections or ledger entries will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                recentActivities.map((act, index) => (
                  <tr key={`${act.id}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap">{act.date}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {act.ref}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{act.member || '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap">
                        {isBangla ? act.typeBn : act.typeEn}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2.5 font-bold text-right whitespace-nowrap ${
                        act.isIncome ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {act.isIncome ? '+' : '-'} ৳{act.amount?.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-500 text-[11px] whitespace-nowrap">
                      {act.user || 'সিস্টেম'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  UserMinus,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SettlementKpiCardProps {
  onNavigate?: () => void;
}

export const SettlementKpiCard: React.FC<SettlementKpiCardProps> = ({ onNavigate }) => {
  const { db, language, navigateTo } = useApp();
  const isBangla = language === 'bn';
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const kpiData = useMemo(() => {
    const currentFY = db.settings.currentFinancialYear || '2026-2027';
    const activeFYObj = (db.financialYears || []).find(
      fy => fy.yearCode === currentFY || fy.id === currentFY || fy.id === `FY-${currentFY}`
    );

    const allExits = db.memberExits || [];

    // Filter by active Financial Year
    const exitsInFY = allExits.filter(exit => {
      const recordDate = exit.requestDate || (exit as any).createdAt?.split('T')[0] || (exit as any).date;
      if (activeFYObj && activeFYObj.startDate && activeFYObj.endDate && recordDate) {
        return recordDate >= activeFYObj.startDate && recordDate <= activeFYObj.endDate;
      }
      // Fallback: If currentFY is "2026-2027", check if record date year matches
      if (currentFY.includes('-') && recordDate) {
        const [startYear, endYear] = currentFY.split('-');
        const recYear = recordDate.split('-')[0];
        return recYear === startYear || recYear === endYear;
      }
      return true;
    });

    const getStatsForType = (type: 'NORMAL' | 'EARLY' | 'DEATH_SETTLEMENT') => {
      const items = exitsInFY.filter(e => {
        if (type === 'DEATH_SETTLEMENT') {
          return e.exitType === 'DEATH_SETTLEMENT' || (e.exitType as any) === 'DEATH';
        }
        return e.exitType === type;
      });

      const requests = items.length;
      const underReview = items.filter(e => e.status === 'UNDER_REVIEW').length;
      const pending = items.filter(e =>
        ['NORMAL_EXIT_REQUESTED', 'EARLY_EXIT_REQUESTED', 'DEATH_REPORTED', 'EXIT_REQUESTED', 'PENDING'].includes(e.status)
      ).length;
      const approved = items.filter(e =>
        ['APPROVED', 'REFUND_PROCESSING', 'SETTLEMENT_PROCESSING'].includes(e.status)
      ).length;
      const settledItems = items.filter(e =>
        ['SETTLED', 'REFUNDED', 'EXITED', 'DECEASED'].includes(e.status)
      );
      const settled = settledItems.length;
      const rejected = items.filter(e => e.status === 'REJECTED').length;

      const capital = items.reduce((sum, e) =>
        sum + (e.memberCapital || (e as any).eligibleCapital || e.eligibleRefundAmount || 0), 0
      );
      const serviceCharge = items.reduce((sum, e) =>
        sum + (e.serviceChargeAmount || 0), 0
      );
      const benefits = items.reduce((sum, e) =>
        sum + (e.eligibleBenefitAmount || 0), 0
      );

      // Net settlement amount
      const netPaid = settledItems.reduce((sum, e) => {
        if (e.netSettlementAmount !== undefined && e.netSettlementAmount > 0) return sum + e.netSettlementAmount;
        if (e.netRefundAmount !== undefined && e.netRefundAmount > 0) return sum + e.netRefundAmount;
        const c = e.memberCapital || (e as any).eligibleCapital || e.eligibleRefundAmount || 0;
        const sc = e.serviceChargeAmount || 0;
        const b = e.eligibleBenefitAmount || 0;
        return sum + (type === 'DEATH_SETTLEMENT' ? (c + b) : Math.max(0, c - sc));
      }, 0);

      return {
        requests,
        pending,
        underReview,
        approved,
        settled,
        rejected,
        capital,
        serviceCharge,
        benefits,
        netPaid,
        items
      };
    };

    const normalStats = getStatsForType('NORMAL');
    const earlyStats = getStatsForType('EARLY');
    const deathStats = getStatsForType('DEATH_SETTLEMENT');

    const totalRequests = exitsInFY.length;
    const totalPending = normalStats.pending + earlyStats.pending + deathStats.pending;
    const totalUnderReview = normalStats.underReview + earlyStats.underReview + deathStats.underReview;
    const totalApproved = normalStats.approved + earlyStats.approved + deathStats.approved;
    const totalSettled = normalStats.settled + earlyStats.settled + deathStats.settled;
    const totalRejected = normalStats.rejected + earlyStats.rejected + deathStats.rejected;
    const totalCapital = normalStats.capital + earlyStats.capital + deathStats.capital;
    const totalServiceCharge = normalStats.serviceCharge + earlyStats.serviceCharge + deathStats.serviceCharge;
    const totalBenefits = normalStats.benefits + earlyStats.benefits + deathStats.benefits;
    const totalNetPaid = normalStats.netPaid + earlyStats.netPaid + deathStats.netPaid;

    return {
      currentFY,
      totalRequests,
      totalPending,
      totalUnderReview,
      totalApproved,
      totalSettled,
      totalRejected,
      totalCapital,
      totalServiceCharge,
      totalBenefits,
      totalNetPaid,
      normalStats,
      earlyStats,
      deathStats,
      hasActivity: totalRequests > 0
    };
  }, [db.memberExits, db.settings.currentFinancialYear, db.financialYears]);

  const handleCardClick = () => {
    if (onNavigate) {
      onNavigate();
    } else {
      navigateTo('SETTLEMENT_REPORTS');
    }
  };

  const tooltipText = isBangla
    ? 'সদস্যের Normal Exit, Early Exit এবং Death Settlement-এর বর্তমান আর্থিক ও workflow status-এর সারসংক্ষেপ।'
    : 'Summary of member settlement requests, approvals and financial settlements.';

  return (
    <div
      id="settlement-kpi-card"
      onClick={handleCardClick}
      className="cursor-pointer bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between group"
    >
      {/* Header with Title, Tooltip & Icon */}
      <div>
        <div className="flex items-start justify-between gap-1.5 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800 tracking-tight">
                {isBangla ? 'সদস্য নিষ্পত্তি' : 'Member Settlement'}
              </span>
              {/* Tooltip Icon */}
              <div
                className="relative inline-flex items-center"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(!showTooltip);
                }}
              >
                <Info className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer" />
                {showTooltip && (
                  <div
                    className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-60 p-2 bg-slate-900 text-white text-[11px] leading-relaxed rounded-lg shadow-xl pointer-events-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {tooltipText}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
              {isBangla ? 'সাধারণ • আগাম • মৃত্যু নিষ্পত্তি' : 'Normal Exit • Early Exit • Death Settlement'}
            </p>
          </div>

          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        </div>

        {/* Main Metric */}
        <div className="my-2">
          <div className="flex items-baseline justify-between">
            <div className="text-xl font-black text-indigo-900 tracking-tight">
              ৳{kpiData.totalNetPaid.toLocaleString()}
            </div>
            {kpiData.totalSettled > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {kpiData.totalSettled} {isBangla ? 'নিষ্পত্তিকৃত' : 'Settled'}
              </span>
            )}
          </div>
          <div className="text-[10px] font-medium text-slate-500 flex items-center justify-between mt-0.5">
            <span>{isBangla ? 'পরিশোধিত নিট নিষ্পত্তি' : 'Total Net Settlement Paid'}</span>
            <span className="text-slate-400 font-mono text-[9px]">FY {kpiData.currentFY}</span>
          </div>
        </div>

        {/* Status Badges Row */}
        <div className="grid grid-cols-4 gap-1 py-1.5 my-1.5 bg-slate-50 rounded-lg p-1.5 border border-slate-100 text-center">
          <div>
            <span className="block text-[9px] text-slate-500 uppercase font-semibold">
              {isBangla ? 'আবেদন' : 'Requests'}
            </span>
            <span className="text-xs font-bold text-slate-800">{kpiData.totalRequests}</span>
          </div>
          <div>
            <span className="block text-[9px] text-purple-600 uppercase font-semibold">
              {isBangla ? 'পর্যালোচনা' : 'Review'}
            </span>
            <span className="text-xs font-bold text-purple-700">{kpiData.totalUnderReview}</span>
          </div>
          <div>
            <span className="block text-[9px] text-blue-600 uppercase font-semibold">
              {isBangla ? 'অনুমোদিত' : 'Approved'}
            </span>
            <span className="text-xs font-bold text-blue-700">{kpiData.totalApproved}</span>
          </div>
          <div>
            <span className="block text-[9px] text-emerald-600 uppercase font-semibold">
              {isBangla ? 'নিষ্পন্ন' : 'Settled'}
            </span>
            <span className="text-xs font-bold text-emerald-700">{kpiData.totalSettled}</span>
          </div>
        </div>

        {/* Financial Sub-Metrics */}
        <div className="space-y-1 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">{isBangla ? 'মূলধন ফেরত:' : 'Capital Returned:'}</span>
            <span className="font-semibold text-slate-800">৳{kpiData.totalCapital.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">{isBangla ? 'সার্ভিস চার্জ:' : 'Service Charge:'}</span>
            <span className="font-semibold text-amber-700">৳{kpiData.totalServiceCharge.toLocaleString()}</span>
          </div>
          {kpiData.totalBenefits > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{isBangla ? 'প্রদত্ত সুবিধা:' : 'Benefits Paid:'}</span>
              <span className="font-semibold text-purple-700">৳{kpiData.totalBenefits.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Expandable Breakdown Drawer/Accordion */}
        {isExpanded && (
          <div
            className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-2 text-[11px] bg-slate-50/80 p-2.5 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              <span>{isBangla ? 'ধরনভিত্তিক নিষ্পত্তি হিসাব' : 'Settlement Type Breakdown'}</span>
              <span className="text-[9px] text-indigo-700 font-mono">FY {kpiData.currentFY}</span>
            </div>

            {/* Normal Exit */}
            <div className="p-2 bg-white rounded border border-slate-200">
              <div className="flex items-center justify-between font-bold text-emerald-800 mb-1">
                <span className="flex items-center gap-1">
                  <UserMinus className="w-3 h-3 text-emerald-600" />
                  <span>{isBangla ? 'সাধারণ প্রস্থান (Normal Exit)' : 'Normal Exit'}</span>
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-mono">
                  15% ফি
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-600">
                <div>
                  <span className="text-slate-400">{isBangla ? 'আবেদন:' : 'Req:'}</span> {kpiData.normalStats.requests}
                </div>
                <div>
                  <span className="text-slate-400">{isBangla ? 'অনুমোদিত:' : 'Apprv:'}</span> {kpiData.normalStats.approved}
                </div>
                <div>
                  <span className="text-slate-400">{isBangla ? 'নিষ্পন্ন:' : 'Setl:'}</span> {kpiData.normalStats.settled}
                </div>
              </div>
              <div className="flex justify-between text-[10px] mt-1 pt-1 border-t border-slate-100">
                <span className="text-slate-500">মূলধন: ৳{kpiData.normalStats.capital.toLocaleString()}</span>
                <span className="text-amber-700">চার্জ: ৳{kpiData.normalStats.serviceCharge.toLocaleString()}</span>
                <span className="font-bold text-emerald-700">নিট: ৳{kpiData.normalStats.netPaid.toLocaleString()}</span>
              </div>
            </div>

            {/* Early Exit */}
            <div className="p-2 bg-white rounded border border-slate-200">
              <div className="flex items-center justify-between font-bold text-amber-800 mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>{isBangla ? 'আগাম প্রস্থান (Early Exit)' : 'Early Exit'}</span>
                </span>
                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-mono">
                  15% ফি
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-600">
                <div>
                  <span className="text-slate-400">{isBangla ? 'আবেদন:' : 'Req:'}</span> {kpiData.earlyStats.requests}
                </div>
                <div>
                  <span className="text-slate-400">{isBangla ? 'অনুমোদিত:' : 'Apprv:'}</span> {kpiData.earlyStats.approved}
                </div>
                <div>
                  <span className="text-slate-400">{isBangla ? 'নিষ্পন্ন:' : 'Setl:'}</span> {kpiData.earlyStats.settled}
                </div>
              </div>
              <div className="flex justify-between text-[10px] mt-1 pt-1 border-t border-slate-100">
                <span className="text-slate-500">মূলধন: ৳{kpiData.earlyStats.capital.toLocaleString()}</span>
                <span className="text-amber-700">চার্জ: ৳{kpiData.earlyStats.serviceCharge.toLocaleString()}</span>
                <span className="font-bold text-amber-700">নিট: ৳{kpiData.earlyStats.netPaid.toLocaleString()}</span>
              </div>
            </div>

            {/* Death Settlement */}
            <div className="p-2 bg-white rounded border border-slate-200">
              <div className="flex items-center justify-between font-bold text-purple-800 mb-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-600" />
                  <span>{isBangla ? 'মৃত্যু নিষ্পত্তি (Death Settlement)' : 'Death Settlement'}</span>
                </span>
                <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-mono">
                  0% ফি + কল্যাণ
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-600">
                <div>
                  <span className="text-slate-400">{isBangla ? 'আবেদন:' : 'Req:'}</span> {kpiData.deathStats.requests}
                </div>
                <div>
                  <span className="text-slate-400">{isBangla ? 'অনুমোদিত:' : 'Apprv:'}</span> {kpiData.deathStats.approved}
                </div>
                <div>
                  <span className="text-slate-400">{isBangla ? 'নিষ্পন্ন:' : 'Setl:'}</span> {kpiData.deathStats.settled}
                </div>
              </div>
              <div className="flex justify-between text-[10px] mt-1 pt-1 border-t border-slate-100">
                <span className="text-slate-500">মূলধন: ৳{kpiData.deathStats.capital.toLocaleString()}</span>
                <span className="text-purple-700">সুবিধা: ৳{kpiData.deathStats.benefits.toLocaleString()}</span>
                <span className="font-bold text-purple-700">নিট: ৳{kpiData.deathStats.netPaid.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls: Type Breakdown Toggle & View Reports Button */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-[11px] font-medium text-slate-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
        >
          <span>{isExpanded ? (isBangla ? 'সংক্ষেপ করুন' : 'Collapse') : (isBangla ? 'ধরনভিত্তিক হিসাব' : 'Type Breakdown')}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 transition-colors group-hover:translate-x-0.5 transition-transform"
        >
          <span>{isBangla ? 'নিষ্পত্তি রিপোর্ট →' : 'View Settlement Reports →'}</span>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, TrendingUp, HandCoins, Building, Calendar, ArrowRight, LineChart } from 'lucide-react';
import { AccountingService } from '../../services/accounting';
import { KeyFinancialIndicators } from '../dashboard/KeyFinancialIndicators';

export const MemberDashboard: React.FC = () => {
  const { db, activeUser, language, navigateTo } = useApp();
  const isBangla = language === 'bn';

  if (!activeUser || !activeUser.linkedMemberId) return null;

  const member = (db.members || []).find(m => m.memberId === activeUser.linkedMemberId);
  if (!member) return null;

  const ledgerData = AccountingService.getComprehensiveMemberLedger(db, member.memberId);
  const totalCapital = ledgerData?.totalCapital || 0;
  const totalCollections = ledgerData?.totalMonthlySubscription || 0;
  const admissionFee = ledgerData?.totalAdmissionFee || 0;
  const balance = ledgerData?.currentMemberBalance || 0;

  const totalDue = (db.collections || []).filter(c => c?.memberId === member.memberId && (c?.status === 'ACTIVE' || !c?.status)).reduce((sum, c) => sum + (c?.currentDue || 0), 0);
  
  const totalLoanDisbursed = (db.loans || []).filter(l => l.memberId === member.memberId && (l.status === 'ACTIVE' || l.status === 'COMPLETED')).reduce((sum, l) => sum + (l.approvedAmount ?? l.appliedAmount ?? l.requestedAmount ?? 0), 0);
  const totalLoanRepaid = (db.loanRepayments || []).filter(r => r.memberId === member.memberId && r.status === 'ACTIVE').reduce((sum, r) => sum + r.principalAmount, 0);
  const outstandingLoan = (db.loans || []).filter(l => l.memberId === member.memberId && l.status === 'ACTIVE').reduce((sum, l) => sum + (l.totalOutstanding || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {member.photoPath ? (
             <div className="w-14 h-14 rounded-full border-2 border-emerald-500 overflow-hidden shrink-0 shadow-sm">
               <img src={member.photoPath} alt="Profile" className="w-full h-full object-cover" />
             </div>
          ) : (
             <ShieldCheck className="w-8 h-8 text-emerald-600" />
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>{isBangla ? 'আমার ড্যাশবোর্ড' : 'My Dashboard'}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isBangla ? 'স্বাগতম' : 'Welcome'}, <strong>{member.fullName}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('MEMBER_FINANCIAL_SUMMARY' as any)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <LineChart className="w-4 h-4" />
            <span>{isBangla ? 'সমিতির সামগ্রিক আর্থিক অবস্থা' : 'Society Financial Indicators'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="bg-emerald-100 px-3 py-1.5 rounded-lg text-emerald-800 font-bold text-sm">
            {member.memberId}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 font-bold mb-1">{isBangla ? 'মোট মূলধন' : 'Total Capital'}</p>
          <p className="text-xl font-black text-indigo-700">৳{totalCapital.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 font-bold mb-1">{isBangla ? 'মাসিক চাঁদা' : 'Monthly Sub'}</p>
          <p className="text-xl font-black text-emerald-700">৳{totalCollections.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 font-bold mb-1">{isBangla ? 'ভর্তি ফি' : 'Admission Fee'}</p>
          <p className="text-xl font-black text-amber-600">৳{admissionFee.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 font-bold mb-1">{isBangla ? 'সদস্য স্থিতি' : 'Member Balance'}</p>
          <p className="text-xl font-black text-blue-600">৳{balance.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 font-bold mb-1">{isBangla ? 'বর্তমান বকেয়া' : 'Current Due'}</p>
          <p className="text-xl font-black text-rose-600">৳{totalDue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 font-bold mb-1">{isBangla ? 'চলমান ঋণ' : 'Outstanding Loan'}</p>
          <p className="text-xl font-black text-orange-600">৳{outstandingLoan.toLocaleString()}</p>
        </div>
      </div>
      
      
      <div className="mt-8">
        <KeyFinancialIndicators showTitle={true} compact={false} />
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">{isBangla ? 'সাম্প্রতিক লেনদেন' : 'Recent Transactions'}</h3>
        </div>
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {(db.memberLedgers || []).filter(l => l.memberId === member.memberId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map((l, index) => (
              <div key={`${l.ledgerId}-${index}`} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <p className="text-sm font-bold text-slate-800">{l.description}</p>
                  <p className="text-xs text-slate-500">{new Date(l.date || new Date().toISOString()).toLocaleDateString()} • {l.voucherNo}</p>
                </div>
                <div className="text-right">
                  {l.credit > 0 ? (
                    <p className="text-sm font-bold text-emerald-600">+ ৳{l.credit}</p>
                  ) : (
                    <p className="text-sm font-bold text-rose-600">- ৳{l.debit}</p>
                  )}
                  <p className="text-xs font-mono text-slate-500">Bal: ৳{l.balance}</p>
                </div>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
};

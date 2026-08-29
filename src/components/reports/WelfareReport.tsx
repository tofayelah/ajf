import React from 'react';
import { AppDatabaseState } from '../../services/db';
import { AccountingService } from '../../services/accounting';

export const WelfareReport: React.FC<{ db: AppDatabaseState }> = ({ db }) => {
  const summary = AccountingService.calculateFinancialSummary(db);
  const transactions = db.welfareTransactions || [];

  const welfareIncome = transactions.filter(w => w.fundType === 'WELFARE' && w.approvalStatus !== 'REVERSED' && w.status !== 'REVERSED').reduce((s, w) => s + (w.income || 0), 0);
  const emergencyIncome = transactions.filter(w => w.fundType === 'EMERGENCY' && w.approvalStatus !== 'REVERSED' && w.status !== 'REVERSED').reduce((s, w) => s + (w.income || 0), 0);
  
  const welfareExpense = transactions.filter(w => w.fundType === 'WELFARE' && w.approvalStatus !== 'REVERSED' && w.status !== 'REVERSED').reduce((s, w) => s + (w.expense || 0), 0);
  const emergencyExpense = transactions.filter(w => w.fundType === 'EMERGENCY' && w.approvalStatus !== 'REVERSED' && w.status !== 'REVERSED').reduce((s, w) => s + (w.expense || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center border-b border-slate-200 pb-4">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
          কল্যাণ তহবিল রিপোর্ট (Welfare Report)
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
          <div className="text-xs text-purple-800 font-bold mb-1">Welfare Income</div>
          <div className="text-lg font-black text-purple-700">৳{welfareIncome.toLocaleString()}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <div className="text-xs text-amber-800 font-bold mb-1">Emergency Income</div>
          <div className="text-lg font-black text-amber-700">৳{emergencyIncome.toLocaleString()}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
          <div className="text-xs text-purple-800 font-bold mb-1">Welfare Utilized</div>
          <div className="text-lg font-black text-rose-600">৳{welfareExpense.toLocaleString()}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <div className="text-xs text-amber-800 font-bold mb-1">Emergency Utilized</div>
          <div className="text-lg font-black text-rose-600">৳{emergencyExpense.toLocaleString()}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <div className="bg-purple-100 p-4 rounded-xl border border-purple-300 text-center">
          <div className="text-xs text-purple-900 font-bold mb-1">Welfare Balance</div>
          <div className="text-2xl font-black text-purple-800">৳{summary.welfareFundBalance.toLocaleString()}</div>
        </div>
        <div className="bg-amber-100 p-4 rounded-xl border border-amber-300 text-center">
          <div className="text-xs text-amber-900 font-bold mb-1">Emergency Balance</div>
          <div className="text-2xl font-black text-amber-800">৳{summary.emergencyFundBalance.toLocaleString()}</div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 border-b font-bold">Date & Voucher</th>
              <th className="p-3 border-b font-bold">Fund Type</th>
              <th className="p-3 border-b font-bold">Beneficiary / Member ID</th>
              <th className="p-3 border-b font-bold">Purpose / Resolution</th>
              <th className="p-3 border-b font-bold text-center">Status & By</th>
              <th className="p-3 border-b font-bold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map(w => {
              const member = w.memberId ? (db.members || []).find(m => m.memberId === w.memberId) : undefined;
              const resolvedBeneficiary = member ? `${member.fullName} (${member.memberId || w.memberId})` : (w.beneficiary || w.beneficiaryName || '-');
              const isReversed = w.approvalStatus === 'REVERSED' || w.status === 'REVERSED';
              return (
                <tr key={w.fundId} className={isReversed ? 'bg-slate-50 opacity-60' : ''}>
                  <td className="p-3 font-mono">
                    <span className="block font-bold">{w.voucherNo}</span>
                    <span className="block text-[10px] text-slate-500">{w.date}</span>
                  </td>
                  <td className="p-3">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        w.fundType === 'WELFARE' ? 'bg-purple-100 text-purple-800' :
                        w.fundType === 'EMERGENCY' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {w.fundType}
                     </span>
                  </td>
                  <td className="p-3">
                    <span className="block font-semibold text-slate-800">{resolvedBeneficiary}</span>
                    {member && <span className="block text-[10px] text-emerald-600 font-medium">সমিতির সদস্য</span>}
                  </td>
                  <td className="p-3">
                    <span className="block text-slate-700">{w.reason || w.purpose || '-'}</span>
                    <span className="block text-[10px] text-slate-500 font-mono">{w.resolutionNo || '-'}</span>
                  </td>
                  <td className="p-3 text-center">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isReversed ? 'bg-rose-100 text-rose-800 line-through' :
                        w.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        w.approvalStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isReversed ? 'REVERSED' : w.approvalStatus}
                     </span>
                  </td>
                  <td className="p-3 text-right">
                    {w.income > 0 ? (
                      <span className="block font-mono font-bold text-emerald-600">+৳{w.income.toLocaleString()}</span>
                    ) : (
                      <span className="block font-mono font-bold text-rose-600">৳{(w.expense || w.amount || 0).toLocaleString()}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">কোনো তথ্য পাওয়া যায়নি।</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

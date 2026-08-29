import React from 'react';
import { AppDatabaseState } from '../../services/db';

export const ProfitReport: React.FC<{ db: AppDatabaseState }> = ({ db }) => {
  const records = db.historicalProfits || [];

  return (
    <div className="space-y-6">
      <div className="text-center border-b border-slate-200 pb-4">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
          লভ্যাংশ বন্টন রিপোর্ট (Profit Report)
        </h2>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 border-b font-bold">Financial Year</th>
              <th className="p-3 border-b font-bold text-right">Net Profit</th>
              <th className="p-3 border-b font-bold text-center">Breakdown (%)</th>
              <th className="p-3 border-b font-bold text-right">Breakdown (Amounts)</th>
              <th className="p-3 border-b font-bold text-center">Status / Meta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map(r => {
              const isLegacy = !r.finalized;
              const memPrc = r.memberDistributionPercent !== undefined ? r.memberDistributionPercent : (r.memberPercent || 0);
              const memAmt = r.memberDistributionAmount !== undefined ? r.memberDistributionAmount : (r.memberAmount || 0);
              
              return (
                <tr key={r.id}>
                  <td className="p-3 font-mono font-bold text-slate-900">
                    {r.financialYear}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700">
                    ৳{r.netProfit.toLocaleString()}
                  </td>
                  <td className="p-3 text-center text-[10px] space-y-1">
                    <div className="text-emerald-700">Member: {memPrc}%</div>
                    <div className="text-purple-700">Welfare: {r.welfarePercent || 0}%</div>
                    <div className="text-amber-700">Emergency: {r.emergencyPercent || 0}%</div>
                    <div className="text-blue-700">Reserve: {r.reservePercent || 0}%</div>
                  </td>
                  <td className="p-3 text-right font-mono text-[10px] space-y-1">
                    <div className="text-emerald-700">৳{memAmt.toLocaleString()}</div>
                    <div className="text-purple-700">৳{(r.welfareAmount || 0).toLocaleString()}</div>
                    <div className="text-amber-700">৳{(r.emergencyAmount || 0).toLocaleString()}</div>
                    <div className="text-blue-700">৳{(r.reserveAmount || 0).toLocaleString()}</div>
                  </td>
                  <td className="p-3 text-center">
                    {isLegacy ? (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded block mb-1">LEGACY</span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded block mb-1">FINALIZED</span>
                    )}
                    <span className="block text-[10px] text-slate-500 font-mono">By: {r.finalizedBy || r.approvedBy || '-'}</span>
                    <span className="block text-[10px] text-slate-500 font-mono">Res: {r.resolutionNo || '-'}</span>
                    <span className="block text-[10px] text-slate-500">{r.finalizedAt || r.createdDate || '-'}</span>
                  </td>
                </tr>
              );
            })}
            {records.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">কোনো তথ্য পাওয়া যায়নি।</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React from 'react';
import { AppDatabaseState } from '../../services/db';
import { Investment } from '../../types';
import { calculateInvestmentOutstanding, getInvestmentStatus } from '../../services/accounting';

export const InvestmentReport: React.FC<{ db: AppDatabaseState }> = ({ db }) => {
  const investments = db.investments || [];
  
  const totalInvestment = investments.reduce((sum, i) => sum + (i.originalPrincipal ?? i.investmentAmount ?? 0), 0);
  const activeInvestment = investments
    .filter(i => {
      const status = getInvestmentStatus(i);
      return status === 'ACTIVE' || status === 'PARTIAL_RETURN';
    })
    .reduce((sum, i) => sum + calculateInvestmentOutstanding(i), 0);
  
  const completedInvestment = investments
    .filter(i => getInvestmentStatus(i) === 'COMPLETED')
    .reduce((sum, i) => sum + (i.originalPrincipal ?? i.investmentAmount ?? 0), 0);
    
  const totalProfit = investments.reduce((sum, i) => sum + (i.profit || 0), 0);
  const totalLoss = investments.reduce((sum, i) => sum + (i.loss || 0), 0);
    
  const overallROI = totalInvestment > 0 ? ((totalProfit - totalLoss) / totalInvestment) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="text-center border-b border-slate-200 pb-4">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
          বিনিয়োগ রিপোর্ট (Investment Report)
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-bold mb-1">Total Funded</div>
          <div className="text-lg font-black text-slate-900">৳{totalInvestment.toLocaleString()}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <div className="text-xs text-blue-800 font-bold mb-1">Active / Outstanding</div>
          <div className="text-lg font-black text-blue-700">৳{activeInvestment.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-bold mb-1">Completed / Settled</div>
          <div className="text-lg font-black text-slate-700">৳{completedInvestment.toLocaleString()}</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs text-emerald-800 font-bold mb-1">Total Profit</div>
          <div className="text-lg font-black text-emerald-700">৳{totalProfit.toLocaleString()}</div>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
          <div className="text-xs text-rose-800 font-bold mb-1">Total Loss</div>
          <div className="text-lg font-black text-rose-700">৳{totalLoss.toLocaleString()}</div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
          <div className="text-xs text-indigo-800 font-bold mb-1">Overall ROI</div>
          <div className="text-lg font-black text-indigo-700">{overallROI.toFixed(2)}%</div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 border-b font-bold">Investment ID & Date</th>
              <th className="p-3 border-b font-bold">Type & Manager</th>
              <th className="p-3 border-b font-bold text-right">Original & Outstanding</th>
              <th className="p-3 border-b font-bold text-right">Total Returned</th>
              <th className="p-3 border-b font-bold text-right">Profit / Loss</th>
              <th className="p-3 border-b font-bold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {investments.map(i => {
              const status = getInvestmentStatus(i);
              const returnedPrincipal = i.returnedPrincipal ?? 0;
              const original = i.originalPrincipal ?? i.investmentAmount ?? 0;
              const outstanding = calculateInvestmentOutstanding(i);
              
              const actualReturn = returnedPrincipal + (i.profit || 0) - (i.loss || 0);
              const roi = (i.profit && original > 0) ? (i.profit / original) * 100 : 
                          (i.loss && original > 0) ? -(i.loss / original) * 100 : 0;

              return (
                <tr key={i.investmentId}>
                  <td className="p-3 font-mono">
                    <span className="block font-bold">{i.investmentId}</span>
                    <span className="block text-[10px] text-slate-500">{i.investmentDate}</span>
                  </td>
                  <td className="p-3">
                    <span className="block font-semibold text-slate-800">{i.projectType}</span>
                    <span className="block text-[10px] text-slate-500">{i.partner}</span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="block font-mono font-bold text-slate-900">৳{original.toLocaleString()}</span>
                    <span className="block text-[10px] text-slate-500 font-bold text-rose-600">
                      Out: ৳{outstanding.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-700">
                    ৳{actualReturn.toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    {i.profit ? (
                      <span className="block font-mono font-bold text-emerald-600">+৳{i.profit.toLocaleString()}</span>
                    ) : i.loss ? (
                      <span className="block font-mono font-bold text-rose-600">-৳{i.loss.toLocaleString()}</span>
                    ) : (
                      <span className="block text-slate-400">-</span>
                    )}
                    {(i.profit || i.loss) ? (
                      <span className="block text-[10px] font-mono font-bold text-slate-500">{roi.toFixed(2)}% ROI</span>
                    ) : null}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      status === 'COMPLETED' ? 'bg-slate-200 text-slate-800' :
                      status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 
                      status === 'PARTIAL_RETURN' ? 'bg-blue-100 text-blue-800' : 
                      status === 'APPROVED' ? 'bg-indigo-100 text-indigo-800' : 
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {investments.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">কোনো বিনিয়োগ পাওয়া যায়নি।</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

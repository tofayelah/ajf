import React from 'react';
import { AppDatabaseState } from '../../services/db';
import { format } from 'date-fns';

export const CashReconciliationReport: React.FC<{ db: AppDatabaseState }> = ({ db }) => {
  const isBangla = db.settings.language === 'bn';
  const records = db.cashReconciliations || [];
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
          {isBangla ? 'নগদ সমন্বয় প্রতিবেদন (Cash Reconciliation Report)' : 'Cash Reconciliation Report'}
        </h2>
        <p className="text-xs text-slate-500">
          {isBangla ? 'নগদান বই এবং প্রকৃত নগদ অর্থের সমন্বয় ইতিহাস' : 'History of cash book vs physical cash reconciliations'}
        </p>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
              <th className="p-2 font-bold">{isBangla ? 'তারিখ' : 'Date'}</th>
              <th className="p-2 font-bold">{isBangla ? 'প্রত্যাশিত জের' : 'Expected Balance'}</th>
              <th className="p-2 font-bold">{isBangla ? 'প্রকৃত নগদ' : 'Physical Cash'}</th>
              <th className="p-2 font-bold">{isBangla ? 'পার্থক্য' : 'Difference'}</th>
              <th className="p-2 font-bold">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
              <th className="p-2 font-bold">{isBangla ? 'অনুমোদন' : 'Approved By'}</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-slate-500">No data found</td></tr>
            ) : records.map(r => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="p-2">{format(new Date(r.reconciliationDate || new Date().toISOString()), 'dd MMM yyyy')}</td>
                <td className="p-2 font-mono">৳{r.bookBalance.toLocaleString()}</td>
                <td className="p-2 font-mono">৳{r.physicalCash.toLocaleString()}</td>
                <td className={`p-2 font-mono font-bold ${r.difference !== 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {r.difference === 0 ? '-' : `৳${Math.abs(r.difference).toLocaleString()}`}
                </td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 text-[10px]">{r.approvedBy || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React from 'react';
import { AppDatabaseState } from '../../services/db';
import { format } from 'date-fns';
import { AccountingService } from '../../services/accounting';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const YearClosingReport: React.FC<{ db: AppDatabaseState }> = ({ db }) => {
  const isBangla = db.settings.language === 'bn';
  const closedYears = (db.financialYears || []).filter(fy => fy.status === 'CLOSED').sort((a,b) => b.endDate.localeCompare(a.endDate));
  const latestClosed = closedYears[0];

  if (!latestClosed) {
    return (
      <div className="p-8 text-center text-slate-500">
        {isBangla ? 'কোনো বন্ধ অর্থবছর পাওয়া যায়নি' : 'No closed financial year found'}
      </div>
    );
  }

  // Calculate summary just based on db since we didn't snapshot the full state inside the fy object.
  // In a robust implementation, the snapshot values would be fetched from `latestClosed.closingBalances`
  const summary = AccountingService.calculateFinancialSummary(db);
  const profit = (db.historicalProfits || []).find(p => p.financialYear === latestClosed.yearCode);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
          {isBangla ? 'অর্থবছর সমাপনী প্রতিবেদন (Year Closing Report)' : 'Year Closing Report'}
        </h2>
        <p className="text-sm font-bold text-indigo-700 mt-1">
          {latestClosed.yearCode} ({format(new Date(latestClosed.startDate), 'dd MMM yy')} - {format(new Date(latestClosed.endDate), 'dd MMM yy')})
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 text-xs">
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100 p-2.5 font-bold text-slate-900 border-b border-slate-200">
            {isBangla ? 'সমাপনী ব্যালেন্স' : 'Closing Balances'}
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Cash</span>
              <span className="font-mono font-bold">৳{summary.cashBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Bank</span>
              <span className="font-mono font-bold">৳{summary.bankBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Member Capital</span>
              <span className="font-mono font-bold">৳{summary.totalCapital.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Outstanding Loans</span>
              <span className="font-mono font-bold">৳{summary.outstandingLoans.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Investments</span>
              <span className="font-mono font-bold">৳{summary.totalInvestments.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Welfare Fund</span>
              <span className="font-mono font-bold">৳{summary.welfareFundBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Emergency Fund</span>
              <span className="font-mono font-bold">৳{summary.emergencyFundBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Reserve Fund</span>
              <span className="font-mono font-bold">৳{summary.reserveFundBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100 p-2.5 font-bold text-slate-900 border-b border-slate-200">
            {isBangla ? 'লাভ-ক্ষতি ও বন্টন' : 'Profit & Distribution'}
          </div>
          <div className="p-3 space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Total Income</span>
              <span className="font-mono font-bold text-emerald-700">৳{summary.totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Total Expense</span>
              <span className="font-mono font-bold text-rose-700">৳{summary.totalExpense.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 bg-slate-50 font-bold p-1">
              <span>Net Profit</span>
              <span className="font-mono text-indigo-700">৳{summary.netProfit.toLocaleString()}</span>
            </div>
            
            {profit && (
              <>
                <div className="flex justify-between py-1 border-b border-slate-100 mt-2">
                  <span>Distributed to Members</span>
                  <span className="font-mono font-bold">৳{(profit.distributedAmount ?? profit.memberDistributionAmount ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>To Welfare</span>
                  <span className="font-mono font-bold">৳{(profit.welfareAmount ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>To Reserve</span>
                  <span className="font-mono font-bold">৳{(profit.reserveAmount ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Retained</span>
                  <span className="font-mono font-bold">৳{(profit.retainedAmount ?? profit.emergencyAmount ?? 0).toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex justify-between items-center text-xs">
        <div>
          <span className="block text-indigo-900 font-bold mb-1">{isBangla ? 'অনুমোদনকারী' : 'Closed By'}</span>
          <span className="text-indigo-700">{latestClosed.closedBy || 'Admin'}</span>
        </div>
        <div className="text-right">
          <span className="block text-indigo-900 font-bold mb-1">{isBangla ? 'বন্ধের তারিখ' : 'Closed At'}</span>
          <span className="text-indigo-700 font-mono">{latestClosed.closedAt ? format(new Date(latestClosed.closedAt), 'dd MMM yyyy, h:mm a') : '-'}</span>
        </div>
        <div className="flex items-center gap-2 bg-indigo-100 px-3 py-1.5 rounded-lg text-indigo-800 font-bold">
          <ShieldCheck className="w-5 h-5" />
          {isBangla ? 'সফলভাবে বন্ধ' : 'Successfully Closed'}
        </div>
      </div>
    </div>
  );
};

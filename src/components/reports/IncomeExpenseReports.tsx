import React, { useState, useMemo } from 'react';
import { AppDatabaseState } from '../../services/db';

export const IncomeReport: React.FC<{ db: AppDatabaseState }> = ({ db }) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [head, setHead] = useState('');
  const [method, setMethod] = useState('');

  const filteredIncomes = useMemo(() => {
    let list = db.incomes || [];
    if (fromDate) list = list.filter(i => i.date >= fromDate);
    if (toDate) list = list.filter(i => i.date <= toDate);
    if (head) list = list.filter(i => i.incomeHead === head);
    if (method) list = list.filter(i => i.paymentMethod === method);
    return list;
  }, [db.incomes, fromDate, toDate, head, method]);

  const total = filteredIncomes.reduce((s, i) => s + i.amount, 0);

  const breakdown = filteredIncomes.reduce((acc, i) => {
    acc[i.incomeHead] = (acc[i.incomeHead] || 0) + i.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="text-center border-b border-slate-200 pb-4">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
          আয় রিপোর্ট (Income Report)
        </h2>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs hide-print">
        <div>
          <label className="block text-slate-500 font-bold mb-1">From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full border-slate-300 rounded p-1.5" />
        </div>
        <div>
          <label className="block text-slate-500 font-bold mb-1">To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full border-slate-300 rounded p-1.5" />
        </div>
        <div>
          <label className="block text-slate-500 font-bold mb-1">Income Head</label>
          <select value={head} onChange={e => setHead(e.target.value)} className="w-full border-slate-300 rounded p-1.5">
            <option value="">All</option>
            {Array.from(new Set((db.incomes || []).map(i => i.incomeHead))).map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-500 font-bold mb-1">Payment Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="w-full border-slate-300 rounded p-1.5">
            <option value="">All</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs text-emerald-800 font-bold mb-1">Total Income</div>
          <div className="text-xl font-black text-emerald-700">৳{total.toLocaleString()}</div>
        </div>
        <div className="col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
           {Object.entries(breakdown).map(([h, amount]) => (
              <div key={h} className="bg-white p-2 rounded border border-slate-200">
                <div className="text-[10px] text-slate-500 truncate">{h}</div>
                <div className="font-bold text-slate-800 text-sm">৳{amount.toLocaleString()}</div>
              </div>
           ))}
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 border-b font-bold">Voucher & Date</th>
              <th className="p-3 border-b font-bold">Income Head</th>
              <th className="p-3 border-b font-bold">Member / Reference</th>
              <th className="p-3 border-b font-bold">Method</th>
              <th className="p-3 border-b font-bold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredIncomes.map(i => (
              <tr key={i.incomeId}>
                <td className="p-3 font-mono">
                  <span className="block font-bold">{i.voucherNo}</span>
                  <span className="block text-[10px] text-slate-500">{i.date}</span>
                </td>
                <td className="p-3 font-semibold text-slate-800">{i.incomeHead}</td>
                <td className="p-3">
                  <span className="block font-medium">{i.memberName || '-'}</span>
                  <span className="block text-[10px] text-slate-500">{i.reference || i.remarks || ''}</span>
                </td>
                <td className="p-3">{i.paymentMethod}</td>
                <td className="p-3 text-right font-mono font-bold text-emerald-700">৳{i.amount.toLocaleString()}</td>
              </tr>
            ))}
            {filteredIncomes.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">নির্বাচিত সময়সীমায় কোনো আয় পাওয়া যায়নি।</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ExpenseReport: React.FC<{ db: AppDatabaseState }> = ({ db }) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [head, setHead] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');

  const filteredExpenses = useMemo(() => {
    let list = db.expenses || [];
    if (fromDate) list = list.filter(e => e.date >= fromDate);
    if (toDate) list = list.filter(e => e.date <= toDate);
    if (head) list = list.filter(e => e.expenseHead === head);
    if (method) list = list.filter(e => e.paymentMethod === method);
    if (status) list = list.filter(e => e.approvalStatus === status);
    return list;
  }, [db.expenses, fromDate, toDate, head, method, status]);

  const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="text-center border-b border-slate-200 pb-4">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
          ব্যয় রিপোর্ট (Expense Report)
        </h2>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs hide-print">
        <div>
          <label className="block text-slate-500 font-bold mb-1">From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full border-slate-300 rounded p-1.5" />
        </div>
        <div>
          <label className="block text-slate-500 font-bold mb-1">To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full border-slate-300 rounded p-1.5" />
        </div>
        <div>
          <label className="block text-slate-500 font-bold mb-1">Expense Head</label>
          <select value={head} onChange={e => setHead(e.target.value)} className="w-full border-slate-300 rounded p-1.5">
            <option value="">All</option>
            {Array.from(new Set((db.expenses || []).map(e => e.expenseHead))).map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-500 font-bold mb-1">Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="w-full border-slate-300 rounded p-1.5">
            <option value="">All</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-500 font-bold mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border-slate-300 rounded p-1.5">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-center max-w-sm mx-auto">
        <div className="text-xs text-rose-800 font-bold mb-1">Total Expense</div>
        <div className="text-xl font-black text-rose-700">৳{total.toLocaleString()}</div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 border-b font-bold">Voucher & Date</th>
              <th className="p-3 border-b font-bold">Expense Head</th>
              <th className="p-3 border-b font-bold">Payee</th>
              <th className="p-3 border-b font-bold">Status & By</th>
              <th className="p-3 border-b font-bold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.map(e => (
              <tr key={e.expenseId}>
                <td className="p-3 font-mono">
                  <span className="block font-bold">{e.voucherNo}</span>
                  <span className="block text-[10px] text-slate-500">{e.date}</span>
                  <span className="block text-[10px] text-slate-500">{e.paymentMethod}</span>
                </td>
                <td className="p-3 font-semibold text-slate-800">{e.expenseHead}</td>
                <td className="p-3">{e.payee}</td>
                <td className="p-3">
                   <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      e.approvalStatus === 'APPROVED' || e.approvalStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                      e.approvalStatus === 'PENDING_APPROVAL' || (e.approvalStatus as string) === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {e.approvalStatus}
                   </span>
                   <span className="block text-[10px] text-slate-500 mt-1">{e.approvedBy}</span>
                </td>
                <td className="p-3 text-right font-mono font-bold text-rose-700">৳{e.amount.toLocaleString()}</td>
              </tr>
            ))}
            {filteredExpenses.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-slate-500">নির্বাচিত সময়সীমায় কোনো ব্যয় পাওয়া যায়নি।</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const IncomeExpenseReport: React.FC<{ db: AppDatabaseState }> = ({ db }) => {
  return (
    <div className="space-y-12">
      <IncomeReport db={db} />
      <hr className="border-slate-300 border-dashed" />
      <ExpenseReport db={db} />
    </div>
  );
};

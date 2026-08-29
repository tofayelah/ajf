import React, { useState } from 'react';
import { AppDatabaseState } from '../../services/db';

interface Props {
  db: AppDatabaseState;
}

export const ReserveFundReport: React.FC<Props> = ({ db }) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [purposeFilter, setPurposeFilter] = useState('');
  const [requestedByFilter, setRequestedByFilter] = useState('');

  // Calculate Reserve Fund balances properly
  const historicalAllocations = (db.historicalProfits || []).reduce((sum, hp) => sum + (hp.reserveAmount || 0), 0);
  const otherAllocations = (db.welfareTransactions || []).filter(w => w.fundType === 'RESERVE' && w.income > 0).reduce((sum, w) => sum + w.income, 0);
  const totalAllocated = historicalAllocations + otherAllocations;
  const totalPaidUtilizations = (db.reserveUtilizations || []).filter(u => u.status === 'PAID').reduce((sum, u) => sum + u.amount, 0);
  const openingBalance = 0;
  const availableBalance = openingBalance + totalAllocated - totalPaidUtilizations;

  const filteredUtils = (db.reserveUtilizations || []).filter(u => {
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (fromDate && u.date < fromDate) return false;
    if (toDate && u.date > toDate) return false;
    if (purposeFilter && !u.purpose.toLowerCase().includes(purposeFilter.toLowerCase())) return false;
    if (requestedByFilter && !u.requestedBy.toLowerCase().includes(requestedByFilter.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
          রিজার্ভ তহবিল রিপোর্ট (Reserve Fund Report)
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 hide-print">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-bold mb-1">Opening Balance</div>
          <div className="text-lg font-black text-slate-800">৳{openingBalance.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-bold mb-1">Total Allocated</div>
          <div className="text-lg font-black text-emerald-700">৳{totalAllocated.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-bold mb-1">Total Utilized (Paid)</div>
          <div className="text-lg font-black text-rose-700">৳{totalPaidUtilizations.toLocaleString()}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <div className="text-xs text-blue-600 font-bold mb-1">Available Balance</div>
          <div className="text-xl font-black text-blue-800">৳{availableBalance.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 hide-print">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border border-slate-300 rounded-lg p-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border border-slate-300 rounded-lg p-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg p-1.5 text-xs">
            <option value="ALL">All Statuses</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PAID">PAID</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Purpose</label>
          <input type="text" placeholder="Search Purpose" value={purposeFilter} onChange={e => setPurposeFilter(e.target.value)} className="border border-slate-300 rounded-lg p-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Requested By</label>
          <input type="text" placeholder="Search Requested By" value={requestedByFilter} onChange={e => setRequestedByFilter(e.target.value)} className="border border-slate-300 rounded-lg p-1.5 text-xs" />
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 border-b border-slate-200 font-bold">Date</th>
              <th className="p-3 border-b border-slate-200 font-bold">Utilization ID</th>
              <th className="p-3 border-b border-slate-200 font-bold">Purpose</th>
              <th className="p-3 border-b border-slate-200 font-bold">Status</th>
              <th className="p-3 border-b border-slate-200 font-bold">Requested By</th>
              <th className="p-3 border-b border-slate-200 font-bold">Approved By</th>
              <th className="p-3 border-b border-slate-200 font-bold">Resolution</th>
              <th className="p-3 border-b border-slate-200 font-bold">Method</th>
              <th className="p-3 border-b border-slate-200 font-bold">Voucher No</th>
              <th className="p-3 border-b border-slate-200 font-bold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUtils.map((u, idx) => (
              <tr key={idx}>
                <td className="p-3">{new Date(u.date || new Date().toISOString()).toLocaleDateString()}</td>
                <td className="p-3 font-mono text-[10px]">{u.utilizationId}</td>
                <td className="p-3 font-semibold text-slate-800">{u.purpose}</td>
                <td className="p-3 font-bold text-[10px]">{u.status}</td>
                <td className="p-3 text-[10px]">{u.requestedBy}</td>
                <td className="p-3 text-[10px]">{u.approvedBy || '-'}</td>
                <td className="p-3 font-mono text-[10px]">{u.resolutionNo || '-'}</td>
                <td className="p-3 text-[10px]">{u.paymentMethod || '-'}</td>
                <td className="p-3 font-mono text-[10px]">{u.voucherNo || '-'}</td>
                <td className="p-3 text-right font-mono font-bold text-slate-800">৳{u.amount.toLocaleString()}</td>
              </tr>
            ))}
            {filteredUtils.length === 0 && (
              <tr><td colSpan={10} className="p-4 text-center text-slate-500">কোনো রেকর্ড নেই</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

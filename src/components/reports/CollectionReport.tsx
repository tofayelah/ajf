
import React, { useState, useMemo } from 'react';
import { AppDatabaseState } from '../../services/db';
import { useApp } from '../../context/AppContext';
import { Search } from 'lucide-react';

export const CollectionReport: React.FC<{ db: AppDatabaseState }> = ({ db }) => {
  const { activeUser } = useApp();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterReceivedBy, setFilterReceivedBy] = useState('');

  const filteredCollections = useMemo(() => {
    let collections = db.collections || [];

    // Security: Restrict to logged-in member
    if (activeUser?.role === 'MEMBER') {
      collections = collections.filter(c => c.memberId === activeUser.linkedMemberId);
    }

    if (fromDate) {
      collections = collections.filter(c => c.collectionDate >= fromDate);
    }
    if (toDate) {
      collections = collections.filter(c => c.collectionDate <= toDate);
    }
    if (filterMonth) {
      collections = collections.filter(c => c.collectionMonth === filterMonth);
    }
    if (filterMember) {
      const search = filterMember.toLowerCase();
      collections = collections.filter(c => 
        (c.memberName || "").toLowerCase().includes(search) || 
        (c.memberId || "").toLowerCase().includes(search)
      );
    }
    if (filterMethod) {
      collections = collections.filter(c => c.paymentMethod === filterMethod);
    }
    if (filterReceivedBy) {
      const search = filterReceivedBy.toLowerCase();
      collections = collections.filter(c => (c.receivedBy || "").toLowerCase().includes(search));
    }

    return collections;
  }, [db.collections, activeUser, fromDate, toDate, filterMonth, filterMember, filterMethod, filterReceivedBy]);

  const totalMonthly = filteredCollections.reduce((s, c) => s + c.monthlyAmount, 0);
  const totalLate = filteredCollections.reduce((s, c) => s + c.lateFine, 0);
  const totalDiscount = filteredCollections.reduce((s, c) => s + (c.discount || 0), 0);
  const totalNet = filteredCollections.reduce((s, c) => s + c.totalPayable, 0);

  const methodBreakdown = filteredCollections.reduce((acc, c) => {
    const method = c.paymentMethod || 'Other';
    acc[method] = (acc[method] || 0) + c.totalPayable;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="text-center border-b border-slate-200 pb-4">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
          কালেকশন রিপোর্ট (Collection Report)
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs hide-print">
        <div>
          <label className="block text-slate-500 font-bold mb-1">From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full border-slate-300 rounded p-1.5" />
        </div>
        <div>
          <label className="block text-slate-500 font-bold mb-1">To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full border-slate-300 rounded p-1.5" />
        </div>
        <div>
          <label className="block text-slate-500 font-bold mb-1">Collection Month</label>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full border-slate-300 rounded p-1.5" />
        </div>
        {activeUser?.role !== 'MEMBER' && (
          <div>
            <label className="block text-slate-500 font-bold mb-1">Member (ID/Name)</label>
            <input type="text" value={filterMember} onChange={e => setFilterMember(e.target.value)} placeholder="Search member..." className="w-full border-slate-300 rounded p-1.5" />
          </div>
        )}
        <div>
          <label className="block text-slate-500 font-bold mb-1">Payment Method</label>
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="w-full border-slate-300 rounded p-1.5">
            <option value="">All</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-500 font-bold mb-1">Received By</label>
          <input type="text" value={filterReceivedBy} onChange={e => setFilterReceivedBy(e.target.value)} placeholder="Search receiver..." className="w-full border-slate-300 rounded p-1.5" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-bold mb-1">Total Monthly Contribution</div>
          <div className="text-lg font-black text-slate-900">৳{totalMonthly.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-bold mb-1">Total Late Fine</div>
          <div className="text-lg font-black text-slate-900">৳{totalLate.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-bold mb-1">Total Discount</div>
          <div className="text-lg font-black text-rose-600">৳{totalDiscount.toLocaleString()}</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <div className="text-xs text-emerald-800 font-bold mb-1">Net Collected</div>
          <div className="text-lg font-black text-emerald-700">৳{totalNet.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {Object.entries(methodBreakdown).map(([method, amount]) => (
            <div key={method} className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">{method}</div>
              <div className="font-mono font-bold text-slate-800">৳{amount.toLocaleString()}</div>
            </div>
         ))}
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 border-b border-slate-200 font-bold">Receipt</th>
              <th className="p-3 border-b border-slate-200 font-bold">Date & Month</th>
              <th className="p-3 border-b border-slate-200 font-bold">Member</th>
              <th className="p-3 border-b border-slate-200 font-bold text-right">Details</th>
              <th className="p-3 border-b border-slate-200 font-bold text-right">Net Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCollections.map((c) => (
              <tr key={c.collectionId}>
                <td className="p-3 font-mono">
                  <span className="block font-bold">{c.receiptNo}</span>
                  <span className="block text-[10px] text-slate-500">{c.paymentMethod}</span>
                </td>
                <td className="p-3">
                  <span className="block">{c.collectionDate}</span>
                  <span className="block font-semibold text-emerald-700">{c.collectionMonth}</span>
                </td>
                <td className="p-3">
                  <span className="font-semibold text-slate-800 block">{c.memberName}</span>
                  <span className="block font-mono text-[10px] text-slate-500">{c.memberId}</span>
                </td>
                <td className="p-3 text-right text-[10px]">
                  <div>Monthly: ৳{c.monthlyAmount}</div>
                  {c.lateFine > 0 && <div className="text-rose-600">Fine: +৳{c.lateFine}</div>}
                  {c.discount > 0 && <div className="text-emerald-600">Disc: -৳{c.discount}</div>}
                </td>
                <td className="p-3 text-right">
                  <span className="font-mono font-bold text-slate-900 block">৳{c.totalPayable.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-400 block">By: {c.receivedBy}</span>
                </td>
              </tr>
            ))}
            {filteredCollections.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-medium">নির্বাচিত সময়সীমায় কোনো তথ্য পাওয়া যায়নি।</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

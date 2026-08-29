import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FileSpreadsheet, Search, Eye, Download, Printer } from 'lucide-react';
import { MemberExitRequest } from '../../types';

export const SettlementReportsView = () => {
  const { db, language, activeUser, navigateTo } = useApp();
  const isBangla = language === 'bn';
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const exits = (db.memberExits || []);

  const filteredExits = exits.filter(exit => {
    const member = db.members?.find(m => m.memberId === exit.memberId);
    const matchesSearch = 
      exit.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || exit.exitType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || exit.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-4 pb-12 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>{isBangla ? 'নিষ্পত্তি রিপোর্ট' : 'Settlement Reports'}</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors">
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isBangla ? 'সদস্য আইডি বা নাম খুঁজুন...' : 'Search by Member ID or Name...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm"
          >
            <option value="ALL">All Types</option>
            <option value="NORMAL">Normal Exit</option>
            <option value="EARLY">Early Exit</option>
            <option value="DEATH">Death Settlement</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="NORMAL_EXIT_REQUESTED">Pending Request</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REFUND_PROCESSING">Refund Processing</option>
            <option value="REFUNDED">Refunded</option>
            <option value="EXITED">Exited</option>
            <option value="DEATH_REPORTED">Death Reported</option>
            <option value="SETTLEMENT_PROCESSING">Settlement Processing</option>
            <option value="SETTLED">Settled</option>
            <option value="DECEASED">Deceased</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Member Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Type</th>
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 whitespace-nowrap">Capital</th>
                <th className="px-4 py-3 whitespace-nowrap">Net Settlement</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExits.map(exit => {
                const member = db.members?.find(m => m.memberId === exit.memberId);
                const realId = exit.exitRequestId || (exit as any).id;
                const capital = exit.memberCapital || (exit as any).eligibleCapital || exit.eligibleRefundAmount || 0;
                return (
                  <tr key={realId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {exit.memberId}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {member?.fullName || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        exit.exitType === 'NORMAL' ? 'bg-emerald-100 text-emerald-700' :
                        exit.exitType === 'EARLY' ? 'bg-amber-100 text-amber-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {exit.exitType}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {exit.refundProcessDate || (exit as any).exitDate || exit.requestDate || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      ৳{capital.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                      ৳{(exit.netRefundAmount || exit.netSettlementAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium">
                        {exit.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredExits.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No records found for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

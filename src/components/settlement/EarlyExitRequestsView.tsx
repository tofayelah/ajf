import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClipboardList, Search, Eye, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { MemberExitRequest } from '../../types';

export const EarlyExitRequestsView = () => {
  const { db, language, navigateTo } = useApp();
  const isBangla = language === 'bn';
  const [searchTerm, setSearchTerm] = useState('');

  const exits = (db.memberExits || []).filter(e => e.exitType === 'EARLY' && (e.status === 'EARLY_EXIT_REQUESTED' || e.status === 'UNDER_REVIEW'));

  const filteredExits = exits.filter(exit => {
    const member = db.members?.find(m => m.memberId === exit.memberId);
    return exit.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (exit.exitRequestId || (exit as any).id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (member?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-4 pb-12 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-700" />
            <span>{isBangla ? 'আগাম প্রস্থান অনুরোধ' : 'Early Exit Requests'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBangla ? 'সদস্যদের আগাম প্রস্থান ও ১৫% সার্ভিস চার্জ প্রযোজ্য আবেদনসমূহ' : 'Early exit requests subject to 15% service charge'}
          </p>
        </div>
        <button
          onClick={() => navigateTo('PENDING_SETTLEMENT_APPROVALS' as any)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          <span>{isBangla ? 'অনুমোদন ড্যাশবোর্ডে যান' : 'Go to Approvals'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
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
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Member Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Request Date</th>
                <th className="px-4 py-3 whitespace-nowrap">Capital</th>
                <th className="px-4 py-3 whitespace-nowrap">Service Charge (15%)</th>
                <th className="px-4 py-3 whitespace-nowrap">Net Refund</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExits.map(exit => {
                const realId = exit.exitRequestId || (exit as any).id;
                const member = db.members?.find(m => m.memberId === exit.memberId);
                const capital = exit.memberCapital || (exit as any).eligibleCapital || exit.eligibleRefundAmount || 0;
                const serviceCharge = exit.serviceChargeAmount || 0;
                const netAmount = exit.netRefundAmount || exit.netSettlementAmount || (capital - serviceCharge);

                return (
                  <tr key={realId} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-emerald-900 whitespace-nowrap">
                      {exit.memberId}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {member?.fullName || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {exit.requestDate || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      ৳{capital.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-rose-600 whitespace-nowrap">
                      ৳{serviceCharge.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-700 whitespace-nowrap">
                      ৳{netAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => navigateTo('PENDING_SETTLEMENT_APPROVALS' as any)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isBangla ? 'অনুমোদন পরিচালনা' : 'Manage Approval'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredExits.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No pending early exit requests found.
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

import React, { useState } from 'react';
import { AppDatabaseState } from '../../services/db';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useApp } from '../../context/AppContext';
import { Download, Eye } from 'lucide-react';
import { SettlementManagerModal } from '../members/SettlementManagerModal';

export const MemberExitReport: React.FC<{ db: AppDatabaseState }> = ({ db }) => {
  const { language } = useApp();
  const isBangla = language === 'bn';
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  const [selectedMemberForExit, setSelectedMemberForExit] = useState<any>(null);

  const exits = db.memberExits || [];
  
  const filteredExits = exits.filter(e => {
    let matches = true;
    if (dateFrom && e.requestDate < dateFrom) matches = false;
    if (dateTo && e.requestDate > dateTo) matches = false;
    if (statusFilter !== 'ALL' && e.status !== statusFilter) matches = false;
    if (typeFilter !== 'ALL' && e.exitType !== typeFilter) matches = false;
    return matches;
  }).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  const totalRefund = filteredExits.reduce((sum, e) => sum + (e.netRefundAmount || 0), 0);
  const totalCharge = filteredExits.reduce((sum, e) => sum + (e.serviceChargeAmount || 0), 0);

  const handleExport = () => {
    // Generate CSV
    const headers = ['Request ID', 'Request Date', 'Member ID', 'Exit Type', 'Status', 'Tenure (Y/M)', 'Original Capital', 'S.Charge %', 'Service Charge', 'Eligible Benefit', 'Net Settlement', 'Approved By', 'Voucher'];
    const rows = filteredExits.map(e => [
      e.exitRequestId,
      e.requestDate,
      e.memberId,
      e.exitType,
      e.status,
      `${e.membershipTenureYears}Y ${e.membershipTenureMonths}M`,
      e.eligibleRefundAmount.toString(),
      e.serviceChargePercentage.toString() + '%',
      e.serviceChargeAmount.toString(),
      (e.eligibleBenefitAmount || 0).toString(),
      (e.netSettlementAmount || e.netRefundAmount).toString(),
      'N/A', // Assuming we don't store approvedBy directly on the request, but we have audit logs. Can leave blank or query audit.
      e.refundVoucherNo || '-'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Member_Exit_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex gap-4">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border-slate-300 rounded-lg p-2 text-sm" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border-slate-300 rounded-lg p-2 text-sm" />
          
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border-slate-300 rounded-lg p-2 text-sm">
            <option value="ALL">All Types</option>
            <option value="NORMAL">Normal Exit</option>
            <option value="EARLY">Early Exit</option>
            <option value="DEATH_SETTLEMENT">Death Settlement</option>
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border-slate-300 rounded-lg p-2 text-sm">
            <option value="ALL">All Statuses</option>
            <option value="NORMAL_EXIT_REQUESTED">Normal Exit Requested</option>
            <option value="EARLY_EXIT_REQUESTED">Early Exit Requested</option>
            <option value="DEATH_REPORTED">Death Reported</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="REFUNDED">Refunded</option>
            <option value="EXITED">Exited</option>
            <option value="DECEASED">Deceased</option>
          </select>
        </div>
        <div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Req ID</th>
              <th className="px-4 py-3">Req Date</th>
              <th className="px-4 py-3">Member Details</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tenure</th>
              <th className="px-4 py-3 text-right">Capital</th>
              <th className="px-4 py-3 text-right">S.Charge %</th>
              <th className="px-4 py-3 text-right">S.Charge</th>
              <th className="px-4 py-3 text-right">Benefit</th>
              <th className="px-4 py-3 text-right">Settlement</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExits.map((e) => {
               const member = db.members.find(m => m.memberId === e.memberId);
               return (
                 <tr key={e.exitRequestId} className="border-b border-slate-100 hover:bg-slate-50">
                   <td className="px-4 py-2 text-xs font-mono text-slate-500">{e.exitRequestId}</td>
                   <td className="px-4 py-2 whitespace-nowrap">{formatDate(e.requestDate)}</td>
                   <td className="px-4 py-2 font-medium">
                     {e.memberId}<br/>
                     <span className="text-xs text-slate-500">{member?.fullName}</span><br/>
                     <span className="text-[10px] text-slate-400">Join: {member ? formatDate(member.joiningDate) : ''}</span>
                   </td>
                   <td className="px-4 py-2">
                     <span className={`px-2 py-1 text-[11px] font-bold rounded-full ${e.exitType === 'EARLY' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                       {e.exitType}
                     </span>
                   </td>
                   <td className="px-4 py-2 text-xs font-medium">
                     <span className="px-2 py-1 bg-slate-100 rounded text-slate-700">{e.status}</span>
                   </td>
                   <td className="px-4 py-2 text-xs whitespace-nowrap">{e.membershipTenureYears}Y {e.membershipTenureMonths}M</td>
                   <td className="px-4 py-2 text-right">{formatCurrency(e.eligibleRefundAmount)}</td>
                   <td className="px-4 py-2 text-right">{e.serviceChargePercentage}%</td>
                   <td className="px-4 py-2 text-right text-rose-600">{e.serviceChargeAmount > 0 ? formatCurrency(e.serviceChargeAmount) : '-'}</td>
                   <td className="px-4 py-2 text-right text-emerald-600">{e.eligibleBenefitAmount ? formatCurrency(e.eligibleBenefitAmount) : '-'}</td>
                   <td className="px-4 py-2 text-right font-bold text-purple-700">{formatCurrency(e.netSettlementAmount || e.netRefundAmount)}</td>
                   <td className="px-4 py-2 text-center">
                     <button
                        onClick={() => member && setSelectedMemberForExit(member)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"
                        title="View / Process"
                     >
                        <Eye className="w-4 h-4" />
                     </button>
                   </td>
                 </tr>
               );
            })}
            {filteredExits.length === 0 && (
              <tr><td colSpan={11} className="text-center py-6 text-slate-500">No exit records found</td></tr>
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
            <tr>
              <td colSpan={6} className="px-4 py-3 text-right text-slate-700">Total:</td>
              <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(filteredExits.reduce((sum, e) => sum + e.eligibleRefundAmount, 0))}</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right text-rose-700">{formatCurrency(totalCharge)}</td>
              <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(filteredExits.reduce((sum, e) => sum + (e.eligibleBenefitAmount || 0), 0))}</td>
              <td className="px-4 py-3 text-right text-purple-700">{formatCurrency(filteredExits.reduce((sum, e) => sum + (e.netSettlementAmount || e.netRefundAmount || 0), 0))}</td>
              <td className="px-4 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {selectedMemberForExit && (
        <SettlementManagerModal 
          member={selectedMemberForExit}
          onClose={() => setSelectedMemberForExit(null)}
        />
      )}
    </div>
  );
};

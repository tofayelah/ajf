import React, { useState, useMemo } from 'react';
import { AppDatabaseState } from '../../services/db';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  DollarSign,
  TrendingDown,
  HeartHandshake
} from 'lucide-react';
import { MemberExitRequest } from '../../types';

interface SettlementReportsContainerProps {
  db: AppDatabaseState;
  reportType?: 'ALL' | 'NORMAL' | 'EARLY' | 'DEATH' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'FINANCIAL';
  onDrillDown?: (item: any) => void;
}

export const SettlementReportsContainer: React.FC<SettlementReportsContainerProps> = ({
  db,
  reportType = 'ALL',
  onDrillDown
}) => {
  const { language } = useApp();
  const isBangla = language === 'bn';

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(
    reportType === 'NORMAL' || reportType === 'EARLY' || reportType === 'DEATH' ? reportType : 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    reportType === 'PENDING' ? 'UNDER_REVIEW' : reportType === 'APPROVED' ? 'APPROVED' : reportType === 'COMPLETED' ? 'SETTLED' : 'ALL'
  );

  const exits = db.memberExits || [];

  const enrichedExits = useMemo(() => {
    return exits.map(exit => {
      const member = db.members?.find(m => m.memberId === exit.memberId);
      const realId = exit.exitRequestId || (exit as any).id;
      const capital = exit.memberCapital || (exit as any).eligibleCapital || exit.eligibleRefundAmount || 0;
      const serviceCharge = (exit as any).serviceChargeDeduction || exit.serviceChargeAmount || 0;
      const netPaid = exit.netRefundAmount || exit.netSettlementAmount || (capital - serviceCharge);
      const welfareBenefit = (exit as any).welfareGrantAmount || 0;

      return {
        ...exit,
        realId,
        memberName: member?.fullName || 'Unknown Member',
        mobile: member?.mobile || '',
        capital,
        serviceCharge,
        netPaid,
        welfareBenefit
      };
    });
  }, [exits, db.members]);

  const filteredExits = useMemo(() => {
    return enrichedExits.filter(exit => {
      if (typeFilter !== 'ALL' && exit.exitType !== typeFilter) return false;
      if (statusFilter !== 'ALL' && exit.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          exit.memberId.toLowerCase().includes(term) ||
          exit.memberName.toLowerCase().includes(term) ||
          (exit.realId || '').toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [enrichedExits, typeFilter, statusFilter, searchTerm]);

  // Key KPI totals for settlement
  const totals = useMemo(() => {
    const totalRequests = enrichedExits.length;
    const pendingCount = enrichedExits.filter(e => ['PENDING', 'UNDER_REVIEW', 'NORMAL_EXIT_REQUESTED', 'EARLY_EXIT_REQUESTED', 'DEATH_REPORTED'].includes(e.status)).length;
    const approvedCount = enrichedExits.filter(e => e.status === 'APPROVED').length;
    const settledCount = enrichedExits.filter(e => ['SETTLED', 'REFUNDED', 'COMPLETED', 'EXITED'].includes(e.status)).length;

    const totalCapital = filteredExits.reduce((s, e) => s + e.capital, 0);
    const totalServiceCharge = filteredExits.reduce((s, e) => s + e.serviceCharge, 0);
    const totalNetPaid = filteredExits.reduce((s, e) => s + e.netPaid, 0);
    const totalWelfare = filteredExits.reduce((s, e) => s + e.welfareBenefit, 0);

    return {
      totalRequests,
      pendingCount,
      approvedCount,
      settledCount,
      totalCapital,
      totalServiceCharge,
      totalNetPaid,
      totalWelfare
    };
  }, [enrichedExits, filteredExits]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center justify-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-700" />
          <span>
            {reportType === 'FINANCIAL'
              ? (isBangla ? 'সদস্য নিষ্পত্তি আর্থিক বিবরণী (Settlement Financial Report)' : 'Settlement Financial Report')
              : (isBangla ? 'সদস্য প্রস্থান ও নিষ্পত্তি প্রতিবেদন (Settlement Reports)' : 'Settlement Reports')}
          </span>
        </h2>
        <p className="text-xs text-slate-500">
          {isBangla
            ? 'সাধারণ প্রস্থান, আগাম প্রস্থান, মৃত্যু নিষ্পত্তি, সার্ভিস চার্জ ও চূড়ান্ত অর্থ পরিশোধের হিসাব'
            : 'Comprehensive member settlement analysis, service charge deductions, and net payouts'}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            {isBangla ? 'মোট মূলধন স্থিতি' : 'Total Capital Settlement'}
          </span>
          <span className="text-base font-black text-slate-900 font-mono">
            ৳{totals.totalCapital.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            {isBangla ? 'কর্তনকৃত সার্ভিস চার্জ' : 'Service Charge'}
          </span>
          <span className="text-base font-black text-amber-700 font-mono">
            ৳{totals.totalServiceCharge.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            {isBangla ? 'কল্যাণ অনুদান প্রদান' : 'Welfare Grant Paid'}
          </span>
          <span className="text-base font-black text-purple-700 font-mono">
            ৳{totals.totalWelfare.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            {isBangla ? 'মোট প্রদেয় পরিশোধ' : 'Net Settlement Paid'}
          </span>
          <span className="text-base font-black text-emerald-800 font-mono">
            ৳{totals.totalNetPaid.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 text-xs hide-print">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={isBangla ? 'সদস্য আইডি, নাম বা রিকোয়েস্ট আইডি...' : 'Search member ID, name, request ID...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg"
        >
          <option value="ALL">{isBangla ? 'সকল প্রস্থান ধরণ' : 'All Exit Types'}</option>
          <option value="NORMAL">Normal Exit (সাধারণ প্রস্থান)</option>
          <option value="EARLY">Early Exit (আগাম প্রস্থান)</option>
          <option value="DEATH">Death Settlement (মৃত্যুজনিত নিষ্পত্তি)</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg"
        >
          <option value="ALL">{isBangla ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
          <option value="UNDER_REVIEW">Under Review / Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="SETTLED">Settled / Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Settlements Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3 w-24">{isBangla ? 'আইডি' : 'Member ID'}</th>
              <th className="p-3">{isBangla ? 'সদস্য নাম' : 'Member Name'}</th>
              <th className="p-3 w-28">{isBangla ? 'প্রস্থান ধরণ' : 'Type'}</th>
              <th className="p-3 w-24">{isBangla ? 'তারিখ' : 'Date'}</th>
              <th className="p-3 text-right">{isBangla ? 'মূলধন স্থিতি (৳)' : 'Capital (৳)'}</th>
              <th className="p-3 text-right">{isBangla ? 'সার্ভিস চার্জ (৳)' : 'Service Charge (৳)'}</th>
              <th className="p-3 text-right">{isBangla ? 'পরিশোধিত অর্থ (৳)' : 'Net Settlement (৳)'}</th>
              <th className="p-3 w-24 text-center">{isBangla ? 'অবস্থা' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExits.map(exit => (
              <tr key={exit.realId} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-mono font-bold text-indigo-700">{exit.memberId}</td>
                <td className="p-3">
                  <div className="font-semibold text-slate-900">{exit.memberName}</div>
                  <span className="text-[10px] text-slate-400 font-mono">Req: {exit.realId}</span>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      exit.exitType === 'NORMAL'
                        ? 'bg-emerald-100 text-emerald-800'
                        : exit.exitType === 'EARLY'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {exit.exitType}
                  </span>
                </td>
                <td className="p-3 font-mono text-slate-600">
                  {exit.refundProcessDate || (exit as any).exitDate || exit.requestDate || 'N/A'}
                </td>
                <td className="p-3 text-right font-mono text-slate-800">
                  ৳{exit.capital.toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono text-amber-700">
                  ৳{exit.serviceCharge.toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono font-bold text-emerald-800">
                  ৳{exit.netPaid.toLocaleString()}
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {exit.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredExits.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  {isBangla ? 'কোনো নিষ্পত্তি রেকর্ড পাওয়া যায়নি।' : 'No settlement records found.'}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-50 font-black border-t-2 border-slate-200 text-slate-900 text-xs">
            <tr>
              <td colSpan={4} className="p-3 text-right uppercase">
                {isBangla ? 'সর্বমোট:' : 'Total:'}
              </td>
              <td className="p-3 text-right font-mono text-emerald-950">
                ৳{totals.totalCapital.toLocaleString()}
              </td>
              <td className="p-3 text-right font-mono text-amber-950">
                ৳{totals.totalServiceCharge.toLocaleString()}
              </td>
              <td className="p-3 text-right font-mono text-emerald-950">
                ৳{totals.totalNetPaid.toLocaleString()}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

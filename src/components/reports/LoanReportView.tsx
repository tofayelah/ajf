import React, { useState, useMemo } from 'react';
import { AppDatabaseState } from '../../services/db';
import { useApp } from '../../context/AppContext';
import { Briefcase, Search, Filter, Calendar, DollarSign, TrendingUp, Eye } from 'lucide-react';

interface LoanReportViewProps {
  db: AppDatabaseState;
  reportType?: 'LOANS' | 'INVESTMENTS';
  onDrillDown?: (item: any) => void;
}

export const LoanReportView: React.FC<LoanReportViewProps> = ({
  db,
  reportType = 'LOANS',
  onDrillDown
}) => {
  const { language } = useApp();
  const isBangla = language === 'bn';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loans = db.loans || [];
  const loanRepayments = db.loanRepayments || [];
  const investments = db.investments || [];

  // Loans summary
  const enrichedLoans = useMemo(() => {
    return loans.map(l => {
      const repayments = loanRepayments.filter(r => r.loanId === l.loanId);
      const totalRepaidPrincipal = repayments.reduce((s, r) => s + (r.principalAmount || 0), 0);
      const totalRepaidProfit = repayments.reduce((s, r) => s + (r.profitOrCharge || 0), 0);
      const outstandingPrincipal = Math.max(0, (l.approvedAmount || l.requestedAmount || 0) - totalRepaidPrincipal);

      const member = db.members?.find(m => m.memberId === l.memberId);

      return {
        ...l,
        memberName: member?.fullName || l.memberName || 'Unknown',
        totalRepaidPrincipal,
        totalRepaidProfit,
        outstandingPrincipal
      };
    });
  }, [loans, loanRepayments, db.members]);

  const filteredLoans = useMemo(() => {
    return enrichedLoans.filter(l => {
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          l.loanId.toLowerCase().includes(term) ||
          l.memberId.toLowerCase().includes(term) ||
          l.memberName.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [enrichedLoans, statusFilter, searchTerm]);

  const enrichedInvestments = useMemo(() => {
    return investments.map(inv => {
      const principal = inv.originalPrincipal || inv.investmentAmount || 0;
      const profit = inv.profit || inv.actualReturn || 0;
      const title = inv.projectName || inv.description || inv.investmentId;
      const partner = inv.partner || '';
      return {
        ...inv,
        principal,
        profit,
        title,
        partner
      };
    });
  }, [investments]);

  const filteredInvestments = useMemo(() => {
    return enrichedInvestments.filter(inv => {
      if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          inv.investmentId.toLowerCase().includes(term) ||
          inv.title.toLowerCase().includes(term) ||
          inv.partner.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [enrichedInvestments, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center justify-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-700" />
          <span>
            {reportType === 'LOANS'
              ? (isBangla ? 'ঋণ রেজিস্টার ও আদায় প্রতিবেদন (Loan Register & Repayments)' : 'Loan Register & Repayments')
              : (isBangla ? 'বিনিয়োগ ও প্রকল্প প্রতিবেদন (Investment & Profit Register)' : 'Investment & Profit Register')}
          </span>
        </h2>
        <p className="text-xs text-slate-500">
          {isBangla
            ? 'বিতরণকৃত ঋণ, অনাদায়ী মূলধন, কিস্তি পরিশোধ এবং বিনিয়োগের লাভ-লোকসান বিশ্লেষণ'
            : 'Loan disbursement tracking, outstanding principals, and investment portfolio returns'}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 text-xs hide-print">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={isBangla ? 'অনুসন্ধান করুন...' : 'Search...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg"
        >
          <option value="ALL">{isBangla ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
          <option value="ACTIVE">ACTIVE / DISBURSED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="PENDING">PENDING</option>
          <option value="CLOSED">COMPLETED / CLOSED</option>
        </select>
      </div>

      {reportType === 'LOANS' ? (
        /* Loans Table */
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-24">{isBangla ? 'ঋণ আইডি' : 'Loan ID'}</th>
                <th className="p-3">{isBangla ? 'সদস্য নাম ও আইডি' : 'Member'}</th>
                <th className="p-3 w-24">{isBangla ? 'বিতরণ তারিখ' : 'Disbursed'}</th>
                <th className="p-3 text-right">{isBangla ? 'বিতরণকৃত মূলধন (৳)' : 'Principal (৳)'}</th>
                <th className="p-3 text-right">{isBangla ? 'পরিশোধিত আসল (৳)' : 'Repaid Principal (৳)'}</th>
                <th className="p-3 text-right">{isBangla ? 'অনাদায়ী স্থিতি (৳)' : 'Outstanding (৳)'}</th>
                <th className="p-3 w-20 text-center">{isBangla ? 'অবস্থা' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.map(l => (
                <tr key={l.loanId} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-indigo-700">{l.loanId}</td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{l.memberName}</div>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {l.memberId}</span>
                  </td>
                  <td className="p-3 font-mono text-slate-600">{l.disbursementDate || l.applicationDate || 'N/A'}</td>
                  <td className="p-3 text-right font-mono font-semibold text-slate-800">
                    ৳{(l.approvedAmount || l.requestedAmount || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-800">
                    ৳{l.totalRepaidPrincipal.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-rose-800">
                    ৳{l.outstandingPrincipal.toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLoans.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {isBangla ? 'কোনো ঋণ রেকর্ড পাওয়া যায়নি।' : 'No loan records found.'}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-black border-t-2 border-slate-200 text-slate-900 text-xs">
              <tr>
                <td colSpan={3} className="p-3 text-right uppercase">
                  {isBangla ? 'সর্বমোট:' : 'Total:'}
                </td>
                <td className="p-3 text-right font-mono text-emerald-950">
                  ৳{filteredLoans.reduce((s, l) => s + (l.approvedAmount || l.requestedAmount || 0), 0).toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono text-emerald-950">
                  ৳{filteredLoans.reduce((s, l) => s + l.totalRepaidPrincipal, 0).toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono text-rose-800">
                  ৳{filteredLoans.reduce((s, l) => s + l.outstandingPrincipal, 0).toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* Investments Table */
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-28">{isBangla ? 'প্রকল্প কোড' : 'Project Code'}</th>
                <th className="p-3">{isBangla ? 'প্রকল্পের নাম ও অংশীদার' : 'Project Title & Partner'}</th>
                <th className="p-3 w-24">{isBangla ? 'শুরুর তারিখ' : 'Start Date'}</th>
                <th className="p-3 text-right">{isBangla ? 'বিনিয়োগ মূলধন (৳)' : 'Capital (৳)'}</th>
                <th className="p-3 text-right">{isBangla ? 'প্রাপ্ত মুনাফা (৳)' : 'Profit Received (৳)'}</th>
                <th className="p-3 w-20 text-center">{isBangla ? 'অবস্থা' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvestments.map(inv => (
                <tr key={inv.investmentId} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-indigo-700">{inv.investmentId}</td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{inv.title}</div>
                    <span className="text-[10px] text-slate-400">{inv.partner || 'Direct'}</span>
                  </td>
                  <td className="p-3 font-mono text-slate-600">{inv.investmentDate}</td>
                  <td className="p-3 text-right font-mono font-semibold text-slate-800">
                    ৳{inv.principal.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-800">
                    ৳{inv.profit.toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredInvestments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {isBangla ? 'কোনো বিনিয়োগ রেকর্ড পাওয়া যায়নি।' : 'No investment projects found.'}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-black border-t-2 border-slate-200 text-slate-900 text-xs">
              <tr>
                <td colSpan={3} className="p-3 text-right uppercase">
                  {isBangla ? 'সর্বমোট:' : 'Total:'}
                </td>
                <td className="p-3 text-right font-mono text-emerald-950">
                  ৳{filteredInvestments.reduce((s, i) => s + i.principal, 0).toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono text-emerald-950">
                  ৳{filteredInvestments.reduce((s, i) => s + i.profit, 0).toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

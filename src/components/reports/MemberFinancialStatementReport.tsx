import React, { useState, useMemo } from 'react';
import { AppDatabaseState } from '../../services/db';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Search,
  Filter,
  CreditCard,
  PieChart,
  Calendar,
  Eye,
  FileSpreadsheet,
  DollarSign
} from 'lucide-react';
import { AccountingService } from '../../services/accounting';

interface MemberFinancialStatementReportProps {
  db: AppDatabaseState;
  reportType?: 'STATEMENT' | 'REGISTER' | 'CAPITAL' | 'COLLECTION' | 'DUE' | 'PROFIT';
  onDrillDown?: (item: any) => void;
}

export const MemberFinancialStatementReport: React.FC<MemberFinancialStatementReportProps> = ({
  db,
  reportType = 'STATEMENT',
  onDrillDown
}) => {
  const { language } = useApp();
  const isBangla = language === 'bn';

  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const members = db.members || [];
  const collections = db.collections || [];
  const capitalDeposits = db.capitalDeposits || [];
  const memberLedgers = db.memberLedgers || [];
  const historicalProfits = db.historicalProfits || [];

  // Member summaries
  const memberSummaries = useMemo(() => {
    return members.map(m => {
      const memberCollections = collections.filter(c => c.memberId === m.memberId);
      const totalCollections = memberCollections.reduce((s, c) => s + (c.paidAmount || c.totalPayable || 0), 0);
      const monthlyFees = memberCollections.reduce((s, c) => s + (c.monthlyAmount || 0), 0);

      const memberCapitals = capitalDeposits.filter(cd => cd.memberId === m.memberId);
      const directCapital = memberCapitals.reduce((s, cd) => s + (cd.amount || 0), 0);
      const standardCapital = db.settings.capitalDeposit || 20000;
      const totalCapital = directCapital > 0 ? directCapital : standardCapital;

      const dueInfo = AccountingService.calculateMemberDue(
        m,
        collections,
        db.settings.monthlyContribution || 1000,
        db.settings.lateFine || 20,
        db.settings.latePaymentDay || 10
      );
      const totalDue = dueInfo.totalDueAmount || 0;
      const dueMonths = dueInfo.monthsDueCount || 0;

      return {
        ...m,
        totalCollections,
        monthlyFees,
        shareCapital: standardCapital,
        directCapital,
        totalCapital,
        totalDue,
        dueMonths
      };
    });
  }, [members, collections, capitalDeposits, db.settings]);

  const filteredMembers = useMemo(() => {
    return memberSummaries.filter(m => {
      if (selectedMemberId !== 'ALL' && m.memberId !== selectedMemberId) return false;
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          m.memberId.toLowerCase().includes(term) ||
          m.fullName.toLowerCase().includes(term) ||
          (m.mobile || '').includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [memberSummaries, selectedMemberId, statusFilter, searchTerm]);

  // Single Member Statement Detail
  const singleMemberLedger = useMemo(() => {
    if (selectedMemberId === 'ALL') return [];
    return memberLedgers
      .filter(l => l.memberId === selectedMemberId)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [memberLedgers, selectedMemberId]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center justify-center gap-2">
          <Users className="w-5 h-5 text-indigo-700" />
          <span>
            {reportType === 'CAPITAL'
              ? (isBangla ? 'সদস্য মূলধন রেজিস্টার ও স্থিতি (Capital Register)' : 'Member Capital Register')
              : reportType === 'DUE'
              ? (isBangla ? 'বকেয়া ও ডিউ এজিং প্রতিবেদন (Due Report)' : 'Member Due & Aging Report')
              : reportType === 'COLLECTION'
              ? (isBangla ? 'চাঁদা আদায় বিবরণী (Collection Statement)' : 'Member Collection Statement')
              : reportType === 'PROFIT'
              ? (isBangla ? 'সদস্য লভ্যাংশ বণ্টন বিবরণী (Profit Distribution)' : 'Member Profit Distribution')
              : (isBangla ? 'সদস্য আর্থিক বিবরণী ও খতিয়ান (Member Financial Statement)' : 'Member Financial Statement')}
          </span>
        </h2>
        <p className="text-xs text-slate-500">
          {isBangla
            ? 'সদস্যভিত্তিক মূলধন জমা, মাসিক চাঁদা, তহবিল অনুদান এবং বকেয়া বিশ্লেষণ'
            : 'Comprehensive member equity balances, monthly contributions, and ledger accounts'}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs hide-print">
        <div>
          <label className="block text-slate-500 font-bold mb-1">
            {isBangla ? 'সদস্য নির্বাচন করুন' : 'Select Member'}
          </label>
          <select
            value={selectedMemberId}
            onChange={e => setSelectedMemberId(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg p-1.5"
          >
            <option value="ALL">{isBangla ? 'সকল সদস্য (All Members)' : 'All Members'}</option>
            {members.map(m => (
              <option key={m.memberId} value={m.memberId}>
                {m.memberId} - {m.fullName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-500 font-bold mb-1">
            {isBangla ? 'সদস্য অবস্থা (Status)' : 'Status'}
          </label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg p-1.5"
          >
            <option value="ALL">{isBangla ? 'সকল' : 'All'}</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="EXITED">Exited / Settled</option>
            <option value="DECEASED">Deceased</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-500 font-bold mb-1">
            {isBangla ? 'অনুসন্ধান' : 'Search'}
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              placeholder={isBangla ? 'নাম, আইডি বা মোবাইল নং...' : 'Name, ID or mobile...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* If single member selected, display summary card */}
      {selectedMemberId !== 'ALL' && (
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {(() => {
            const m = memberSummaries.find(x => x.memberId === selectedMemberId);
            if (!m) return null;
            return (
              <>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    {isBangla ? 'সদস্য নাম' : 'Member Name'}
                  </span>
                  <span className="font-bold text-slate-900">{m.fullName}</span>
                  <span className="text-[10px] font-mono text-indigo-700 block">ID: {m.memberId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    {isBangla ? 'মোট মূলধন জমা' : 'Total Capital'}
                  </span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    ৳{m.totalCapital.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    {isBangla ? 'মোট চাঁদা জমা' : 'Total Collection'}
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    ৳{m.totalCollections.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    {isBangla ? 'বর্তমান বকেয়া' : 'Total Due'}
                  </span>
                  <span className={`font-mono font-bold text-sm ${m.totalDue > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                    ৳{m.totalDue.toLocaleString()}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Member Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3 w-20">{isBangla ? 'সদস্য নং' : 'Member ID'}</th>
              <th className="p-3">{isBangla ? 'সদস্যের নাম ও মোবাইল' : 'Member Name & Mobile'}</th>
              <th className="p-3 text-right">{isBangla ? 'শেয়ার মূলধন (৳)' : 'Share Capital'}</th>
              <th className="p-3 text-right">{isBangla ? 'সরাসরি মূলধন (৳)' : 'Direct Capital'}</th>
              <th className="p-3 text-right">{isBangla ? 'মোট মূলধন (৳)' : 'Total Capital'}</th>
              <th className="p-3 text-right">{isBangla ? 'চাঁদা আদায় (৳)' : 'Collection'}</th>
              <th className="p-3 text-right">{isBangla ? 'বকেয়া (৳)' : 'Due'}</th>
              <th className="p-3 w-20 text-center">{isBangla ? 'অবস্থা' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMembers.map(m => (
              <tr key={m.memberId} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-mono font-bold text-indigo-700">{m.memberId}</td>
                <td className="p-3">
                  <div className="font-semibold text-slate-900">{m.fullName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{m.mobile || 'No Mobile'}</div>
                </td>
                <td className="p-3 text-right font-mono text-slate-700">
                  ৳{m.shareCapital.toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono text-slate-700">
                  ৳{m.directCapital.toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono font-bold text-emerald-800">
                  ৳{m.totalCapital.toLocaleString()}
                </td>
                <td className="p-3 text-right font-mono text-slate-700">
                  ৳{m.totalCollections.toLocaleString()}
                </td>
                <td className={`p-3 text-right font-mono font-bold ${m.totalDue > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                  {m.totalDue > 0 ? `৳${m.totalDue.toLocaleString()}` : '-'}
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : m.status === 'EXITED'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  {isBangla ? 'কোনো সদস্য রেকর্ড পাওয়া যায়নি।' : 'No member records found.'}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-50 font-black border-t-2 border-slate-200 text-slate-900 text-xs">
            <tr>
              <td colSpan={2} className="p-3 text-right uppercase">
                {isBangla ? 'সর্বমোট:' : 'Total:'}
              </td>
              <td className="p-3 text-right font-mono text-emerald-950">
                ৳{filteredMembers.reduce((s, m) => s + m.shareCapital, 0).toLocaleString()}
              </td>
              <td className="p-3 text-right font-mono text-emerald-950">
                ৳{filteredMembers.reduce((s, m) => s + m.directCapital, 0).toLocaleString()}
              </td>
              <td className="p-3 text-right font-mono text-emerald-950">
                ৳{filteredMembers.reduce((s, m) => s + m.totalCapital, 0).toLocaleString()}
              </td>
              <td className="p-3 text-right font-mono text-emerald-950">
                ৳{filteredMembers.reduce((s, m) => s + m.totalCollections, 0).toLocaleString()}
              </td>
              <td className="p-3 text-right font-mono text-rose-800">
                ৳{filteredMembers.reduce((s, m) => s + m.totalDue, 0).toLocaleString()}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

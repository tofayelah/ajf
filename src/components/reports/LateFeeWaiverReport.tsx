import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AppDatabaseState } from '../../services/db';
import { LateFeeWaiver } from '../../types';
import { Search, Filter, ShieldCheck, Printer, Download, UserCheck, Calendar } from 'lucide-react';
import { PdfService } from '../../services/pdfService';
import { ExcelService } from '../../services/excelService';

interface Props {
  db: AppDatabaseState;
}

export const LateFeeWaiverReport: React.FC<Props> = ({ db }) => {
  const { language, activeUser } = useApp();
  const isBangla = language === 'bn';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVERSED'>('ALL');

  // Filter waivers based on user role and filters
  const waivers: LateFeeWaiver[] = useMemo(() => {
    const raw = db.lateFeeWaivers || [];
    return raw.filter(w => {
      // Role protection
      if (activeUser?.role === 'MEMBER' && w.memberId !== activeUser.linkedMemberId) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && w.status !== statusFilter) {
        return false;
      }

      // Month filter
      if (selectedMonth && w.collectionMonth !== selectedMonth) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const mObj = (db.members || []).find(m => m.memberId === w.memberId);
        const name = (w.memberName || mObj?.fullName || '').toLowerCase();
        const mId = (w.memberId || '').toLowerCase();
        const rNo = (w.receiptNo || '').toLowerCase();
        const appBy = (w.approvedBy || '').toLowerCase();
        if (!name.includes(q) && !mId.includes(q) && !rNo.includes(q) && !appBy.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [db.lateFeeWaivers, db.members, activeUser, statusFilter, selectedMonth, searchTerm]);

  // Aggregate stats
  const totalWaivedAmount = useMemo(() => {
    return waivers.filter(w => w.status === 'ACTIVE').reduce((sum, w) => sum + (Number(w.waivedAmount) || 0), 0);
  }, [waivers]);

  const uniqueMembersCount = useMemo(() => {
    return new Set(waivers.filter(w => w.status === 'ACTIVE').map(w => w.memberId)).size;
  }, [waivers]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const data = waivers.map((w, idx) => ({
      'SL': idx + 1,
      'Waiver Date': w.waiverDate,
      'Member ID': w.memberId,
      'Member Name': w.memberName,
      'Collection Month': w.collectionMonth,
      'Calculated Late Fee': w.calculatedLateFee,
      'Waived Amount': w.waivedAmount,
      'Receipt No': w.receiptNo,
      'Approved By': w.approvedBy,
      'Reason / Remarks': w.reason || w.remarks,
      'Status': w.status
    }));
    ExcelService.exportToExcel(data, `Late_Fee_Waiver_Report_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            {isBangla ? 'বিলম্ব ফি মওকুফ রেজিস্টার ও রিপোর্ট' : 'Late Fee Waiver Register & Report'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isBangla 
              ? 'বকেয়া আদায়কালীন অনুমোদিত বিলম্ব ফি মওকুফের অডিট ও হিসাব প্রতিবেদন (অ-নগদ আয়/জিরো রিমেইনিং ব্যালেন্স)'
              : 'Audit & financial register of approved late fee waivers during bulk/due collections'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            {isBangla ? 'প্রিন্ট' : 'Print'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            {isBangla ? 'মোট মওকুফকৃত জরিমানা' : 'Total Waived Late Fees'}
          </span>
          <span className="text-2xl font-black text-amber-600">
            ৳{totalWaivedAmount.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 block mt-1">
            {isBangla ? 'সক্রিয় মওকুফ রেকর্ড' : 'Active waiver records'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            {isBangla ? 'উপকৃত সদস্য সংখ্যা' : 'Benefited Members'}
          </span>
          <span className="text-2xl font-black text-slate-800">
            {uniqueMembersCount} {isBangla ? 'জন' : ''}
          </span>
          <span className="text-xs text-slate-400 block mt-1">
            {isBangla ? 'অনন্য সদস্য আইডি' : 'Unique Member IDs'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            {isBangla ? 'মোট মওকুফ এন্ট্রি' : 'Total Waiver Entries'}
          </span>
          <span className="text-2xl font-black text-slate-800">
            {waivers.length} {isBangla ? 'টি' : ''}
          </span>
          <span className="text-xs text-slate-400 block mt-1">
            {isBangla ? 'ফিল্টারকৃত তালিকা অনুযায়ী' : 'According to active filters'}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isBangla ? 'সদস্য নাম, আইডি বা রসিদ নং খুঁজুন...' : 'Search member name, ID or receipt...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">{isBangla ? 'সকল স্ট্যাটাস' : 'All Statuses'}</option>
            <option value="ACTIVE">{isBangla ? 'সক্রিয় (ACTIVE)' : 'Active'}</option>
            <option value="REVERSED">{isBangla ? 'রিভার্সড/বাতিল (REVERSED)' : 'Reversed'}</option>
          </select>
        </div>

        <div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Waiver Register Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">{isBangla ? 'তারিখ' : 'Date'}</th>
                <th className="p-3">{isBangla ? 'সদস্য আইডি ও নাম' : 'Member ID & Name'}</th>
                <th className="p-3">{isBangla ? 'মাস' : 'Month'}</th>
                <th className="p-3 text-right">{isBangla ? 'ধার্যকৃত জরিমানা' : 'Calculated Fee'}</th>
                <th className="p-3 text-right">{isBangla ? 'মওকুফ পরিমাণ' : 'Waived Amount'}</th>
                <th className="p-3">{isBangla ? 'রসিদ নং' : 'Receipt No'}</th>
                <th className="p-3">{isBangla ? 'অনুমোদনকারী' : 'Approved By'}</th>
                <th className="p-3">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {waivers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    {isBangla ? 'কোনো বিলম্ব ফি মওকুফের রেকর্ড পাওয়া যায়নি।' : 'No late fee waiver records found.'}
                  </td>
                </tr>
              ) : (
                waivers.map((w, idx) => {
                  const mObj = (db.members || []).find(m => m.memberId === w.memberId);
                  const isReversed = w.status === 'REVERSED';
                  return (
                    <tr key={w.waiverId || idx} className={`hover:bg-slate-50 ${isReversed ? 'bg-rose-50/50 opacity-60' : ''}`}>
                      <td className="p-3 text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono">{w.waiverDate}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{w.memberName || mObj?.fullName || w.memberId}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{w.memberId}</div>
                      </td>
                      <td className="p-3 font-mono">{w.collectionMonth}</td>
                      <td className="p-3 text-right font-mono text-slate-500">৳{(w.calculatedLateFee || 0).toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-600">৳{(w.waivedAmount || 0).toLocaleString()}</td>
                      <td className="p-3 font-mono text-indigo-600">{w.receiptNo}</td>
                      <td className="p-3 text-slate-600">{w.approvedBy || 'System Admin'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          w.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {waivers.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                <tr>
                  <td colSpan={4} className="p-3 text-right">{isBangla ? 'সর্বমোট সক্রিয় মওকুফ:' : 'Total Active Waived:'}</td>
                  <td className="p-3 text-right font-mono text-slate-600">
                    ৳{waivers.filter(w => w.status === 'ACTIVE').reduce((s, w) => s + (w.calculatedLateFee || 0), 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-600">
                    ৳{totalWaivedAmount.toLocaleString()}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

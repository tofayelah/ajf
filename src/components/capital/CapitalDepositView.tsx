import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod } from '../../types';
import { PdfService } from '../../services/pdfService';
import { validateFyGuard } from '../../utils/fyGuard';
import {
  PiggyBank,
  Search,
  PlusCircle,
  Printer,
  Download,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const CapitalDepositView: React.FC = () => {
  const { db, postCapitalDeposit, language, activeUser, canAccessMember } = useApp();
  const isBangla = language === 'bn';

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    (db.members || []).find(m => canAccessMember(m.memberId))?.memberId || ''
  );
  const [amount, setAmount] = useState<number>(db.settings.capitalDeposit);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [transactionNo, setTransactionNo] = useState('');
  const [remarks, setRemarks] = useState('সদস্য মূলধন তহবিলে জমা');
  const [searchTerm, setSearchTerm] = useState('');

  const totalCapital = (activeUser?.role === 'MEMBER' ? (db.capitalDeposits || []).filter(c => c.memberId === activeUser.linkedMemberId) : (db.capitalDeposits || [])).filter(c => c.status === 'ACTIVE')
    .reduce((sum, c) => sum + c.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    const _checkDate = new Date().toISOString().split('T')[0];
    if (!validateFyGuard(_checkDate, db, isBangla)) return;

    e.preventDefault();
        if (!selectedMemberId || amount <= 0) return;
    if (!canAccessMember(selectedMemberId)) {
        alert(isBangla ? 'এই তথ্য দেখার অনুমতি আপনার নেই।' : 'You do not have permission.');
        return;
    }

    postCapitalDeposit({
      memberId: selectedMemberId,
      amount,
      paymentMethod,
      transactionNo: transactionNo || `CAP-TXN-${Date.now()}`,
      remarks
    });

    setIsDepositModalOpen(false);
  };

  const filteredDeposits = ((activeUser?.role === 'MEMBER' ? (db.capitalDeposits || []).filter(c => c.memberId === activeUser.linkedMemberId) : (db.capitalDeposits || [])) || []).filter(c => {
    return (
      (c.voucherNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.memberName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.memberId || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handlePrint = () => {
    PdfService.printElement('printable-capital-register', 'Capital_Fund_Register');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'সদস্য মূলধন তহবিল (Member Capital Fund)' : 'Member Capital Deposits'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'গঠনতন্ত্র অনুযায়ী সদস্য প্রতি নির্ধারিত স্থায়ী ফেরতযোগ্য মূলধন তহবিল'
              : 'Society Capital Pool & Member Equity'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{isBangla ? 'প্রিন্ট' : 'Print'}</span>
          </button>
          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isBangla ? '+ মূলধন জমা এন্ট্রি' : '+ Deposit Capital'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">সর্বমোট মূলধন তহবিল</span>
          <span className="text-2xl font-black text-indigo-900">৳{totalCapital?.toLocaleString()}</span>
          <span className="text-[11px] text-slate-500 block mt-1">
            মোট {((activeUser?.role === 'MEMBER' ? (db.capitalDeposits || []).filter(c => c.memberId === activeUser.linkedMemberId) : (db.capitalDeposits || [])) || []).length} টি সফল ডিপোজিট ভাউচার
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">নির্ধারিত সদস্য শেয়ার</span>
          <span className="text-2xl font-bold text-slate-800">
            ৳{db.settings.capitalDeposit?.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">প্রতি সদস্যের জন্য প্রযোজ্য</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">মোট অংশীদার সদস্য</span>
          <span className="text-2xl font-bold text-emerald-800">{(db.members || []).length} জন</span>
          <span className="text-[11px] text-slate-500 block mt-1">অনুমোদিত ভোটার সদস্য</span>
        </div>
      </div>

      {/* Register Table */}
      <div id="printable-capital-register" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <h3 className="font-bold text-sm text-slate-900">
            {isBangla ? 'মূলধন জমা রেজিস্টার (Capital Register)' : 'Capital Deposit Register'}
          </h3>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="ভাউচার, সদস্য নাম বা আইডি..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3">ভাউচার নং</th>
                <th className="p-3">তারিখ</th>
                <th className="p-3">সদস্য আইডি</th>
                <th className="p-3">সদস্যের নাম</th>
                <th className="p-3">পরিশোধের মাধ্যম</th>
                <th className="p-3">মন্তব্য / রেফারেন্স</th>
                <th className="p-3 text-right">পরিমাণ (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    কোনো মূলধন জমার তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredDeposits.map(c => (
                  <tr key={c.depositId} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {c.voucherNo}
                    </td>
                    <td className="p-3 font-mono text-[11px] whitespace-nowrap">{c.date}</td>
                    <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {c.memberId}
                    </td>
                    <td className="p-3 font-medium text-slate-900 whitespace-nowrap">{c.memberName}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                        {c.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">{c.remarks || '-'}</td>
                    <td className="p-3 text-right font-black text-indigo-900 font-mono whitespace-nowrap">
                      ৳{c.amount?.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Capital Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">নতুন মূলধন জমা ভাউচার</h3>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">সদস্য নির্বাচন করুন *</label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={e => setSelectedMemberId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  {(db.members || []).filter(m => canAccessMember(m.memberId)).map(m => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.memberId} - {m.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">মূলধন জমার পরিমাণ (টাকা) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold font-mono text-indigo-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">পরিশোধের মাধ্যম</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="Cash">নগদ (Cash in Hand)</option>
                  <option value="Bank">ব্যাংক ডিপোজিট</option>
                  <option value="Mobile Banking">মোবাইল ব্যাংকিং</option>
                  <option value="Other">অন্যান্য</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ট্রানজেকশন / স্লিপ নং</label>
                <input
                  type="text"
                  placeholder="ঐচ্ছিক ডিপোজিট রেফারেন্স"
                  value={transactionNo}
                  onChange={e => setTransactionNo(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
                >
                  জমা নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

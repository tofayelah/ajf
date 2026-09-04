import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Collection } from '../../types';
import { PdfService } from '../../services/pdfService';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Share2,
  FileText
} from 'lucide-react';
import { AJFLogo } from '../common/AJFLogo';

interface ReceiptModalProps {
  receiptNo: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receiptNo, isOpen, onClose }) => {
  const { db, language, reverseCollection, activeUser } = useApp();
  const isBangla = language === 'bn';

  const [receiptFormat, setReceiptFormat] = useState<'A4' | 'POS'>('A4');
  const [isReversalDialogOpen, setIsReversalDialogOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');

  const matchingCollections = (db.collections || []).filter(c => c.receiptNo === receiptNo);
  if (!isOpen || matchingCollections.length === 0) return null;

  const isBulk = matchingCollections.length > 1;
  const collection = matchingCollections[0];
  const member = (db.members || []).find(m => m.memberId === collection.memberId);

  const totalMonthlyAmount = matchingCollections.reduce((sum, c) => sum + (c.monthlyAmount || 0), 0);
  const totalLateFine = matchingCollections.reduce((sum, c) => sum + (c.lateFine || 0), 0);
  const totalDiscount = matchingCollections.reduce((sum, c) => sum + (c.discount || 0), 0);
  const totalPayable = matchingCollections.reduce((sum, c) => sum + (c.totalPayable || 0), 0);
  const totalPaidAmount = matchingCollections.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const totalCurrentDue = matchingCollections.reduce((sum, c) => sum + (c.currentDue || 0), 0);
  const isAnyLateFeeWaived = matchingCollections.some(c => c.lateFeeWaived || c.late_fee_waived);
  const sortedMonths = matchingCollections.map(c => c.collectionMonth).sort();

  const handlePrint = () => {
    PdfService.printElement('printable-money-receipt', `Receipt_${collection.receiptNo}`);
  };

  const handleExportPdf = () => {
    PdfService.exportToPdf('printable-money-receipt', `AJ_Receipt_${collection.receiptNo}.pdf`);
  };

  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalReason.trim()) return;
    
    try {
      const res = await reverseCollection(collection.receiptNo, reversalReason.trim(), activeUser?.username || 'System');
      if (res && res.success) {
        alert('রসিদটি সফলভাবে রিভার্স/বাতিল করা হয়েছে।');
      } else {
        alert('রিভার্স করতে সমস্যা হয়েছে: ' + (res?.message || 'অজানা ত্রুটি'));
      }
    } catch (err: any) {
      alert('ত্রুটি: ' + err.message);
    }
    
    setIsReversalDialogOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="bg-emerald-800 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {isBangla ? 'টাকা জমার অফিসিয়াল মানি রসিদ (Money Receipt)' : 'Official Money Receipt'}
              </h3>
              <p className="text-[11px] font-mono text-emerald-200">
                {collection.receiptNo} {isBulk && `(${matchingCollections.length} মাসের এককালীন আদায়)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Toggle */}
            <div className="bg-emerald-900/70 p-0.5 rounded-lg flex text-[10px] font-bold">
              <button
                onClick={() => setReceiptFormat('A4')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  receiptFormat === 'A4' ? 'bg-white text-emerald-900' : 'text-emerald-200'
                }`}
              >
                A4 স্ট্যান্ডার্ড
              </button>
              <button
                onClick={() => setReceiptFormat('POS')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  receiptFormat === 'POS' ? 'bg-white text-emerald-900' : 'text-emerald-200'
                }`}
              >
                POS স্লিপ
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg hover:bg-emerald-700 text-emerald-200 hover:text-white transition-colors"
              title="প্রিন্ট করুন"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportPdf}
              className="p-1.5 rounded-lg hover:bg-emerald-700 text-emerald-200 hover:text-white transition-colors"
              title="PDF ডাউনলোড"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-emerald-700 text-emerald-200 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reversal Warning if reversed */}
        {collection.status === 'REVERSED' && (
          <div className="bg-rose-100 border-b border-rose-300 p-2.5 px-5 flex items-center justify-between text-rose-900 text-xs font-bold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>এই রসিদটি বাতিল ও সমন্বয় (REVERSED) করা হয়েছে। কারণ: {collection.reversedReason}</span>
            </div>
            <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded">বাতিলকৃত</span>
          </div>
        )}

        {/* Printable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex items-center justify-center">
          <div
            id="printable-money-receipt"
            className={`bg-white text-slate-900 shadow-lg border border-slate-300 relative transition-all ${
              receiptFormat === 'A4'
                ? 'w-full max-w-xl p-6 rounded-xl'
                : 'w-72 p-4 text-[11px] font-mono rounded-lg'
            }`}
          >
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
              <span className="text-7xl font-black rotate-[-30deg]">AJ WELFARE</span>
            </div>

            {/* Receipt Header */}
            <div className="text-center border-b-2 border-emerald-800 pb-3 mb-3">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AJFLogo 
                  variant="receipt" 
                  alt={db.settings.orgNameBangla || 'আতরগাঁও জাগরণী ক্লাব লোগো'} 
                  className="w-8 h-8 shrink-0" 
                />
                <h2 className="font-black text-sm sm:text-base tracking-tight text-emerald-900">
                  {db.settings.orgNameBangla}
                </h2>
              </div>
              <p className="text-[10px] text-slate-600 font-semibold">{db.settings.address}</p>
              <p className="text-[10px] text-emerald-800 font-serif italic">
                "{db.settings.slogan}"
              </p>
              <div className="inline-block bg-emerald-800 text-white text-[11px] font-bold px-4 py-0.5 rounded-full mt-2 uppercase tracking-wider">
                {isBulk ? `এককালীন বকেয়া চাঁদা জমার রসিদ (${matchingCollections.length} মাস)` : 'অর্থ আদায় মানি রসিদ (Money Receipt)'}
              </div>
            </div>

            {/* Metadata row */}
            <div className="flex justify-between items-center text-xs mb-3 font-semibold text-slate-700">
              <div>
                <span>রসিদ নং: </span>
                <span className="font-mono font-bold text-emerald-900">{collection.receiptNo}</span>
              </div>
              <div>
                <span>তারিখ: </span>
                <span className="font-mono font-bold">{collection.collectionDate}</span>
              </div>
            </div>

            {/* Member info box */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">সদস্যের নাম:</span>
                <span className="font-bold text-slate-900">{collection.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">সদস্য আইডি:</span>
                <span className="font-mono font-bold text-emerald-800">{collection.memberId}</span>
              </div>
              {member && (
                <div className="flex justify-between">
                  <span className="text-slate-600">মোবাইল নম্বর:</span>
                  <span className="font-mono">{member.mobile}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">আদায়ের সময়কাল / মাস:</span>
                <span className="font-bold text-emerald-900">
                  {isBulk
                    ? `${sortedMonths[0]} হতে ${sortedMonths[sortedMonths.length - 1]} (${matchingCollections.length} মাস)`
                    : collection.collectionMonth}
                </span>
              </div>
            </div>

            {/* If Bulk, show month summary tags */}
            {isBulk && (
              <div className="mb-3 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200/60">
                <p className="text-[10px] font-bold text-emerald-900 mb-1.5">
                  পরিশোধিত মাসের তালিকা ({matchingCollections.length} টি মাস):
                </p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-white rounded border border-emerald-100">
                  {sortedMonths.map(m => (
                    <span key={m} className="bg-emerald-100 text-emerald-900 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Breakdown Table */}
            <table className="w-full text-xs mb-4 border border-slate-200">
              <thead className="bg-emerald-50 text-emerald-950 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2 text-left">হিসাবের বিবরণ</th>
                  <th className="p-2 text-right">পরিমাণ (টাকা)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr>
                  <td className="p-2">
                    মাসিক চাঁদা বাবদ {isBulk ? `(${matchingCollections.length} মাস × ৳${collection.monthlyAmount?.toLocaleString()})` : '(Monthly Contribution)'}
                  </td>
                  <td className="p-2 text-right font-mono font-semibold">৳{totalMonthlyAmount?.toLocaleString()}</td>
                </tr>
                {totalLateFine > 0 && (
                  <tr>
                    <td className="p-2 text-amber-800 font-semibold">বিলম্ব ফি (Late Fine)</td>
                    <td className="p-2 text-right font-mono text-amber-800 font-semibold">৳{totalLateFine?.toLocaleString()}</td>
                  </tr>
                )}
                {isAnyLateFeeWaived && totalLateFine === 0 && (
                  <tr className="text-teal-800 bg-teal-50/50">
                    <td className="p-2 font-semibold">বিলম্ব ফি (মওকুফকৃত / Waived)</td>
                    <td className="p-2 text-right font-mono font-bold text-teal-700">৳০ (মওকুফ)</td>
                  </tr>
                )}
                {totalDiscount > 0 && (
                  <tr>
                    <td className="p-2 text-teal-800">মওকুফ / ছাড় (Discount)</td>
                    <td className="p-2 text-right font-mono text-teal-800 font-semibold">-৳{totalDiscount?.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="bg-slate-50 font-bold">
                  <td className="p-2">মোট প্রদেয় অর্থ (Total Payable)</td>
                  <td className="p-2 text-right font-mono">৳{totalPayable?.toLocaleString()}</td>
                </tr>
                <tr className="bg-emerald-100/80 font-black text-emerald-950 text-sm">
                  <td className="p-2">আদায়কৃত অর্থ (Net Paid Amount)</td>
                  <td className="p-2 text-right font-mono text-base text-emerald-900">
                    ৳{totalPaidAmount?.toLocaleString()}
                  </td>
                </tr>
                {totalCurrentDue > 0 && (
                  <tr className="text-rose-700 font-bold">
                    <td className="p-2">অবশিষ্ট বকেয়া (Remaining Due)</td>
                    <td className="p-2 text-right font-mono">৳{totalCurrentDue?.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Payment Mode */}
            <div className="text-[11px] text-slate-600 mb-6 flex justify-between border-t border-slate-200 pt-2">
              <span>পরিশোধের মাধ্যম: <strong className="text-slate-900">{collection.paymentMethod}</strong></span>
              <span>ট্রানজেকশন আইডি: <strong className="font-mono">{collection.transactionNo || 'N/A'}</strong></span>
            </div>

            {/* Signatures */}
            <div className="pt-8 flex justify-between text-[11px] text-slate-700">
              <div className="text-center">
                <div className="w-28 border-t border-slate-400 mb-1" />
                <span>টাকা প্রদানকারীর স্বাক্ষর</span>
              </div>
              <div className="text-center">
                <div className="w-28 border-t border-slate-400 mb-1 font-semibold">
                  {collection.receivedBy}
                </div>
                <span>টাকা গ্রহণকারী / কোষাধ্যক্ষ</span>
              </div>
            </div>

            {/* Footer notice */}
            <div className="mt-4 pt-2 border-t border-slate-100 text-center text-[9px] text-slate-400">
              কম্পিউটার জেনারেটেড ডিজিটাল রসিদ | আতরগাঁও জাগরণী ক্লাব কল্যাণ সমিতি
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
          {collection.status === 'ACTIVE' ? (
            <button
              onClick={() => setIsReversalDialogOpen(true)}
              className="text-rose-700 hover:text-rose-900 font-semibold underline"
            >
              ভুল এন্ট্রি হলে রসিদ রিভার্স / বাতিল করুন
            </button>
          ) : (
            <span className="text-slate-500 italic">রসিদটি ইতিমধ্যে সমন্বয় করা হয়েছে</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট রসিদ</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-semibold transition-colors"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>

        {/* Reversal Confirmation Dialog */}
        {isReversalDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-bold text-sm">রসিদ রিভার্সাল ও অর্থ সমন্বয় নিশ্চিতকরণ</h4>
              </div>
              <p className="text-xs text-slate-600">
                হিসাবরক্ষণ নীতি অনুসারে কোনো লেনদেন সম্পূর্ণ মুছে ফেলা হয় না। রিভার্স করলে এটি বিপরীত এন্ট্রি হিসেবে লেজার ও নগদান বইতে সমন্বয় হবে।
              </p>
              <form onSubmit={handleReverseSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    রিভার্স / বাতিলের স্পষ্ট কারণ লিখুন *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: ভুল সদস্য নির্বাচন / অতিরিক্ত টাকা এন্ট্রি"
                    value={reversalReason}
                    onChange={e => setReversalReason(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReversalDialogOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow-md"
                  >
                    রিভার্স নিশ্চিত করুন
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

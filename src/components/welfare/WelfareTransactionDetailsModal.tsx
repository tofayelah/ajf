import React from 'react';
import { useApp } from '../../context/AppContext';
import { WelfareFundTransaction } from '../../types';
import { PdfService } from '../../services/pdfService';
import {
  X,
  Printer,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface WelfareTransactionDetailsModalProps {
  transaction: WelfareFundTransaction;
  onClose: () => void;
  onEdit?: () => void;
  onReverse?: () => void;
}

export const WelfareTransactionDetailsModal: React.FC<WelfareTransactionDetailsModalProps> = ({
  transaction,
  onClose,
  onEdit,
  onReverse
}) => {
  const { db, language, activeUser } = useApp();
  const isBangla = language === 'bn';

  const member = transaction.memberId
    ? (db.members || []).find(m => m.memberId === transaction.memberId)
    : undefined;

  const resolvedName = member ? member.fullName : (transaction.beneficiaryName || transaction.beneficiary || '-');
  const resolvedMobile = member?.mobile || transaction.beneficiaryMobile || '-';
  const resolvedAddress = member?.presentAddress || transaction.beneficiaryAddress || '-';
  const isReversed = transaction.approvalStatus === 'REVERSED' || transaction.status === 'REVERSED';

  const isBank = transaction.paymentMethod === 'Bank';
  const isAuthorizedToEdit = activeUser && activeUser.role !== 'MEMBER';

  const handlePrint = () => {
    PdfService.printElement(`welfare-voucher-${transaction.fundId}`, `Voucher_${transaction.voucherNo}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {isBangla ? 'অনুদানের ভাউচার বিবরণী' : 'Welfare Aid Voucher Details'}
              </h3>
              <p className="text-[11px] text-slate-300 font-mono">
                ভাউচার নং: {transaction.voucherNo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isBangla ? 'প্রিন্ট' : 'Print'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Body */}
        <div id={`welfare-voucher-${transaction.fundId}`} className="p-6 space-y-4 text-xs">
          {/* Status banner if reversed */}
          {isReversed && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold">
                এই অনুদান ভাউচারটি বাতিল/রিভার্স করা হয়েছে।
              </span>
            </div>
          )}

          {/* Org Header on Print */}
          <div className="text-center pb-3 border-b border-slate-200">
            <h2 className="text-base font-black text-slate-900">{db.settings.orgNameBangla || db.settings.orgName || 'আতরগাঁও যুব কল্যাণ সমিতি'}</h2>
            <p className="text-[10px] text-slate-500">{db.settings.address || 'বাজিতপুর, কিশোরগঞ্জ'}</p>
            <span className="inline-block mt-1.5 px-3 py-0.5 bg-purple-100 text-purple-900 rounded-full font-bold text-[11px]">
              {transaction.fundType === 'WELFARE' ? 'কল্যাণ অনুদান ও সহায়তা ভাউচার' : 'জরুরী অনুদান ভাউচার'}
            </span>
          </div>

          {/* Amount Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                অনুদানের মোট পরিমাণ
              </span>
              <span className="text-2xl font-black text-emerald-800 font-mono">
                ৳{(transaction.amount || transaction.expense || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">পরিশোধ মাধ্যম</span>
              <span className="font-bold text-slate-800 px-2 py-0.5 bg-white border border-slate-200 rounded">
                {transaction.paymentMethod || 'Cash'}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-slate-100 rounded-xl">
            <div>
              <span className="text-slate-400 block text-[10px]">ভাউচার নং</span>
              <span className="font-bold font-mono text-slate-800">{transaction.voucherNo}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ইস্যুর তারিখ</span>
              <span className="font-bold font-mono text-slate-800">{transaction.date}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">তহবিলের ধরন</span>
              <span className="font-bold text-purple-800">
                {transaction.fundType === 'WELFARE' ? 'কল্যাণ তহবিল' : 'জরুরী তহবিল'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">অনুমোদন স্ট্যাটাস</span>
              <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded ${
                isReversed ? 'bg-rose-100 text-rose-800 line-through' :
                transaction.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {isReversed ? 'বাতিলকৃত / REVERSED' : transaction.approvalStatus || 'APPROVED'}
              </span>
            </div>
          </div>

          {/* Beneficiary Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>সুবিধাভোগী ও গ্রহীতার তথ্য</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">নাম:</span>
                <span className="font-bold text-slate-900">{resolvedName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">সদস্য পদমর্যাদা:</span>
                <span className="font-medium text-slate-800">
                  {member ? `সমিতির সদস্য (ID: ${member.memberId || transaction.memberId})` : 'সাধারণ গ্রামবাসী / অ-সদস্য'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">মোবাইল:</span>
                <span className="font-mono text-slate-800">{resolvedMobile}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ঠিকানা:</span>
                <span className="text-slate-800">{resolvedAddress}</span>
              </div>
            </div>
          </div>

          {/* Purpose and Resolutions */}
          <div className="space-y-2 bg-white p-3 border border-slate-100 rounded-xl">
            <div>
              <span className="text-slate-400 block text-[10px]">অনুদানের উদ্দেশ্য</span>
              <p className="font-medium text-slate-800">{transaction.purpose || transaction.reason || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">অনুমোদনকারী</span>
                <span className="font-medium text-slate-700">{transaction.approvedBy || 'কার্যনির্বাহী পরিষদ'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">রেজুলেশন নং</span>
                <span className="font-mono text-slate-700">{transaction.resolutionNo || '-'}</span>
              </div>
            </div>
            {transaction.transactionNumber && (
              <div className="pt-1 border-t border-slate-100">
                <span className="text-slate-400 block text-[10px]">ট্রানজেকশন / চেক রেফারেন্স</span>
                <span className="font-mono text-slate-700">{transaction.transactionNumber}</span>
              </div>
            )}
            {transaction.remarks && (
              <div className="pt-1 border-t border-slate-100">
                <span className="text-slate-400 block text-[10px]">মন্তব্য (Remarks)</span>
                <p className="text-slate-600 italic">{transaction.remarks}</p>
              </div>
            )}
          </div>

          {/* Signature lines on print */}
          <div className="pt-8 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-500">
            <div className="border-t border-slate-300 pt-1">গ্রহীতার স্বাক্ষর</div>
            <div className="border-t border-slate-300 pt-1">কোষাধ্যক্ষের স্বাক্ষর</div>
            <div className="border-t border-slate-300 pt-1">সভাপতির স্বাক্ষর</div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            বন্ধ করুন
          </button>
          <div className="flex items-center gap-2">
            {isAuthorizedToEdit && !isReversed && onReverse && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReverse();
                }}
                className="px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>বাতিল / রিভার্স</span>
              </button>
            )}
            {isAuthorizedToEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-all"
              >
                সম্পাদনা করুন
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

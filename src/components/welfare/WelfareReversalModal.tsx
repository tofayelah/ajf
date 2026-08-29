import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WelfareFundTransaction } from '../../types';
import { isDateInClosedYear } from '../../utils/fyGuard';
import { RotateCcw, AlertTriangle, X, ShieldAlert, Lock } from 'lucide-react';

interface WelfareReversalModalProps {
  transaction: WelfareFundTransaction;
  onClose: () => void;
}

export const WelfareReversalModal: React.FC<WelfareReversalModalProps> = ({
  transaction,
  onClose
}) => {
  const { db, reverseWelfareTransaction, language } = useApp();
  const isBangla = language === 'bn';

  const isClosedFY = isDateInClosedYear(transaction.date, db);
  const [reason, setReason] = useState('ভুল এন্ট্রি সংশোধন / অনুদান বাতিল');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('রিভার্সাল বা বাতিলের কারণ উল্লেখ করা আবশ্যক!');
      return;
    }

    if (isClosedFY) {
      setError('এই অর্থবছর বন্ধ রয়েছে। পূর্ববর্তী বন্ধ অর্থবছরের লেনদেন রিভার্স করা যাবে না।');
      return;
    }

    setIsSubmitting(true);
    const res = await reverseWelfareTransaction({
      fundId: transaction.fundId,
      reason: reason.trim()
    });
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.message);
    }
  };

  const member = transaction.memberId
    ? (db.members || []).find(m => m.memberId === transaction.memberId)
    : undefined;
  const beneficiaryDisplayName = member ? `${member.fullName} (${member.memberId || transaction.memberId})` : (transaction.beneficiary || transaction.beneficiaryName || '-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-rose-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <RotateCcw className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {isBangla ? 'অনুদান ভাউচার রিভার্সাল / বাতিল' : 'Reverse Welfare Voucher'}
              </h3>
              <p className="text-[11px] text-rose-100 font-mono">ভাউচার: {transaction.voucherNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-rose-200 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleReverse} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isClosedFY && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2 font-semibold">
              <Lock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>এই অর্থবছর বন্ধ রয়েছে। রিভার্সাল প্রক্রিয়া ব্লক করা হয়েছে।</span>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">সুবিধাভোগী:</span>
              <span className="font-bold text-slate-900">{beneficiaryDisplayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">অনুদানের পরিমাণ:</span>
              <span className="font-bold text-rose-700 font-mono">
                ৳{(transaction.amount || transaction.expense || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">তহবিল:</span>
              <span className="font-semibold text-purple-800">
                {transaction.fundType === 'WELFARE' ? 'কল্যাণ তহবিল' : 'জরুরী তহবিল'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">তারিখ:</span>
              <span className="font-mono text-slate-700">{transaction.date}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold block">অডিট ও হিসাব সংরক্ষণ বিধি:</span>
              সরাসরি ডিলিট করলে অতীতের ক্যাশ/ব্যাংক ব্যালেন্স মিলবে না। তাই একটি স্বয়ংক্রিয় বিপরীত (Reversing Contra) এন্ট্রি পাস করে তহবিল এবং ক্যাশ পুনরায় সমন্বয় করা হবে।
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              বাতিল / রিভার্সালের সুনির্দিষ্ট কারণ *
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="কী কারণে লেনদেনটি বাতিল করা হচ্ছে..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isClosedFY}
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isSubmitting ? 'রিভার্স হচ্ছে...' : 'রিভার্সাল নিশ্চিত করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

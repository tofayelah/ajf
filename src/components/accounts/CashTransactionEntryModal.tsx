import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { CashTransaction } from '../../types';
import { validateFyGuard, isDateInClosedYear } from '../../utils/fyGuard';
import {
  Banknote,
  AlertCircle,
  CheckCircle2,
  X,
  FileEdit,
  Send
} from 'lucide-react';

interface CashTransactionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editDraft?: CashTransaction | null;
}

export const CashTransactionEntryModal: React.FC<CashTransactionEntryModalProps> = ({
  isOpen,
  onClose,
  editDraft = null
}) => {
  const {
    db,
    saveCashTransactionDraft,
    editDraftCashTransaction,
    postDraftCashTransaction,
    postCashTransaction,
    language,
    activeUser
  } = useApp();
  const isBangla = language === 'bn';

  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [voucherNo, setVoucherNo] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editDraft) {
      setType(editDraft.cashIn > 0 ? 'IN' : 'OUT');
      setAmount(editDraft.cashIn > 0 ? editDraft.cashIn : editDraft.cashOut);
      setDate(editDraft.date);
      setDescription(editDraft.description);
      setReference(editDraft.reference || '');
      setVoucherNo(editDraft.voucherNo || '');
    } else {
      setType('IN');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setReference('');
      setVoucherNo('');
    }
    setErrorMsg(null);
  }, [editDraft, isOpen]);

  if (!isOpen) return null;

  const handleSaveOrPost = async (isDraft: boolean) => {
    setErrorMsg(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg(isBangla ? 'অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন।' : 'Please enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg(isBangla ? 'অনুগ্রহ করে বিবরণ লিখুন।' : 'Please enter description.');
      return;
    }

    if (!isDraft) {
      if (isDateInClosedYear(date, db)) {
        setErrorMsg(
          isBangla
            ? 'এই অর্থবছর বন্ধ রয়েছে। বন্ধ অর্থবছরে নগদ লেনদেন পোস্ট করা সম্ভব নয়।'
            : 'This financial year is closed. Posting transactions is locked.'
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type,
        amount: numAmount,
        date,
        description: description.trim(),
        reference: reference.trim(),
        voucherNo: voucherNo.trim()
      };

      if (editDraft) {
        if (isDraft) {
          const res = await editDraftCashTransaction(editDraft.transactionId, payload);
          if (res.success) onClose();
          else setErrorMsg(res.message);
        } else {
          await editDraftCashTransaction(editDraft.transactionId, payload);
          const res = await postDraftCashTransaction(editDraft.transactionId);
          if (res.success) onClose();
          else setErrorMsg(res.message);
        }
      } else {
        if (isDraft) {
          const res = await saveCashTransactionDraft(payload);
          if (res.success) onClose();
          else setErrorMsg(res.message);
        } else {
          const res = await postCashTransaction(payload);
          if (res.success) onClose();
          else setErrorMsg(res.message);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              editDraft ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {editDraft ? <FileEdit className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {editDraft
                  ? (isBangla ? `খসড়া এন্ট্রি সম্পাদনা` : `Edit Draft Entry`)
                  : (isBangla ? 'নগদ লেনদেন এন্ট্রি' : 'Cash Transaction Entry')}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                {isBangla ? 'লেনদেনের ধরন *' : 'Transaction Type *'}
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as 'IN' | 'OUT')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="IN">{isBangla ? 'নগদ প্রাপ্তি (Cash In)' : 'Cash In'}</option>
                <option value="OUT">{isBangla ? 'নগদ প্রদান (Cash Out)' : 'Cash Out'}</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                {isBangla ? 'তারিখ *' : 'Date *'}
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              {isBangla ? 'বিবরণ (Particulars) *' : 'Particulars *'}
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
              placeholder={isBangla ? 'লেনদেনের বিবরণ লিখুন' : 'Enter particulars'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                {isBangla ? 'ভাউচার নং (ঐচ্ছিক)' : 'Voucher No (Optional)'}
              </label>
              <input
                type="text"
                value={voucherNo}
                onChange={e => setVoucherNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                placeholder={isBangla ? 'ম্যানুয়াল ভাউচার নং' : 'Manual Voucher No'}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                {isBangla ? 'টাকার পরিমাণ *' : 'Amount *'}
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 font-bold"
                placeholder="0.00"
                required
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
              {isBangla ? 'রেফারেন্স (ঐচ্ছিক)' : 'Reference (Optional)'}
            </label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
              placeholder={isBangla ? 'রেফারেন্স লিখুন' : 'Enter reference'}
            />
          </div>
          
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4 text-[11px]">
             <div className="flex items-center gap-1.5 text-slate-500 mb-1">
               <span>Entered By:</span>
               <span className="font-bold text-slate-700">{activeUser?.fullName || 'Admin'}</span>
             </div>
             <div className="flex items-center gap-1.5 text-slate-500">
               <span>Date & Time:</span>
               <span className="font-bold text-slate-700">{new Date().toLocaleString('en-US')}</span>
             </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold text-xs"
          >
            {isBangla ? 'বাতিল' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveOrPost(true)}
              disabled={isSubmitting || !amount || Number(amount) <= 0 || !description.trim()}
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 text-xs"
            >
              <FileEdit className="w-4 h-4" />
              <span>{editDraft ? (isBangla ? 'খসড়া আপডেট' : 'Update Draft') : (isBangla ? 'খসড়া সংরক্ষণ' : 'Save as Draft')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveOrPost(false)}
              disabled={isSubmitting || !amount || Number(amount) <= 0 || !description.trim()}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-all text-xs"
            >
              {isSubmitting ? (
                <span>প্রক্রিয়াকরণ হচ্ছে...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isBangla ? 'লেজারে পোস্ট করুন' : 'Post Transaction'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

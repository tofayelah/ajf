import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { ContraType, BankAccount, ContraTransaction } from '../../types';
import { validateFyGuard } from '../../utils/fyGuard';
import {
  ArrowRightLeft,
  ArrowRight,
  Landmark,
  Wallet,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Info,
  ShieldCheck,
  FileEdit,
  Send
} from 'lucide-react';

interface ContraEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: ContraType;
  defaultBankAccountId?: string;
  editDraft?: ContraTransaction | null;
}

export const ContraEntryModal: React.FC<ContraEntryModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'CASH_TO_BANK',
  defaultBankAccountId,
  editDraft = null
}) => {
  const {
    db,
    postContraEntry,
    saveDraftContraEntry,
    editDraftContraEntry,
    postDraftContraEntry,
    language,
    activeUser
  } = useApp();
  const isBangla = language === 'bn';

  const [type, setType] = useState<ContraType>(defaultType);
  const [fromBankId, setFromBankId] = useState<string>(
    defaultBankAccountId || (db.bankAccounts?.find(b => b.status === 'ACTIVE')?.id || '')
  );
  const [toBankId, setToBankId] = useState<string>(() => {
    const activeBanks = (db.bankAccounts || []).filter(b => b.status === 'ACTIVE');
    return activeBanks.length > 1 ? activeBanks[1].id : (activeBanks[0]?.id || '');
  });
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transactionNo, setTransactionNo] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset when modal opens or editDraft changes
  useEffect(() => {
    if (editDraft) {
      setType(editDraft.type);
      if (editDraft.fromAccountId) setFromBankId(editDraft.fromAccountId);
      if (editDraft.toAccountId) setToBankId(editDraft.toAccountId);
      setAmount(editDraft.amount);
      setDate(editDraft.date);
      setTransactionNo(editDraft.transactionNo || editDraft.reference || '');
      setRemarks(editDraft.remarks || '');
    } else {
      setType(defaultType);
      if (defaultBankAccountId) setFromBankId(defaultBankAccountId);
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setTransactionNo('');
      setRemarks('');
    }
    setErrorMsg(null);
  }, [editDraft, defaultType, defaultBankAccountId, isOpen]);

  const activeBankAccounts = useMemo(() => {
    return (db.bankAccounts || []).filter(b => b.status === 'ACTIVE');
  }, [db.bankAccounts]);

  const currentCashBalance = useMemo(() => {
    return AccountingService.getCashBalance(db.cashTransactions);
  }, [db.cashTransactions]);

  const getBankBalance = (bankId: string) => {
    return AccountingService.getBankAccountBalance(db, bankId);
  };

  // Compute maximum allowed transfer amount from source
  const sourceAvailableBalance = useMemo(() => {
    if (type === 'CASH_TO_BANK') {
      return currentCashBalance;
    }
    if (type === 'BANK_TO_CASH' || type === 'BANK_TO_BANK') {
      return fromBankId ? getBankBalance(fromBankId) : 0;
    }
    return 0;
  }, [type, currentCashBalance, fromBankId, db.bankAccounts, db.bankTransactions]);

  if (!isOpen) return null;

  /**
   * Refactored handleSaveDraft using the Atomic Update Pattern (Get-Modify-Save)
   * Ensures draft record is written and verified in the persistent contraEntries collection
   * before returning a success signal to the UI.
   */
  const handleSaveDraft = async () => {
    setErrorMsg(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg(isBangla ? 'অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন।' : 'Please enter a valid amount.');
      return;
    }

    if (type === 'BANK_TO_BANK' && fromBankId === toBankId) {
      setErrorMsg(
        isBangla
          ? 'উৎস ব্যাংক এবং গন্তব্য ব্যাংক একই হতে পারে না।'
          : 'Source bank and destination bank cannot be the same.'
      );
      return;
    }

    const fromAccountId = (type === 'BANK_TO_CASH' || type === 'BANK_TO_BANK') ? fromBankId : undefined;
    const toAccountId = (type === 'CASH_TO_BANK' || type === 'BANK_TO_BANK') ? toBankId : undefined;

    setIsSubmitting(true);
    try {
      // Async atomic get-modify-save on persistent contraEntries / contraTransactions
      const res = await saveDraftContraEntry({
        draftId: editDraft ? editDraft.id : undefined,
        type,
        amount: numAmount,
        fromAccountId,
        toAccountId,
        fromBankAccountId: fromAccountId,
        toBankAccountId: toAccountId,
        date,
        transactionNo: transactionNo.trim() || undefined,
        reference: transactionNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      if (res && res.success) {
        onClose();
      } else {
        setErrorMsg(res?.message || (isBangla ? 'খসড়া কন্ট্রা এন্ট্রি সংরক্ষণ করা যায়নি।' : 'Failed to save draft contra entry.'));
      }
    } catch (err: any) {
      console.error('handleSaveDraft error:', err);
      setErrorMsg(err.message || 'An error occurred while saving draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Post Contra Entry to Ledger (with strict Financial Year & Balance Guards)
   */
  const handlePostToLedger = async () => {
    setErrorMsg(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg(isBangla ? 'অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন।' : 'Please enter a valid amount.');
      return;
    }

    if (numAmount > sourceAvailableBalance) {
      setErrorMsg(
        isBangla
          ? `উৎস হিসাবে পর্যাপ্ত ব্যালেন্স নেই! সর্বোচ্চ স্থানান্তরযোগ্য: ৳${sourceAvailableBalance.toLocaleString()}`
          : `Insufficient funds in source account! Max available: ৳${sourceAvailableBalance.toLocaleString()}`
      );
      return;
    }

    if (type === 'BANK_TO_BANK' && fromBankId === toBankId) {
      setErrorMsg(
        isBangla
          ? 'উৎস ব্যাংক এবং গন্তব্য ব্যাংক একই হতে পারে না।'
          : 'Source bank and destination bank cannot be the same.'
      );
      return;
    }

    // Financial Year closed guard check (only for posting to ledger)
    if (!validateFyGuard(date, db, isBangla)) {
      return;
    }

    const fromAccountId = (type === 'BANK_TO_CASH' || type === 'BANK_TO_BANK') ? fromBankId : undefined;
    const toAccountId = (type === 'CASH_TO_BANK' || type === 'BANK_TO_BANK') ? toBankId : undefined;

    setIsSubmitting(true);
    try {
      if (editDraft) {
        // First atomically update draft values if changed, then post to ledger
        await saveDraftContraEntry({
          draftId: editDraft.id,
          type,
          amount: numAmount,
          fromAccountId,
          toAccountId,
          fromBankAccountId: fromAccountId,
          toBankAccountId: toAccountId,
          date,
          transactionNo: transactionNo.trim() || undefined,
          reference: transactionNo.trim() || undefined,
          remarks: remarks.trim() || undefined,
        });

        const res = await postDraftContraEntry(editDraft.id);
        if (res && res.success) {
          onClose();
        } else {
          setErrorMsg(res?.message || 'Failed to post draft contra entry.');
        }
      } else {
        const res = await postContraEntry({
          type,
          amount: numAmount,
          fromAccountId,
          toAccountId,
          fromBankAccountId: fromAccountId,
          toBankAccountId: toAccountId,
          date,
          transactionNo: transactionNo.trim() || undefined,
          reference: transactionNo.trim() || undefined,
          remarks: remarks.trim() || undefined,
          isDraft: false,
          status: 'POSTED'
        });

        if (res && res.success) {
          onClose();
        } else {
          setErrorMsg(res?.message || (isBangla ? 'কন্ট্রা এন্ট্রি পোস্ট করা যায়নি।' : 'Failed to post contra entry.'));
        }
      }
    } catch (err: any) {
      console.error('handlePostToLedger error:', err);
      setErrorMsg(err.message || 'An error occurred while posting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Backwards compatible wrapper for any callers
  const handleSaveOrPost = async (isDraft: boolean) => {
    if (isDraft) {
      await handleSaveDraft();
    } else {
      await handlePostToLedger();
    }
  };

  const selectedFromBank = db.bankAccounts?.find(b => b.id === fromBankId);
  const selectedToBank = db.bankAccounts?.find(b => b.id === toBankId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              editDraft ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {editDraft ? <FileEdit className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {editDraft
                  ? (isBangla ? `খসড়া কন্ট্রা এন্ট্রি সম্পাদনা (${editDraft.voucherNo})` : `Edit Draft Contra Entry (${editDraft.voucherNo})`)
                  : (isBangla ? 'কন্ট্রা এন্ট্রি / তহবিল স্থানান্তর (Contra Entry)' : 'Contra Entry / Fund Transfer')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {editDraft
                  ? (isBangla ? 'খসড়া পরিবর্তন করুন অথবা চূড়ান্তভাবে লেজারে পোস্ট করুন' : 'Update draft or finalize posting to ledger')
                  : (isBangla ? 'নগদ ও ব্যাংকের মধ্যে অভ্যন্তরীণ ফান্ড সমন্বয় ভাউচার' : 'Internal cash and bank balance transfer')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Transfer Type Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              {isBangla ? 'স্থানান্তরের ধরন (Transfer Mode) *' : 'Transfer Type *'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('CASH_TO_BANK');
                  setErrorMsg(null);
                }}
                className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                  type === 'CASH_TO_BANK'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Wallet className="w-4 h-4 text-emerald-700" />
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <Landmark className="w-4 h-4 text-teal-700" />
                </div>
                <div className="text-[11px] leading-tight">নগদ → ব্যাংক</div>
                <div className="text-[9px] text-slate-400">ব্যাংক জমা</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('BANK_TO_CASH');
                  setErrorMsg(null);
                }}
                className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                  type === 'BANK_TO_CASH'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Landmark className="w-4 h-4 text-teal-700" />
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <Wallet className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="text-[11px] leading-tight">ব্যাংক → নগদ</div>
                <div className="text-[9px] text-slate-400">নগদ উত্তোলন</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('BANK_TO_BANK');
                  setErrorMsg(null);
                }}
                className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                  type === 'BANK_TO_BANK'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Landmark className="w-4 h-4 text-blue-700" />
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <Landmark className="w-4 h-4 text-teal-700" />
                </div>
                <div className="text-[11px] leading-tight">ব্যাংক → ব্যাংক</div>
                <div className="text-[9px] text-slate-400">আন্তঃব্যাংক স্থানান্তর</div>
              </button>
            </div>
          </div>

          {/* Source and Destination Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            {/* FROM ACCOUNT */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {isBangla ? 'উৎস হিসাব (From / Credit)' : 'From Account (Credit)'}
              </span>
              {type === 'CASH_TO_BANK' ? (
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-700" />
                    <span>হাতে নগদ (Cash in Hand)</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 font-mono mt-1">
                    বর্তমান স্থিতি: <strong>৳{currentCashBalance.toLocaleString()}</strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <select
                    value={fromBankId}
                    onChange={e => setFromBankId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800"
                    required
                  >
                    {activeBankAccounts.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber} ({b.branchName})
                      </option>
                    ))}
                  </select>
                  {selectedFromBank && (
                    <div className="text-[11px] text-teal-800 font-mono pl-1">
                      হিসাব ব্যালেন্স: <strong>৳{getBankBalance(selectedFromBank.id).toLocaleString()}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TO ACCOUNT */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {isBangla ? 'গন্তব্য হিসাব (To / Debit)' : 'To Account (Debit)'}
              </span>
              {type === 'BANK_TO_CASH' ? (
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-700" />
                    <span>হাতে নগদ (Cash in Hand)</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 font-mono mt-1">
                    বর্তমান স্থিতি: <strong>৳{currentCashBalance.toLocaleString()}</strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <select
                    value={toBankId}
                    onChange={e => setToBankId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800"
                    required
                  >
                    {activeBankAccounts
                      .filter(b => (type === 'BANK_TO_BANK' ? b.id !== fromBankId : true))
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} - {b.accountNumber} ({b.branchName})
                        </option>
                      ))}
                  </select>
                  {selectedToBank && (
                    <div className="text-[11px] text-teal-800 font-mono pl-1">
                      হিসাব ব্যালেন্স: <strong>৳{getBankBalance(selectedToBank.id).toLocaleString()}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'টাকার পরিমাণ (৳) *' : 'Transfer Amount (৳) *'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-bold text-slate-400">৳</span>
                <input
                  type="number"
                  min={1}
                  max={sourceAvailableBalance}
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
              <div className="flex gap-1.5 mt-1.5">
                {[1000, 5000, 10000, 50000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(Math.min(val, sourceAvailableBalance))}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-mono text-slate-700"
                  >
                    +৳{val.toLocaleString()}
                  </button>
                ))}
                {sourceAvailableBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(sourceAvailableBalance)}
                    className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded text-[10px] font-semibold"
                  >
                    সর্বোচ্চ (Max)
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'লেনদেনের তারিখ *' : 'Transaction Date *'}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Reference / Slip No & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'ডিপোজিট স্লিপ / চেক / ট্রানজেকশন নং' : 'Slip / Cheque / Txn Ref'}
              </label>
              <input
                type="text"
                placeholder="যেমন: SLIP-98234 / CHQ-102938"
                value={transactionNo}
                onChange={e => setTransactionNo(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'মন্তব্য (Remarks)' : 'Remarks'}
              </label>
              <input
                type="text"
                placeholder="স্থানান্তরের কারণ বা বিবরণ"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Double-Entry Compliance Summary */}
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>ডাবল-এন্ট্রি হিসাব সমীকরণ ও নীতিমালা</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-emerald-800">
              <div>
                • ডেবিট:{' '}
                <strong>
                  {type === 'CASH_TO_BANK'
                    ? selectedToBank?.bankName || 'ব্যাংক হিসাব'
                    : type === 'BANK_TO_CASH'
                    ? 'হাতে নগদ (Cash)'
                    : selectedToBank?.bankName || 'গন্তব্য ব্যাংক'}
                </strong>
              </div>
              <div>
                • ক্রেডিট:{' '}
                <strong>
                  {type === 'CASH_TO_BANK'
                    ? 'হাতে নগদ (Cash)'
                    : type === 'BANK_TO_CASH'
                    ? selectedFromBank?.bankName || 'উৎস ব্যাংক'
                    : selectedFromBank?.bankName || 'উৎস ব্যাংক'}
                </strong>
              </div>
            </div>
            <div className="text-[10px] text-emerald-700 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              <span>
                কন্ট্রা এন্ট্রি প্রতিষ্ঠানের মোট নগদ+ব্যাংক তহবিল পরিবর্তন করে না এবং কোনো আয় বা ব্যয় তৈরি করে না।
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
            >
              {isBangla ? 'বাতিল' : 'Cancel'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting || !amount || Number(amount) <= 0}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <FileEdit className="w-4 h-4" />
                <span>{isSubmitting ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (editDraft ? (isBangla ? 'খসড়া আপডেট' : 'Update Draft') : (isBangla ? 'খসড়া সংরক্ষণ' : 'Save as Draft'))}</span>
              </button>

              <button
                type="button"
                onClick={handlePostToLedger}
                disabled={isSubmitting || !amount || Number(amount) <= 0}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <span>{isBangla ? 'প্রক্রিয়াকরণ হচ্ছে...' : 'Processing...'}</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{isBangla ? 'লেজারে পোস্ট করুন' : 'Post to Ledger'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

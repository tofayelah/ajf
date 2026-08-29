import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { BankAccount } from '../../types';
import {
  Landmark,
  Building,
  Plus,
  Edit2,
  CheckCircle2,
  X,
  AlertCircle,
  ShieldCheck,
  Power
} from 'lucide-react';

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: BankAccount | null;
}

export const BankAccountModal: React.FC<BankAccountModalProps> = ({
  isOpen,
  onClose,
  accountToEdit
}) => {
  const { db, addBankAccount, updateBankAccount, language, activeUser } = useApp();
  const isBangla = language === 'bn';

  const [bankName, setBankName] = useState(accountToEdit?.bankName || '');
  const [branchName, setBranchName] = useState(accountToEdit?.branchName || '');
  const [accountName, setAccountName] = useState(accountToEdit?.accountName || 'AJ Welfare Society');
  const [accountNumber, setAccountNumber] = useState(accountToEdit?.accountNumber || '');
  const [accountType, setAccountType] = useState(accountToEdit?.accountType || 'CURRENT');
  const [routingNumber, setRoutingNumber] = useState(accountToEdit?.routingNumber || '');
  const [openingBalance, setOpeningBalance] = useState<number | ''>(accountToEdit?.openingBalance ?? '');
  const [openingDate, setOpeningDate] = useState(accountToEdit?.openingDate || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(accountToEdit?.status || 'ACTIVE');
  const [remarks, setRemarks] = useState(accountToEdit?.remarks || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!bankName.trim() || !branchName.trim() || !accountNumber.trim()) {
      setErrorMsg(isBangla ? 'ব্যাংকের নাম, শাখা ও হিসাব নম্বর অবশ্যই পূরণ করতে হবে।' : 'Bank name, branch and account number are required.');
      return;
    }

    if (accountToEdit && accountToEdit.status === 'ACTIVE' && status === 'INACTIVE') {
      // Validate that it doesn't have positive balance? Handled in service if needed.
    }

    setIsSubmitting(true);
    try {
      if (accountToEdit) {
        const res = await updateBankAccount({
          id: accountToEdit.id,
          bankName: bankName.trim(),
          branchName: branchName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          accountType,
          routingNumber: routingNumber.trim() || undefined,
          status,
          remarks: remarks.trim() || undefined
        });
        if (res && res.success) {
          onClose();
        } else {
          setErrorMsg(res?.message || 'Failed to update bank account.');
        }
      } else {
        const res = await addBankAccount({
          bankName: bankName.trim(),
          branchName: branchName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          accountType,
          routingNumber: routingNumber.trim() || undefined,
          openingBalance: Number(openingBalance) || 0,
          openingDate,
          remarks: remarks.trim() || undefined,
          status: 'ACTIVE'
        });
        if (res && res.success) {
          onClose();
        } else {
          setErrorMsg(res?.message || 'Failed to add bank account.');
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
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {accountToEdit
                  ? (isBangla ? 'ব্যাংক হিসাব সংশোধন' : 'Edit Bank Account')
                  : (isBangla ? 'নতুন ব্যাংক হিসাব সংযোজন' : 'Add New Bank Account')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isBangla ? 'সংগঠনের অফিসিয়াল ব্যাংক একাউন্ট মাস্টার' : 'Official organization bank account master'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'ব্যাংকের নাম (Bank Name) *' : 'Bank Name *'}
              </label>
              <input
                type="text"
                required
                placeholder="যেমন: সোনালী ব্যাংক পিএলসি"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'শাখার নাম (Branch Name) *' : 'Branch Name *'}
              </label>
              <input
                type="text"
                required
                placeholder="যেমন: বাজিতপুর শাখা"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isBangla ? 'হিসাবের শিরোনাম (Account Name) *' : 'Account Name *'}
            </label>
            <input
              type="text"
              required
              placeholder="আতরগাঁও আদর্শ যুব সমবায় সমিতি"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'হিসাব নম্বর (Account Number) *' : 'Account Number *'}
              </label>
              <input
                type="text"
                required
                placeholder="যেমন: SB-0192837465678"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'হিসাবের ধরন (Account Type)' : 'Account Type'}
              </label>
              <select
                value={accountType}
                onChange={e => setAccountType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="CURRENT">{isBangla ? 'চলতি (Current)' : 'CURRENT'}</option>
                <option value="SAVINGS">{isBangla ? 'সঞ্চয়ী (Savings)' : 'SAVINGS'}</option>
                <option value="STD">{isBangla ? 'এসটিডি (STD)' : 'STD'}</option>
                <option value="FDR">{isBangla ? 'এফডিআর (FDR)' : 'FDR'}</option>
                <option value="ISLAMIC">{isBangla ? 'ইসলামিক (Islamic)' : 'ISLAMIC'}</option>
                <option value="OTHER">{isBangla ? 'অন্যান্য (Other)' : 'OTHER'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'রাউটিং নম্বর (Routing Number)' : 'Routing Number'}
              </label>
              <input
                type="text"
                placeholder="যেমন: 200260481"
                value={routingNumber}
                onChange={e => setRoutingNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
            
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'অবস্থা (Status)' : 'Status'}
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="ACTIVE">{isBangla ? 'সক্রিয় (ACTIVE)' : 'ACTIVE'}</option>
                <option value="INACTIVE">{isBangla ? 'নিষ্ক্রিয় (INACTIVE)' : 'INACTIVE'}</option>
              </select>
            </div>
          </div>

          {!accountToEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'প্রারম্ভিক স্থিতি (Opening Balance ৳)' : 'Opening Balance (৳)'}
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-teal-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'হিসাব খোলার তারিখ (Opening Date)' : 'Opening Date'}
                </label>
                <input
                  type="date"
                  value={openingDate}
                  onChange={e => setOpeningDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isBangla ? 'মন্তব্য (Remarks)' : 'Remarks'}
            </label>
            <input
              type="text"
              placeholder="হিসাবের উদ্দেশ্য বা বিবরণ"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
            >
              {isBangla ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <span>সংরক্ষণ হচ্ছে...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{accountToEdit ? (isBangla ? 'হালনাগাদ করুন' : 'Update') : (isBangla ? 'সংরক্ষণ করুন' : 'Save')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

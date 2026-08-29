import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { WelfareFundTransaction, PaymentMethod } from '../../types';
import { isDateInClosedYear } from '../../utils/fyGuard';
import {
  X,
  Save,
  AlertCircle,
  User,
  Users,
  ShieldCheck,
  FileText,
  DollarSign,
  Calendar,
  Lock,
  Search
} from 'lucide-react';

interface WelfareTransactionEditModalProps {
  transaction: WelfareFundTransaction;
  onClose: () => void;
}

export const WelfareTransactionEditModal: React.FC<WelfareTransactionEditModalProps> = ({
  transaction,
  onClose
}) => {
  const { db, updateWelfareTransaction, activeUser, language } = useApp();
  const isBangla = language === 'bn';

  const isClosedFY = isDateInClosedYear(transaction.date, db);

  // Check if posted to cash or bank
  const hasCash = (db.cashTransactions || []).some(
    c => c.sourceId === transaction.fundId || c.voucherNo === transaction.voucherNo
  );
  const hasBank = (db.bankTransactions || []).some(
    b => b.sourceId === transaction.fundId || b.transactionNo === transaction.voucherNo || b.reference === transaction.voucherNo
  );
  const hasPostedAccounting = hasCash || hasBank;

  const initialMember = transaction.memberId
    ? (db.members || []).find(m => m.memberId === transaction.memberId)
    : undefined;

  const [beneficiaryType, setBeneficiaryType] = useState<'MEMBER' | 'NON_MEMBER'>(
    transaction.memberId ? 'MEMBER' : (transaction.beneficiaryType || 'NON_MEMBER')
  );
  const [selectedMemberId, setSelectedMemberId] = useState<string>(transaction.memberId || '');
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [beneficiaryName, setBeneficiaryName] = useState<string>(
    initialMember?.fullName || transaction.beneficiaryName || transaction.beneficiary || ''
  );
  const [beneficiaryMobile, setBeneficiaryMobile] = useState<string>(
    transaction.beneficiaryMobile || initialMember?.mobile || ''
  );
  const [beneficiaryAddress, setBeneficiaryAddress] = useState<string>(
    transaction.beneficiaryAddress || initialMember?.presentAddress || ''
  );
  const [purpose, setPurpose] = useState<string>(
    transaction.purpose || transaction.reason || 'চিকিৎসা সহায়তা অনুদান'
  );
  const [amount, setAmount] = useState<number>(transaction.amount || transaction.expense || 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(transaction.paymentMethod || 'Cash');
  const [transactionNumber, setTransactionNumber] = useState<string>(transaction.transactionNumber || '');
  const [approvedBy, setApprovedBy] = useState<string>(transaction.approvedBy || 'কার্যনির্বাহী পরিষদ');
  const [resolutionNo, setResolutionNo] = useState<string>(transaction.resolutionNo || '');
  const [remarks, setRemarks] = useState<string>(transaction.remarks || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Handle member selection
  const handleMemberSelect = (mId: string) => {
    setSelectedMemberId(mId);
    if (!mId) {
      return;
    }
    const member = (db.members || []).find(m => m.memberId === mId);
    if (member) {
      setBeneficiaryName(member.fullName);
      setBeneficiaryMobile(member.mobile || '');
      setBeneficiaryAddress(member.presentAddress || '');
    }
  };

  const filteredMembers = (db.members || []).filter(m => {
    if (!memberSearch.trim()) return true;
    const query = memberSearch.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(query) ||
      m.memberId.toLowerCase().includes(query) ||
      (m.mobile && m.mobile.includes(query))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isClosedFY) {
      setError('এই অর্থবছর বন্ধ রয়েছে। পূর্ববর্তী বন্ধ অর্থবছরের কোনো তথ্য সম্পাদনা করা যাবে না।');
      return;
    }

    if (beneficiaryType === 'MEMBER' && !selectedMemberId) {
      setError('অনুগ্রহ করে একজন সক্রিয় সদস্য নির্বাচন করুন!');
      return;
    }

    if (!beneficiaryName.trim()) {
      setError('সুবিধাভোগীর নাম আবশ্যক!');
      return;
    }

    if (!hasPostedAccounting && amount <= 0) {
      setError('অনুদানের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে!');
      return;
    }

    setIsSubmitting(true);

    const res = await updateWelfareTransaction({
      fundId: transaction.fundId,
      beneficiaryName: beneficiaryName.trim(),
      beneficiary: beneficiaryName.trim(),
      beneficiaryMobile: beneficiaryMobile.trim(),
      beneficiaryAddress: beneficiaryAddress.trim(),
      beneficiaryType,
      memberId: beneficiaryType === 'MEMBER' ? selectedMemberId : '',
      purpose: purpose.trim(),
      reason: purpose.trim(),
      amount: hasPostedAccounting ? undefined : amount,
      paymentMethod: hasPostedAccounting ? undefined : paymentMethod,
      transactionNumber: transactionNumber.trim(),
      approvedBy: approvedBy.trim(),
      resolutionNo: resolutionNo.trim(),
      remarks: remarks.trim()
    });

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {isBangla ? 'অনুদান ও সহায়তা ভাউচার সম্পাদনা' : 'Edit Welfare Aid Transaction'}
              </h3>
              <p className="text-[11px] text-slate-300 font-mono">
                ভাউচার নং: {transaction.voucherNo} | আইডি: {transaction.fundId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isClosedFY && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <Lock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>এই লেনদেনটি বন্ধ অর্থবছরের অন্তর্ভুক্ত। সম্পাদনা নিষ্ক্রিয়।</span>
            </div>
          )}

          {hasPostedAccounting && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl flex items-start gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <span className="font-bold">হিসাবভুক্ত ভাউচার সুরক্ষা:</span>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  এই লেনদেনের ক্যাশ/ব্যাংক লেজার পোস্ট সম্পন্ন হয়েছে। লেজারের সঠিকতা রক্ষার্থে পরিমাণ (৳) ও পেমেন্ট মাধ্যম পরিবর্তনযোগ্য নয়। নাম, উদ্দেশ্য ও অনুমোদন বিবরণ আপডেট করা যাবে।
                </p>
              </div>
            </div>
          )}

          {/* Beneficiary Type Radio Buttons */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">সুবিধাভোগীর ধরন *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setBeneficiaryType('MEMBER');
                  if (selectedMemberId) {
                    handleMemberSelect(selectedMemberId);
                  }
                }}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  beneficiaryType === 'MEMBER'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>সমিতির সদস্য (Member)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBeneficiaryType('NON_MEMBER');
                  setSelectedMemberId('');
                }}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  beneficiaryType === 'NON_MEMBER'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <User className="w-4 h-4" />
                <span>বহিরাগত / সাধারণ সুবিধাভোগী</span>
              </button>
            </div>
          </div>

          {/* Member Selection if MEMBER */}
          {beneficiaryType === 'MEMBER' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block font-bold text-slate-700">সদস্য নির্বাচন করুন *</label>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="সদস্যের নাম বা আইডি দিয়ে খুঁজুন..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <select
                value={selectedMemberId}
                onChange={e => handleMemberSelect(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-xs font-semibold"
              >
                <option value="">-- সদস্য বাছাই করুন --</option>
                {filteredMembers.map(m => (
                  <option key={m.memberId} value={m.memberId}>
                    {m.fullName} - ({m.memberId}) - {m.mobile}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Beneficiary Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                সুবিধাভোগীর পূর্ণ নাম *
              </label>
              <input
                type="text"
                required
                value={beneficiaryName}
                onChange={e => setBeneficiaryName(e.target.value)}
                placeholder="পূর্ণ নাম"
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">মোবাইল নম্বর</label>
              <input
                type="text"
                value={beneficiaryMobile}
                onChange={e => setBeneficiaryMobile(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ঠিকানা / গ্রাম</label>
            <input
              type="text"
              value={beneficiaryAddress}
              onChange={e => setBeneficiaryAddress(e.target.value)}
              placeholder="ঠিকানা"
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
            />
          </div>

          {/* Purpose & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">অনুদানের উদ্দেশ্য *</label>
              <input
                type="text"
                required
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="যেমন: চিকিৎসা সহায়তা"
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                অনুদানের পরিমাণ (৳) * {hasPostedAccounting && <span className="text-slate-400 font-normal">(লকড)</span>}
              </label>
              <input
                type="number"
                disabled={hasPostedAccounting}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className={`w-full border rounded-lg px-3 py-1.5 text-xs font-mono font-bold ${
                  hasPostedAccounting
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-emerald-800'
                }`}
              />
            </div>
          </div>

          {/* Payment Method & Transaction No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                পরিশোধ মাধ্যম {hasPostedAccounting && <span className="text-slate-400 font-normal">(লকড)</span>}
              </label>
              <select
                disabled={hasPostedAccounting}
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  hasPostedAccounting
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <option value="Cash">নগদ (Cash)</option>
                <option value="Bank">ব্যাংক (Bank)</option>
                <option value="bKash">বিকাশ (bKash)</option>
                <option value="Nagad">নগদ মোবাইল ব্যাংকিং (Nagad)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ট্রানজেকশন / চেক নং</label>
              <input
                type="text"
                value={transactionNumber}
                onChange={e => setTransactionNumber(e.target.value)}
                placeholder="চেক বা ট্রানজেকশন নম্বর"
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>

          {/* Approvals and Resolution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">অনুমোদনকারী</label>
              <input
                type="text"
                value={approvedBy}
                onChange={e => setApprovedBy(e.target.value)}
                placeholder="অনুমোদনকারীর নাম / পদবি"
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">কার্যবিবরণী / রেজুলেশন নং</label>
              <input
                type="text"
                value={resolutionNo}
                onChange={e => setResolutionNo(e.target.value)}
                placeholder="যেমন: RES-2026-000005"
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">মন্তব্য (Remarks)</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="অন্যান্য বিবরণ..."
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isClosedFY}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'আপডেট সম্পন্ন করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

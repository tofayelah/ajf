import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Member } from '../../types';
import {
  AlertTriangle,
  ShieldAlert,
  Trash2,
  UserX,
  UserCheck,
  X,
  CheckCircle2,
  Info,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';

interface MemberActionModalsProps {
  member: Member | null;
  mode: 'DEACTIVATE' | 'REACTIVATE' | 'DELETE' | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MemberActionModals: React.FC<MemberActionModalsProps> = ({
  member,
  mode,
  onClose,
  onSuccess
}) => {
  const {
    language,
    checkMemberDependencies,
    deactivateMember,
    reactivateMember,
    deleteMember,
    getCurrentUser
  } = useApp();
  const isBangla = language === 'bn';
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [isProcessing, setIsProcessing] = useState(false);
  const [overrideToDeactivate, setOverrideToDeactivate] = useState(false);

  if (!member || !mode) return null;

  const depCheck = checkMemberDependencies(member.memberId);
  const effectiveMode = overrideToDeactivate ? 'DEACTIVATE' : mode;

  const handleDeactivate = async () => {
    setIsProcessing(true);
    const res = await deactivateMember(member.memberId);
    setIsProcessing(false);
    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  const handleReactivate = async () => {
    setIsProcessing(true);
    const res = await reactivateMember(member.memberId);
    setIsProcessing(false);
    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    const res = await deleteMember(member.memberId);
    setIsProcessing(false);
    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            {effectiveMode === 'DEACTIVATE' && (
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </div>
            )}
            {effectiveMode === 'REACTIVATE' && (
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
            )}
            {effectiveMode === 'DELETE' && (
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {effectiveMode === 'DEACTIVATE' && (isBangla ? 'সদস্য নিষ্ক্রিয়করণ' : 'Deactivate Member')}
                {effectiveMode === 'REACTIVATE' && (isBangla ? 'সদস্য পুনঃসক্রিয়করণ' : 'Reactivate Member')}
                {effectiveMode === 'DELETE' && (isBangla ? 'সদস্য মুছে ফেলার যাচাইকরণ' : 'Delete Member')}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {member.fullName} ({member.memberId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* DEACTIVATE MODE */}
          {effectiveMode === 'DEACTIVATE' && (
            <div className="space-y-3.5">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-slate-700">
                  <p className="font-semibold text-slate-900 text-xs">
                    {isBangla
                      ? 'এই সদস্যকে নিষ্ক্রিয় করলে নতুন সদস্য-ভিত্তিক কার্যক্রম সীমিত হবে, তবে পুরনো হিসাব ও ইতিহাস সংরক্ষিত থাকবে। আপনি কি নিশ্চিত?'
                      : 'Deactivating this member will restrict new member transactions, but existing accounting and history will be preserved. Are you sure?'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {isBangla
                      ? 'নিষ্ক্রিয় সদস্যদের প্রোফাইল, খতিয়ান ও হিসাব পূর্বে যেমন ছিল তেমনই নিরাপদে সংরক্ষিত থাকবে।'
                      : 'Profile, ledgers and past records of inactive members remain securely preserved.'}
                  </p>
                </div>
              </div>

              {depCheck.details.linkedUserAccountsCount > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-blue-900 text-[11px]">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    {isBangla
                      ? 'এই সদস্যের লিংকযুক্ত ইউজার একাউন্টটিও স্বয়ংক্রিয়ভাবে নিষ্ক্রিয় (DISABLED) করা হবে।'
                      : 'Linked member user account will also be automatically disabled.'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* REACTIVATE MODE */}
          {effectiveMode === 'REACTIVATE' && (
            <div className="space-y-3.5">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-slate-700">
                  <p className="font-semibold text-slate-900 text-xs">
                    {isBangla
                      ? 'আপনি কি এই সদস্যকে পুনরায় সক্রিয় (ACTIVE) করতে চান?'
                      : 'Do you want to reactivate this member?'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {isBangla
                      ? 'সক্রিয় করার পর সদস্যের নিয়মিত চাঁদা আদায় ও সমিতির অন্যান্য কার্যক্রমে অংশ নিতে পারবেন।'
                      : 'After activation, regular monthly collections and society activities will resume.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DELETE MODE */}
          {effectiveMode === 'DELETE' && (
            <div className="space-y-4">
              {/* Financial History Exists -> Block Delete */}
              {depCheck.hasFinancialHistory ? (
                <div className="space-y-3.5">
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-rose-900">
                      <p className="font-bold text-xs">
                        {isBangla
                          ? 'এই সদস্যের আর্থিক/সদস্যতা ইতিহাস রয়েছে। নিরাপত্তার কারণে সদস্যটি মুছে ফেলা যাবে না।'
                          : 'Member has financial/accounting history. Permanent deletion is blocked.'}
                      </p>
                      <p className="text-[11px] text-rose-800">
                        {isBangla
                          ? 'অ্যাকাউন্টিং অডিট ট্রেইল ও ডাবল-এন্ট্রি ব্যালেন্স রক্ষার স্বার্থে স্থায়ীভাবে ডিলিট করা নিষিদ্ধ।'
                          : 'Permanent deletion is prohibited to protect audit trails and ledger integrity.'}
                      </p>
                    </div>
                  </div>

                  {/* Duplicate warning if applicable */}
                  {depCheck.hasDuplicateWarning && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                      <p className="font-semibold">
                        {isBangla
                          ? 'এই সদস্যের ইতিহাস রয়েছে। সরাসরি মুছে ফেলা যাবে না। Duplicate Member Merge/Correction workflow ব্যবহার করুন।'
                          : 'This member has existing records. Direct deletion not permitted. Use Duplicate Member Merge/Correction workflow.'}
                      </p>
                    </div>
                  )}

                  {/* Dependency Breakdown */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isBangla ? 'বিদ্যমান তথ্যের বিবরণ:' : 'Existing Records:'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div className="flex justify-between bg-white px-2 py-1 rounded border border-slate-100">
                        <span>{isBangla ? 'ভর্তি রেকর্ড:' : 'Admissions:'}</span>
                        <span className="font-bold text-slate-800">{depCheck.details.admissionsCount}</span>
                      </div>
                      <div className="flex justify-between bg-white px-2 py-1 rounded border border-slate-100">
                        <span>{isBangla ? 'চাঁদা আদায়:' : 'Collections:'}</span>
                        <span className="font-bold text-slate-800">{depCheck.details.collectionsCount}</span>
                      </div>
                      <div className="flex justify-between bg-white px-2 py-1 rounded border border-slate-100">
                        <span>{isBangla ? 'মূলধন জমা:' : 'Capital Deposits:'}</span>
                        <span className="font-bold text-slate-800">{depCheck.details.capitalDepositsCount}</span>
                      </div>
                      <div className="flex justify-between bg-white px-2 py-1 rounded border border-slate-100">
                        <span>{isBangla ? 'ঋণ হিসাব:' : 'Loans:'}</span>
                        <span className="font-bold text-slate-800">{depCheck.details.loansCount}</span>
                      </div>
                      <div className="flex justify-between bg-white px-2 py-1 rounded border border-slate-100">
                        <span>{isBangla ? 'লেজার এন্ট্রি:' : 'Ledger Entries:'}</span>
                        <span className="font-bold text-slate-800">{depCheck.details.memberLedgerCount}</span>
                      </div>
                      <div className="flex justify-between bg-white px-2 py-1 rounded border border-slate-100">
                        <span>{isBangla ? 'কল্যাণ তহবিল:' : 'Welfare:'}</span>
                        <span className="font-bold text-slate-800">{depCheck.details.welfareTransactionsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* No Financial History -> Permanent Delete Allowed */
                <div className="space-y-3.5">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-slate-700">
                      <p className="font-semibold text-slate-900 text-xs">
                        {isBangla
                          ? 'এই সদস্যের কোনো আর্থিক ইতিহাস নেই। আপনি কি সদস্যটি স্থায়ীভাবে মুছে ফেলতে চান?'
                          : 'This member has no financial transactions. Do you want to permanently delete this member?'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isBangla
                          ? 'যেহেতু কোনো খতিয়ান বা লেনদেন নেই, এটি ডাটাবেজ থেকে সম্পূর্ণ মুছে ফেলা হবে।'
                          : 'Since there is no financial transaction, this member record will be completely removed.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-semibold text-xs transition-all cursor-pointer"
          >
            {isBangla ? 'বাতিল' : 'Cancel'}
          </button>

          {effectiveMode === 'DEACTIVATE' && (
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={isProcessing || !isAdmin}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isBangla ? 'নিষ্ক্রিয় করুন' : 'Deactivate Member'}</span>
            </button>
          )}

          {effectiveMode === 'REACTIVATE' && (
            <button
              type="button"
              onClick={handleReactivate}
              disabled={isProcessing || !isAdmin}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isBangla ? 'সক্রিয় করুন' : 'Reactivate Member'}</span>
            </button>
          )}

          {effectiveMode === 'DELETE' && (
            <>
              {depCheck.hasFinancialHistory ? (
                <button
                  type="button"
                  onClick={() => setOverrideToDeactivate(true)}
                  disabled={!isAdmin}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>{isBangla ? 'সদস্য নিষ্ক্রিয় করুন' : 'Deactivate Member'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isProcessing || !isAdmin}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isBangla ? 'স্থায়ীভাবে মুছুন' : 'Permanently Delete'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

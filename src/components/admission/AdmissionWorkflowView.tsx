import { SOCIETY_OPENING_DATE } from "../../utils/constants";
import React, { useState } from 'react';
import { CommitteeService } from '../../services/committeeService';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { Member, PaymentMethod, Nominee } from '../../types';
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  CreditCard,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export const AdmissionWorkflowView: React.FC = () => {
  const { db, completeMemberAdmission, language, navigateTo } = useApp();
  const isBangla = language === 'bn';

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isProcessingRef = React.useRef(false);

  // Form States
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('1992-05-15');
  const [nid, setNid] = useState('');
  const [occupation, setOccupation] = useState('ব্যবসা');
  const [maritalStatus, setMaritalStatus] = useState('বিবাহিত');
  const [mobile, setMobile] = useState('');
  const [presentAddress, setPresentAddress] = useState('গ্রাম: আতরগাঁও, বাজিতপুর, কিশোরগঞ্জ');
  const [permanentAddress, setPermanentAddress] = useState('গ্রাম: আতরগাঁও, বাজিতপুর, কিশোরগঞ্জ');
  const [bloodGroup, setBloodGroup] = useState('B+');

  // Nominee
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('স্ত্রী');
  const [nomineeMobile, setNomineeMobile] = useState('');
  const [nomineeNid, setNomineeNid] = useState('');
  const [nomineeAddress, setNomineeAddress] = useState('আতরগাঁও, বাজিতপুর');

  // Verification & Financials
  const [isNidVerified, setIsNidVerified] = useState(true);
  const [isAddressVerified, setIsAddressVerified] = useState(true);
  const [admissionFee, setAdmissionFee] = useState<number>(db.settings?.admissionFee ?? 500);
  const [capitalDeposit, setCapitalDeposit] = useState<number>(db.settings?.capitalDeposit ?? 5000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [transactionNo, setTransactionNo] = useState('');
  const activeCommittee = CommitteeService.getActiveCommittee(db);
  const defaultPresident = activeCommittee?.president ? `${activeCommittee.president.fullName} (সভাপতি)` : '';
  const [approvedBy, setApprovedBy] = useState(defaultPresident);
  const [remarks, setRemarks] = useState('নতুন সদস্য ভর্তি কার্যনির্বাহী পর্ষদ কর্তৃক অনুমোদিত');

  const [generatedMemberId, setGeneratedMemberId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Steps handling
  const handleNext = () => {
    setErrorMessage(null);
    if (step === 1) {
      if (!fullName.trim() || !nid.trim() || !mobile.trim()) {
        setErrorMessage('অনুগ্রহ করে নাম, এনআইডি এবং মোবাইল নম্বর প্রদান করুন।');
        return;
      }
      // Check duplicate
      if ((db.members || []).some(m => m.nid.trim() === nid.trim())) {
        setErrorMessage(`এই এনআইডি (${nid}) দিয়ে ইতিমধ্যে একজন সদস্য নিবন্ধিত আছেন!`);
        return;
      }
      if ((db.members || []).some(m => m.mobile.trim() === mobile.trim())) {
        setErrorMessage(`এই মোবাইল নম্বর (${mobile}) ইতিমধ্যে ব্যবহৃত হয়েছে!`);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!nomineeName.trim()) {
        setErrorMessage('অনুগ্রহ করে নমিনির নাম উল্লেখ করুন।');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!isNidVerified || !isAddressVerified) {
        setErrorMessage('ভর্তি নিশ্চিত করতে এনআইডি ও ঠিকানা যাচাই মার্ক করুন।');
        return;
      }
      setStep(4);
    }
  };

  const handleFinalActivation = async () => {
    if (isSubmitting || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const admissionTimeSeed = Date.now();
      const uniqueSuffix = Math.random().toString(36).substring(2, 7);
      const generatedTxnNo = transactionNo || `ADM-TXN-${admissionTimeSeed}-${uniqueSuffix}`;

      const res = await completeMemberAdmission({
        memberData: {
          fullName: fullName.trim(),
          fatherName: fatherName.trim(),
          motherName: motherName.trim(),
          dateOfBirth,
          nid: nid.trim(),
          occupation: occupation.trim(),
          maritalStatus,
          mobile: mobile.trim(),
          presentAddress: presentAddress.trim(),
          permanentAddress: permanentAddress.trim(),
          bloodGroup,
          joiningDate: SOCIETY_OPENING_DATE,
          remarks: `${remarks} (অনুমোদনকারী: ${approvedBy})`,
          nominees: nomineeName.trim() ? [
            {
              nomineeId: `NOM-${admissionTimeSeed}-${uniqueSuffix}`,
              memberId: '',
              name: nomineeName.trim(),
              relation: nomineeRelation.trim(),
              mobile: nomineeMobile.trim(),
              nid: nomineeNid.trim(),
              address: nomineeAddress.trim(),
              percentage: 100
            }
          ] : []
        },
        admissionFee,
        capitalDeposit,
        paymentMethod,
        transactionNo: generatedTxnNo,
        approvedBy,
        remarks: 'সদস্যপদ সক্রিয় ও ভর্তি সম্পন্ন',
        skipCapitalPosting: false,
        isCapitalAlreadyPosted: false
      });

      if (!res.success || !res.member) {
        setErrorMessage(res.message || 'সদস্য ভর্তি সংরক্ষণ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
        setIsSubmitting(false);
        isProcessingRef.current = false;
        return;
      }

      setGeneratedMemberId(res.member.memberId);
      setStep(5);
    } catch (err: any) {
      console.error('Admission activation failed:', err);
      setErrorMessage('সদস্য ভর্তি সংরক্ষণ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
      isProcessingRef.current = false;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'সদস্য ভর্তি ও অনুমোদন কার্যপ্রবাহ (Admission Workflow)' : 'Member Admission'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'ধাপে ধাপে তথ্য যাচাই, ভর্তি ফি, প্রাথমিক মূলধন গ্রহণ এবং সদস্য আইডি তৈরি'
              : 'Step-by-step verified membership onboarding'}
          </p>
        </div>
      </div>

      {/* Workflow Stepper Navigation */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between relative">
          {[
            { num: 1, title: 'সদস্য তথ্য' },
            { num: 2, title: 'নমিনি তথ্য' },
            { num: 3, title: 'কাগজপত্র ও যাচাই' },
            { num: 4, title: 'ফি ও মূলধন' },
            { num: 5, title: 'সদস্যপদ সক্রিয়' }
          ].map(s => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex-1 flex flex-col items-center relative z-10">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-700 text-white'
                      : isCurrent
                      ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-700 shadow-sm'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] mt-1 font-semibold text-center ${
                    isCurrent ? 'text-emerald-800' : 'text-slate-500'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step Contents */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-800 border-b pb-2">
              ধাপ ১: নতুন সদস্যের প্রাথমিক ও যোগাযোগের তথ্য
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">সদস্যের পূর্ণ নাম *</label>
                <input
                  type="text"
                  placeholder="যেমন: তোফায়েল আহমেদ"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">পিতার নাম</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={e => setFatherName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">মাতার নাম</label>
                <input
                  type="text"
                  value={motherName}
                  onChange={e => setMotherName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">জাতীয় পরিচয়পত্র (NID) *</label>
                <input
                  type="text"
                  placeholder="১০ বা ১৭ সংখ্যার NID"
                  value={nid}
                  onChange={e => setNid(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">মোবাইল নম্বর *</label>
                <input
                  type="text"
                  placeholder="017XXXXXXXX"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">রক্তের গ্রুপ</label>
                <select
                  value={bloodGroup}
                  onChange={e => setBloodGroup(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">বর্তমান ঠিকানা</label>
                <textarea
                  rows={2}
                  value={presentAddress}
                  onChange={e => setPresentAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-800 border-b pb-2">
              ধাপ ২: মনোনীত উত্তরাধিকারী (নমিনি) সংক্রান্ত তথ্য
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">নমিনির পূর্ণ নাম *</label>
                <input
                  type="text"
                  placeholder="নমিনির নাম"
                  value={nomineeName}
                  onChange={e => setNomineeName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">সম্পর্ক</label>
                <input
                  type="text"
                  value={nomineeRelation}
                  onChange={e => setNomineeRelation(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">নমিনির মোবাইল</label>
                <input
                  type="text"
                  value={nomineeMobile}
                  onChange={e => setNomineeMobile(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">নমিনির NID (যদি থাকে)</label>
                <input
                  type="text"
                  value={nomineeNid}
                  onChange={e => setNomineeNid(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">নমিনির ঠিকানা</label>
                <input
                  type="text"
                  value={nomineeAddress}
                  onChange={e => setNomineeAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-800 border-b pb-2">
              ধাপ ৩: ডকুমেন্ট সত্যতা যাচাই ও কার্যনির্বাহী অনুমোদন
            </h3>
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isNidVerified}
                  onChange={e => setIsNidVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-800">
                  জাতীয় পরিচয়পত্রের কপি যাচাই করা হয়েছে এবং তথ্য সঠিক
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAddressVerified}
                  onChange={e => setIsAddressVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500"
                />
                <span className="font-semibold text-slate-800">
                  আতরগাঁও গ্রামের স্থায়ী বাসিন্দা হিসেবে পরিচিত ও গ্রহণযোগ্য
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">অনুমোদনকারী কর্মকর্তা</label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={e => setApprovedBy(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">অনুমোদন মন্তব্য</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-800 border-b pb-2">
              ধাপ ৪: ভর্তি ফি ও প্রাথমিক মূলধন গ্রহণ
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ভর্তি ফি (অফেরতযোগ্য আয়)
                </label>
                <input
                  type="number"
                  value={admissionFee}
                  onChange={e => setAdmissionFee(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-800"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  সেটিংস ডিফল্ট: ৳{db.settings.admissionFee}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  প্রাথমিক সদস্য মূলধন জমা (ফেরতযোগ্য সঞ্চয়)
                </label>
                <input
                  type="number"
                  value={capitalDeposit}
                  onChange={e => setCapitalDeposit(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-indigo-900"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  সেটিংস ডিফল্ট: ৳{db.settings.capitalDeposit}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">পরিশোধের মাধ্যম</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="Cash">নগদ (Cash in Hand)</option>
                  <option value="Bank">ব্যাংক ডিপোজিট (Bank Account)</option>
                  <option value="Mobile Banking">মোবাইল ব্যাংকিং (bKash/Nagad)</option>
                  <option value="Other">অন্যান্য</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ট্রানজেকশন / রেফারেন্স নং
                </label>
                <input
                  type="text"
                  placeholder="ঐচ্ছিক মানি রসিদ বা ডিপোজিট স্লিপ"
                  value={transactionNo}
                  onChange={e => setTransactionNo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-800">সর্বমোট প্রদেয় অর্থ:</span>
              <span className="text-lg font-black text-emerald-800">
                ৳{(admissionFee + capitalDeposit)?.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="py-6 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              সদস্য ভর্তি ও একাউন্ট সক্রিয়করণ সফল হয়েছে!
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              সদস্য <span className="font-bold text-slate-900">{fullName}</span> কে সমিতিতে সক্রিয় সদস্য হিসেবে নথিভুক্ত করা হয়েছে।
            </p>

            <div className="inline-block bg-emerald-50 border-2 border-emerald-600 px-6 py-2 rounded-xl">
              <span className="text-xs text-emerald-800 font-medium block">নতুন সদস্য আইডি:</span>
              <span className="text-xl font-mono font-black text-emerald-900 tracking-wider">
                {generatedMemberId}
              </span>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => navigateTo('MEMBERS')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md transition-all"
              >
                সদস্য তালিকায় যান
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  setFullName('');
                  setNid('');
                  setMobile('');
                  setNomineeName('');
                  setGeneratedMemberId(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                আরেকজন সদস্য ভর্তি করুন
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        {step < 5 && (
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>পেছনে যান</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <span>পরবর্তী ধাপ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalActivation}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black px-6 py-2 rounded-xl shadow-lg transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>সংরক্ষণ ও সক্রিয় করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>সদস্যপদ সক্রিয় ও অনুমোদন করুন</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

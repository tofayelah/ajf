import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { submitMemberPaymentRequestAPI, getMemberPaymentRequestsAPI } from '../../services/api';
import { 
  Building2, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle, 
  ArrowLeft, 
  Copy, 
  Check, 
  Receipt, 
  Calendar, 
  ShieldCheck, 
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { MemberPaymentRequest } from '../../types';

export const MemberChandaPaymentView: React.FC = () => {
  const { db, activeUser, language, navigateTo } = useApp();
  const isBangla = language === 'bn';

  const [activeStep, setActiveStep] = useState<'PROMPT' | 'FORM' | 'SUCCESS'>('PROMPT');
  const [requests, setRequests] = useState<MemberPaymentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<MemberPaymentRequest | null>(null);

  // Identify Member
  const member = (db.members || []).find(m => m.memberId === activeUser?.linkedMemberId);

  // Authoritative Due Calculation via AccountingService
  const dueInfo = member
    ? AccountingService.calculateMemberDue(
        member,
        db.collections || [],
        db.settings?.monthlyContribution || 1000,
        db.settings?.lateFine || 0,
        db.settings?.latePaymentDay || 10
      )
    : {
        monthsDueCount: 0,
        unpaidMonths: [],
        totalDueAmount: 0,
        totalContributionDue: 0,
        totalLateFineDue: 0,
        unpaidMonthDetails: [],
        allMonthDetails: []
      };

  // Current Month String (e.g. "2026-09")
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Format month names
  const formatMonthDisplay = (monthYearStr: string) => {
    try {
      const [y, m] = monthYearStr.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return {
        en: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        bn: d.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' })
      };
    } catch {
      return { en: monthYearStr, bn: monthYearStr };
    }
  };

  const currentMonthDisplay = formatMonthDisplay(currentMonthStr);

  // Find current month due info or first unpaid month
  const currentMonthDueDetail = dueInfo.unpaidMonthDetails?.find(d => d.month === currentMonthStr);
  const selectedTargetMonth = currentMonthDueDetail?.month || dueInfo.unpaidMonths?.[0] || currentMonthStr;
  const targetMonthDisplay = formatMonthDisplay(selectedTargetMonth);

  // Official Due Amount for target month
  const targetMonthDueAmount = currentMonthDueDetail 
    ? currentMonthDueDetail.totalDue 
    : (dueInfo.unpaidMonthDetails?.[0]?.totalDue || db.settings?.monthlyContribution || 1000);
  
  const totalOutstandingDue = dueInfo.totalDueAmount || 0;
  const isCurrentMonthPaid = !currentMonthDueDetail && totalOutstandingDue === 0;

  // AJF Official bKash Configuration (Configurable from Settings)
  const officialBkashNumber = db.settings?.companyBkashNumber || '01711-234567';
  const officialBkashType = db.settings?.companyBkashType || 'Merchant';

  // Form State
  const [formData, setFormData] = useState({
    requestedAmount: targetMonthDueAmount > 0 ? targetMonthDueAmount : (db.settings?.monthlyContribution || 1000),
    transactionId: '',
    senderMobile: member?.mobile || activeUser?.mobile || '',
    paymentDate: now.toISOString().split('T')[0],
    paymentTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    note: ''
  });

  // Sync default amount when due calculation finishes
  useEffect(() => {
    if (targetMonthDueAmount > 0) {
      setFormData(prev => ({ ...prev, requestedAmount: targetMonthDueAmount }));
    }
  }, [targetMonthDueAmount]);

  // Load Member's Payment Requests
  const loadRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await getMemberPaymentRequestsAPI();
      setRequests(res.requests || []);
    } catch (err) {
      console.error('Failed to load member payment requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(officialBkashNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!member) {
      setSubmissionError(isBangla ? 'সদস্য প্রোফাইল পাওয়া যায়নি।' : 'Member profile not found.');
      return;
    }

    // MANDATORY Transaction ID Validation
    const trimmedTrxId = formData.transactionId.trim();
    if (!trimmedTrxId) {
      setSubmissionError(
        isBangla 
          ? 'বিকাশ ট্রানজেকশন আইডি (TrxID) দেওয়া আবশ্যক।' 
          : 'bKash Transaction ID (TrxID) is mandatory.'
      );
      return;
    }

    // MANDATORY Sender Mobile Validation
    if (!formData.senderMobile.trim()) {
      setSubmissionError(
        isBangla 
          ? 'প্রেরকের বিকাশ মোবাইল নম্বর দেওয়া আবশ্যক।' 
          : 'Sender bKash mobile number is required.'
      );
      return;
    }

    // Amount Validation
    const amountNum = Number(formData.requestedAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setSubmissionError(
        isBangla 
          ? 'পরিশোধের পরিমাণ অবশ্যই ০-এর চেয়ে বেশি হতে হবে।' 
          : 'Payment amount must be greater than zero.'
      );
      return;
    }

    // Amount cannot exceed authorized outstanding due
    if (totalOutstandingDue > 0 && amountNum > totalOutstandingDue) {
      setSubmissionError(
        isBangla
          ? `পরিশোধের পরিমাণ আপনার অনুমোদিত মোট বকেয়া (৳${totalOutstandingDue}) এর চেয়ে বেশি হতে পারবে না।`
          : `Payment amount cannot exceed your authorized total due (৳${totalOutstandingDue}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const [targetYear, targetMonthNum] = selectedTargetMonth.split('-');
      const payload = {
        memberId: member.memberId,
        month: targetMonthNum || '09',
        year: Number(targetYear) || now.getFullYear(),
        dueAmount: targetMonthDueAmount,
        requestedAmount: amountNum,
        paymentMethod: 'bKash',
        senderMobile: formData.senderMobile.trim(),
        transactionId: trimmedTrxId.toUpperCase(),
        paymentDate: formData.paymentDate,
        paymentTime: formData.paymentTime,
        note: formData.note.trim()
      };

      const res = await submitMemberPaymentRequestAPI(payload);

      if (res && res.success && res.request) {
        setSubmittedRequest(res.request);
        setActiveStep('SUCCESS');
        await loadRequests();
      } else {
        setSubmissionError(res?.error || (isBangla ? 'পেমেন্ট অনুরোধ প্রক্রিয়া করতে ব্যর্থ হয়েছে।' : 'Failed to submit payment request.'));
      }
    } catch (err: any) {
      console.error('Error submitting payment request:', err);
      setSubmissionError(err?.message || (isBangla ? 'পেমেন্ট অনুরোধ জমা দেওয়ার সময় ত্রুটি ঘটেছে।' : 'Error submitting payment request.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!member) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">
          {isBangla ? 'সদস্য তথ্য লোড করা যায়নি' : 'Member Profile Not Found'}
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          {isBangla ? 'আপনার অ্যাকাউন্টের সাথে কোনো সদস্য আইডি যুক্ত নেই।' : 'No linked member ID found for your account.'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo('DASHBOARD')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title={isBangla ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>{isBangla ? 'মাসিক চাঁদা পরিশোধ অনুরোধ' : 'Monthly Chanda Payment Request'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {isBangla ? 'সদস্য:' : 'Member:'} <strong>{member.fullName}</strong> ({member.memberId})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {isBangla ? 'নিরাপদ পেমেন্ট গেটওয়ে' : 'Secure Verification Workflow'}
          </span>
        </div>
      </div>

      {/* DUE SUMMARY CARD (AUTHORITATIVE VIA ACCOUNTING SERVICE) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {isBangla ? 'চলতি মাস' : 'Current Month'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {isBangla ? currentMonthDisplay.bn : currentMonthDisplay.en}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {isBangla ? 'সমিতির হিসাবরক্ষণ শাখা অনুযায়ী বর্তমান বকেয়া স্থিতি' : 'Authoritative dues assessed by Accounting Service'}
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700/60">
            <div>
              <p className="text-xs text-slate-400 font-medium">{isBangla ? 'চলতি মাসের চাঁদা' : 'Monthly Chanda Due'}</p>
              <p className="text-2xl font-black text-emerald-400">৳{targetMonthDueAmount.toLocaleString()}</p>
            </div>
            <div className="h-8 w-px bg-slate-700 hidden sm:block" />
            <div>
              <p className="text-xs text-slate-400 font-medium">{isBangla ? 'মোট বকেয়া' : 'Total Outstanding'}</p>
              <p className="text-2xl font-black text-rose-400">৳{totalOutstandingDue.toLocaleString()}</p>
            </div>
            <div className="h-8 w-px bg-slate-700 hidden sm:block" />
            <div>
              <p className="text-xs text-slate-400 font-medium">{isBangla ? 'পরিশোধ স্থিতি' : 'Payment Status'}</p>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${
                totalOutstandingDue > 0 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {totalOutstandingDue > 0 ? (isBangla ? 'বকেয়া (DUE)' : 'DUE') : (isBangla ? 'পরিশোধিত (PAID)' : 'PAID')}
              </span>
            </div>
          </div>
        </div>

        {/* Previous Unpaid Months Notice if any */}
        {dueInfo.unpaidMonths && dueInfo.unpaidMonths.length > 1 && (
          <div className="p-4 bg-amber-50 border-t border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-900">
              <span className="font-bold">{isBangla ? 'পূর্ববর্তী বকেয়া মাসসমূহ:' : 'Previous Unpaid Months:'}</span>{' '}
              {dueInfo.unpaidMonths.map(m => formatMonthDisplay(m)[isBangla ? 'bn' : 'en']).join(', ')}.
              <span className="ml-1 text-amber-800">
                {isBangla 
                  ? 'পূর্ববর্তী বকেয়া থাকলে ক্রমানুসারে পরিশোধ করা শ্রেয়।' 
                  : 'Previous dues are prioritized in chronological order.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* STEP 1: PAYMENT QUESTION PROMPT */}
      {activeStep === 'PROMPT' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
            <Smartphone className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              {isBangla ? 'আপনি কি এখন চাঁদা পরিশোধ করতে চান?' : 'Do you want to make payment?'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isBangla 
                ? 'অনলাইনে অফিসিয়াল বিকাশ নম্বরে পেমেন্ট সম্পন্ন করে TrxID সাবমিট করুন। অ্যাডমিন ভেরিফাই করলে আপনার রসিদ তৈরি হবে।'
                : 'Complete payment externally via our official AJF bKash account, then submit your transaction TrxID for verification.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveStep('FORM')}
              className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isBangla ? 'হ্যাঁ, পরিশোধ করতে চাই' : 'Yes, Make Payment'}</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('DASHBOARD')}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              <span>{isBangla ? 'এখন নয় (ড্যাশবোর্ডে ফিরুন)' : 'Not Now (Return to Dashboard)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PAYMENT FORM */}
      {activeStep === 'FORM' && (
        <div className="space-y-6">
          {/* Official AJF bKash Details Banner */}
          <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 border-2 border-pink-200 p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-200/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-xs">
                  bK
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>{isBangla ? 'এজেএফ অফিসিয়াল বিকাশ অ্যাকাউন্ট' : 'AJF Official bKash Account'}</span>
                  </h3>
                  <p className="text-xs text-slate-600">
                    {isBangla ? 'সোসাইটির অনুমোদিত অফিসিয়াল কালেকশন অ্যাকাউন্ট' : 'Society Authoritative Collection Account'}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase bg-pink-100 text-pink-800 border border-pink-300 self-start sm:self-auto">
                {officialBkashType} Account
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-pink-100 space-y-1">
                <p className="text-xs text-slate-500 font-medium">{isBangla ? 'বিকাশ নম্বর:' : 'bKash Number:'}</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-lg text-pink-700 tracking-wider">
                    {officialBkashNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="p-1.5 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                    title={isBangla ? 'নম্বর কপি করুন' : 'Copy Number'}
                  >
                    {copiedNumber ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-pink-100 space-y-1">
                <p className="text-xs text-slate-500 font-medium">{isBangla ? 'অ্যাকাউন্ট ধরন:' : 'Account Type:'}</p>
                <p className="font-bold text-slate-800 text-base">
                  {officialBkashType === 'Merchant' 
                    ? (isBangla ? 'মার্চেন্ট (Payment অপশন)' : 'Merchant (Use Make Payment)') 
                    : (isBangla ? 'পার্সোনাল (Send Money অপশন)' : 'Personal (Use Send Money)')}
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-pink-100 space-y-1">
                <p className="text-xs text-slate-500 font-medium">{isBangla ? 'পরিশোধযোগ্য চাঁদা:' : 'Payable Amount:'}</p>
                <p className="font-mono font-black text-lg text-emerald-700">
                  ৳{targetMonthDueAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-3 bg-pink-100/60 rounded-xl text-xs text-pink-900 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-pink-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>{isBangla ? 'নির্দেশনা:' : 'Instructions:'}</strong>{' '}
                {isBangla 
                  ? 'প্রথমে আপনার বিকাশ অ্যাপ ওপেন করে উপরের নম্বরে নির্ধারিত টাকা পরিশোধ করুন। ট্রানজেকশন সফল হলে এসএমএস থেকে প্রাপ্ত TrxID (ট্রানজেকশন আইডি) এবং প্রেরক নম্বর নিচের ফর্মে লিখুন।'
                  : 'Please complete your bKash payment first. Then copy the TrxID received from bKash and submit the form below.'}
              </p>
            </div>
          </div>

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                {isBangla ? 'পেমেন্ট ট্রানজেকশন তথ্য ফরম' : 'Payment Transaction Details Form'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveStep('PROMPT')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
              >
                {isBangla ? 'বাতিল করুন' : 'Cancel'}
              </button>
            </div>

            {submissionError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{isBangla ? 'ত্রুটি:' : 'Error:'}</span> {submissionError}
                </div>
              </div>
            )}

            {/* Read-Only Server Controlled Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-medium">{isBangla ? 'সদস্যের নাম:' : 'Member Name:'}</span>
                <p className="font-bold text-slate-800 mt-0.5">{member.fullName}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">{isBangla ? 'সদস্য আইডি:' : 'Member ID:'}</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{member.memberId}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">{isBangla ? 'চাঁদার মাস ও সাল:' : 'Chanda Month & Year:'}</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {isBangla ? targetMonthDisplay.bn : targetMonthDisplay.en}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">{isBangla ? 'অফিসিয়াল বকেয়া:' : 'Authoritative Due:'}</span>
                <p className="font-black text-emerald-700 mt-0.5">৳{targetMonthDueAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Member Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isBangla ? 'পরিশোধের পরিমাণ (টাকা) *' : 'Payment Amount (BDT) *'}
                </label>
                <input
                  type="number"
                  name="requestedAmount"
                  min="1"
                  max={totalOutstandingDue > 0 ? totalOutstandingDue : undefined}
                  value={formData.requestedAmount}
                  onChange={(e) => setFormData({ ...formData, requestedAmount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {isBangla ? 'বকেয়া পরিমাণের বেশি প্রদান করা যাবে না।' : 'Cannot exceed total assessed due.'}
                </span>
              </div>

              {/* MANDATORY TRANSACTION ID (TrxID) */}
              <div>
                <label className="block text-xs font-bold text-pink-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>{isBangla ? 'বিকাশ TrxID (ট্রানজেকশন আইডি) *' : 'bKash TrxID (Transaction ID) *'}</span>
                  <span className="text-[10px] text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded font-bold border border-pink-200">
                    {isBangla ? 'বাধ্যতামূলক' : 'MANDATORY'}
                  </span>
                </label>
                <input
                  type="text"
                  name="transactionId"
                  placeholder="e.g. BLA892KJ1X"
                  value={formData.transactionId}
                  onChange={(e) => setFormData({ ...formData, transactionId: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 border-2 border-pink-300 rounded-xl text-sm font-mono font-bold text-slate-900 uppercase focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-hidden bg-pink-50/20"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {isBangla ? 'বিকাশ পেমেন্ট কনফার্মেশন এসএমএস থেকে TrxID দিন।' : 'Enter the TrxID from your bKash confirmation SMS.'}
                </span>
              </div>

              {/* Sender Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isBangla ? 'প্রেরকের বিকাশ মোবাইল নম্বর *' : 'Sender bKash Mobile Number *'}
                </label>
                <input
                  type="text"
                  name="senderMobile"
                  placeholder="01XXXXXXXXX"
                  value={formData.senderMobile}
                  onChange={(e) => setFormData({ ...formData, senderMobile: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                  required
                />
              </div>

              {/* Payment Method (Read-only bKash) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isBangla ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}
                </label>
                <input
                  type="text"
                  value="bKash (বিকাশ)"
                  readOnly
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-100 rounded-xl text-sm font-semibold text-slate-600 outline-hidden cursor-not-allowed"
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isBangla ? 'পেমেন্টের তারিখ *' : 'Payment Date *'}
                </label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                  required
                />
              </div>

              {/* Payment Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isBangla ? 'পেমেন্টের সময়' : 'Payment Time'}
                </label>
                <input
                  type="text"
                  name="paymentTime"
                  placeholder="e.g. 10:45 AM"
                  value={formData.paymentTime}
                  onChange={(e) => setFormData({ ...formData, paymentTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            {/* Note / Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isBangla ? 'অতিরিক্ত মন্তব্য (যদি থাকে)' : 'Remarks / Note (Optional)'}
              </label>
              <textarea
                rows={2}
                name="note"
                placeholder={isBangla ? 'পেমেন্ট সংক্রান্ত কোনো বিবরণ বা নোট থাকলে লিখুন...' : 'Any optional note or details...'}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>

            {/* Compliance Assurance Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">
                {isBangla ? 'গুরুত্বপূর্ণ নিয়মাবলী ও সতর্কতা:' : 'Security & Verification Policy:'}
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  {isBangla 
                    ? 'আপনার অনুরোধ জমা দেওয়ার পর স্ট্যাটাস হবে "অ্যাডমিন ভেরিফিকেশনের অপেক্ষায়"।' 
                    : 'Submitted requests will be assigned PENDING ADMIN VERIFICATION status.'}
                </li>
                <li>
                  {isBangla 
                    ? 'অ্যাডমিন বিকাশ স্টেটমেন্টের সাথে ট্রানজেকশন আইডি (TrxID) মিলিয়ে অনুমোদন দিলে অফিসিয়াল রসিদ তৈরি হবে।' 
                    : 'Official collection receipts will only be generated after Admin verifies the transaction.'}
                </li>
                <li>
                  {isBangla 
                    ? 'ভুয়া বা ডুপ্লিকেট ট্রানজেকশন আইডি প্রদান করা হলে অনুরোধ সরাসরি বাতিল হবে।' 
                    : 'Duplicate or unverified transaction IDs will be immediately rejected.'}
                </li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveStep('PROMPT')}
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
              >
                {isBangla ? 'বাতিল করুন' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={submitting || !formData.transactionId.trim()}
                className="w-full sm:w-auto px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isBangla ? 'অনুরোধ জমা হচ্ছে...' : 'Submitting Request...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isBangla ? 'পেমেন্ট অনুরোধ জমা দিন' : 'Submit Payment Request'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: SUBMISSION SUCCESS CONFIRMATION */}
      {activeStep === 'SUCCESS' && submittedRequest && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 shadow-xs space-y-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-300">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {isBangla ? 'পেমেন্ট অনুরোধ সফলভাবে জমা হয়েছে!' : 'Payment Request Submitted Successfully!'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isBangla 
                ? 'আপনার অনুরোধটি গ্রহণ করা হয়েছে এবং বর্তমানে অ্যাডমিন ভেরিফিকেশনের জন্য অপেক্ষমাণ রয়েছে।' 
                : 'Your payment details have been received and are currently pending admin verification.'}
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">{isBangla ? 'অনুরোধ আইডি:' : 'Request ID:'}</span>
              <span className="font-mono font-bold text-slate-800">{submittedRequest.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">{isBangla ? 'সদস্য:' : 'Member:'}</span>
              <span className="font-bold text-slate-800">{submittedRequest.memberNameSnapshot}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">{isBangla ? 'মাস ও সাল:' : 'Month & Year:'}</span>
              <span className="font-bold text-slate-800">{submittedRequest.month}/{submittedRequest.year}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">{isBangla ? 'টাকার পরিমাণ:' : 'Amount:'}</span>
              <span className="font-bold text-emerald-700">৳{submittedRequest.requestedAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">{isBangla ? 'বিকাশ TrxID:' : 'bKash TrxID:'}</span>
              <span className="font-mono font-black text-pink-700">{submittedRequest.transactionId}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">{isBangla ? 'বর্তমান স্ট্যাটাস:' : 'Current Status:'}</span>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-xs">
                {isBangla ? 'অ্যাডমিন ভেরিফিকেশনের অপেক্ষায়' : 'PENDING ADMIN VERIFICATION'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveStep('PROMPT')}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              {isBangla ? 'নতুন অনুরোধ' : 'New Request'}
            </button>
            <button
              type="button"
              onClick={() => navigateTo('DASHBOARD')}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isBangla ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}
            </button>
          </div>
        </div>
      )}

      {/* MY PAYMENT REQUESTS STATUS & HISTORY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              {isBangla ? 'আমার পেমেন্ট অনুরোধসমূহ ও স্থিতি' : 'My Payment Requests & Verification Status'}
            </h3>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full">
            {requests.length} {isBangla ? 'টি অনুরোধ' : 'requests'}
          </span>
        </div>

        {loadingRequests ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {isBangla ? 'অনুরোধসমূহ লোড হচ্ছে...' : 'Loading payment requests...'}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            {isBangla ? 'এখনও কোনো পেমেন্ট অনুরোধ জমা দেওয়া হয়নি।' : 'No payment requests submitted yet.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req) => (
              <div key={req.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">
                      {req.month}/{req.year} {isBangla ? 'চাঁদা' : 'Chanda'}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold border border-slate-200">
                      {req.id}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-mono text-pink-700 font-bold">
                      TrxID: {req.transactionId}
                    </span>
                    <span>
                      {isBangla ? 'তারিখ:' : 'Date:'} {req.paymentDate}
                    </span>
                    {req.senderMobile && (
                      <span>
                        {isBangla ? 'প্রেরক:' : 'Sender:'} {req.senderMobile}
                      </span>
                    )}
                  </div>

                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium inline-flex items-center gap-1.5 mt-1">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{isBangla ? 'প্রত্যাখ্যানের কারণ:' : 'Rejection Reason:'} {req.rejectionReason}</span>
                    </div>
                  )}

                  {req.status === 'APPROVED' && req.approvedReceiptNo && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium inline-flex items-center gap-1.5 mt-1">
                      <Receipt className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>{isBangla ? 'অফিসিয়াল রসিদ নং:' : 'Official Receipt:'} <strong className="font-mono">{req.approvedReceiptNo}</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <span className="font-black text-lg sm:text-xl text-slate-900">
                    ৳{req.requestedAmount.toLocaleString()}
                  </span>

                  {req.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      {isBangla ? 'অপেক্ষমাণ (ভেরিফিকেশন চলছে)' : 'PENDING VERIFICATION'}
                    </span>
                  )}

                  {req.status === 'APPROVED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {isBangla ? 'অনুমোদিত ও সম্পন্ন' : 'APPROVED & POSTED'}
                    </span>
                  )}

                  {req.status === 'REJECTED' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-bold border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      {isBangla ? 'প্রত্যাখ্যাত' : 'REJECTED'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

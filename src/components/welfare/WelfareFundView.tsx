import React, { useState } from 'react';
import { AttachmentModal } from '../shared/AttachmentModal';
import { useApp } from '../../context/AppContext';
import { PaymentMethod, ReserveUtilization, WelfareFundTransaction } from '../../types';
import { AccountingService } from '../../services/accounting';
import { PdfService } from '../../services/pdfService';
import { ReserveFundSection } from './ReserveFundSection';
import { validateFyGuard, isDateInClosedYear } from '../../utils/fyGuard';
import { WelfareTransactionEditModal } from './WelfareTransactionEditModal';
import { WelfareTransactionDetailsModal } from './WelfareTransactionDetailsModal';
import { WelfareReversalModal } from './WelfareReversalModal';
import {
  HeartHandshake,
  ShieldCheck,
  AlertCircle,
  PlusCircle,
  Printer,
  Calendar,
  Users,
  User,
  Search,
  CheckCircle2,
  Paperclip,
  Pencil,
  Trash2,
  Eye,
  RotateCcw,
  FileText,
  AlertTriangle,
  Lock,
  Filter
} from 'lucide-react';

export const WelfareFundView: React.FC = () => {
  const {
    db,
    postWelfarePayment,
    deleteWelfareTransaction,
    addReserveUtilization,
    updateReserveUtilizationStatus,
    payReserveUtilization,
    language,
    activeUser
  } = useApp();

  const isBangla = language === 'bn';
  const isAuthorized = activeUser && activeUser.role !== 'MEMBER';

  const summary = AccountingService.calculateFinancialSummary(db);
  const existingFinalized = (db.historicalProfits || []).find(
    hp => hp.financialYear === db.settings.currentFinancialYear
  );
  const isFinalized = !!existingFinalized;
  const displayWelfarePercent = isFinalized ? existingFinalized.welfarePercent : db.settings.profitWelfarePercent;
  const displayEmergencyPercent = isFinalized ? existingFinalized.emergencyPercent : db.settings.profitEmergencyPercent;
  const displayReservePercent = isFinalized ? existingFinalized.reservePercent : db.settings.profitReservePercent;

  // View & Modal States
  const [activeFundTab, setActiveFundTab] = useState<'WELFARE_EMERGENCY' | 'RESERVE'>('WELFARE_EMERGENCY');
  const [subFilterTab, setSubFilterTab] = useState<'ALL' | 'WELFARE' | 'EMERGENCY' | 'REVERSED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [selectedTransactionForView, setSelectedTransactionForView] = useState<WelfareFundTransaction | null>(null);
  const [selectedTransactionForEdit, setSelectedTransactionForEdit] = useState<WelfareFundTransaction | null>(null);
  const [selectedTransactionForReversal, setSelectedTransactionForReversal] = useState<WelfareFundTransaction | null>(null);
  const [selectedTransactionForDelete, setSelectedTransactionForDelete] = useState<WelfareFundTransaction | null>(null);
  const [selectedWelfareForAttachments, setSelectedWelfareForAttachments] = useState<string | null>(null);

  // New Distribution Form State
  const [fundType, setFundType] = useState<'WELFARE' | 'EMERGENCY'>('WELFARE');
  const [beneficiaryType, setBeneficiaryType] = useState<'MEMBER' | 'NON_MEMBER'>('MEMBER');
  const [memberId, setMemberId] = useState<string>('');
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryMobile, setBeneficiaryMobile] = useState('');
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
  const [purpose, setPurpose] = useState('চিকিৎসা সহায়তা অনুদান');
  const [amount, setAmount] = useState<number>(3000);
  const [approvedBy, setApprovedBy] = useState('কার্যনির্বাহী পরিষদ');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [resolutionNo, setResolutionNo] = useState('');
  const [remarks, setRemarks] = useState('সমিতির কল্যাণ নীতিমালা অনুযায়ী অনুদান প্রদান');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState<string | null>(null);

  // Member selection handler for new voucher modal
  const handleMemberSelect = (selectedId: string) => {
    setMemberId(selectedId);
    if (!selectedId) return;
    const m = (db.members || []).find(mem => mem.memberId === selectedId);
    if (m) {
      setBeneficiaryName(m.fullName);
      setBeneficiaryMobile(m.mobile || '');
      setBeneficiaryAddress(m.presentAddress || '');
    }
  };

  const handleOpenDistributeModal = () => {
    setFormError(null);
    setFundType('WELFARE');
    setBeneficiaryType('MEMBER');
    setMemberId('');
    setMemberSearch('');
    setBeneficiaryName('');
    setBeneficiaryMobile('');
    setBeneficiaryAddress('');
    setPurpose('চিকিৎসা সহায়তা অনুদান');
    setAmount(3000);
    setApprovedBy(activeUser?.fullName || 'কার্যনির্বাহী পরিষদ');
    setPaymentMethod('Cash');
    setTransactionNumber('');
    setResolutionNo('');
    setRemarks('সমিতির কল্যাণ নীতিমালা অনুযায়ী অনুদান প্রদান');
    setDateStr(new Date().toISOString().split('T')[0]);
    setIsDistributeModalOpen(true);
  };

  const handleDistributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isDateInClosedYear(dateStr, db)) {
      setFormError('এই অর্থবছর বন্ধ রয়েছে। নতুন লেনদেন যোগ করা যাবে না।');
      return;
    }

    if (beneficiaryType === 'MEMBER' && !memberId) {
      setFormError('অনুগ্রহ করে একজন সক্রিয় সদস্য নির্বাচন করুন!');
      return;
    }

    if (!beneficiaryName.trim()) {
      setFormError('সুবিধাভোগীর নাম আবশ্যক!');
      return;
    }

    if (amount <= 0) {
      setFormError('অনুদানের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে!');
      return;
    }

    const res = await postWelfarePayment({
      fundType,
      beneficiary: beneficiaryName.trim(),
      beneficiaryName: beneficiaryName.trim(),
      beneficiaryMobile: beneficiaryMobile.trim(),
      beneficiaryAddress: beneficiaryAddress.trim(),
      beneficiaryType,
      memberId: beneficiaryType === 'MEMBER' ? memberId : undefined,
      purpose: purpose.trim(),
      reason: purpose.trim(),
      amount,
      approvedBy: approvedBy.trim(),
      paymentMethod,
      transactionNumber: transactionNumber.trim(),
      resolutionNo: resolutionNo.trim(),
      remarks: remarks.trim(),
      date: dateStr
    });

    if (res.success) {
      setIsDistributeModalOpen(false);
    } else {
      setFormError(res.message);
    }
  };

  // State-Aware Delete or Reversal Dispatcher
  const handleDeleteOrReverseClick = (w: WelfareFundTransaction) => {
    if (!isAuthorized) return;

    if (isDateInClosedYear(w.date, db)) {
      alert('এই অর্থবছর বন্ধ রয়েছে। কোনো পূর্ববর্তী লেনদেন পরিবর্তন বা ডিলিট করা যাবে না।');
      return;
    }

    // Check if posted to cash, bank, or journal
    const hasCash = (db.cashTransactions || []).some(
      c => c.sourceId === w.fundId || c.voucherNo === w.voucherNo
    );
    const hasBank = (db.bankTransactions || []).some(
      b => b.sourceId === w.fundId || b.transactionNo === w.voucherNo || b.reference === w.voucherNo
    );
    const hasJournal = (db.journalEntries || []).some(
      j => j.sourceId === w.fundId || j.journalNo === w.voucherNo
    );

    if (hasCash || hasBank || hasJournal) {
      // Must use Reversal workflow
      setSelectedTransactionForReversal(w);
    } else {
      // Safe to hard delete unposted record
      setSelectedTransactionForDelete(w);
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedTransactionForDelete) return;
    deleteWelfareTransaction(selectedTransactionForDelete.fundId);
    setSelectedTransactionForDelete(null);
  };

  // Filter distribution records
  const filteredDistributions = (db.welfareTransactions || []).filter(w => {
    // Only welfare & emergency funds in this table
    if (w.fundType !== 'WELFARE' && w.fundType !== 'EMERGENCY') return false;

    // Sub filter tab
    const isReversed = w.approvalStatus === 'REVERSED' || w.status === 'REVERSED';
    if (subFilterTab === 'WELFARE' && (w.fundType !== 'WELFARE' || isReversed)) return false;
    if (subFilterTab === 'EMERGENCY' && (w.fundType !== 'EMERGENCY' || isReversed)) return false;
    if (subFilterTab === 'REVERSED' && !isReversed) return false;

    // Search query resolution
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();

    const member = w.memberId
      ? (db.members || []).find(m => m.memberId === w.memberId)
      : undefined;
    const resolvedName = (member?.fullName || w.beneficiaryName || w.beneficiary || '').toLowerCase();
    const resolvedMemberId = (w.memberId || '').toLowerCase();
    const resolvedVoucher = (w.voucherNo || '').toLowerCase();
    const resolvedReason = (w.reason || w.purpose || '').toLowerCase();

    return (
      resolvedVoucher.includes(query) ||
      resolvedName.includes(query) ||
      resolvedMemberId.includes(query) ||
      resolvedReason.includes(query)
    );
  });

  const handlePrint = () => {
    PdfService.printElement('printable-welfare-register', 'Welfare_Fund_Register');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'কল্যাণ, জরুরী ও সংরক্ষিত তহবিল (Welfare Funds)' : 'Welfare & Emergency Funds'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'সমাজকল্যাণমূলক চিকিৎসা সহায়তা, দুর্যোগ ত্রাণ এবং জরুরি আর্থিক অনুদান রেজিস্টার'
              : 'Society charity, medical aid & emergency reserves'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{isBangla ? 'প্রিন্ট' : 'Print'}</span>
          </button>
          {isAuthorized && (
            <button
              onClick={handleOpenDistributeModal}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isBangla ? '+ অনুদান প্রদান ভাউচার' : '+ Distribute Aid'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Funds Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Welfare */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">কল্যাণ তহবিল ব্যালেন্স</span>
            <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
              {displayWelfarePercent}% শেয়ার
            </span>
          </div>
          <span className="text-2xl font-black text-purple-900">
            ৳{summary.welfareFundBalance?.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">চিকিৎসা ও সামাজিক সহায়তা তহবিল</span>
        </div>

        {/* Emergency */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">জরুরী তহবিল ব্যালেন্স</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
              {displayEmergencyPercent}% শেয়ার
            </span>
          </div>
          <span className="text-2xl font-black text-amber-900">
            ৳{summary.emergencyFundBalance?.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">তাৎক্ষণিক দুর্যোগ ও বিপদকালীন সাহায্য</span>
        </div>

        {/* Reserve */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">সংরক্ষিত তহবিল (Reserve)</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
              {displayReservePercent}% শেয়ার
            </span>
          </div>
          <span className="text-2xl font-black text-blue-900">
            ৳{summary.reserveFundBalance?.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">সমিতির স্থায়ী নিরাপত্তা তহবিল</span>
        </div>
      </div>

      {/* Main Module Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t-xl gap-3 text-xs font-bold mt-4">
        <button
          onClick={() => setActiveFundTab('WELFARE_EMERGENCY')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeFundTab === 'WELFARE_EMERGENCY'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          <span>{isBangla ? 'প্রদত্ত অনুদান ও সহায়তা রেজিস্টার' : 'Welfare Distribution Register'}</span>
        </button>
        <button
          onClick={() => setActiveFundTab('RESERVE')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 ${
            activeFundTab === 'RESERVE'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isBangla ? 'সংরক্ষিত তহবিল (Reserve Fund)' : 'Reserve Fund Utilizations'}</span>
        </button>
      </div>

      {/* Section 1: Reserve Fund Tab */}
      {activeFundTab === 'RESERVE' && <ReserveFundSection />}

      {/* Section 2: Welfare & Emergency Distribution Register */}
      {activeFundTab === 'WELFARE_EMERGENCY' && (
        <div
          id="printable-welfare-register"
          className="bg-white rounded-b-2xl border border-t-0 border-slate-200 shadow-sm overflow-hidden"
        >
          {/* Controls Bar: Sub-filters & Search */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSubFilterTab('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  subFilterTab === 'ALL'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                সকল অনুদান ({db.welfareTransactions?.filter(w => w.fundType === 'WELFARE' || w.fundType === 'EMERGENCY').length || 0})
              </button>
              <button
                onClick={() => setSubFilterTab('WELFARE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  subFilterTab === 'WELFARE'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-purple-700 hover:bg-purple-50'
                }`}
              >
                কল্যাণ তহবিল
              </button>
              <button
                onClick={() => setSubFilterTab('EMERGENCY')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  subFilterTab === 'EMERGENCY'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
                }`}
              >
                জরুরী তহবিল
              </button>
              <button
                onClick={() => setSubFilterTab('REVERSED')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  subFilterTab === 'REVERSED'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
                }`}
              >
                বাতিল / রিভার্সড
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="ভাউচার, সদস্য আইডি, সুবিধাভোগীর নাম..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">ভাউচার নং</th>
                  <th className="p-3">তারিখ</th>
                  <th className="p-3">তহবিলের উৎস</th>
                  <th className="p-3">সুবিধাভোগী / সদস্য</th>
                  <th className="p-3">অনুদানের উদ্দেশ্য</th>
                  <th className="p-3 text-center">অনুমোদন</th>
                  <th className="p-3 text-right">পরিমাণ (৳)</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDistributions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <HeartHandshake className="w-8 h-8 text-slate-300" />
                        <span className="font-medium">কোনো অনুদান বা সহায়তার রেকর্ড পাওয়া যায়নি</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDistributions.map(w => {
                    // Resolve member if memberId exists
                    const member = w.memberId
                      ? (db.members || []).find(m => m.memberId === w.memberId)
                      : undefined;

                    const resolvedBeneficiaryName = member
                      ? member.fullName
                      : w.beneficiaryName || w.beneficiary || 'সুবিধাভোগী';

                    const isReversed = w.approvalStatus === 'REVERSED' || w.status === 'REVERSED';
                    const amountValue = w.amount || w.expense || 0;

                    return (
                      <tr
                        key={w.fundId || w.voucherNo}
                        className={`hover:bg-slate-50 transition-colors ${
                          isReversed ? 'bg-rose-50/30 opacity-75' : ''
                        }`}
                      >
                        {/* Voucher No */}
                        <td className="p-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                          {w.voucherNo}
                        </td>

                        {/* Date */}
                        <td className="p-3 font-mono text-[11px] whitespace-nowrap text-slate-600">
                          {w.date}
                        </td>

                        {/* Fund Type */}
                        <td className="p-3 whitespace-nowrap">
                          {w.fundType === 'WELFARE' ? (
                            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              কল্যাণ তহবিল
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              জরুরী তহবিল
                            </span>
                          )}
                        </td>

                        {/* Beneficiary with proper Member resolution */}
                        <td className="p-3 whitespace-nowrap">
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1">
                              <span>{resolvedBeneficiaryName}</span>
                              {member && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                  সদস্য
                                </span>
                              )}
                            </div>
                            {w.memberId && (
                              <div className="text-[11px] text-slate-500 font-mono">
                                আইডি: {w.memberId}
                              </div>
                            )}
                            {!w.memberId && (
                              <div className="text-[10px] text-slate-400">সাধারণ নাগরিক / অ-সদস্য</div>
                            )}
                          </div>
                        </td>

                        {/* Purpose */}
                        <td className="p-3 text-slate-600 max-w-xs truncate" title={w.purpose || w.reason}>
                          <span>{w.purpose || w.reason || '-'}</span>
                          {w.resolutionNo && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              রেজুলেশন: {w.resolutionNo}
                            </span>
                          )}
                        </td>

                        {/* Approved By */}
                        <td className="p-3 text-center text-slate-600 text-[11px] whitespace-nowrap">
                          {w.approvedBy || 'কার্যনির্বাহী পরিষদ'}
                        </td>

                        {/* Amount Formatted cleanly as positive ৳ */}
                        <td className="p-3 text-right whitespace-nowrap">
                          <span
                            className={`font-black font-mono text-xs ${
                              isReversed ? 'text-slate-400 line-through' : 'text-emerald-800'
                            }`}
                          >
                            ৳{amountValue.toLocaleString()}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isReversed
                                ? 'bg-rose-100 text-rose-800 line-through'
                                : w.approvalStatus === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : w.approvalStatus === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isReversed
                              ? 'বাতিলকৃত'
                              : w.approvalStatus === 'APPROVED'
                              ? 'অনুমোদিত'
                              : w.approvalStatus === 'PENDING'
                              ? 'বিচারাধীন'
                              : 'প্রত্যাখ্যাত'}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* View Details */}
                            <button
                              onClick={() => setSelectedTransactionForView(w)}
                              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                              title="বিস্তারিত বিবরণ ও ভাউচার প্রিন্ট"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button */}
                            {isAuthorized && !isReversed && (
                              <button
                                onClick={() => setSelectedTransactionForEdit(w)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                                title="তথ্য সম্পাদনা"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete / Reversal Button */}
                            {isAuthorized && !isReversed && (
                              <button
                                onClick={() => handleDeleteOrReverseClick(w)}
                                className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                                title="মুছে ফেলুন বা রিভার্স করুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Attachments Button */}
                            <button
                              onClick={() => setSelectedWelfareForAttachments(w.fundId)}
                              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
                              title="সংযুক্তি / প্রমাণপত্র"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attachments Modal */}
      {selectedWelfareForAttachments && (
        <AttachmentModal
          entityType="WELFARE"
          entityId={selectedWelfareForAttachments}
          title={`Welfare Aid #${selectedWelfareForAttachments}`}
          onClose={() => setSelectedWelfareForAttachments(null)}
        />
      )}

      {/* Details Modal */}
      {selectedTransactionForView && (
        <WelfareTransactionDetailsModal
          transaction={selectedTransactionForView}
          onClose={() => setSelectedTransactionForView(null)}
          onEdit={() => {
            const tx = selectedTransactionForView;
            setSelectedTransactionForView(null);
            setSelectedTransactionForEdit(tx);
          }}
          onReverse={() => {
            const tx = selectedTransactionForView;
            setSelectedTransactionForView(null);
            setSelectedTransactionForReversal(tx);
          }}
        />
      )}

      {/* Edit Modal */}
      {selectedTransactionForEdit && (
        <WelfareTransactionEditModal
          transaction={selectedTransactionForEdit}
          onClose={() => setSelectedTransactionForEdit(null)}
        />
      )}

      {/* Reversal Modal */}
      {selectedTransactionForReversal && (
        <WelfareReversalModal
          transaction={selectedTransactionForReversal}
          onClose={() => setSelectedTransactionForReversal(null)}
        />
      )}

      {/* Hard Delete Confirmation Dialog (for unposted transactions) */}
      {selectedTransactionForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-rose-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">অনুদানের রেকর্ড মুছে ফেলা নিশ্চিতকরণ</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              আপনি কি নিশ্চিতভাবে ভাউচার{' '}
              <strong className="text-slate-900">{selectedTransactionForDelete.voucherNo}</strong> এর অনুদান রেকর্ডটি
              সিস্টেম থেকে মুছে ফেলতে চান?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setSelectedTransactionForDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold shadow-xs transition-all active:scale-95"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Aid Distribution Modal */}
      {isDistributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">নতুন অনুদান প্রদান ভাউচার</h3>
                  <p className="text-[11px] text-slate-300">কল্যাণ ও জরুরী সহায়তা বিতরণ</p>
                </div>
              </div>
              <button
                onClick={() => setIsDistributeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleDistributeSubmit} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Fund Type & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">তহবিলের উৎস *</label>
                  <select
                    value={fundType}
                    onChange={e => setFundType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="WELFARE">কল্যাণ তহবিল (Welfare Fund)</option>
                    <option value="EMERGENCY">জরুরী তহবিল (Emergency Fund)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={dateStr}
                    onChange={e => setDateStr(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-medium"
                  />
                </div>
              </div>

              {/* Beneficiary Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">সুবিধাভোগীর ধরন *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBeneficiaryType('MEMBER');
                      if (memberId) handleMemberSelect(memberId);
                    }}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 font-bold transition-all ${
                      beneficiaryType === 'MEMBER'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>সমিতির সদস্য</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBeneficiaryType('NON_MEMBER');
                      setMemberId('');
                    }}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 font-bold transition-all ${
                      beneficiaryType === 'NON_MEMBER'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>সাধারণ নাগরিক / বহিরাগত</span>
                  </button>
                </div>
              </div>

              {/* Member Selection if MEMBER */}
              {beneficiaryType === 'MEMBER' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="block font-bold text-slate-700">সদস্য নির্বাচন করুন *</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="নাম বা আইডি খুঁজুন..."
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <select
                    value={memberId}
                    onChange={e => handleMemberSelect(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs font-semibold"
                  >
                    <option value="">-- সদস্য বাছাই করুন --</option>
                    {(db.members || [])
                      .filter(m => {
                        if (!memberSearch.trim()) return true;
                        const q = memberSearch.toLowerCase();
                        return (
                          m.fullName.toLowerCase().includes(q) ||
                          m.memberId.toLowerCase().includes(q) ||
                          (m.mobile && m.mobile.includes(q))
                        );
                      })
                      .map(m => (
                        <option key={m.memberId} value={m.memberId}>
                          {m.fullName} - ({m.memberId})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Beneficiary Name & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">সুবিধাভোগীর পূর্ণ নাম *</label>
                  <input
                    type="text"
                    required
                    placeholder="সুবিধাভোগীর নাম"
                    value={beneficiaryName}
                    onChange={e => setBeneficiaryName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    placeholder="01XXXXXXXXX"
                    value={beneficiaryMobile}
                    onChange={e => setBeneficiaryMobile(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Amount & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">অনুদানের পরিমাণ (৳) *</label>
                  <input
                    type="number"
                    min={100}
                    required
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">পরিশোধ মাধ্যম</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="Cash">নগদ (Cash)</option>
                    <option value="Bank">ব্যাংক (Bank)</option>
                    <option value="bKash">বিকাশ (bKash)</option>
                    <option value="Nagad">নগদ মোবাইল ব্যাংকিং (Nagad)</option>
                  </select>
                </div>
              </div>

              {/* Purpose & Approval */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">অনুদানের উদ্দেশ্য</label>
                  <input
                    type="text"
                    required
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">অনুমোদনকারী</label>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={e => setApprovedBy(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Resolution No & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">রেজুলেশন নং (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    placeholder="RES-2026-00000X"
                    value={resolutionNo}
                    onChange={e => setResolutionNo(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ট্রানজেকশন / চেক নং</label>
                  <input
                    type="text"
                    placeholder="ঐচ্ছিক"
                    value={transactionNumber}
                    onChange={e => setTransactionNumber(e.target.value)}
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
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsDistributeModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2 rounded-xl shadow-sm transition-all active:scale-95"
                >
                  অনুদান নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

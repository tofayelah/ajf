import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { PaymentMethod } from '../../types';
import {
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  RotateCcw,
  Printer,
  Calendar,
  CreditCard,
  User,
  Plus,
  Layers,
  CheckSquare,
  Square,
  Clock
} from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface MonthlyCollectionViewProps {
  preSelectedMemberId?: string | null;
}

export const MonthlyCollectionView: React.FC<MonthlyCollectionViewProps> = ({
  preSelectedMemberId
}) => {
  const { db, postCollection, postBulkCollection, language, activeUser, canAccessMember } = useApp();
  const isBangla = language === 'bn';

  // Collection Entry States
  const now = new Date();
  const defaultMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    preSelectedMemberId && canAccessMember(preSelectedMemberId)
      ? preSelectedMemberId
      : ((db.members || []).find(m => canAccessMember(m.memberId))?.memberId || '')
  );
  const [collectionMonth, setCollectionMonth] = useState<string>(defaultMonthStr);
  const [collectionDate, setCollectionDate] = useState<string>(now.toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState<number>(db.settings.monthlyContribution);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [transactionNo, setTransactionNo] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('মাসিক চাঁদা পরিশোধ');

  // Bulk Mode States
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [selectedUnpaidMonths, setSelectedUnpaidMonths] = useState<string[]>([]);
  const [bulkDiscount, setBulkDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Late Fee Waiver States
  const [isLateFeeWaived, setIsLateFeeWaived] = useState<boolean>(false);
  const [waivedMonths, setWaivedMonths] = useState<string[]>([]);

  // History Filter
  const [historySearch, setHistorySearch] = useState('');
  const [viewingReceiptNo, setViewingReceiptNo] = useState<string | null>(null);

  // Selected Member calculation
  const selectedMember = (db.members || []).find(m => m.memberId === selectedMemberId);
  const monthlyFee = db.settings.monthlyContribution;

  const dueInfo = selectedMember
    ? AccountingService.calculateMemberDue(
        selectedMember,
        (activeUser?.role === 'MEMBER'
          ? (db.collections || []).filter(c => c.memberId === activeUser.linkedMemberId)
          : (db.collections || [])),
        db.settings.monthlyContribution,
        db.settings.lateFine,
        db.settings.latePaymentDay
      )
    : { monthsDueCount: 0, unpaidMonths: [], totalDueAmount: 0, unpaidMonthDetails: [], allMonthDetails: [] };

  // Helper to compute next advance month for a member
  const getNextAvailableMonth = (): string => {
    const activeMemberColls = (db.collections || [])
      .filter(c => c.memberId === selectedMemberId && (c.status === 'ACTIVE' || c.status === 'POSTED'))
      .map(c => c.collectionMonth)
      .sort();
    
    if (activeMemberColls.length === 0) {
      return defaultMonthStr;
    }
    const latestPaid = activeMemberColls[activeMemberColls.length - 1];
    const [y, mon] = latestPaid.split('-').map(Number);
    const d = new Date(y, mon - 1, 1);
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Whenever member changes or bulk mode is activated, synchronize unpaid months
  useEffect(() => {
    if (dueInfo.unpaidMonths && dueInfo.unpaidMonths.length > 0) {
      setSelectedUnpaidMonths([...dueInfo.unpaidMonths]);
      setCollectionMonth(dueInfo.unpaidMonths[0]); // Auto-select oldest due month for single collection
      setWaivedMonths([]);
      setIsLateFeeWaived(false);
    } else {
      setSelectedUnpaidMonths([]);
      setWaivedMonths([]);
      setIsLateFeeWaived(false);
      // Auto-suggest next advance month when there are no past unpaid months
      const nextMonth = getNextAvailableMonth();
      setCollectionMonth(nextMonth);
    }
  }, [selectedMemberId, dueInfo.unpaidMonths?.length]);

  // Single Month Calculations
  let singleBaseFee = 0;
  let rawLateFine = 0;
  let singleLateFine = 0;
  let singleTotalPayable = 0;
  let isLateFineOnly = false;
  let isAlreadyFullyPaidForSelectedMonth = false;
  let existingReceiptNo = undefined;
  let calculationError = null;

  try {
    const selectedMonthInfo = dueInfo.unpaidMonthDetails?.find(d => d.month === collectionMonth);
    const existingActiveCollections = (db.collections || []).filter(
      c => c.memberId === selectedMemberId &&
           c.collectionMonth === collectionMonth &&
           (c.status === 'ACTIVE' || c.status === 'POSTED')
    );
    isLateFineOnly = selectedMonthInfo?.isLateFinePaid === false && selectedMonthInfo?.isContributionPaid === true;
    isAlreadyFullyPaidForSelectedMonth = existingActiveCollections.length > 0 && !isLateFineOnly;
    existingReceiptNo = existingActiveCollections[0]?.receiptNo;
    
    const cDateObj = new Date(collectionDate);
    const currentMonthStr = `${cDateObj.getFullYear()}-${String(cDateObj.getMonth() + 1).padStart(2, '0')}`;
    const isPastLateCutoff = collectionMonth < currentMonthStr || (collectionMonth === currentMonthStr && cDateObj.getDate() > db.settings.latePaymentDay);
    
    singleBaseFee = isLateFineOnly ? 0 : monthlyFee;
    rawLateFine = isLateFineOnly ? (selectedMonthInfo?.lateFineDue || 0) : (isPastLateCutoff ? db.settings.lateFine : 0);
    singleLateFine = isLateFeeWaived ? 0 : rawLateFine;
    singleTotalPayable = isAlreadyFullyPaidForSelectedMonth ? 0 : (singleBaseFee + singleLateFine - discount);
  } catch (err: any) {
    calculationError = err.message;
  }

  // Bulk Mode Calculations
  const bulkMonthCount = selectedUnpaidMonths.length;
  let bulkPrincipal = 0;
  let bulkRawLateFine = 0;
  let bulkLateFine = 0;
  
  if (dueInfo.unpaidMonthDetails) {
    selectedUnpaidMonths.forEach(m => {
      const details = dueInfo.unpaidMonthDetails!.find(d => d.month === m);
      if (details) {
        bulkPrincipal += details.contributionDue;
        bulkRawLateFine += details.lateFineDue;
        if (!waivedMonths.includes(m)) {
          bulkLateFine += details.lateFineDue;
        }
      } else {
        bulkPrincipal += monthlyFee;
      }
    });
  } else {
    bulkPrincipal = bulkMonthCount * monthlyFee;
  }
  
  const bulkTotalPayable = bulkPrincipal + bulkLateFine - bulkDiscount;

  // Sync paid amount based on mode
  useEffect(() => {
    if (isBulkMode) {
      setPaidAmount(bulkTotalPayable);
    } else {
      setPaidAmount(singleTotalPayable);
    }
  }, [isBulkMode, singleTotalPayable, bulkTotalPayable, selectedMemberId, collectionMonth, selectedUnpaidMonths, isLateFeeWaived, waivedMonths]);

  const handleToggleMonth = (month: string) => {
    if (selectedUnpaidMonths.includes(month)) {
      setSelectedUnpaidMonths(selectedUnpaidMonths.filter(m => m !== month));
      setWaivedMonths(waivedMonths.filter(m => m !== month));
    } else {
      setSelectedUnpaidMonths([...selectedUnpaidMonths, month].sort());
    }
  };

  const handleSelectAllMonths = () => {
    if (dueInfo.unpaidMonths) {
      setSelectedUnpaidMonths([...dueInfo.unpaidMonths].sort());
    }
  };

  const handleDeselectAllMonths = () => {
    setSelectedUnpaidMonths([]);
    setWaivedMonths([]);
  };

  const handleToggleWaiveMonth = (month: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (waivedMonths.includes(month)) {
      setWaivedMonths(waivedMonths.filter(m => m !== month));
    } else {
      setWaivedMonths([...waivedMonths, month]);
    }
  };

  const handleWaiveAllLateFees = () => {
    if (selectedUnpaidMonths.length > 0) {
      setWaivedMonths([...selectedUnpaidMonths]);
    }
  };

  const handleResetAllLateFeeWaivers = () => {
    setWaivedMonths([]);
  };

  const handleCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[COLLECTION] BUTTON CLICKED');

    if (!selectedMemberId) {
      alert(isBangla ? 'অনুগ্রহ করে একজন সদস্য নির্বাচন করুন।' : 'Please select a member.');
      return;
    }

    if (!canAccessMember(selectedMemberId)) {
      alert(isBangla ? 'এই তথ্য দেখার অনুমতি আপনার নেই।' : 'You do not have permission.');
      return;
    }

    const currentTotalPayable = isBulkMode ? bulkTotalPayable : singleTotalPayable;
    console.log('[COLLECTION] FORM DATA', {
      memberId: selectedMemberId,
      memberName: selectedMember?.fullName,
      isBulkMode,
      collectionMonth: isBulkMode ? selectedUnpaidMonths : collectionMonth,
      monthlyAmount: monthlyFee,
      paidAmount,
      totalPayable: currentTotalPayable,
      lateFee: isBulkMode ? bulkLateFine : singleLateFine,
      lateFeeWaived: isBulkMode ? (waivedMonths.length > 0) : isLateFeeWaived,
      paymentMethod
    });

    console.log('[COLLECTION] VALIDATION START');

    if (isBulkMode) {
      if (selectedUnpaidMonths.length === 0) {
        alert(isBangla ? 'বকেয়া আদায়ের জন্য কমপক্ষে একটি মাস নির্বাচন করুন!' : 'Select at least one unpaid month!');
        return;
      }
      if (paidAmount <= 0) {
        alert(isBangla ? 'আদায়কৃত টাকার পরিমাণ ০ বা ঋণাত্মক হতে পারে না। অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন।' : 'Payment amount must be greater than 0.');
        return;
      }
      if (paidAmount > bulkTotalPayable) {
        alert(isBangla ? 'পরিশোধের পরিমাণ মোট বকেয়ার চেয়ে বেশি হতে পারবে না।' : 'Payment cannot exceed total due.');
        return;
      }
    } else {
      if (isAlreadyFullyPaidForSelectedMonth) {
        alert(isBangla
          ? `এই সদস্যের জন্য ${collectionMonth} মাসের চাঁদা ইতিমধ্যে সক্রিয়ভাবে পরিশোধিত (রসিদ নং: ${existingReceiptNo})। অনুগ্রহ করে পরবর্তী অগ্রিম মাস (${getNextAvailableMonth()}) নির্বাচন করুন।`
          : `Monthly contribution for ${collectionMonth} is already paid (Receipt: ${existingReceiptNo}). Please select a different month.`);
        return;
      }
      if (paidAmount <= 0) {
        alert(isBangla ? 'আদায়কৃত টাকার পরিমাণ ০ বা ঋণাত্মক হতে পারে না। অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন।' : 'Payment amount must be greater than 0.');
        return;
      }
      if (singleTotalPayable > 0 && paidAmount > singleTotalPayable) {
        alert(isBangla ? 'পরিশোধের পরিমাণ মোট বকেয়ার চেয়ে বেশি হতে পারবে না।' : 'Payment cannot exceed total due.');
        return;
      }
    }

    console.log('[COLLECTION] POST START');
    setIsSubmitting(true);
    try {
      if (isBulkMode) {
        const res = await postBulkCollection({
          memberId: selectedMemberId,
          months: selectedUnpaidMonths,
          monthlyContribution: monthlyFee,
          totalLateFine: bulkLateFine,
          totalDiscount: bulkDiscount,
          totalPaidAmount: paidAmount,
          paymentMethod,
          transactionNo: transactionNo || `TXN-${Date.now()}`,
          collectionDate,
          receivedBy: activeUser?.fullName || 'Administrator',
          remarks: remarks || `একসাথে বকেয়া আদায় (${selectedUnpaidMonths.length} মাস)`,
          waivedMonths,
          lateFeeWaived: waivedMonths.length > 0 && selectedUnpaidMonths.every(m => waivedMonths.includes(m))
        });

        if (res && res.success && res.receiptNo) {
          console.log('[COLLECTION] POST SUCCESS', res);
          console.log('[COLLECTION] RECEIPT GENERATED', res.receiptNo);
          setViewingReceiptNo(res.receiptNo);
          setIsBulkMode(false);
          setWaivedMonths([]);
        } else {
          console.error('[COLLECTION] POST FAILED', res);
          alert(res?.message || (isBangla ? 'চাঁদা গ্রহণ করা যায়নি।' : 'Collection failed.'));
        }
      } else {
        const res = await postCollection({
          memberId: selectedMemberId,
          collectionMonth,
          paidAmount,
          discount,
          paymentMethod,
          transactionNo: transactionNo || `TRX-${Date.now()}`,
          collectionDate,
          receivedBy: activeUser?.fullName || 'Administrator',
          remarks: remarks || (isLateFineOnly ? 'বিলম্ব ফি পরিশোধ' : undefined),
          isLateFineOnly,
          lateFeeWaived: isLateFeeWaived
        });

        if (res && res.success && res.receiptNo) {
          console.log('[COLLECTION] POST SUCCESS', res);
          console.log('[COLLECTION] RECEIPT GENERATED', res.receiptNo);
          setViewingReceiptNo(res.receiptNo);
          setIsLateFeeWaived(false);
        } else {
          console.error('[COLLECTION] POST FAILED', res);
          alert(res?.message || (isBangla ? 'চাঁদা গ্রহণ করা যায়নি।' : 'Collection failed.'));
        }
      }
    } catch (error: any) {
      console.error('[COLLECTION ERROR]', error);
      alert(error?.message || (isBangla ? 'চাঁদা গ্রহণ করার সময় একটি ত্রুটি ঘটেছে।' : 'An error occurred during collection submission.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group collections by receiptNo for history display
  const userCollections = (activeUser?.role === 'MEMBER'
    ? (db.collections || []).filter(c => c.memberId === activeUser.linkedMemberId)
    : (db.collections || [])) || [];

  // Create unique receipt list
  interface GroupedReceipt {
    receiptNo: string;
    memberId: string;
    memberName: string;
    collectionDate: string;
    paymentMethod: PaymentMethod;
    months: string[];
    totalPaid: number;
    status: 'ACTIVE' | 'REVERSED' | 'CANCELLED' | 'POSTED';
    itemsCount: number;
  }

  const groupedReceiptsMap = new Map<string, GroupedReceipt>();

  userCollections.forEach(c => {
    const rNo = c.receiptNo;
    if (!groupedReceiptsMap.has(rNo)) {
      groupedReceiptsMap.set(rNo, {
        receiptNo: rNo,
        memberId: c.memberId,
        memberName: c.memberName,
        collectionDate: c.collectionDate,
        paymentMethod: c.paymentMethod,
        months: [c.collectionMonth],
        totalPaid: c.paidAmount,
        status: c.status || 'ACTIVE',
        itemsCount: 1
      });
    } else {
      const existing = groupedReceiptsMap.get(rNo)!;
      if (!existing.months.includes(c.collectionMonth)) {
        existing.months.push(c.collectionMonth);
      }
      existing.totalPaid += c.paidAmount;
      existing.itemsCount += 1;
      if (c.status === 'REVERSED') existing.status = 'REVERSED';
    }
  });

  const groupedReceiptList = Array.from(groupedReceiptsMap.values()).sort((a, b) =>
    b.receiptNo.localeCompare(a.receiptNo)
  );

  const filteredReceipts = groupedReceiptList.filter(r => {
    return (
      r.receiptNo.toLowerCase().includes(historySearch.toLowerCase()) ||
      r.memberName.toLowerCase().includes(historySearch.toLowerCase()) ||
      r.memberId.toLowerCase().includes(historySearch.toLowerCase()) ||
      r.months.some(m => m.includes(historySearch))
    );
  });

  return (
    <ErrorBoundary>
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'মাসিক চাঁদা ও বকেয়া আদায় (Monthly & Bulk Collection)' : 'Monthly & Bulk Due Collection'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'একক বা একাধিক মাসের বকেয়া চাঁদা আদায়ে স্বয়ংক্রিয় মানি রসিদ, লেজার ও হিসাব আপডেট হয়'
              : 'Single or multi-month bulk collection with automated receipts and ledger entries'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Collection Entry Form */}
        <div className="lg:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>{isBangla ? 'চাঁদা গ্রহণ ফরম' : 'Collection Entry Form'}</span>
              </h3>
              <p className="text-[11px] text-slate-500">সদস্য ও আদায়ের বিবরণ নির্বাচন করুন</p>
            </div>

            {dueInfo.monthsDueCount > 1 && (
              <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">
                {dueInfo.monthsDueCount} মাস বকেয়া
              </span>
            )}
          </div>

          <form onSubmit={handleCollectionSubmit} className="space-y-3.5">
            {/* Member Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'সদস্য নির্বাচন করুন *' : 'Select Member *'}
              </label>
              <select
                required
                value={selectedMemberId}
                onChange={e => setSelectedMemberId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500"
              >
                {(db.members || [])
                  .filter(m => canAccessMember(m.memberId))
                  .map(m => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.memberId} - {m.fullName} ({m.mobile})
                    </option>
                  ))}
              </select>
            </div>

            {/* Member Due Summary Badge */}
            {selectedMember && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-2">
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px]">সদস্যের নাম</span>
                    <span className="font-bold">{selectedMember.fullName}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px]">সদস্য নং</span>
                    <span className="font-mono font-bold">{selectedMember.memberId}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px]">যোগদান</span>
                    <span className="font-mono">{selectedMember.joiningDate || '2026-06-01'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-[10px]">মোবাইল</span>
                    <span className="font-mono">{selectedMember.mobile}</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50 rounded p-1 border border-emerald-100">
                    <span className="block text-slate-500 text-[10px]">মোট জমা</span>
                    <span className="font-bold text-emerald-700">{dueInfo.allMonthDetails ? dueInfo.allMonthDetails.filter(m => m.isFullyPaid).length : 0} মাস</span>
                  </div>
                  <div className="bg-rose-50 rounded p-1 border border-rose-100">
                    <span className="block text-slate-500 text-[10px]">মোট বকেয়া</span>
                    <span className="font-bold text-rose-700">{dueInfo.monthsDueCount} মাস</span>
                  </div>
                  <div className="bg-amber-50 rounded p-1 border border-amber-100">
                    <span className="block text-slate-500 text-[10px]">বকেয়া পরিমাণ</span>
                    <span className="font-bold text-amber-700 font-mono">৳{dueInfo.totalDueAmount.toLocaleString()}</span>
                  </div>
                </div>

                {dueInfo.allMonthDetails && dueInfo.allMonthDetails.length > 0 && (
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <span className="block text-slate-600 font-semibold mb-1">মাসিক স্ট্যাটাস:</span>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {dueInfo.allMonthDetails.slice().reverse().map(m => (
                        <div key={m.month} className="flex justify-between items-center bg-white border border-slate-100 p-1.5 rounded">
                          <span className="font-mono font-bold text-slate-700">{m.month}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.isFullyPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {m.isFullyPaid ? 'PAID' : 'DUE'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bulk Payment Toggle Option */}
            <div className="bg-emerald-50/80 border border-emerald-300/80 p-2.5 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isBulkMode}
                  onChange={e => {
                    setIsBulkMode(e.target.checked);
                    if (e.target.checked && dueInfo.unpaidMonths) {
                      setSelectedUnpaidMonths([...dueInfo.unpaidMonths]);
                    }
                  }}
                  className="w-4 h-4 text-emerald-700 rounded border-emerald-400 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-xs text-emerald-950 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    একসাথে বকেয়া পরিশোধ (Multi-Month Collection)
                  </span>
                  <p className="text-[10px] text-emerald-800">
                    একাধিক বা সব বকেয়া মাসের চাঁদা এককালীন জমা ও প্রতি মাসের পৃথক রেকর্ড সংরক্ষণ
                  </p>
                </div>
              </label>
            </div>

            {/* Bulk Mode: Month Selection Matrix */}
            {isBulkMode ? (
              <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">
                    পরিশোধযোগ্য বকেয়া মাস ({selectedUnpaidMonths.length}/{dueInfo.unpaidMonths.length}):
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSelectAllMonths}
                      className="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded transition-colors"
                    >
                      সব নির্বাচন
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllMonths}
                      className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-2 py-0.5 rounded transition-colors"
                    >
                      বাতিল
                    </button>
                    {bulkRawLateFine > 0 && (
                      <button
                        type="button"
                        onClick={waivedMonths.length === selectedUnpaidMonths.length ? handleResetAllLateFeeWaivers : handleWaiveAllLateFees}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                          waivedMonths.length === selectedUnpaidMonths.length && selectedUnpaidMonths.length > 0
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                            : 'bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-300'
                        }`}
                      >
                        {waivedMonths.length === selectedUnpaidMonths.length && selectedUnpaidMonths.length > 0
                          ? 'মওকুফ বাতিল'
                          : 'সকল বিলম্ব ফি মওকুফ'}
                      </button>
                    )}
                  </div>
                </div>

                {dueInfo.unpaidMonthDetails && dueInfo.unpaidMonthDetails.length === 0 ? (
                  <div className="p-3 text-center text-slate-500 bg-white rounded border border-slate-200 text-[11px]">
                    এই সদস্যের কোনো বকেয়া মাস নেই
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto bg-white rounded-lg border border-slate-200">
                    <table className="w-full text-left text-[10px] whitespace-nowrap">
                      <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                        <tr>
                          <th className="p-2 pl-3 font-semibold text-slate-600">Select</th>
                          <th className="p-2 font-semibold text-slate-600">Month</th>
                          <th className="p-2 font-semibold text-slate-600 text-right">Contr.</th>
                          <th className="p-2 font-semibold text-emerald-600 text-right">Paid</th>
                          <th className="p-2 font-semibold text-rose-600 text-right">Contr. Due</th>
                          <th className="p-2 font-semibold text-amber-600 text-right">L.Fine</th>
                          <th className="p-2 font-semibold text-emerald-600 text-right">LF Paid</th>
                          <th className="p-2 font-semibold text-rose-600 text-right">LF Due</th>
                          <th className="p-2 font-semibold text-teal-700 text-center">ফি মওকুফ</th>
                          <th className="p-2 pr-3 font-semibold text-slate-600 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(dueInfo.allMonthDetails || []).slice().reverse().map(detail => {
                          const isSelected = selectedUnpaidMonths.includes(detail.month);
                          const isWaived = waivedMonths.includes(detail.month);
                          let status = detail.paid > 0 ? 'PARTIAL' : 'UNPAID';
                          if (detail.isFullyPaid) status = 'PAID';
                          return (
                            <tr
                              key={detail.month}
                              onClick={() => !detail.isFullyPaid && handleToggleMonth(detail.month)}
                              className={`transition-colors ${
                                detail.isFullyPaid ? 'bg-slate-50 opacity-60' : 'cursor-pointer hover:bg-slate-50'
                              } ${isSelected ? 'bg-emerald-50/50' : ''}`}
                            >
                              <td className="p-2 pl-3">
                                <div className="flex justify-center items-center">
                                  {detail.isFullyPaid ? (
                                    <CheckSquare className="w-4 h-4 text-slate-300" />
                                  ) : isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-700" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              </td>
                              <td className="p-2 font-mono font-bold text-slate-700">{detail.month}</td>
                              <td className="p-2 text-right font-mono text-slate-600">৳{detail.monthlyAmount}</td>
                              <td className="p-2 text-right font-mono text-emerald-600">৳{detail.monthlyAmount - detail.contributionDue}</td>
                              <td className="p-2 text-right font-mono font-bold text-rose-600">৳{detail.contributionDue}</td>
                              <td className="p-2 text-right font-mono text-amber-600">৳{detail.lateFine}</td>
                              <td className="p-2 text-right font-mono text-emerald-600">৳{detail.paidLateFine}</td>
                              <td className="p-2 text-right font-mono font-bold">
                                {isWaived ? (
                                  <span className="text-emerald-700 font-bold line-through">৳{detail.lateFineDue}</span>
                                ) : (
                                  <span className={detail.isFullyPaid ? 'text-slate-400' : 'text-rose-600'}>৳{detail.lateFineDue}</span>
                                )}
                              </td>
                              <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                                {detail.lateFineDue > 0 && !detail.isFullyPaid ? (
                                  <label className="inline-flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isWaived}
                                      disabled={!isSelected}
                                      onChange={e => handleToggleWaiveMonth(detail.month, e as any)}
                                      className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 disabled:opacity-40"
                                    />
                                    <span className={`text-[9px] font-bold ${isWaived ? 'text-teal-700' : 'text-slate-500'}`}>
                                      {isWaived ? 'মওকুফ' : 'না'}
                                    </span>
                                  </label>
                                ) : (
                                  <span className="text-slate-400 text-[9px]">-</span>
                                )}
                              </td>
                              <td className="p-2 pr-3 text-center">
                                <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                                  detail.isFullyPaid ? 'bg-emerald-100 text-emerald-800' : (status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')
                                }`}>
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Bulk Financial Breakdown */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-700">
                    <span>নির্বাচিত মাস সংখ্যা:</span>
                    <span className="font-mono font-bold text-emerald-900">{bulkMonthCount} মাস</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>মূল চাঁদা ({bulkMonthCount} × ৳{monthlyFee}):</span>
                    <span className="font-mono font-bold">৳{bulkPrincipal.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-amber-900 pt-1 border-t border-slate-100">
                    <span>বিলম্ব ফি:</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      {bulkRawLateFine > bulkLateFine && (
                        <span className="text-slate-400 line-through text-[10px]">
                          ৳{bulkRawLateFine.toLocaleString()}
                        </span>
                      )}
                      <span className="font-bold text-amber-800">৳{bulkLateFine.toLocaleString()}</span>
                      {bulkRawLateFine > bulkLateFine && (
                        <span className="text-emerald-700 bg-emerald-100 text-[9px] font-bold px-1 rounded">
                          -৳{(bulkRawLateFine - bulkLateFine).toLocaleString()} মওকুফ
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-teal-900">
                    <span>মওকুফ / বিশেষ ছাড়:</span>
                    <input
                      type="number"
                      min={0}
                      value={bulkDiscount}
                      onChange={e => setBulkDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-20 bg-teal-50/50 border border-teal-300 rounded px-1.5 py-0.5 text-right font-mono text-xs font-bold"
                    />
                  </div>

                  <div className="flex justify-between text-slate-900 font-black pt-1.5 border-t border-slate-200 text-xs">
                    <span>সর্বমোট প্রদেয় / আদায়:</span>
                    <span className="font-mono text-emerald-900 text-sm">
                      ৳{bulkTotalPayable.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Single Month Inputs */
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isBangla ? 'আদায়ের মাস *' : 'Collection Month *'}
                    </label>
                    <input
                      type="month"
                      required
                      value={collectionMonth}
                      onChange={e => setCollectionMonth(e.target.value)}
                      className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold ${
                        isAlreadyFullyPaidForSelectedMonth
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : 'border-slate-300 text-emerald-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isBangla ? 'গ্রহণের তারিখ' : 'Date'}
                    </label>
                    <input
                      type="date"
                      required
                      value={collectionDate}
                      onChange={e => setCollectionDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Already Paid Warning Alert Box */}
                {isAlreadyFullyPaidForSelectedMonth && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-950">
                          {isBangla
                            ? `${collectionMonth} মাসের চাঁদা ইতিমধ্যে সক্রিয়ভাবে পরিশোধিত (রসিদ নং: ${existingReceiptNo})`
                            : `Contribution for ${collectionMonth} is already paid (Receipt: ${existingReceiptNo})`}
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          {isBangla
                            ? 'একই মাসে একাধিকবার চাঁদা গ্রহণ সম্ভব নয়। পরবর্তী অগ্রিম মাসের চাঁদা গ্রহণ করতে নিচে ক্লিক করুন।'
                            : 'Duplicate monthly contribution is not allowed. Click below to switch to the next advance month.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCollectionMonth(getNextAvailableMonth())}
                      className="self-start text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isBangla ? `পরবর্তী অগ্রিম মাস (${getNextAvailableMonth()}) নির্বাচন করুন` : `Select Next Advance Month (${getNextAvailableMonth()})`}</span>
                    </button>
                  </div>
                )}

                {/* Single Fee Breakdown Display */}
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex justify-between text-slate-700">
                    <span>{isLateFineOnly ? 'মাসিক চাঁদা (ইতিমধ্যে পরিশোধিত):' : 'নির্ধারিত মাসিক চাঁদা:'}</span>
                    <span className="font-mono font-bold">৳{singleBaseFee?.toLocaleString()}</span>
                  </div>

                  {rawLateFine > 0 ? (
                    <div className="bg-white p-2 rounded-lg border border-amber-200 space-y-1.5">
                      <div className="flex justify-between items-center text-amber-900 font-semibold text-xs">
                        <span>বিলম্ব ফি (হিসাবকৃত):</span>
                        <span className={`font-mono font-bold ${isLateFeeWaived ? 'line-through text-slate-400' : 'text-amber-800'}`}>
                          +৳{rawLateFine?.toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Late Fee Waiver Control */}
                      <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-amber-100 select-none">
                        <input
                          type="checkbox"
                          checked={isLateFeeWaived}
                          onChange={e => setIsLateFeeWaived(e.target.checked)}
                          className="w-3.5 h-3.5 text-emerald-700 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                          বিলম্ব ফি মওকুফ করুন (Waive Late Fee)
                        </span>
                      </label>
                      {isLateFeeWaived && (
                        <div className="text-[10px] text-emerald-800 font-bold bg-emerald-100/70 px-2 py-0.5 rounded flex items-center justify-between">
                          <span>✓ মওকুফকৃত (হিসাব হতে বাদ দেওয়া হয়েছে)</span>
                          <span className="font-mono">৳০</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between text-emerald-700 text-[10px]">
                      <span>সময়মতো পরিশোধ (বিলম্ব ফি নেই)</span>
                      <span>৳০</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-emerald-200/60">
                    <span>মওকুফ / ছাড় (যদি থাকে):</span>
                    <input
                      type="number"
                      min={0}
                      value={discount}
                      onChange={e => setDiscount(Number(e.target.value))}
                      className="w-20 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-right font-mono text-xs font-bold"
                    />
                  </div>

                  <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-emerald-200 text-xs">
                    <span>মোট প্রদেয় টাকা:</span>
                    <span className="font-mono text-sm font-black text-emerald-950">
                      ৳{singleTotalPayable?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Paid Amount - Available for both Single and Bulk Modes */}
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-300">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <label className="block font-bold text-emerald-900 mb-0.5">
                    {isBangla ? 'আদায়কৃত টাকা (Payment Amount) *' : 'Payment Amount *'}
                  </label>
                  <p className="text-[10px] text-emerald-700 font-semibold">
                    {isBangla ? 'আংশিক পরিশোধের ক্ষেত্রে পরিমাণ পরিবর্তন করুন' : 'Change amount for partial payment'}
                  </p>
                </div>
                <input
                  type="number"
                  min={1}
                  required
                  value={paidAmount}
                  onChange={e => setPaidAmount(Number(e.target.value))}
                  className="w-full sm:w-32 border-2 border-emerald-600 rounded-lg px-3 py-2 text-base font-mono font-black text-emerald-900 bg-white text-right shadow-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Allocation Preview logic */}
              {paidAmount > 0 && paidAmount < (isBulkMode ? bulkTotalPayable : singleTotalPayable) && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {isBangla ? 'আংশিক পেমেন্ট বন্টন (Allocation Preview)' : 'Partial Payment Allocation'}
                  </p>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>{isBangla ? 'মোট বকেয়া' : 'Total Payable'}: <span className="font-mono">৳{(isBulkMode ? bulkTotalPayable : singleTotalPayable).toLocaleString()}</span></span>
                    <span className="text-rose-600 font-bold">{isBangla ? 'অবশিষ্ট বকেয়া' : 'Remaining Due'}: <span className="font-mono">৳{((isBulkMode ? bulkTotalPayable : singleTotalPayable) - paidAmount).toLocaleString()}</span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Collection Date for Bulk Mode */}
            {isBulkMode && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'গ্রহণের তারিখ *' : 'Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={collectionDate}
                  onChange={e => setCollectionDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
            )}

            {/* Payment Method */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'পরিশোধের মাধ্যম' : 'Payment Mode'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="Cash">নগদ (Cash)</option>
                  <option value="Bank">ব্যাংক (Bank)</option>
                  <option value="Mobile Banking">মোবাইল ব্যাংকিং</option>
                  <option value="Other">অন্যান্য</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'ট্রানজেকশন আইডি' : 'Txn / Ref No'}
                </label>
                <input
                  type="text"
                  placeholder="নগদ / বিকাশ TRXID"
                  value={transactionNo}
                  onChange={e => setTransactionNo(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'মন্তব্য / বিবরণ' : 'Remarks'}
              </label>
              <input
                type="text"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isSubmitting || 
                !selectedMemberId ||
                (isBulkMode && selectedUnpaidMonths.length === 0) ||
                (!isBulkMode && isAlreadyFullyPaidForSelectedMonth)
              }
              className={`w-full font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-xs flex items-center justify-center gap-1.5 text-white ${
                isSubmitting || !selectedMemberId || (isBulkMode && selectedUnpaidMonths.length === 0) || (!isBulkMode && isAlreadyFullyPaidForSelectedMonth)
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 cursor-pointer'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? (isBangla ? 'সংরক্ষণ করা হচ্ছে...' : 'Processing...')
                  : !isBulkMode && isAlreadyFullyPaidForSelectedMonth
                  ? (isBangla ? `${collectionMonth} মাসের চাঁদা ইতিমধ্যে পরিশোধিত` : `${collectionMonth} is already paid`)
                  : isBulkMode
                  ? (isBangla
                      ? `একসাথে ${selectedUnpaidMonths.length} মাসের চাঁদা আদায় ও রসিদ তৈরি (${paidAmount > 0 ? `৳${paidAmount.toLocaleString()}` : ''})`
                      : `Receive Bulk Collection (${selectedUnpaidMonths.length} Months)`)
                  : isLateFineOnly
                  ? (isBangla ? 'বিলম্ব ফি গ্রহণ ও রসিদ তৈরি করুন' : 'Receive Late Fine & Generate Receipt')
                  : (isBangla ? 'চাঁদা গ্রহণ ও রসিদ তৈরি করুন' : 'Receive Contribution & Generate Receipt')}
              </span>
            </button>
          </form>
        </div>

        {/* Right Column: Collections Register Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isBangla ? 'আদায়কৃত চাঁদা ও রসিদ রেজিস্টার' : 'Collections & Receipts Register'}
              </h3>
              <p className="text-[11px] text-slate-500">
                সর্বমোট {groupedReceiptList.length} টি মানি রসিদ ({userCollections.length} টি মাসিক রেকর্ড) সংরক্ষিত আছে
              </p>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="রসিদ নং, সদস্য নাম বা মাস..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">রসিদ নং</th>
                  <th className="px-3 py-2.5">তারিখ</th>
                  <th className="px-3 py-2.5">সদস্য</th>
                  <th className="px-3 py-2.5">আদায়ের সময়কাল</th>
                  <th className="px-3 py-2.5 text-right">মোট আদায় (৳)</th>
                  <th className="px-3 py-2.5 text-center">স্ট্যাটাস</th>
                  <th className="px-3 py-2.5 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      কোনো চাঁদা আদায়ের তথ্য পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r, index) => {
                    const sorted = [...r.months].sort();
                    const isMulti = r.itemsCount > 1;
                    return (
                      <tr
                        key={`${r.receiptNo}-${index}`}
                        className={`hover:bg-slate-50 transition-colors ${
                          r.status === 'REVERSED' ? 'bg-rose-50/40 text-slate-400' : ''
                        }`}
                      >
                        <td className="px-3 py-2.5 font-mono font-bold text-emerald-800 whitespace-nowrap">
                          {r.receiptNo}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap">{r.collectionDate}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                          {r.memberName} <span className="text-[10px] text-slate-400">({r.memberId})</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {isMulti ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[11px] text-slate-900">
                                {sorted[0]} হতে {sorted[sorted.length - 1]}
                              </span>
                              <span className="bg-emerald-100 text-emerald-900 text-[9px] font-bold px-1.5 py-0.2 rounded whitespace-nowrap">
                                {r.itemsCount} মাস
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono text-[11px]">{sorted[0]}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-right text-emerald-700 whitespace-nowrap">
                          ৳{r.totalPaid?.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {r.status === 'ACTIVE' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              সক্রিয়
                            </span>
                          ) : (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              বাতিলকৃত
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => setViewingReceiptNo(r.receiptNo)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 mx-auto transition-colors"
                            title="মানি রসিদ দেখুন ও প্রিন্ট করুন"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>রসিদ</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
            <span>
              সর্বমোট সংগৃহীত চাঁদা:{' '}
              <strong>
                ৳
                {userCollections
                  .reduce((sum, c) => sum + (c?.status === 'ACTIVE' || !c?.status ? (c?.paidAmount || 0) : 0), 0)
                  ?.toLocaleString()}
              </strong>
            </span>
            <span>নিয়মিত চাঁদা হার: ৳{db.settings.monthlyContribution}</span>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {viewingReceiptNo && (
        <ReceiptModal
          receiptNo={viewingReceiptNo}
          isOpen={!!viewingReceiptNo}
          onClose={() => setViewingReceiptNo(null)}
        />
      )}
    </div>
    </ErrorBoundary>
  );
};

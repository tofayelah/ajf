import React, { useState, useMemo } from 'react';
import { AppDatabaseState } from '../../services/db';
import { useApp } from '../../context/AppContext';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';
import { AJFLogo } from '../common/AJFLogo';
import {
  Search,
  Filter,
  Printer,
  Download,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  Receipt,
  Users,
  Building,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  FileText,
  ChevronRight,
  TrendingUp,
  Layers
} from 'lucide-react';

interface MonthlyCollectionStatementReportProps {
  db: AppDatabaseState;
  onDrillDown?: (item: any) => void;
}

export const MonthlyCollectionStatementReport: React.FC<MonthlyCollectionStatementReportProps> = ({
  db,
  onDrillDown
}) => {
  const { activeUser, language } = useApp();
  const isBangla = language === 'bn';
  const isMemberRole = activeUser?.role === 'MEMBER';
  const memberLinkedId = activeUser?.linkedMemberId;

  // Active Financial Year resolution
  const activeFy = useMemo(() => {
    return (
      db.financialYears?.find(fy => fy.status === 'ACTIVE') ||
      db.financialYears?.[0] || {
        id: 'FY-2026',
        yearCode: '2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'ACTIVE' as const
      }
    );
  }, [db.financialYears]);

  // Determine current active month in YYYY-MM
  const defaultCurrentMonth = useMemo(() => {
    const today = new Date().toISOString().slice(0, 7); // e.g. '2026-09'
    return today;
  }, []);

  // Filter States
  const [selectedFyId, setSelectedFyId] = useState<string>(activeFy.id);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultCurrentMonth);
  const [fromDate, setFromDate] = useState<string>(`${defaultCurrentMonth}-01`);
  const [toDate, setToDate] = useState<string>(() => {
    const [y, m] = defaultCurrentMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return `${defaultCurrentMonth}-${String(lastDay).padStart(2, '0')}`;
  });

  const [selectedMember, setSelectedMember] = useState<string>(
    isMemberRole && memberLinkedId ? memberLinkedId : 'ALL'
  );
  const [collectionType, setCollectionType] = useState<
    'ALL' | 'CHANDA' | 'CAPITAL' | 'ADMISSION' | 'LATE_FEE' | 'OTHER'
  >('ALL');
  const [paymentStatus, setPaymentStatus] = useState<
    'ACTIVE' | 'ALL' | 'REVERSED_CANCELLED'
  >('ACTIVE');

  // Sub-view Tab State inside report
  const [activeTab, setActiveTab] = useState<
    'SUMMARY' | 'DAILY' | 'MEMBER' | 'TRANSACTIONS' | 'REVERSED' | 'RECON'
  >('DAILY');

  // Search filter for member breakdown
  const [memberSearch, setMemberSearch] = useState('');

  // Handle Month selector change (syncs fromDate & toDate to month boundary)
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    if (newMonth === 'ALL') {
      const fyObj = db.financialYears?.find(fy => fy.id === selectedFyId) || activeFy;
      setFromDate(fyObj.startDate || '2026-01-01');
      setToDate(fyObj.endDate || '2026-12-31');
    } else {
      const [y, m] = newMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      setFromDate(`${newMonth}-01`);
      setToDate(`${newMonth}-${String(lastDay).padStart(2, '0')}`);
    }
  };

  // Handle FY change
  const handleFyChange = (fyId: string) => {
    setSelectedFyId(fyId);
    const fyObj = db.financialYears?.find(fy => fy.id === fyId) || activeFy;
    if (selectedMonth === 'ALL') {
      setFromDate(fyObj.startDate || '2026-01-01');
      setToDate(fyObj.endDate || '2026-12-31');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedFyId(activeFy.id);
    setSelectedMonth(defaultCurrentMonth);
    setFromDate(`${defaultCurrentMonth}-01`);
    const [y, m] = defaultCurrentMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    setToDate(`${defaultCurrentMonth}-${String(lastDay).padStart(2, '0')}`);
    setSelectedMember(isMemberRole && memberLinkedId ? memberLinkedId : 'ALL');
    setCollectionType('ALL');
    setPaymentStatus('ACTIVE');
    setMemberSearch('');
  };

  // 1. RAW AUTHORITATIVE TRANSACTION DATA EXTRACTION
  // All active and cancelled/reversed transactions across Collections, Capital Deposits, Admissions, Incomes
  const unifiedTransactions = useMemo(() => {
    interface UnifiedRecord {
      id: string;
      receiptNo: string;
      date: string;
      month: string;
      memberId: string;
      memberName: string;
      chanda: number;
      capital: number;
      admissionFee: number;
      lateFine: number;
      other: number;
      total: number;
      paymentMethod: string;
      receivedBy: string;
      status: 'ACTIVE' | 'POSTED' | 'CANCELLED' | 'REVERSED';
      reversedReason?: string;
      sourceType: 'COLLECTION' | 'CAPITAL' | 'ADMISSION' | 'OTHER';
      remarks?: string;
    }

    const records: UnifiedRecord[] = [];

    // 1A. Monthly Collections (db.collections)
    (db.collections || []).forEach(c => {
      const member = db.members?.find(m => m.memberId === c.memberId);
      const statusRaw = (c.status || 'ACTIVE').toUpperCase();
      const isReversedOrCancelled = statusRaw === 'REVERSED' || statusRaw === 'CANCELLED';
      const status = isReversedOrCancelled ? (statusRaw as 'CANCELLED' | 'REVERSED') : 'ACTIVE';

      // Chanda portion and Late Fine portion
      const chandaAmt = c.monthlyAmount || 0;
      const lateFineAmt = c.lateFine || 0;
      const discountAmt = c.discount || 0;
      const effectiveTotal = c.paidAmount || Math.max(0, chandaAmt + lateFineAmt - discountAmt);

      records.push({
        id: c.collectionId || `COL-${c.receiptNo}`,
        receiptNo: c.receiptNo,
        date: c.collectionDate,
        month: c.collectionMonth || c.collectionDate.slice(0, 7),
        memberId: c.memberId,
        memberName: c.memberName || member?.fullName || 'Member',
        chanda: chandaAmt,
        capital: 0,
        admissionFee: 0,
        lateFine: lateFineAmt,
        other: 0,
        total: effectiveTotal,
        paymentMethod: c.paymentMethod || 'Cash',
        receivedBy: c.receivedBy || 'Authorized Collector',
        status,
        reversedReason: c.reversedReason,
        sourceType: 'COLLECTION',
        remarks: c.remarks || (isBangla ? 'মাসিক চাঁদা আদায়' : 'Monthly Subscription')
      });
    });

    // 1B. Capital Deposits (db.capitalDeposits)
    (db.capitalDeposits || []).forEach(cap => {
      const member = db.members?.find(m => m.memberId === cap.memberId);
      const statusRaw = (cap.status || 'ACTIVE').toUpperCase();
      const isReversedOrCancelled = statusRaw === 'REVERSED' || statusRaw === 'CANCELLED';
      const status = isReversedOrCancelled ? (statusRaw as 'CANCELLED' | 'REVERSED') : 'ACTIVE';

      records.push({
        id: cap.depositId || `CAP-${cap.voucherNo}`,
        receiptNo: cap.voucherNo,
        date: cap.date,
        month: cap.date.slice(0, 7),
        memberId: cap.memberId,
        memberName: cap.memberName || member?.fullName || 'Member',
        chanda: 0,
        capital: cap.amount || 0,
        admissionFee: 0,
        lateFine: 0,
        other: 0,
        total: cap.amount || 0,
        paymentMethod: cap.paymentMethod || 'Cash',
        receivedBy: cap.createdBy || 'Authorized Official',
        status,
        sourceType: 'CAPITAL',
        remarks: cap.remarks || (isBangla ? 'মূলধন আমানত জমা' : 'Capital Deposit')
      });
    });

    // 1C. Admission Fees (db.admissions)
    // Note: In AJF, member admission has admissionFee (non-refundable income).
    // The capital deposit paid during admission is separately logged in db.capitalDeposits,
    // so we strictly record ONLY the non-refundable admissionFee here to prevent double counting.
    (db.admissions || []).forEach(adm => {
      const member = db.members?.find(m => m.memberId === adm.memberId);
      const admDate = adm.approvalDate || adm.applicationDate || adm.createdAt.slice(0, 10);
      const isApproved = adm.status === 'APPROVED' || (adm.status as any) === 'ACTIVE' || !adm.status;
      const status = isApproved ? 'ACTIVE' : 'CANCELLED';

      if (adm.admissionFee && adm.admissionFee > 0) {
        records.push({
          id: adm.admissionId,
          receiptNo: adm.transactionNo || `ADM-${adm.admissionId}`,
          date: admDate,
          month: admDate.slice(0, 7),
          memberId: adm.memberId,
          memberName: member?.fullName || 'New Member',
          chanda: 0,
          capital: 0,
          admissionFee: adm.admissionFee || 0,
          lateFine: 0,
          other: 0,
          total: adm.admissionFee || 0,
          paymentMethod: adm.paymentMethod || 'Cash',
          receivedBy: adm.approvedBy || 'Admission Desk',
          status,
          sourceType: 'ADMISSION',
          remarks: adm.remarks || (isBangla ? 'সদস্য ভর্তি ফি (অফেরতযোগ্য)' : 'Member Admission Fee')
        });
      }
    });

    // 1D. Other Member Incomes (db.incomes)
    (db.incomes || []).forEach(inc => {
      // Exclude already covered heads
      if (
        inc.incomeHead === 'Admission Fee' ||
        inc.incomeHead === 'Monthly Collection' ||
        inc.incomeHead === 'Late Fine' ||
        inc.incomeHead === 'Late Fee'
      ) {
        return;
      }
      if (inc.memberId) {
        const member = db.members?.find(m => m.memberId === inc.memberId);
        records.push({
          id: inc.incomeId,
          receiptNo: inc.voucherNo,
          date: inc.date,
          month: inc.date.slice(0, 7),
          memberId: inc.memberId,
          memberName: inc.memberName || member?.fullName || 'Member',
          chanda: 0,
          capital: 0,
          admissionFee: 0,
          lateFine: 0,
          other: inc.amount || 0,
          total: inc.amount || 0,
          paymentMethod: inc.paymentMethod || 'Cash',
          receivedBy: 'System',
          status: inc.status === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE',
          sourceType: 'OTHER',
          remarks: inc.incomeHead || inc.remarks || 'Other Fee'
        });
      }
    });

    return records;
  }, [db.collections, db.capitalDeposits, db.admissions, db.incomes, db.members, isBangla]);

  // 2. FILTERED TRANSACTION RECORDS
  const filteredRecords = useMemo(() => {
    return unifiedTransactions.filter(record => {
      // Security / RBAC: Member can strictly only see their own collections
      if (isMemberRole && memberLinkedId) {
        if (record.memberId !== memberLinkedId) return false;
      } else if (selectedMember !== 'ALL') {
        if (record.memberId !== selectedMember) return false;
      }

      // Date Range filter
      if (fromDate && record.date < fromDate) return false;
      if (toDate && record.date > toDate) return false;

      // Status filter
      if (paymentStatus === 'ACTIVE') {
        if (record.status !== 'ACTIVE' && record.status !== 'POSTED') return false;
      } else if (paymentStatus === 'REVERSED_CANCELLED') {
        if (record.status !== 'CANCELLED' && record.status !== 'REVERSED') return false;
      }

      // Collection Type filter
      if (collectionType === 'CHANDA' && record.chanda <= 0) return false;
      if (collectionType === 'CAPITAL' && record.capital <= 0) return false;
      if (collectionType === 'ADMISSION' && record.admissionFee <= 0) return false;
      if (collectionType === 'LATE_FEE' && record.lateFine <= 0) return false;
      if (collectionType === 'OTHER' && record.other <= 0) return false;

      return true;
    });
  }, [
    unifiedTransactions,
    isMemberRole,
    memberLinkedId,
    selectedMember,
    fromDate,
    toDate,
    paymentStatus,
    collectionType
  ]);

  // Separate Effective Records (ACTIVE only for accounting totals)
  const effectiveRecords = useMemo(() => {
    return filteredRecords.filter(r => r.status === 'ACTIVE' || r.status === 'POSTED');
  }, [filteredRecords]);

  // Separate Cancelled / Reversed Records for audit trail
  const reversedRecords = useMemo(() => {
    return unifiedTransactions.filter(record => {
      if (isMemberRole && memberLinkedId && record.memberId !== memberLinkedId) return false;
      if (selectedMember !== 'ALL' && record.memberId !== selectedMember) return false;
      if (fromDate && record.date < fromDate) return false;
      if (toDate && record.date > toDate) return false;
      return record.status === 'CANCELLED' || record.status === 'REVERSED';
    });
  }, [unifiedTransactions, isMemberRole, memberLinkedId, selectedMember, fromDate, toDate]);

  // 3. EXECUTIVE SUMMARY CALCULATIONS
  const summary = useMemo(() => {
    let totalCollection = 0;
    let chandaCollection = 0;
    let capitalCollection = 0;
    let admissionFee = 0;
    let lateFee = 0;
    let otherCollection = 0;
    const memberSet = new Set<string>();
    const receiptSet = new Set<string>();

    effectiveRecords.forEach(r => {
      totalCollection += r.total;
      chandaCollection += r.chanda;
      capitalCollection += r.capital;
      admissionFee += r.admissionFee;
      lateFee += r.lateFine;
      otherCollection += r.other;
      if (r.memberId) memberSet.add(r.memberId);
      receiptSet.add(r.receiptNo || r.id);
    });

    return {
      totalCollection,
      totalReceiptsCount: receiptSet.size,
      membersCollectedCount: memberSet.size,
      chandaCollection,
      capitalCollection,
      admissionFee,
      lateFee,
      otherCollection
    };
  }, [effectiveRecords]);

  // 4. DAILY BREAKDOWN CALCULATION
  const dailyBreakdown = useMemo(() => {
    interface DailyItemInternal {
      date: string;
      receipts: Set<string>;
      chanda: number;
      capital: number;
      admissionFee: number;
      lateFine: number;
      other: number;
      dailyTotal: number;
    }

    const map = new Map<string, DailyItemInternal>();

    effectiveRecords.forEach(r => {
      const d = r.date || 'Unknown';
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          receipts: new Set(),
          chanda: 0,
          capital: 0,
          admissionFee: 0,
          lateFine: 0,
          other: 0,
          dailyTotal: 0
        });
      }
      const item = map.get(d)!;
      item.receipts.add(r.receiptNo || r.id);
      item.chanda += r.chanda;
      item.capital += r.capital;
      item.admissionFee += r.admissionFee;
      item.lateFine += r.lateFine;
      item.other += r.other;
      item.dailyTotal += r.total;
    });

    // Sort ascending by date and convert Set size to receiptsCount
    return Array.from(map.values())
      .map(item => ({
        date: item.date,
        receiptsCount: item.receipts.size,
        chanda: item.chanda,
        capital: item.capital,
        admissionFee: item.admissionFee,
        lateFine: item.lateFine,
        other: item.other,
        dailyTotal: item.dailyTotal
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [effectiveRecords]);

  // 5. MEMBER-WISE BREAKDOWN CALCULATION
  const memberBreakdown = useMemo(() => {
    interface MemberCollectionItem {
      serial: number;
      memberId: string;
      memberName: string;
      mobile?: string;
      chanda: number;
      capital: number;
      admissionFee: number;
      lateFine: number;
      other: number;
      totalCollected: number;
      receiptCount: number;
    }

    const map = new Map<string, MemberCollectionItem>();

    // Seed with all active members or filtered members
    const targetMembers = (db.members || []).filter(m => {
      if (isMemberRole && memberLinkedId) {
        return m.memberId === memberLinkedId;
      }
      if (selectedMember !== 'ALL') {
        return m.memberId === selectedMember;
      }
      return true;
    });

    targetMembers.forEach(m => {
      map.set(m.memberId, {
        serial: 0,
        memberId: m.memberId,
        memberName: m.fullName,
        mobile: m.mobile,
        chanda: 0,
        capital: 0,
        admissionFee: 0,
        lateFine: 0,
        other: 0,
        totalCollected: 0,
        receiptCount: 0
      });
    });

    // Aggregate effective records
    effectiveRecords.forEach(r => {
      if (!map.has(r.memberId)) {
        map.set(r.memberId, {
          serial: 0,
          memberId: r.memberId,
          memberName: r.memberName,
          chanda: 0,
          capital: 0,
          admissionFee: 0,
          lateFine: 0,
          other: 0,
          totalCollected: 0,
          receiptCount: 0
        });
      }
      const item = map.get(r.memberId)!;
      item.chanda += r.chanda;
      item.capital += r.capital;
      item.admissionFee += r.admissionFee;
      item.lateFine += r.lateFine;
      item.other += r.other;
      item.totalCollected += r.total;
      item.receiptCount += 1;
    });

    let list = Array.from(map.values());

    // Filter by memberSearch query if provided
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      list = list.filter(
        m =>
          m.memberId.toLowerCase().includes(q) ||
          m.memberName.toLowerCase().includes(q) ||
          (m.mobile && m.mobile.toLowerCase().includes(q))
      );
    }

    // Sort by Member ID
    list.sort((a, b) => a.memberId.localeCompare(b.memberId));

    // Assign 1-indexed serial numbers
    return list.map((item, idx) => ({ ...item, serial: idx + 1 }));
  }, [db.members, isMemberRole, memberLinkedId, selectedMember, effectiveRecords, memberSearch]);

  // 6. AUTHORITATIVE ACCOUNTING SYSTEM RECONCILIATION
  const reconciliation = useMemo(() => {
    // 6A. Total cash in from collections in cash transactions for date range
    const cashInColls = (db.cashTransactions || [])
      .filter(ct => {
        if (fromDate && ct.date < fromDate) return false;
        if (toDate && ct.date > toDate) return false;
        return (
          ct.sourceType === 'COLLECTION' ||
          ct.sourceType === 'ADMISSION' ||
          (ct.sourceType as string) === 'COLLECTION_CORRECTION'
        );
      })
      .reduce((sum, ct) => sum + (ct.cashIn || 0), 0);

    // Cash out from collection reversals
    const cashOutReversals = (db.cashTransactions || [])
      .filter(ct => {
        if (fromDate && ct.date < fromDate) return false;
        if (toDate && ct.date > toDate) return false;
        return (
          (ct.sourceType as string) === 'COLLECTION_REVERSAL' ||
          ((ct.sourceType as string) === 'COLLECTION' && (ct.cashOut || 0) > 0)
        );
      })
      .reduce((sum, ct) => sum + (ct.cashOut || 0), 0);

    // Bank deposits from collections in bank transactions for date range
    const bankDepColls = (db.bankTransactions || [])
      .filter(bt => {
        if (fromDate && bt.date < fromDate) return false;
        if (toDate && bt.date > toDate) return false;
        return bt.sourceType === 'COLLECTION' || (bt.sourceType as string) === 'ADMISSION';
      })
      .reduce((sum, bt) => sum + (bt.deposit || 0), 0);

    // Net collection-related cash
    const netCashColls = cashInColls - cashOutReversals;

    // Net authoritative cash & bank inflows
    const netCashBankInflows = netCashColls + bankDepColls;

    // Discrepancy / Variance
    const isFullScope = selectedMember === 'ALL' && collectionType === 'ALL';
    const variance = isFullScope ? summary.totalCollection - netCashBankInflows : 0;

    return {
      statementTotal: summary.totalCollection,
      cashInColls,
      cashOutReversals,
      netCashColls,
      bankDepColls,
      netCashBankInflows,
      isFullScope,
      variance,
      isReconciled: Math.abs(variance) === 0
    };
  }, [
    db.cashTransactions,
    db.bankTransactions,
    fromDate,
    toDate,
    selectedMember,
    collectionType,
    summary.totalCollection
  ]);

  // 7. EXPORT HANDLERS
  const handlePrint = () => {
    PdfService.printElement(
      'official-printable-report',
      `AJF_Monthly_Collection_Statement_${selectedMonth}`
    );
  };

  const handleDownloadPdf = () => {
    PdfService.exportToPdf(
      'official-printable-report',
      `AJF_Monthly_Collection_Statement_${selectedMonth}.pdf`
    );
  };

  const handleExportExcel = () => {
    const fyObj = db.financialYears?.find(fy => fy.id === selectedFyId) || activeFy;
    ExcelService.exportMonthlyCollectionStatement(db, {
      financialYear: fyObj.yearCode || selectedFyId,
      selectedPeriod: `${fromDate} to ${toDate} (${selectedMonth})`,
      summary,
      dailyBreakdown,
      memberBreakdown,
      receipts: effectiveRecords.map(r => ({
        receiptNo: r.receiptNo,
        date: r.date,
        memberId: r.memberId,
        memberName: r.memberName,
        type: r.sourceType,
        amount: r.total,
        paymentMethod: r.paymentMethod,
        status: r.status,
        remarks: r.remarks
      }))
    });
  };

  const currentFyObj = db.financialYears?.find(fy => fy.id === selectedFyId) || activeFy;
  const targetYearStr = currentFyObj?.yearCode || '2026';
  const bnYear = targetYearStr.split('').map(d => ['০','১','২','৩','৪','৫','৬','৭','৮','৯'][parseInt(d)]).join('');
  
  const monthOptions = [
    { value: `${targetYearStr}-01`, label: `January ${targetYearStr} (জানুয়ারি ${bnYear})` },
    { value: `${targetYearStr}-02`, label: `February ${targetYearStr} (ফেব্রুয়ারি ${bnYear})` },
    { value: `${targetYearStr}-03`, label: `March ${targetYearStr} (মার্চ ${bnYear})` },
    { value: `${targetYearStr}-04`, label: `April ${targetYearStr} (এপ্রিল ${bnYear})` },
    { value: `${targetYearStr}-05`, label: `May ${targetYearStr} (মে ${bnYear})` },
    { value: `${targetYearStr}-06`, label: `June ${targetYearStr} (জুন ${bnYear})` },
    { value: `${targetYearStr}-07`, label: `July ${targetYearStr} (জুলাই ${bnYear})` },
    { value: `${targetYearStr}-08`, label: `August ${targetYearStr} (আগস্ট ${bnYear})` },
    { value: `${targetYearStr}-09`, label: `September ${targetYearStr} (সেপ্টেম্বর ${bnYear})` },
    { value: `${targetYearStr}-10`, label: `October ${targetYearStr} (অক্টোবর ${bnYear})` },
    { value: `${targetYearStr}-11`, label: `November ${targetYearStr} (নভেম্বর ${bnYear})` },
    { value: `${targetYearStr}-12`, label: `December ${targetYearStr} (ডিসেম্বর ${bnYear})` },
  ];

  return (
    <div className="space-y-6">
      {/* 1. REPORT TITLE & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 hide-print">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                {isBangla ? 'মাসিক কালেকশন স্টেটমেন্ট' : 'Monthly Collection Statement'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isBangla
                  ? 'দৈনিক ও সদস্যভিত্তিক চাঁদা, মূলধন, ভর্তি ও জরিমানা আদায় রেজিস্টার'
                  : 'Daily and member-wise subscription, capital, admission and penalty ledger'}
              </p>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            title={isBangla ? 'প্রিন্ট করুন' : 'Print Statement'}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>{isBangla ? 'প্রিন্ট' : 'Print'}</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            title={isBangla ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-rose-600" />
            <span>PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            title={isBangla ? 'এক্সেল স্প্রেডশীট ডাউনলোড' : 'Export to Excel'}
            className="px-3 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* 2. COMPACT & RESPONSIVE FILTER BAR */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hide-print text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-emerald-700" />
            <span>{isBangla ? 'ফিল্টার ও সময়সীমা নির্বাচন' : 'Filters & Date Range'}</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-[11px] font-medium text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isBangla ? 'রিসেট' : 'Reset Filters'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {/* Financial Year */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'অর্থবছর (FY)' : 'Financial Year'}
            </label>
            <select
              value={selectedFyId}
              onChange={e => handleFyChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              {(db.financialYears || [activeFy]).map(fy => (
                <option key={fy.id} value={fy.id}>
                  {fy.yearCode || fy.id} {fy.status === 'ACTIVE' ? '★' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'মাস (Month)' : 'Month'}
            </label>
            <select
              value={selectedMonth}
              onChange={e => handleMonthChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="ALL">{isBangla ? 'সকল মাস (সম্পূর্ণ অর্থবছর)' : 'All Months (Full Year)'}</option>
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'হতে (From Date)' : 'From Date'}
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'পর্যন্ত (To Date)' : 'To Date'}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Member */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'সদস্য (Member)' : 'Member'}
            </label>
            <select
              value={selectedMember}
              disabled={isMemberRole}
              onChange={e => setSelectedMember(e.target.value)}
              className={`w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 ${
                isMemberRole ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''
              }`}
            >
              {!isMemberRole && (
                <option value="ALL">{isBangla ? 'সকল সদস্য (All Members)' : 'All Members'}</option>
              )}
              {(isMemberRole
                ? (db.members || []).filter(m => m.memberId === memberLinkedId)
                : (db.members || [])
              ).map(m => (
                <option key={m.memberId} value={m.memberId}>
                  {m.membershipNo || m.memberId} - {m.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Collection Type */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'কালেকশন টাইপ' : 'Collection Type'}
            </label>
            <select
              value={collectionType}
              onChange={e => setCollectionType(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="ALL">{isBangla ? 'সকল কালেকশন (All)' : 'All Collection Types'}</option>
              <option value="CHANDA">{isBangla ? 'মাসিক চাঁদা (Chanda)' : 'Chanda Collection'}</option>
              <option value="CAPITAL">{isBangla ? 'মূলধন জমা (Capital)' : 'Capital Deposit'}</option>
              <option value="ADMISSION">{isBangla ? 'ভর্তি ফি (Admission Fee)' : 'Admission Fee'}</option>
              <option value="LATE_FEE">{isBangla ? 'বিলম্ব ফি / জরিমানা' : 'Late Fee / Jorimana'}</option>
              <option value="OTHER">{isBangla ? 'অন্যান্য কালেকশন' : 'Other Collection'}</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'পেমেন্ট স্ট্যাটাস' : 'Payment Status'}
            </label>
            <select
              value={paymentStatus}
              onChange={e => setPaymentStatus(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              <option value="ACTIVE">{isBangla ? 'সক্রিয় রশিদ (Active)' : 'Active / Effective Only'}</option>
              <option value="ALL">{isBangla ? 'সকল (অডিটসহ)' : 'All (Audit View)'}</option>
              <option value="REVERSED_CANCELLED">{isBangla ? 'বাতিলকৃত / রিভার্সড' : 'Reversed & Cancelled Only'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE SUMMARY CARDS (USER REQUEST SECTION 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
        {/* Total Collection */}
        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-emerald-800 mb-1 flex items-center justify-between">
            <span>{isBangla ? 'মোট কালেকশন' : 'Total Collection'}</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-900">
            ৳{summary.totalCollection.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-1">
            {isBangla ? 'কার্যকর সর্বমোট' : 'Effective Total'}
          </div>
        </div>

        {/* Number of Receipts */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
            <span>{isBangla ? 'রশিদ সংখ্যা' : 'Collection Receipts'}</span>
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900">
            {summary.totalReceiptsCount}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            {isBangla ? 'ইস্যুকৃত রশিদ' : 'Total Vouchers'}
          </div>
        </div>

        {/* Members Collected */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
            <span>{isBangla ? 'পরিশোধকারী সদস্য' : 'Members Collected'}</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900">
            {summary.membersCollectedCount}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            {isBangla ? 'অনন্য সদস্য' : 'Distinct Contributors'}
          </div>
        </div>

        {/* Chanda Collection */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
            <span>{isBangla ? 'চাঁদা আদায়' : 'Chanda Collection'}</span>
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900">
            ৳{summary.chandaCollection.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            {isBangla ? 'মাসিক চাঁদা' : 'Monthly Subscriptions'}
          </div>
        </div>

        {/* Capital Collection */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
            <span>{isBangla ? 'মূলধন জমা' : 'Capital Collection'}</span>
            <Building className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-blue-900">
            ৳{summary.capitalCollection.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            {isBangla ? 'সদস্য মূলধন' : 'Member Equity Deposits'}
          </div>
        </div>

        {/* Admission Fee */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
            <span>{isBangla ? 'ভর্তি ফি' : 'Admission Fee'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-purple-900">
            ৳{summary.admissionFee.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-700 font-medium mt-1">
            {isBangla ? 'অফেরতযোগ্য আয়' : 'Non-refundable Income'}
          </div>
        </div>

        {/* Late Fee / Jorimana */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
            <span>{isBangla ? 'বিলম্ব ফি / জরিমানা' : 'Late Fee / Jorimana'}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-amber-800">
            ৳{summary.lateFee.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-700 font-medium mt-1">
            {isBangla ? 'জরিমানা আদায়' : 'Penalty Collection'}
          </div>
        </div>

        {/* Other Collection */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
            <span>{isBangla ? 'অন্যান্য কালেকশন' : 'Other Collection'}</span>
            <Layers className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-800">
            ৳{summary.otherCollection.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1">
            {isBangla ? 'বিবিধ আদায়' : 'Misc Collections'}
          </div>
        </div>
      </div>

      {/* 4. RECONCILIATION & ACCOUNTING INTEGRITY AUDIT BOX (USER REQUEST SECTION 8) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-slate-800">
              {isBangla
                ? 'হিসাবরক্ষণ ও ক্যাশ/ব্যাংক সমন্বয় (Accounting Reconciliation)'
                : 'Accounting & Cash / Bank Book Reconciliation'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {reconciliation.isReconciled ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {isBangla ? 'পূর্ণাঙ্গ সমন্বিত (Variance ৳0)' : 'Fully Reconciled (Diff: ৳0)'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                {isBangla ? `পার্থক্য: ৳${reconciliation.variance}` : `Discrepancy: ৳${reconciliation.variance}`}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 font-medium block">
              {isBangla ? 'মাসিক স্টেটমেন্ট কালেকশন:' : 'Monthly Statement Total:'}
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              ৳{summary.totalCollection.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 font-medium block">
              {isBangla ? 'ক্যাশ বুক আদায় (Cash In):' : 'Cash Book Collections:'}
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              ৳{(reconciliation.cashInColls - reconciliation.cashOutReversals).toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 font-medium block">
              {isBangla ? 'ব্যাংক বুক ডিপোজিট (Bank In):' : 'Bank Book Collections:'}
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              ৳{reconciliation.bankDepColls.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 font-medium block">
              {isBangla ? 'সমন্বয় স্থিতি (Variance):' : 'Reconciliation Variance:'}
            </span>
            <span
              className={`font-mono font-bold text-sm ${
                reconciliation.isReconciled ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              ৳{Math.abs(reconciliation.variance).toLocaleString()}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
          {isBangla
            ? 'হিসাবরক্ষণ বিধি: ভর্তি ফি (Admission Fee) এবং বিলম্ব ফি (Late Fee) অফেরতযোগ্য আয় হিসেবে সংরক্ষিত এবং এদের কোনোটিই সদস্যের ব্যক্তিগত মূলধন ব্যালেন্স বৃদ্ধি করে না।'
            : 'Accounting Standard: Admission Fee and Late Fee are non-refundable operating income and do not increase Member Capital balances according to the canonical AJF accounting rules.'}
        </p>
      </div>

      {/* 5. SUB-VIEW TABS (Daily, Member-wise, Transactions, Reversed Audit) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 hide-print pt-2">
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('DAILY')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'DAILY'
                ? 'border-emerald-700 text-emerald-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isBangla ? 'দৈনিক আদায় বিবরণী' : 'Daily Breakdown'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded-full font-mono font-bold text-slate-600">
              {dailyBreakdown.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('MEMBER')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'MEMBER'
                ? 'border-emerald-700 text-emerald-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isBangla ? 'সদস্যভিত্তিক আদায়' : 'Member-wise Breakdown'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded-full font-mono font-bold text-slate-600">
              {memberBreakdown.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'TRANSACTIONS'
                ? 'border-emerald-700 text-emerald-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isBangla ? 'রশিদ ও লেনদেন তালিকা' : 'Receipt Details'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded-full font-mono font-bold text-slate-600">
              {effectiveRecords.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('REVERSED')}
            className={`px-3 py-2 font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'REVERSED'
                ? 'border-rose-600 text-rose-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-rose-700 hover:bg-slate-50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>{isBangla ? 'বাতিলকৃত / রিভার্সড রশিদ' : 'Reversed / Cancelled'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                reversedRecords.length > 0
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {reversedRecords.length}
            </span>
          </button>
        </div>

        {/* Member Search filter (visible on Member-wise tab) */}
        {activeTab === 'MEMBER' && (
          <div className="relative mb-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder={isBangla ? 'সদস্য খুঁজুন...' : 'Search member...'}
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg w-44 sm:w-56 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {/* 6. MAIN CONTENT TABLES */}
      {/* 6A. DAILY BREAKDOWN TABLE (USER REQUEST SECTION 4) */}
      {activeTab === 'DAILY' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-bold text-slate-800">
              {isBangla ? 'দৈনিক আদায় তালিকা (Daily Breakdown)' : 'Daily Collection Breakdown Table'}
            </span>
            <span className="text-slate-500">
              {isBangla
                ? `সময়সীমা: ${fromDate} হতে ${toDate}`
                : `Period: ${fromDate} to ${toDate}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 whitespace-nowrap">{isBangla ? 'তারিখ (Date)' : 'Date'}</th>
                  <th className="p-3 text-center whitespace-nowrap">
                    {isBangla ? 'রশিদ সংখ্যা' : 'Receipts'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">
                    {isBangla ? 'মাসিক চাঁদা (৳)' : 'Chanda (৳)'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">
                    {isBangla ? 'মূলধন (৳)' : 'Capital (৳)'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">
                    {isBangla ? 'ভর্তি ফি (৳)' : 'Admission (৳)'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">
                    {isBangla ? 'বিলম্ব ফি (৳)' : 'Late Fee (৳)'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">
                    {isBangla ? 'অন্যান্য (৳)' : 'Other (৳)'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap bg-emerald-50/50">
                    {isBangla ? 'দৈনিক মোট (৳)' : 'Daily Total (৳)'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyBreakdown.map(item => (
                  <tr key={item.date} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-700">
                      {item.receiptsCount}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-800">
                      ৳{item.chanda.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-blue-800">
                      ৳{item.capital.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-purple-800">
                      ৳{item.admissionFee.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-700">
                      ৳{item.lateFine.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      ৳{item.other.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                      ৳{item.dailyTotal.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {dailyBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                      {isBangla
                        ? 'নির্বাচিত সময়সীমার মধ্যে কোনো কালেকশন পাওয়া যায়নি।'
                        : 'No collection records found for the selected period.'}
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Monthly Grand Total Row (Required) */}
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td className="p-3 uppercase">
                    {isBangla ? 'সর্বমোট (Grand Total)' : 'Monthly Grand Total'}
                  </td>
                  <td className="p-3 text-center font-mono">
                    {summary.totalReceiptsCount}
                  </td>
                  <td className="p-3 text-right font-mono">
                    ৳{summary.chandaCollection.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-blue-900">
                    ৳{summary.capitalCollection.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-purple-900">
                    ৳{summary.admissionFee.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-800">
                    ৳{summary.lateFee.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-700">
                    ৳{summary.otherCollection.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-950 bg-emerald-100/70 text-sm">
                    ৳{summary.totalCollection.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 6B. MEMBER-WISE BREAKDOWN TABLE (USER REQUEST SECTION 5) */}
      {activeTab === 'MEMBER' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-bold text-slate-800">
              {isBangla ? 'সদস্যভিত্তিক আদায় বিবরণী' : 'Member-wise Collection Breakdown Table'}
            </span>
            <span className="text-slate-500">
              {isBangla
                ? `মোট সদস্য: ${memberBreakdown.length} জন`
                : `Total Members: ${memberBreakdown.length}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center whitespace-nowrap w-12">
                    {isBangla ? 'ক্রমিক' : 'Serial'}
                  </th>
                  <th className="p-3 whitespace-nowrap">
                    {isBangla ? 'সদস্য নং (ID)' : 'Member ID'}
                  </th>
                  <th className="p-3 whitespace-nowrap">
                    {isBangla ? 'সদস্যের নাম' : 'Member Name'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">
                    {isBangla ? 'চাঁদা (৳)' : 'Chanda'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">
                    {isBangla ? 'মূলধন (৳)' : 'Capital'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">
                    {isBangla ? 'ভর্তি ফি (৳)' : 'Admission'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">
                    {isBangla ? 'বিলম্ব ফি (৳)' : 'Late Fee'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap">
                    {isBangla ? 'অন্যান্য (৳)' : 'Other'}
                  </th>
                  <th className="p-3 text-right whitespace-nowrap bg-emerald-50/50">
                    {isBangla ? 'মোট আদায় (৳)' : 'Total Collected'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memberBreakdown.map(m => (
                  <tr key={m.memberId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-center font-mono text-slate-500">
                      {m.serial}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {m.memberId}
                    </td>
                    <td className="p-3 font-medium text-slate-800">
                      <div>{m.memberName}</div>
                      {m.mobile && (
                        <div className="text-[10px] text-slate-400 font-mono">{m.mobile}</div>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-800">
                      ৳{m.chanda.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-blue-800">
                      ৳{m.capital.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-purple-800">
                      ৳{m.admissionFee.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-700">
                      ৳{m.lateFine.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      ৳{m.other.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                      ৳{m.totalCollected.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {memberBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                      {isBangla
                        ? 'কোনো সদস্যের রেকর্ড পাওয়া যায়নি।'
                        : 'No member records found matching the filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Grand Total Row */}
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td colSpan={3} className="p-3 uppercase">
                    {isBangla ? 'সর্বমোট (Grand Total)' : 'Grand Total'}
                  </td>
                  <td className="p-3 text-right font-mono">
                    ৳{summary.chandaCollection.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-blue-900">
                    ৳{summary.capitalCollection.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-purple-900">
                    ৳{summary.admissionFee.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-800">
                    ৳{summary.lateFee.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-700">
                    ৳{summary.otherCollection.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-950 bg-emerald-100/70 text-sm">
                    ৳{summary.totalCollection.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 6C. RECEIPT & TRANSACTION DETAIL VIEW */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-bold text-slate-800">
              {isBangla ? 'রশিদ ও লেনদেন তালিকা' : 'Receipt & Transaction Registry'}
            </span>
            <span className="text-slate-500">
              {isBangla
                ? `মোট রশিদ: ${effectiveRecords.length} টি`
                : `Total Receipts: ${effectiveRecords.length}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 whitespace-nowrap">{isBangla ? 'রশিদ নং' : 'Receipt No'}</th>
                  <th className="p-3 whitespace-nowrap">{isBangla ? 'তারিখ ও মাস' : 'Date & Month'}</th>
                  <th className="p-3 whitespace-nowrap">{isBangla ? 'সদস্য' : 'Member'}</th>
                  <th className="p-3 whitespace-nowrap">{isBangla ? 'ধরণ' : 'Type'}</th>
                  <th className="p-3 whitespace-nowrap">{isBangla ? 'মাধ্যম' : 'Method'}</th>
                  <th className="p-3 whitespace-nowrap">{isBangla ? 'বিবরণ' : 'Details'}</th>
                  <th className="p-3 text-right whitespace-nowrap bg-emerald-50/50">
                    {isBangla ? 'পরিমাণ (৳)' : 'Amount (৳)'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {effectiveRecords.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => onDrillDown && onDrillDown(r)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {r.receiptNo}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{r.date}</div>
                      <div className="text-[10px] text-emerald-700 font-mono">{r.month}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{r.memberName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{r.memberId}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          r.sourceType === 'COLLECTION'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : r.sourceType === 'CAPITAL'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : r.sourceType === 'ADMISSION'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.sourceType}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap font-medium text-slate-600">
                      {r.paymentMethod}
                    </td>
                    <td className="p-3 text-[11px] text-slate-600 max-w-xs truncate">
                      {r.remarks}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-900 bg-emerald-50/30 whitespace-nowrap">
                      ৳{r.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {effectiveRecords.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                      {isBangla
                        ? 'কোনো লেনদেন পাওয়া যায়নি।'
                        : 'No transaction receipts found for the selection.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6D. CANCELLED / REVERSED AUDIT TRAIL (USER REQUEST SECTION 7) */}
      {activeTab === 'REVERSED' && (
        <div className="space-y-4">
          <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>
                {isBangla
                  ? 'বাতিলকৃত ও সংশোধিত রশিদের নিরীক্ষা (Cancelled & Reversed Receipts Audit)'
                  : 'Audit Visibility: Cancelled & Reversed Receipts'}
              </span>
            </div>
            <p className="text-rose-700 text-[11px]">
              {isBangla
                ? 'হিসাবরক্ষণ নিয়ম অনুযায়ী বাতিল বা রিভার্সকৃত রশিদ কার্যকর কালেকশন মোট থেকে বাদ দেওয়া হয়েছে। তবে নিরীক্ষা ও স্বচ্ছতার সুবিধার্থে মূল রেকর্ড এখানে সংরক্ষিত রয়েছে।'
                : 'Per accounting standards, cancelled and reversed receipts are strictly excluded from effective collections, but their records and reasons are preserved here for complete audit visibility.'}
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 whitespace-nowrap">{isBangla ? 'রশিদ নং' : 'Receipt No'}</th>
                    <th className="p-3 whitespace-nowrap">{isBangla ? 'তারিখ' : 'Date'}</th>
                    <th className="p-3 whitespace-nowrap">{isBangla ? 'সদস্য' : 'Member'}</th>
                    <th className="p-3 whitespace-nowrap">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="p-3 text-right whitespace-nowrap">{isBangla ? 'পরিমাণ (৳)' : 'Amount (৳)'}</th>
                    <th className="p-3 whitespace-nowrap">{isBangla ? 'বাতিলের কারণ ও নোট' : 'Audit Reason / Notes'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reversedRecords.map(r => (
                    <tr key={r.id} className="bg-rose-50/20 hover:bg-rose-50/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap line-through text-rose-700">
                        {r.receiptNo}
                      </td>
                      <td className="p-3 whitespace-nowrap font-medium text-slate-700">
                        {r.date}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{r.memberName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{r.memberId}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                        ৳{r.total.toLocaleString()}
                      </td>
                      <td className="p-3 text-[11px] text-slate-600 max-w-sm">
                        {r.reversedReason || r.remarks || (isBangla ? 'ভুল সংশোধন / কালেকশন বাতিল' : 'Receipt cancelled or reversed')}
                      </td>
                    </tr>
                  ))}
                  {reversedRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                        {isBangla
                          ? 'নির্বাচিত সময়সীমায় কোনো বাতিলকৃত রশিদ নেই।'
                          : 'No cancelled or reversed receipts found in this period.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. OFFICIAL PRINTABLE REPORT STRUCTURE (For Print and PDF) */}
      <div className="hidden print:block space-y-6 pt-4">
        <div className="border-t-2 border-slate-300 pt-4">
          <div className="text-center space-y-1 mb-4">
            <h2 className="text-lg font-bold text-slate-900 uppercase">
              Monthly Collection Statement (মাসিক কালেকশন স্টেটমেন্ট)
            </h2>
            <p className="text-xs text-slate-600">
              Financial Year: {selectedFyId} | Period: {fromDate} to {toDate}
            </p>
          </div>

          {/* Print Summary Table */}
          <div className="mb-4">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-300 pb-1 mb-2">
              1. EXECUTIVE SUMMARY
            </h3>
            <table className="w-full text-xs border border-slate-300">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2 font-bold bg-slate-50">Total Collection:</td>
                  <td className="p-2 font-mono font-bold text-right">৳{summary.totalCollection.toLocaleString()}</td>
                  <td className="p-2 font-bold bg-slate-50">Receipts Count:</td>
                  <td className="p-2 font-mono text-right">{summary.totalReceiptsCount}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold bg-slate-50">Chanda Collection:</td>
                  <td className="p-2 font-mono text-right">৳{summary.chandaCollection.toLocaleString()}</td>
                  <td className="p-2 font-bold bg-slate-50">Capital Collection:</td>
                  <td className="p-2 font-mono text-right">৳{summary.capitalCollection.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold bg-slate-50">Admission Fee:</td>
                  <td className="p-2 font-mono text-right">৳{summary.admissionFee.toLocaleString()}</td>
                  <td className="p-2 font-bold bg-slate-50">Late Fee / Jorimana:</td>
                  <td className="p-2 font-mono text-right">৳{summary.lateFee.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Print Daily Breakdown Table */}
          <div className="mb-4">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-300 pb-1 mb-2">
              2. DAILY BREAKDOWN
            </h3>
            <table className="w-full text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-center">Receipts</th>
                  <th className="p-2 text-right">Chanda</th>
                  <th className="p-2 text-right">Capital</th>
                  <th className="p-2 text-right">Admission</th>
                  <th className="p-2 text-right">Late Fee</th>
                  <th className="p-2 text-right">Daily Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dailyBreakdown.map(d => (
                  <tr key={d.date}>
                    <td className="p-2 font-mono">{d.date}</td>
                    <td className="p-2 text-center font-mono">{d.receiptsCount}</td>
                    <td className="p-2 text-right font-mono">৳{d.chanda.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">৳{d.capital.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">৳{d.admissionFee.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">৳{d.lateFine.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono font-bold">৳{d.dailyTotal.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                  <td className="p-2">GRAND TOTAL</td>
                  <td className="p-2 text-center font-mono">{summary.totalReceiptsCount}</td>
                  <td className="p-2 text-right font-mono">৳{summary.chandaCollection.toLocaleString()}</td>
                  <td className="p-2 text-right font-mono">৳{summary.capitalCollection.toLocaleString()}</td>
                  <td className="p-2 text-right font-mono">৳{summary.admissionFee.toLocaleString()}</td>
                  <td className="p-2 text-right font-mono">৳{summary.lateFee.toLocaleString()}</td>
                  <td className="p-2 text-right font-mono">৳{summary.totalCollection.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Print Signatures */}
          <div className="pt-12 grid grid-cols-3 gap-8 text-center text-xs">
            <div className="border-t border-slate-400 pt-1 font-bold">Prepared By / Accountant</div>
            <div className="border-t border-slate-400 pt-1 font-bold">Auditor / Verified By</div>
            <div className="border-t border-slate-400 pt-1 font-bold">President / General Secretary</div>
          </div>
        </div>
      </div>
    </div>
  );
};

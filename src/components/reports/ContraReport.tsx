import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PdfService } from '../../services/pdfService';
import { AccountingService } from '../../services/accounting';
import { ContraTransaction, ContraType } from '../../types';
import { isDateInClosedYear } from '../../utils/fyGuard';
import { ContraEntryModal } from '../accounts/ContraEntryModal';
import {
  ArrowRightLeft,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Wallet,
  Landmark,
  ShieldCheck,
  Eye,
  FileText,
  History,
  Trash2,
  Edit3,
  Send,
  Plus,
  X,
  Sparkles,
  Check,
  AlertTriangle
} from 'lucide-react';

export const ContraReport: React.FC = () => {
  const {
    db,
    language,
    reverseContraEntry,
    reverseAndCorrectContraEntry,
    postDraftContraEntry,
    deleteDraftContraEntry,
    activeUser
  } = useApp();
  const isBangla = language === 'bn';

  const [viewMode, setViewMode] = useState<'ALL_VOUCHERS' | 'DRAFT_LOG' | 'REVERSALS'>('ALL_VOUCHERS');
  const [filterType, setFilterType] = useState<'ALL' | ContraType>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'POSTED' | 'DRAFT' | 'REVERSED' | 'REVERSAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    voucherNo?: string;
    status?: string;
    journal?: string;
    cashBook?: string;
    bankBook?: string;
  } | null>(null);
  const [postingDraftId, setPostingDraftId] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<ContraTransaction | null>(null);
  const [viewingTxn, setViewingTxn] = useState<ContraTransaction | null>(null);
  const [printingVoucherTxn, setPrintingVoucherTxn] = useState<ContraTransaction | null>(null);
  const [auditViewingTxn, setAuditViewingTxn] = useState<ContraTransaction | null>(null);

  // Reverse / Correction Modal state
  const [reversingTxn, setReversingTxn] = useState<ContraTransaction | null>(null);
  const [reversalMode, setReversalMode] = useState<'REVERSE_ONLY' | 'REVERSE_AND_CORRECT'>('REVERSE_ONLY');
  const [reverseReason, setReverseReason] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Corrected Entry Fields (for REVERSE_AND_CORRECT mode)
  const [corrType, setCorrType] = useState<ContraType>('CASH_TO_BANK');
  const [corrFromBankId, setCorrFromBankId] = useState<string>('');
  const [corrToBankId, setCorrToBankId] = useState<string>('');
  const [corrAmount, setCorrAmount] = useState<number | ''>('');
  const [corrDate, setCorrDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [corrTransactionNo, setCorrTransactionNo] = useState<string>('');
  const [corrRemarks, setCorrRemarks] = useState<string>('');

  const activeBankAccounts = useMemo(() => {
    return (db.bankAccounts || []).filter(b => b.status === 'ACTIVE');
  }, [db.bankAccounts]);

  const currentCashBalance = useMemo(() => {
    return AccountingService.getCashBalance(db.cashTransactions);
  }, [db.cashTransactions]);

  const getBankBalance = (bankId: string) => {
    return AccountingService.getBankAccountBalance(db, bankId);
  };

  // Persistent Contra Transactions from DB
  const contraTransactions = useMemo(() => {
    const list = (db.contraTransactions && db.contraTransactions.length > 0)
      ? db.contraTransactions
      : (db.contraEntries || []);
    return [...list].sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (new Date(b.createdAt || '').getTime() || 0) - (new Date(a.createdAt || '').getTime() || 0);
    });
  }, [db.contraTransactions, db.contraEntries]);

  // Statistics (derived directly from authoritative persistent DB)
  const postedTxns = useMemo(() => {
    return contraTransactions.filter(t => (t.status || 'POSTED') === 'POSTED');
  }, [contraTransactions]);

  const draftTxns = useMemo(() => {
    return contraTransactions.filter(t => t.status === 'DRAFT');
  }, [contraTransactions]);

  const reversedTxns = useMemo(() => {
    return contraTransactions.filter(t => t.status === 'REVERSED');
  }, [contraTransactions]);

  const totalVolume = useMemo(() => {
    return postedTxns.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [postedTxns]);

  const totalDraftVolume = useMemo(() => {
    return draftTxns.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [draftTxns]);

  const totalCashToBank = useMemo(() => {
    return postedTxns.filter(t => t.type === 'CASH_TO_BANK').reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [postedTxns]);

  const totalBankToCash = useMemo(() => {
    return postedTxns.filter(t => t.type === 'BANK_TO_CASH').reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [postedTxns]);

  const filteredTxns = useMemo(() => {
    return contraTransactions.filter(t => {
      if (viewMode === 'DRAFT_LOG' && t.status !== 'DRAFT') return false;
      if (viewMode === 'REVERSALS' && t.status !== 'REVERSED' && t.status !== 'REVERSAL') return false;

      if (filterType !== 'ALL' && t.type !== filterType) return false;
      if (filterStatus !== 'ALL') {
        const actualStatus = t.status || 'POSTED';
        if (actualStatus !== filterStatus) return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const vNo = (t.voucherNo || '').toLowerCase();
        const fromName = (t.fromAccountName || '').toLowerCase();
        const toName = (t.toAccountName || '').toLowerCase();
        const ref = (t.transactionNo || t.reference || '').toLowerCase();
        const remarks = (t.remarks || '').toLowerCase();
        const creator = (t.createdBy || '').toLowerCase();
        return (
          vNo.includes(term) ||
          fromName.includes(term) ||
          toName.includes(term) ||
          ref.includes(term) ||
          remarks.includes(term) ||
          creator.includes(term)
        );
      }
      return true;
    });
  }, [contraTransactions, viewMode, filterType, filterStatus, searchTerm]);

  const handlePrintFullReport = () => {
    PdfService.printElement('printable-contra-report', 'Contra_Transaction_Report');
  };

  const handlePrintVoucher = () => {
    if (!printingVoucherTxn) return;
    PdfService.printElement('printable-single-voucher', `Contra_Voucher_${printingVoucherTxn.voucherNo}`);
  };

  // Check if active user has permission to reverse
  const canUserReverse = useMemo(() => {
    const role = activeUser?.role;
    return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'FINANCE_MANAGER';
  }, [activeUser]);

  // Open Reversal Modal with prefilled data
  const handleOpenReversalModal = (txn: ContraTransaction) => {
    setReversingTxn(txn);
    setReversalMode('REVERSE_ONLY');
    setReverseReason('');
    setReversalError(null);

    // Default correction values based on original
    setCorrType(txn.type);
    setCorrFromBankId(txn.fromAccountId || activeBankAccounts[0]?.id || '');
    setCorrToBankId(txn.toAccountId || (activeBankAccounts.length > 1 ? activeBankAccounts[1]?.id : activeBankAccounts[0]?.id || ''));
    setCorrAmount(txn.amount);
    setCorrDate(new Date().toISOString().split('T')[0]);
    setCorrTransactionNo(txn.transactionNo || '');
    setCorrRemarks(txn.remarks ? `Correction of ${txn.voucherNo}: ${txn.remarks}` : `সংশোধিত এন্ট্রি (মূল ভাউচার: ${txn.voucherNo})`);
  };

  const handleConfirmReversalOrCorrection = async () => {
    if (!reversingTxn) return;
    setReversalError(null);

    if (!canUserReverse) {
      setReversalError(
        isBangla
          ? 'অনুমতি অস্বীকৃত: শুধুমাত্র অ্যাডমিন এবং ফাইন্যান্স ম্যানেজার কন্ট্রা এন্ট্রি রিভার্স বা সংশোধন করতে পারবেন।'
          : 'Permission denied: Only Admin and Finance Manager can reverse contra entries.'
      );
      return;
    }

    if (!reverseReason.trim()) {
      setReversalError(
        isBangla
          ? 'সংশোধন বা প্রত্যাহারের সুনির্দিষ্ট কারণ উল্লেখ করা বাধ্যতামূলক।'
          : 'Mandatory correction reason is required.'
      );
      return;
    }

    // Closed Financial Year Guard
    if (isDateInClosedYear(reversingTxn.date, db) || isDateInClosedYear(new Date().toISOString().split('T')[0], db)) {
      setReversalError(
        isBangla
          ? 'এই অর্থবছর বন্ধ রয়েছে। বন্ধ অর্থবছরের লেনদেন রিভার্স বা সংশোধন করা যাবে না।'
          : 'This financial year is closed. Modifications are locked.'
      );
      return;
    }

    // Reconciliation Guard
    if (reversingTxn.reconciled || reversingTxn.isReconciliationLocked) {
      setReversalError(
        isBangla
          ? 'এই লেনদেনটি ইতিমধ্যে সম্পন্নকৃত রিকনসিলিয়েশনে (Reconciliation) অন্তর্ভুক্ত রয়েছে। সরাসরি রিভার্স করা যাবে না।'
          : 'This transaction is locked in completed reconciliation.'
      );
      return;
    }

    setIsSubmittingReversal(true);
    try {
      if (reversalMode === 'REVERSE_ONLY') {
        const res = await reverseContraEntry({
          contraId: reversingTxn.id,
          reason: reverseReason.trim()
        });

        if (res && res.success) {
          setReversingTxn(null);
          setReverseReason('');
          setActionFeedback({
            type: 'success',
            message: isBangla ? 'কন্ট্রা এন্ট্রি সফলভাবে প্রত্যাহার (Reverse) করা হয়েছে।' : 'Contra entry reversed successfully.'
          });
        } else {
          setReversalError(res?.message || 'Failed to reverse contra entry.');
        }
      } else {
        // REVERSE_AND_CORRECT Mode
        const numCorrAmount = Number(corrAmount);
        if (!numCorrAmount || numCorrAmount <= 0) {
          setReversalError(isBangla ? 'অনুগ্রহ করে নতুন সংশোধিত সঠিক টাকার পরিমাণ লিখুন।' : 'Please enter valid corrected amount.');
          setIsSubmittingReversal(false);
          return;
        }

        const res = await reverseAndCorrectContraEntry({
          contraId: reversingTxn.id,
          reason: reverseReason.trim(),
          newEntry: {
            type: corrType,
            amount: numCorrAmount,
            fromBankAccountId: (corrType === 'BANK_TO_CASH' || corrType === 'BANK_TO_BANK') ? corrFromBankId : undefined,
            toBankAccountId: (corrType === 'CASH_TO_BANK' || corrType === 'BANK_TO_BANK') ? corrToBankId : undefined,
            date: corrDate,
            transactionNo: corrTransactionNo.trim() || undefined,
            reference: corrTransactionNo.trim() || undefined,
            remarks: corrRemarks.trim() || undefined
          }
        });

        if (res && res.success) {
          setReversingTxn(null);
          setReverseReason('');
          setActionFeedback({
            type: 'success',
            message: isBangla ? 'কন্ট্রা এন্ট্রি সফলভাবে প্রত্যাহার করে নতুন সংশোধিত এন্ট্রি পোস্ট করা হয়েছে।' : 'Contra entry corrected and reposted.'
          });
        } else {
          setReversalError(res?.message || 'Failed to reverse and create corrected contra entry.');
        }
      }
    } catch (err: any) {
      setReversalError(err.message || 'An error occurred during reversal.');
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  // Draft Actions with Full Feedback and Robust Try/Catch
  const handlePostDraft = async (draftId: string) => {
    const draft = contraTransactions.find(t => t.id === draftId);
    if (!draft) {
      setActionFeedback({
        type: 'error',
        message: isBangla ? 'কন্ট্রা এন্ট্রি রেকর্ড পাওয়া যায়নি।' : 'Contra entry draft not found.'
      });
      return;
    }

    if (draft.status !== 'DRAFT') {
      setActionFeedback({
        type: 'error',
        message: isBangla ? 'এই কন্ট্রা এন্ট্রি ইতিমধ্যে লেজারে পোস্ট করা হয়েছে।' : 'This contra entry has already been posted to the ledger.'
      });
      return;
    }

    if (postingDraftId === draftId) return;

    setPostingDraftId(draftId);
    setActionFeedback(null);

    try {
      const res = await postDraftContraEntry(draftId);
      if (res && res.success) {
        setActionFeedback({
          type: 'success',
          message: isBangla ? 'কন্ট্রা এন্ট্রি সফলভাবে লেজারে পোস্ট হয়েছে।' : 'Contra entry posted to ledger successfully.',
          voucherNo: res.voucherNo || draft.voucherNo,
          status: 'POSTED',
          journal: 'Created',
          cashBook: 'Updated',
          bankBook: 'Updated'
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: isBangla 
            ? `কন্ট্রা এন্ট্রি পোস্ট করা যায়নি: ${res?.message || 'অজ্ঞাত ত্রুটি'}` 
            : `Failed to post contra entry: ${res?.message || 'Unknown error'}`
        });
      }
    } catch (err: any) {
      console.error('handlePostDraft error:', err);
      setActionFeedback({
        type: 'error',
        message: isBangla
          ? `কন্ট্রা এন্ট্রি পোস্ট করা যায়নি: ${err.message || 'সিস্টেম ত্রুটি'}`
          : `Failed to post contra entry: ${err.message || 'System error'}`
      });
    } finally {
      setPostingDraftId(null);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    const draft = contraTransactions.find(t => t.id === draftId);
    if (!draft) return;

    setActionFeedback(null);
    try {
      const res = await deleteDraftContraEntry(draftId);
      if (res && res.success) {
        setActionFeedback({
          type: 'success',
          message: isBangla ? `খসড়া এন্ট্রি "${draft.voucherNo}" সফলভাবে মুছে ফেলা হয়েছে।` : `Draft "${draft.voucherNo}" deleted successfully.`
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res?.message || (isBangla ? 'খসড়া মোছা যায়নি।' : 'Failed to delete draft.')
        });
      }
    } catch (err: any) {
      console.error('handleDeleteDraft error:', err);
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error deleting draft.'
      });
    }
  };

  const getTypeBadge = (type: ContraType) => {
    switch (type) {
      case 'CASH_TO_BANK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <Wallet className="w-3 h-3" /> → <Landmark className="w-3 h-3" /> নগদ থেকে ব্যাংক
          </span>
        );
      case 'BANK_TO_CASH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
            <Landmark className="w-3 h-3" /> → <Wallet className="w-3 h-3" /> ব্যাংক থেকে নগদ
          </span>
        );
      case 'BANK_TO_BANK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900">
            <Landmark className="w-3 h-3" /> → <Landmark className="w-3 h-3" /> আন্তঃব্যাংক
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (t: ContraTransaction) => {
    const status = t.status || 'POSTED';
    switch (status) {
      case 'POSTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> পোস্টকৃত
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            <Edit3 className="w-3 h-3" /> খসড়া (Draft)
          </span>
        );
      case 'REVERSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800" title={t.reversedReason}>
            <RotateCcw className="w-3 h-3" /> প্রত্যাহারকৃত ({t.reversedBy || 'Admin'})
          </span>
        );
      case 'REVERSAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800" title={t.reversedReason}>
            <RotateCcw className="w-3 h-3" /> রিভার্সাল ভাউচার
          </span>
        );
      default:
        return null;
    }
  };

  // Check balance sufficiency for drafts
  const getDraftBalanceCheck = (t: ContraTransaction) => {
    if (t.type === 'CASH_TO_BANK') {
      const isSufficient = currentCashBalance >= t.amount;
      return {
        isSufficient,
        available: currentCashBalance,
        sourceLabel: 'হাতে নগদ'
      };
    }
    if (t.type === 'BANK_TO_CASH' || t.type === 'BANK_TO_BANK') {
      const bankId = t.fromAccountId || activeBankAccounts[0]?.id;
      const bankBal = bankId ? getBankBalance(bankId) : 0;
      const isSufficient = bankBal >= t.amount;
      return {
        isSufficient,
        available: bankBal,
        sourceLabel: t.fromAccountName || 'উৎস ব্যাংক'
      };
    }
    return { isSufficient: true, available: 0, sourceLabel: '' };
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'কন্ট্রা এন্ট্রি ও তহবিল স্থানান্তর রেজিস্টার (Contra Register)' : 'Contra Transaction Register'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'নগদ ও ব্যাংকের অভ্যন্তরীণ ফান্ড ট্রান্সফার, ডাটাবেজ খসড়া ও দ্বি-পক্ষীয় রিভার্সাল অডিট'
              : 'Internal liquidity transfers audit, persistent drafts log & double-entry reversal workflows'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingDraft(null);
              setIsCreateModalOpen(true);
            }}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isBangla ? '+ নতুন কন্ট্রা এন্ট্রি' : '+ New Contra Entry'}</span>
          </button>

          <button
            onClick={handlePrintFullReport}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{isBangla ? 'প্রতিবেদন প্রিন্ট' : 'Print Report'}</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner with Detailed Post Confirmation */}
      {actionFeedback && (
        <div className={`p-4 rounded-xl border text-xs animate-fadeIn ${
          actionFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              {actionFeedback.type === 'success' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              <div className="space-y-2">
                <div className="font-bold text-sm">
                  {actionFeedback.message}
                </div>

                {actionFeedback.type === 'success' && actionFeedback.voucherNo && (
                  <div className="bg-white/80 p-3 rounded-lg border border-emerald-200/80 grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Voucher:</span>
                      <strong className="text-slate-900 font-bold">{actionFeedback.voucherNo}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Status:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> {actionFeedback.status || 'POSTED'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Journal:</span>
                      <strong className="text-emerald-800">{actionFeedback.journal || 'Created'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Cash Book:</span>
                      <strong className="text-emerald-800">{actionFeedback.cashBook || 'Updated'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Bank Book:</span>
                      <strong className="text-emerald-800">{actionFeedback.bankBook || 'Updated'}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setActionFeedback(null)} className="p-1 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* View Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setViewMode('ALL_VOUCHERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            viewMode === 'ALL_VOUCHERS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isBangla ? 'সকল কন্ট্রা ভাউচার (All Vouchers)' : 'All Vouchers'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono">
            {contraTransactions.length}
          </span>
        </button>

        <button
          onClick={() => setViewMode('DRAFT_LOG')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            viewMode === 'DRAFT_LOG'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>{isBangla ? 'খসড়া কন্ট্রা লগ (Contra Entry Draft Log)' : 'Contra Entry Draft Log'}</span>
          {draftTxns.length > 0 ? (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              viewMode === 'DRAFT_LOG' ? 'bg-amber-950 text-amber-100' : 'bg-amber-100 text-amber-900 font-bold'
            }`}>
              {draftTxns.length} পেন্ডিং
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">0</span>
          )}
        </button>

        <button
          onClick={() => setViewMode('REVERSALS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            viewMode === 'REVERSALS'
              ? 'bg-rose-700 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>{isBangla ? 'প্রত্যাহার ও সংশোধন হিস্ট্রি (Reversals)' : 'Reversals & Corrections'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
            {reversedTxns.length}
          </span>
        </button>
      </div>

      {/* KPI Cards */}
      {viewMode === 'DRAFT_LOG' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-sm">
            <span className="text-xs font-medium text-amber-800 block mb-1">
              {isBangla ? 'পেন্ডিং খসড়া সংখ্যা' : 'Total Pending Drafts'}
            </span>
            <span className="text-2xl font-black text-amber-950 font-mono">
              {draftTxns.length} টি
            </span>
            <span className="text-[11px] text-amber-700 block mt-1">
              ডাটাবেজে সংরক্ষিত, লেজারে এখনও যুক্ত হয়নি
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block mb-1">
              {isBangla ? 'খসড়া মোট টাকার পরিমাণ' : 'Total Draft Amount'}
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              ৳{totalDraftVolume.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              পোস্ট অনুমোদনের অপেক্ষায়
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block mb-1">
              {isBangla ? 'নগদ → ব্যাংক খসড়া' : 'Cash → Bank Drafts'}
            </span>
            <span className="text-xl font-black text-emerald-700 font-mono">
              ৳{draftTxns.filter(t => t.type === 'CASH_TO_BANK').reduce((a, b) => a + (b.amount || 0), 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-600 block mt-1">
              {draftTxns.filter(t => t.type === 'CASH_TO_BANK').length} টি খসড়া এন্ট্রি
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block mb-1">
              {isBangla ? 'ব্যাংক → নগদ / আন্তঃব্যাংক খসড়া' : 'Bank Out Drafts'}
            </span>
            <span className="text-xl font-black text-blue-700 font-mono">
              ৳{draftTxns.filter(t => t.type !== 'CASH_TO_BANK').reduce((a, b) => a + (b.amount || 0), 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-blue-600 block mt-1">
              {draftTxns.filter(t => t.type !== 'CASH_TO_BANK').length} টি খসড়া এন্ট্রি
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block mb-1">
              {isBangla ? 'পোস্টকৃত মোট ভলিউম' : 'Total Posted Volume'}
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              ৳{totalVolume.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              পোস্টকৃত লেনদেন: {postedTxns.length} টি | খসড়া: {draftTxns.length} টি
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block mb-1">
              {isBangla ? 'নগদ → ব্যাংকে জমা' : 'Cash to Bank Total'}
            </span>
            <span className="text-2xl font-black text-emerald-700 font-mono">
              ৳{totalCashToBank.toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-600 block mt-1">
              হাতে নগদ ক্রেডিট, ব্যাংক ডেবিট
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block mb-1">
              {isBangla ? 'ব্যাংক → নগদ উত্তোলন' : 'Bank to Cash Total'}
            </span>
            <span className="text-2xl font-black text-amber-700 font-mono">
              ৳{totalBankToCash.toLocaleString()}
            </span>
            <span className="text-[11px] text-amber-600 block mt-1">
              ব্যাংক ক্রেডিট, হাতে নগদ ডেবিট
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block mb-1">
              {isBangla ? 'প্রত্যাহারকৃত (Reversed)' : 'Reversed Entries'}
            </span>
            <span className="text-2xl font-black text-rose-700 font-mono">
              {reversedTxns.length} টি
            </span>
            <span className="text-[11px] text-rose-600 block mt-1">
              সংশোধিত / বাতিলকৃত ভাউচার
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Transfer Type Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সকল ধরন
            </button>
            <button
              onClick={() => setFilterType('CASH_TO_BANK')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'CASH_TO_BANK'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              নগদ → ব্যাংক
            </button>
            <button
              onClick={() => setFilterType('BANK_TO_CASH')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'BANK_TO_CASH'
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              ব্যাংক → নগদ
            </button>
            <button
              onClick={() => setFilterType('BANK_TO_BANK')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'BANK_TO_BANK'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
              }`}
            >
              আন্তঃব্যাংক
            </button>
          </div>

          {/* Status Filters & Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {viewMode === 'ALL_VOUCHERS' && (
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">সকল অবস্থা (All Status)</option>
                <option value="POSTED">পোস্টকৃত (Posted)</option>
                <option value="DRAFT">খসড়া (Draft)</option>
                <option value="REVERSED">প্রত্যাহারকৃত (Reversed)</option>
                <option value="REVERSAL">রিভার্সাল ভাউচার (Reversal)</option>
              </select>
            )}

            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="ভাউচার, হিসাব বা স্লিপ নং..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contra Table / Draft Log View */}
      <div id="printable-contra-report" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              {viewMode === 'DRAFT_LOG' ? (
                <>
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  <span>{isBangla ? 'খসড়া কন্ট্রা লগ ও পেন্ডিং অনুমোদন (Contra Entry Draft Log)' : 'Contra Entry Draft Log'}</span>
                </>
              ) : viewMode === 'REVERSALS' ? (
                <>
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>{isBangla ? 'প্রত্যাহার ও সংশোধন রেজিস্টার' : 'Reversals & Correction Register'}</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>{isBangla ? 'কন্ট্রা এন্ট্রি রেজিস্টার ও ভাউচার হিস্ট্রি' : 'Contra Entry Voucher Register'}</span>
                </>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              {viewMode === 'DRAFT_LOG'
                ? 'ডাটাবেজে সংরক্ষিত খসড়া এন্ট্রিগুলো এখানে প্রদর্শিত হচ্ছে। পোস্ট করার পূর্বে এগুলো যাচাই, এডিট (Edit), ডিলিট (Delete) বা লেজারে পোস্ট (Post) করুন।'
                : 'পোস্ট করা কোনো এন্ট্রি সরাসরি এডিট বা ডিলেটযোগ্য নয়। প্রয়োজনে রিভার্সাল/সংশোধন প্রবাহ ব্যবহার করুন।'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">
              মোট রেকর্ড: {filteredTxns.length} টি
            </span>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3">তারিখ</th>
                <th className="p-3">ভাউচার / আইডি</th>
                <th className="p-3">ধরন (Type)</th>
                <th className="p-3">উৎস হিসাব (Credit)</th>
                <th className="p-3">গন্তব্য হিসাব (Debit)</th>
                <th className="p-3 text-right">পরিমাণ (৳)</th>
                <th className="p-3">রেফারেন্স / স্লিপ</th>
                <th className="p-3">অবস্থা / প্রাপ্যতা</th>
                <th className="p-3 text-center">অ্যাকশন (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        {viewMode === 'DRAFT_LOG' ? <Edit3 className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                      </div>
                      <p className="font-semibold text-slate-600">
                        {viewMode === 'DRAFT_LOG'
                          ? 'বর্তমানে কোনো খসড়া কন্ট্রা এন্ট্রি সংরক্ষিত নেই'
                          : 'কোনো কন্ট্রা লেনদেন পাওয়া যায়নি'}
                      </p>
                      {viewMode === 'DRAFT_LOG' && (
                        <button
                          onClick={() => {
                            setEditingDraft(null);
                            setIsCreateModalOpen(true);
                          }}
                          className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg"
                        >
                          + নতুন খসড়া তৈরি করুন
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTxns.map(t => {
                  const status = t.status || 'POSTED';
                  const isDraft = status === 'DRAFT';
                  const isPosted = status === 'POSTED';
                  const isReversed = status === 'REVERSED';
                  const isReversal = status === 'REVERSAL';

                  const balanceCheck = isDraft ? getDraftBalanceCheck(t) : null;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isReversed
                          ? 'opacity-60 bg-rose-50/20'
                          : isReversal
                          ? 'bg-purple-50/20'
                          : isDraft
                          ? 'bg-amber-50/30 font-medium'
                          : ''
                      }`}
                    >
                      <td className="p-3 font-mono text-[11px] whitespace-nowrap">{t.date}</td>
                      <td className="p-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{t.voucherNo}</span>
                          {t.reversalVoucherNo && (
                            <span className="text-[9px] text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                              Rev: {t.reversalVoucherNo}
                            </span>
                          )}
                          {t.originalTransactionId && (
                            <span className="text-[9px] text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-200">
                              Corr
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">{getTypeBadge(t.type)}</td>
                      <td className="p-3 font-medium text-slate-900">
                        <div>{t.fromAccountName}</div>
                        {t.fromAccountNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">{t.fromAccountNumber}</div>
                        )}
                        {balanceCheck && (
                          <div className={`text-[10px] font-mono ${balanceCheck.isSufficient ? 'text-slate-400' : 'text-rose-600 font-bold'}`}>
                            ব্যালেন্স: ৳{balanceCheck.available.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        <div>{t.toAccountName}</div>
                        {t.toAccountNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">{t.toAccountNumber}</div>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        ৳{t.amount.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">{t.transactionNo || t.reference || '-'}</td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(t)}
                          {isDraft && balanceCheck && (
                            <div>
                              {balanceCheck.isSufficient ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-700 font-semibold">
                                  <Check className="w-2.5 h-2.5" /> পোস্ট উপযোগী
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-700 font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                                  <AlertCircle className="w-2.5 h-2.5" /> ব্যালেন্স ঘাটতি
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. DRAFT ACTIONS: Edit, Post, Delete, View */}
                          {isDraft && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingDraft(t);
                                  setIsCreateModalOpen(true);
                                }}
                                className="p-1 px-2.5 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs"
                                title="খসড়া সম্পাদন ও পরিমার্জন করুন"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>সংশোধন (Edit)</span>
                              </button>
                              <button
                                disabled={postingDraftId === t.id}
                                onClick={() => handlePostDraft(t.id)}
                                className="p-1 px-2.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs"
                                title="লেজারে সরাসরি পোস্ট করুন"
                              >
                                {postingDraftId === t.id ? (
                                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                <span>{postingDraftId === t.id ? 'পোস্ট হচ্ছে...' : 'পোস্ট (Post)'}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteDraft(t.id)}
                                className="p-1 px-2 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors inline-flex items-center gap-1"
                                title="খসড়া স্থায়ীভাবে মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>মুছুন</span>
                              </button>
                              <button
                                onClick={() => setViewingTxn(t)}
                                className="p-1 px-1.5 text-slate-500 hover:bg-slate-200 rounded-md transition-colors"
                                title="বিবরণ দেখুন"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* 2. POSTED / REVERSED / REVERSAL ACTIONS */}
                          {!isDraft && (
                            <>
                              {/* View Details */}
                              <button
                                onClick={() => setViewingTxn(t)}
                                className="p-1 px-2 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1"
                                title="বিস্তারিত দেখুন"
                              >
                                <Eye className="w-3 h-3" />
                                <span>ভিউ</span>
                              </button>

                              {/* Print Voucher */}
                              <button
                                onClick={() => setPrintingVoucherTxn(t)}
                                className="p-1 px-2 text-[10px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors inline-flex items-center gap-1"
                                title="কন্ট্রা ভাউচার প্রিন্ট করুন"
                              >
                                <Printer className="w-3 h-3" />
                                <span>ভাউচার</span>
                              </button>

                              {/* Reverse / Correction (Only for POSTED transactions) */}
                              {isPosted && (
                                <button
                                  onClick={() => handleOpenReversalModal(t)}
                                  className="p-1 px-2 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors inline-flex items-center gap-1"
                                  title="কন্ট্রা এন্ট্রি রিভার্স বা সংশোধন করুন"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>রিভার্স / সংশোধন</span>
                                </button>
                              )}

                              {/* View Audit Trail */}
                              <button
                                onClick={() => setAuditViewingTxn(t)}
                                className="p-1 px-2 text-[10px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors inline-flex items-center gap-1"
                                title="অডিট ট্রেইল দেখুন"
                              >
                                <History className="w-3 h-3" />
                                <span>অডিট</span>
                              </button>
                            </>
                          )}
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

      {/* ========================================================================= */}
      {/* 1. TRANSACTION DETAILS MODAL */}
      {/* ========================================================================= */}
      {viewingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  viewingTxn.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {viewingTxn.status === 'DRAFT' ? 'খসড়া কন্ট্রা এন্ট্রি বিবরণী (Draft Preview)' : 'কন্ট্রা লেনদেনের পূর্ণাঙ্গ বিবরণী'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">ভাউচার: {viewingTxn.voucherNo}</p>
                </div>
              </div>
              <button onClick={() => setViewingTxn(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {viewingTxn.status === 'DRAFT' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-amber-700" />
                  <span>এটি একটি খসড়া (DRAFT) রেকর্ড</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  এই লেনদেনটি এখনও জেনারেল লেজার বা ক্যাশ/ব্যাংক ব্যালেন্সে সমন্বয় করা হয়নি। লেজারে অন্তর্ভুক্ত করতে পোস্ট বাটনে ক্লিক করুন।
                </p>
              </div>
            )}

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">তারিখ:</span>
                <span className="font-bold text-slate-800">{viewingTxn.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">স্থানান্তরের ধরন:</span>
                <span>{getTypeBadge(viewingTxn.type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">টাকার পরিমাণ:</span>
                <span className="font-black text-slate-900 text-sm">৳{viewingTxn.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">উৎস হিসাব (Credit):</span>
                <span className="font-bold text-slate-800">{viewingTxn.fromAccountName} {viewingTxn.fromAccountNumber ? `(${viewingTxn.fromAccountNumber})` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">গন্তব্য হিসাব (Debit):</span>
                <span className="font-bold text-slate-800">{viewingTxn.toAccountName} {viewingTxn.toAccountNumber ? `(${viewingTxn.toAccountNumber})` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">স্লিপ / ট্রানজেকশন নং:</span>
                <span className="text-slate-800">{viewingTxn.transactionNo || viewingTxn.reference || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">মন্তব্য (Remarks):</span>
                <span className="text-slate-800">{viewingTxn.remarks || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">পোস্টকারী / প্রস্তুতকারী:</span>
                <span className="text-slate-800">{viewingTxn.createdBy || 'Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">রেকর্ড তৈরির সময়:</span>
                <span className="text-slate-600">{viewingTxn.createdAt ? new Date(viewingTxn.createdAt).toLocaleString('bn-BD') : '-'}</span>
              </div>
            </div>

            {/* Reversal specific info */}
            {viewingTxn.status === 'REVERSED' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-rose-900">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <RotateCcw className="w-4 h-4" />
                  <span>লেনদেন প্রত্যাহার সংক্রান্ত তথ্য</span>
                </div>
                <div className="text-[11px]">
                  • প্রত্যাহারের কারণ: <strong>{viewingTxn.reversedReason || '-'}</strong>
                </div>
                <div className="text-[11px]">
                  • প্রত্যাহারকারী: <strong>{viewingTxn.reversedBy || '-'}</strong>
                </div>
                {viewingTxn.reversalVoucherNo && (
                  <div className="text-[11px]">
                    • সংশ্লিষ্ট রিভার্সাল ভাউচার: <strong className="font-mono">{viewingTxn.reversalVoucherNo}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Double-entry Ledger Posting Summary */}
            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>ডাবল-এন্ট্রি লেজার পোস্টিং (Double-Entry Impact)</span>
              </div>
              <div className="space-y-1 text-[11px] text-emerald-900 font-mono">
                <div className="flex justify-between bg-white/70 p-1.5 rounded">
                  <span>Dr. {viewingTxn.toAccountName}</span>
                  <span className="font-bold">৳{viewingTxn.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between bg-white/70 p-1.5 rounded">
                  <span>Cr. {viewingTxn.fromAccountName}</span>
                  <span className="font-bold">৳{viewingTxn.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t">
              {viewingTxn.status === 'DRAFT' ? (
                <>
                  <button
                    onClick={() => {
                      const t = viewingTxn;
                      setViewingTxn(null);
                      setEditingDraft(t);
                      setIsCreateModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>সংশোধন করুন</span>
                  </button>
                  <button
                    disabled={postingDraftId === viewingTxn.id}
                    onClick={() => {
                      const t = viewingTxn;
                      setViewingTxn(null);
                      handlePostDraft(t.id);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-1.5"
                  >
                    {postingDraftId === viewingTxn.id ? (
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{postingDraftId === viewingTxn.id ? 'পোস্ট হচ্ছে...' : 'লেজারে পোস্ট করুন'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    const t = viewingTxn;
                    setViewingTxn(null);
                    setPrintingVoucherTxn(t);
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>ভাউচার প্রিন্ট</span>
                </button>
              )}
              <button
                onClick={() => setViewingTxn(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SINGLE CONTRA VOUCHER PRINT MODAL */}
      {/* ========================================================================= */}
      {printingVoucherTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">কন্ট্রা ভাউচার প্রিন্ট প্রিভিউ</h3>
              </div>
              <button onClick={() => setPrintingVoucherTxn(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Voucher Element */}
            <div id="printable-single-voucher" className="p-6 bg-white border border-slate-300 rounded-xl space-y-5 text-slate-900">
              {/* Org Header */}
              <div className="text-center border-b pb-4 space-y-1">
                <h2 className="text-lg font-black text-emerald-900 tracking-wide">
                  {db.settings?.orgNameBangla || db.settings?.orgName || 'সংস্থা/সমিতি'}
                </h2>
                <p className="text-xs text-slate-600">{db.settings?.address || 'বাংলাদেশ'}</p>
                <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded-full font-bold text-xs mt-2 uppercase tracking-wider">
                  কন্ট্রা ভাউচার / তহবিল স্থানান্তর রসিদ
                </div>
              </div>

              {/* Voucher Meta */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block">ভাউচার নং:</span>
                  <span className="font-bold text-slate-900 text-sm">{printingVoucherTxn.voucherNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">তারিখ:</span>
                  <span className="font-bold text-slate-900">{printingVoucherTxn.date}</span>
                </div>
              </div>

              {/* Transfer Details Table */}
              <table className="w-full text-xs border border-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2 border border-slate-300">হিসাবের বিবরণ</th>
                    <th className="p-2 border border-slate-300 text-center">ধরন</th>
                    <th className="p-2 border border-slate-300 text-right">ডেবিট (৳)</th>
                    <th className="p-2 border border-slate-300 text-right">ক্রেডিট (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-mono">
                  <tr>
                    <td className="p-2 border border-slate-300">
                      <span className="font-bold">{printingVoucherTxn.toAccountName}</span>
                      {printingVoucherTxn.toAccountNumber && <span className="text-[10px] text-slate-500 block">হিসাব নং: {printingVoucherTxn.toAccountNumber}</span>}
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-bold text-emerald-800">Dr.</td>
                    <td className="p-2 border border-slate-300 text-right font-black">৳{printingVoucherTxn.amount.toLocaleString()}</td>
                    <td className="p-2 border border-slate-300 text-right">-</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-slate-300">
                      <span className="font-bold">{printingVoucherTxn.fromAccountName}</span>
                      {printingVoucherTxn.fromAccountNumber && <span className="text-[10px] text-slate-500 block">হিসাব নং: {printingVoucherTxn.fromAccountNumber}</span>}
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-bold text-rose-800">Cr.</td>
                    <td className="p-2 border border-slate-300 text-right">-</td>
                    <td className="p-2 border border-slate-300 text-right font-black">৳{printingVoucherTxn.amount.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={2} className="p-2 border border-slate-300 text-right font-sans">সর্বমোট (Total):</td>
                    <td className="p-2 border border-slate-300 text-right font-black">৳{printingVoucherTxn.amount.toLocaleString()}</td>
                    <td className="p-2 border border-slate-300 text-right font-black">৳{printingVoucherTxn.amount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Extra Details */}
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">স্থানান্তরের ধরন:</span>
                  <span className="font-bold">
                    {printingVoucherTxn.type === 'CASH_TO_BANK' ? 'নগদ থেকে ব্যাংক জমা' : printingVoucherTxn.type === 'BANK_TO_CASH' ? 'ব্যাংক থেকে নগদ উত্তোলন' : 'আন্তঃব্যাংক স্থানান্তর'}
                  </span>
                </div>
                {printingVoucherTxn.transactionNo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">চেক / ব্যাংক স্লিপ নং:</span>
                    <span>{printingVoucherTxn.transactionNo}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">বিবরণ / উদ্দেশ্য:</span>
                  <span>{printingVoucherTxn.remarks || 'তহবিল স্থানান্তর (Contra Transfer)'}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-3 gap-4 text-center text-xs text-slate-700">
                <div className="space-y-1">
                  <div className="h-8 border-b border-dashed border-slate-400"></div>
                  <span className="font-semibold block">প্রস্তুতকারী</span>
                  <span className="text-[10px] text-slate-400">{printingVoucherTxn.createdBy || 'হিসাবরক্ষক'}</span>
                </div>
                <div className="space-y-1">
                  <div className="h-8 border-b border-dashed border-slate-400"></div>
                  <span className="font-semibold block">যাচাইকারী</span>
                  <span className="text-[10px] text-slate-400">অর্থ সম্পাদক</span>
                </div>
                <div className="space-y-1">
                  <div className="h-8 border-b border-dashed border-slate-400"></div>
                  <span className="font-semibold block">অনুমোদনকারী</span>
                  <span className="text-[10px] text-slate-400">সভাপতি / সাধারণ সম্পাদক</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t">
              <button
                onClick={handlePrintVoucher}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট সম্পন্ন করুন</span>
              </button>
              <button
                onClick={() => setPrintingVoucherTxn(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REVERSAL / CORRECTION MODAL */}
      {/* ========================================================================= */}
      {reversingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">
                  {isBangla ? 'কন্ট্রা এন্ট্রি প্রত্যাহার ও সংশোধন (Contra Reversal)' : 'Contra Entry Reversal / Correction'}
                </h3>
              </div>
              <button onClick={() => setReversingTxn(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reversalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{reversalError}</span>
              </div>
            )}

            {/* Original Voucher Info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
              <div className="text-slate-500 font-bold uppercase text-[10px]">মূল পোস্টকৃত ভাউচার:</div>
              <div className="flex justify-between">
                <span>ভাউচার নং: <strong className="text-slate-900">{reversingTxn.voucherNo}</strong></span>
                <span>তারিখ: <strong>{reversingTxn.date}</strong></span>
              </div>
              <div className="flex justify-between">
                <span>উৎস: {reversingTxn.fromAccountName}</span>
                <span>গন্তব্য: {reversingTxn.toAccountName}</span>
              </div>
              <div className="flex justify-between font-black text-rose-900 text-xs pt-1 border-t">
                <span>টাকার পরিমাণ:</span>
                <span>৳{reversingTxn.amount.toLocaleString()}</span>
              </div>
            </div>

            {/* Mode selection */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">কার্যক্রমের ধরন নির্বাচন করুন:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReversalMode('REVERSE_ONLY')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    reversalMode === 'REVERSE_ONLY'
                      ? 'border-rose-600 bg-rose-50/50 text-rose-950 font-bold ring-2 ring-rose-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>১. শুধু প্রত্যাহার (Reverse Only)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-normal">
                    মূল এন্ট্রি সম্পূর্ণ বাতিল করে বিপরীত ভাউচার পাস হবে এবং ব্যালেন্স পূর্বাবস্থায় ফিরে যাবে।
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setReversalMode('REVERSE_AND_CORRECT')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    reversalMode === 'REVERSE_AND_CORRECT'
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>২. প্রত্যাহার ও সঠিক এন্ট্রি (Correct)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-normal">
                    মূল এন্ট্রি রিভার্স করার সাথে সাথে নতুন সংশোধিত সঠিক কন্ট্রা ভাউচার তৈরি হবে।
                  </p>
                </button>
              </div>
            </div>

            {/* Mandatory Reason */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">
                প্রত্যাহার / সংশোধনের সুনির্দিষ্ট কারণ <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={reverseReason}
                onChange={e => setReverseReason(e.target.value)}
                placeholder="ভুল ব্যাংক নির্বাচন / টাকার অঙ্কে ভুল / দ্বৈত পোস্টিং ইত্যাদি বিস্তারিত লিখুন..."
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 outline-none"
              />
            </div>

            {/* Correction Form Fields (If REVERSE_AND_CORRECT) */}
            {reversalMode === 'REVERSE_AND_CORRECT' && (
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>নতুন সংশোধিত এন্ট্রির সঠিক বিবরণ</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">স্থানান্তরের ধরন</label>
                    <select
                      value={corrType}
                      onChange={e => setCorrType(e.target.value as any)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="CASH_TO_BANK">নগদ থেকে ব্যাংক জমা</option>
                      <option value="BANK_TO_CASH">ব্যাংক থেকে নগদ উত্তোলন</option>
                      <option value="BANK_TO_BANK">আন্তঃব্যাংক স্থানান্তর</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">সঠিক টাকার পরিমাণ (৳)</label>
                    <input
                      type="number"
                      value={corrAmount}
                      onChange={e => setCorrAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="টাকার পরিমাণ লিখুন"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(corrType === 'BANK_TO_CASH' || corrType === 'BANK_TO_BANK') && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">উৎস ব্যাংক হিসাব</label>
                      <select
                        value={corrFromBankId}
                        onChange={e => setCorrFromBankId(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                      >
                        {activeBankAccounts.map(b => (
                          <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(corrType === 'CASH_TO_BANK' || corrType === 'BANK_TO_BANK') && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">গন্তব্য ব্যাংক হিসাব</label>
                      <select
                        value={corrToBankId}
                        onChange={e => setCorrToBankId(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                      >
                        {activeBankAccounts.map(b => (
                          <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">তারিখ</label>
                    <input
                      type="date"
                      value={corrDate}
                      onChange={e => setCorrDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">স্লিপ / ট্রানজেকশন নং</label>
                    <input
                      type="text"
                      value={corrTransactionNo}
                      onChange={e => setCorrTransactionNo(e.target.value)}
                      placeholder="ঐচ্ছিক"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-2 border-t">
              <button
                type="button"
                onClick={() => setReversingTxn(null)}
                disabled={isSubmittingReversal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={handleConfirmReversalOrCorrection}
                disabled={isSubmittingReversal}
                className={`px-5 py-2 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm ${
                  reversalMode === 'REVERSE_ONLY' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {isSubmittingReversal ? (
                  <span>প্রসেসিং হচ্ছে...</span>
                ) : reversalMode === 'REVERSE_ONLY' ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>রিভার্সাল নিশ্চিত করুন</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>সংশোধিত এন্ট্রি পোস্ট করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. AUDIT TRAIL MODAL */}
      {/* ========================================================================= */}
      {auditViewingTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-700" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">কন্ট্রা এন্ট্রি অডিট ট্রেইল (Audit Logs)</h3>
                  <p className="text-[10px] text-slate-500 font-mono">ভাউচার: {auditViewingTxn.voucherNo}</p>
                </div>
              </div>
              <button onClick={() => setAuditViewingTxn(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(() => {
                const logs = (db.auditLogs || []).filter(
                  log =>
                    log.recordId === auditViewingTxn.id ||
                    (log.remarks && log.remarks.includes(auditViewingTxn.voucherNo)) ||
                    (auditViewingTxn.reversalVoucherNo && log.remarks && log.remarks.includes(auditViewingTxn.reversalVoucherNo))
                );

                if (logs.length === 0) {
                  return (
                    <div className="p-6 text-center text-slate-400">
                      এই লেনদেনের জন্য কোনো অডিট লগ রেকর্ড পাওয়া যায়নি।
                    </div>
                  );
                }

                return logs.map(log => (
                  <div key={log.auditId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-900 px-2 py-0.5 bg-blue-100 rounded text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(log.dateTime).toLocaleString('bn-BD')}
                      </span>
                    </div>
                    <div className="text-slate-800 pt-1 font-sans">
                      {log.remarks}
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-200">
                      <span>ইউজার: {log.userName || log.userId}</span>
                      <span>মডিউল: {log.module}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-2 flex justify-end border-t">
              <button
                onClick={() => setAuditViewingTxn(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CREATE / EDIT DRAFT CONTRA ENTRY MODAL */}
      {/* ========================================================================= */}
      <ContraEntryModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingDraft(null);
        }}
        editDraft={editingDraft}
      />
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PdfService } from '../../services/pdfService';
import { AccountingService } from '../../services/accounting';
import { ContraEntryModal } from './ContraEntryModal';
import { CashTransactionEntryModal } from './CashTransactionEntryModal';
import { ContraReport } from '../reports/ContraReport';
import { CashTransaction } from '../../types';
import { validateFyGuard, isDateInClosedYear } from '../../utils/fyGuard';
import {
  Banknote,
  Search,
  Printer,
  Calendar,
  Landmark,
  ArrowRightLeft,
  Filter,
  Plus,
  MoreVertical,
  Eye,
  FileEdit,
  Trash2,
  Send,
  RotateCcw,
  History,
  FileText
} from 'lucide-react';

export const CashBookView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CASH_BOOK' | 'CONTRA_REGISTER'>('CASH_BOOK');
  const [postConfirmTx, setPostConfirmTx] = useState<CashTransaction | null>(null);
  const [reverseConfirmTx, setReverseConfirmTx] = useState<CashTransaction | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const { db, language, deleteDraftCashTransaction, postDraftCashTransaction, reverseCashTransaction } = useApp();
  const isBangla = language === 'bn';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DRAFT' | 'POSTED' | 'REVERSED'>('ALL');
  const [isContraModalOpen, setIsContraModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<CashTransaction | null>(null);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const contraDraftsCount = useMemo(() => {
    return (db.contraTransactions || []).filter(t => t.status === 'DRAFT').length;
  }, [db.contraTransactions]);

  // Sorted Transactions
  const sortedCashTxns = useMemo(() => {
    return [...(db.cashTransactions || [])].sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (new Date(b.createdAt || '').getTime() || 0) - (new Date(a.createdAt || '').getTime() || 0);
    });
  }, [db.cashTransactions]);

  const currentCashBalance = useMemo(() => {
    return AccountingService.getCashBalance(db.cashTransactions);
  }, [db.cashTransactions]);

  const postedTxns = useMemo(() => sortedCashTxns.filter(t => !t.status || t.status === 'POSTED'), [sortedCashTxns]);
  const draftTxns = useMemo(() => sortedCashTxns.filter(t => t.status === 'DRAFT'), [sortedCashTxns]);
  const reversedTxns = useMemo(() => sortedCashTxns.filter(t => t.status === 'REVERSED'), [sortedCashTxns]);

  const totalInflows = useMemo(() => {
    return postedTxns.reduce((sum, t) => {
      const cin = Number(t.cashIn ?? (t as any).amountIn ?? ((t as any).type === 'IN' ? (t as any).amount : 0) ?? 0);
      return sum + (cin > 0 ? cin : 0);
    }, 0);
  }, [postedTxns]);

  const totalOutflows = useMemo(() => {
    return postedTxns.reduce((sum, t) => {
      const cout = Number(t.cashOut ?? (t as any).amountOut ?? ((t as any).type === 'OUT' ? (t as any).amount : 0) ?? 0);
      return sum + (cout > 0 ? cout : 0);
    }, 0);
  }, [postedTxns]);

  const filteredTxns = useMemo(() => {
    let list = sortedCashTxns;
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'POSTED') {
        list = list.filter(t => !t.status || t.status === 'POSTED');
      } else {
        list = list.filter(t => t.status === filterStatus);
      }
    }

    const term = searchTerm.toLowerCase().trim();
    if (!term) return list;

    return list.filter(t => {
      const vNo = (t.voucherNo || t.transactionId || '').toLowerCase();
      const desc = (t.description || (t as any).particulars || t.accountName || '').toLowerCase();
      const ref = (t.reference || (t as any).sourceId || '').toLowerCase();
      const creator = (t.enteredByUserName || t.postedByUserName || t.createdBy || '').toLowerCase();
      return vNo.includes(term) || desc.includes(term) || ref.includes(term) || creator.includes(term);
    });
  }, [sortedCashTxns, filterStatus, searchTerm]);

  const handlePrint = () => {
    PdfService.printElement('printable-cash-book', 'Cash_Book_Ledger');
  };

  const handleDeleteDraft = async (t: CashTransaction) => {
    if (window.confirm(isBangla ? 'আপনি কি এই Draft Cash Transaction মুছে ফেলতে চান?' : 'Are you sure you want to delete this draft?')) {
      await deleteDraftCashTransaction(t.transactionId);
    }
  };

  const handlePostDraft = (t: CashTransaction) => {
    if (isDateInClosedYear(t.date, db)) {
      alert(
        isBangla
          ? 'এই অর্থবছর বন্ধ রয়েছে। বন্ধ অর্থবছরে নগদ লেনদেন পোস্ট করা সম্ভব নয়।'
          : 'This financial year is closed. Posting transactions is locked.'
      );
      return;
    }
    setPostConfirmTx(t);
  };

  const handleReverse = (t: CashTransaction) => {
    if (t.isReconciliationLocked) {
      alert(isBangla ? 'এই লেনদেনটি Finalized Cash Reconciliation-এর অন্তর্ভুক্ত। Correction-এর জন্য অনুমোদিত workflow প্রয়োজন।' : 'This transaction is part of a Finalized Cash Reconciliation. Approved workflow is required for correction.');
      return;
    }

    if (isDateInClosedYear(t.date, db)) {
      alert(isBangla ? 'এই অর্থবছর বন্ধ রয়েছে। বন্ধ অর্থবছরের লেনদেন রিভার্স বা সংশোধন করা সম্ভব নয়।' : 'This financial year is closed. Modifications are locked.');
      return;
    }

    setReverseConfirmTx(t);
  };

  return (
    <div className="space-y-4 pb-12" onClick={() => setActiveDropdown(null)}>
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'নগদান বই (Cash Book)' : 'Cash Book Ledger'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'হাতে নগদ অর্থের সকল প্রকার আগমন, বহির্গমন এবং প্রাত্যহিক রানিং ব্যালেন্স'
              : 'Daily cash inflows, outflows & running balance'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setEditDraft(null); setIsEntryModalOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isBangla ? 'নতুন নগদ লেনদেন' : 'New Cash Transaction'}</span>
          </button>
          <button
            onClick={() => setIsContraModalOpen(true)}
            className="bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{isBangla ? 'কন্ট্রা এন্ট্রি (নগদ ↔ ব্যাংক)' : 'Contra Entry (Cash ↔ Bank)'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{isBangla ? 'প্রিন্ট' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('CASH_BOOK')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'CASH_BOOK'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>{isBangla ? 'নগদান বই (Cash Transactions)' : 'Cash Transactions'}</span>
          {draftTxns.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'CASH_BOOK' ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800'
            }`}>
              {draftTxns.length} খসড়া
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('CONTRA_REGISTER')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'CONTRA_REGISTER'
              ? 'bg-teal-800 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>{isBangla ? 'কন্ট্রা এন্ট্রি ও ড্রাফট রেজিস্টার (Contra & Draft Log)' : 'Contra & Draft Log'}</span>
          {contraDraftsCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'CONTRA_REGISTER' ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800'
            }`}>
              {contraDraftsCount} খসড়া
            </span>
          )}
        </button>
      </div>

      {activeTab === 'CONTRA_REGISTER' ? (
        <ContraReport />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">
                {isBangla ? 'হাতে নগদ (Closing Cash)' : 'Closing Cash'}
              </span>
              <span className="text-xl font-black text-emerald-900 font-mono">
                ৳{currentCashBalance.toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">
                {isBangla ? 'মোট নগদ প্রাপ্তি' : 'Total Inflows'}
              </span>
              <span className="text-xl font-black text-emerald-700 font-mono">
                +৳{totalInflows.toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 block mb-1">
                {isBangla ? 'মোট নগদ প্রদান' : 'Total Outflows'}
              </span>
              <span className="text-xl font-black text-rose-700 font-mono">
                -৳{totalOutflows.toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
               <div className="flex items-center justify-between text-[11px]">
                 <span className="text-slate-500">{isBangla ? 'পোস্টেড' : 'Posted'}</span>
                 <span className="font-bold text-slate-700">{postedTxns.length}</span>
               </div>
               <div className="flex items-center justify-between text-[11px]">
                 <span className="text-slate-500">{isBangla ? 'খসড়া' : 'Draft'}</span>
                 <span className="font-bold text-amber-600">{draftTxns.length}</span>
               </div>
               <div className="flex items-center justify-between text-[11px]">
                 <span className="text-slate-500">{isBangla ? 'বাতিল' : 'Reversed'}</span>
                 <span className="font-bold text-rose-600">{reversedTxns.length}</span>
               </div>
            </div>
          </div>

          {/* Cash Book Table */}
          <div id="printable-cash-book" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ALL">All Status</option>
                  <option value="POSTED">Posted</option>
                  <option value="DRAFT">Draft</option>
                  <option value="REVERSED">Reversed</option>
                </select>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search voucher, description..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Voucher</th>
                    <th className="p-3">Particulars</th>
                    <th className="p-3">Ref</th>
                    <th className="p-3 text-right">Cash In</th>
                    <th className="p-3 text-right">Cash Out</th>
                    <th className="p-3 text-right">Balance</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Entered By</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTxns.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTxns.map(t => {
                      const cashInAmount = Number(t.cashIn ?? (t as any).amountIn ?? ((t as any).type === 'IN' ? (t as any).amount : 0) ?? 0);
                      const cashOutAmount = Number(t.cashOut ?? (t as any).amountOut ?? ((t as any).type === 'OUT' ? (t as any).amount : 0) ?? 0);
                      const desc = t.description || (t as any).particulars || t.accountName || (cashInAmount > 0 ? 'নগদ গ্রহণ' : 'নগদ প্রদান');
                      const ref = t.reference || (t as any).sourceId || '-';
                      const bal = t.balance !== undefined ? t.balance : ((t as any).runningBalance !== undefined ? (t as any).runningBalance : null);
                      const status = t.status || 'POSTED';
                      const enteredBy = t.enteredByUserName || t.postedByUserName || t.createdBy || 'Legacy / System';

                      return (
                        <tr key={t.transactionId} className="hover:bg-slate-50">
                          <td className="p-3 font-mono whitespace-nowrap">{t.date}</td>
                          <td className="p-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                            {t.voucherNo || (t as any).transactionId}
                          </td>
                          <td className="p-3 font-medium text-slate-900 max-w-[200px] truncate" title={desc}>
                            {desc}
                          </td>
                          <td className="p-3 text-slate-500 font-mono truncate max-w-[100px]" title={ref}>{ref}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {cashInAmount > 0 ? `+৳${cashInAmount.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                            {cashOutAmount > 0 ? `-৳${cashOutAmount.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {bal !== null && status === 'POSTED' ? `৳${bal.toLocaleString()}` : '-'}
                          </td>
                          <td className="p-3 text-center">
                            {status === 'DRAFT' && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[10px]">খসড়া</span>}
                            {status === 'POSTED' && <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">পোস্টেড</span>}
                            {status === 'REVERSED' && <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold text-[10px]">বাতিল</span>}
                          </td>
                          <td className="p-3 text-slate-500 truncate max-w-[120px]" title={enteredBy}>
                            {enteredBy}
                          </td>
                          <td className="p-3 text-center relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === t.transactionId ? null : t.transactionId);
                              }}
                              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeDropdown === t.transactionId && (
                              <div className="absolute right-8 top-2 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 flex flex-col text-left">
                                <button className="px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-slate-400" />
                                  <span>View Details</span>
                                </button>
                                
                                {status === 'DRAFT' && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditDraft(t); setIsEntryModalOpen(true); setActiveDropdown(null); }}
                                      className="px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                    >
                                      <FileEdit className="w-4 h-4 text-emerald-500" />
                                      <span>Edit Draft</span>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handlePostDraft(t); setActiveDropdown(null); }}
                                      className="px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                                    >
                                      <Send className="w-4 h-4 text-emerald-600" />
                                      <span>Post Transaction</span>
                                    </button>
                                    <div className="h-px bg-slate-100 my-1" />
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteDraft(t); setActiveDropdown(null); }}
                                      className="px-4 py-2 hover:bg-rose-50 text-rose-700 flex items-center gap-2 font-medium"
                                    >
                                      <Trash2 className="w-4 h-4 text-rose-500" />
                                      <span>Delete Draft</span>
                                    </button>
                                  </>
                                )}

                                {status === 'POSTED' && (
                                  <>
                                    <button className="px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                                      <Printer className="w-4 h-4 text-slate-400" />
                                      <span>Print Voucher</span>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleReverse(t); setActiveDropdown(null); }}
                                      className="px-4 py-2 hover:bg-rose-50 text-rose-700 flex items-center gap-2 font-medium"
                                    >
                                      <RotateCcw className="w-4 h-4 text-rose-500" />
                                      <span>Reverse / Correction</span>
                                    </button>
                                  </>
                                )}
                                
                                {(status === 'POSTED' || status === 'REVERSED') && (
                                  <>
                                    {status === 'REVERSED' && (
                                      <button className="px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                                        <RotateCcw className="w-4 h-4 text-slate-400" />
                                        <span>View Reversal</span>
                                      </button>
                                    )}
                                    <button className="px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                                      <History className="w-4 h-4 text-slate-400" />
                                      <span>View Audit Trail</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ContraEntryModal
        isOpen={isContraModalOpen}
        onClose={() => setIsContraModalOpen(false)}
        defaultType="CASH_TO_BANK"
      />
      
      <CashTransactionEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        editDraft={editDraft}
      />

      {/* Post Confirm Modal */}
      {postConfirmTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-emerald-50 text-emerald-900">
              <Send className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm">
                {isBangla ? 'লেনদেন পোস্ট নিশ্চিত করুন' : 'Confirm Transaction Post'}
              </h3>
            </div>
            <div className="p-5 text-[13px] space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-medium text-slate-900">{postConfirmTx.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Voucher:</span>
                <span className="font-bold text-emerald-700">{postConfirmTx.voucherNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Particulars:</span>
                <span className="font-medium text-slate-900 max-w-[200px] text-right">{postConfirmTx.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cash In:</span>
                <span className="font-bold text-emerald-600">{postConfirmTx.cashIn > 0 ? `৳${postConfirmTx.cashIn.toLocaleString()}` : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cash Out:</span>
                <span className="font-bold text-rose-600">{postConfirmTx.cashOut > 0 ? `৳${postConfirmTx.cashOut.toLocaleString()}` : '-'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-500">Entered By:</span>
                <span className="font-medium text-slate-900">{postConfirmTx.enteredByUserName || 'System'}</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setPostConfirmTx(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-xs transition-colors"
              >
                {isBangla ? 'বাতিল (Cancel)' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  await postDraftCashTransaction(postConfirmTx.transactionId);
                  setPostConfirmTx(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-xs shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{isBangla ? 'নিশ্চিত করুন ও পোস্ট করুন' : 'Confirm & Post'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reverse Confirm Modal */}
      {reverseConfirmTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-rose-100 flex items-center gap-3 bg-rose-50 text-rose-900">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-sm">
                {isBangla ? 'লেনদেন রিভার্স / বাতিল করুন' : 'Reverse Transaction'}
              </h3>
            </div>
            <div className="p-5 text-[13px] space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Original Voucher:</span>
                <span className="font-bold text-rose-700">{reverseConfirmTx.voucherNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-medium text-slate-900">{reverseConfirmTx.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Particulars:</span>
                <span className="font-medium text-slate-900 max-w-[200px] text-right">{reverseConfirmTx.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cash In:</span>
                <span className="font-bold text-emerald-600">{reverseConfirmTx.cashIn > 0 ? `৳${reverseConfirmTx.cashIn.toLocaleString()}` : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cash Out:</span>
                <span className="font-bold text-rose-600">{reverseConfirmTx.cashOut > 0 ? `৳${reverseConfirmTx.cashOut.toLocaleString()}` : '-'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-500">Entered By:</span>
                <span className="font-medium text-slate-900">{reverseConfirmTx.postedByUserName || reverseConfirmTx.enteredByUserName || 'System'}</span>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isBangla ? 'সংশোধন / বাতিলের কারণ * (Correction Reason)' : 'Correction Reason *'}
                </label>
                <input
                  type="text"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder={isBangla ? 'ভুল amount entry করা হয়েছে...' : 'e.g. Wrong amount entered...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 text-xs"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => { setReverseConfirmTx(null); setReversalReason(''); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-xs transition-colors"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  if (!reversalReason.trim()) {
                    alert(isBangla ? 'কারণ প্রদান করা আবশ্যক।' : 'Reason is required.');
                    return;
                  }
                  await reverseCashTransaction(reverseConfirmTx.transactionId, reversalReason.trim());
                  setReverseConfirmTx(null);
                  setReversalReason('');
                }}
                disabled={!reversalReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-xs shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isBangla ? 'রিভার্সাল নিশ্চিত করুন' : 'Confirm Reversal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

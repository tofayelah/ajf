import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Income, Expense, IncomeStatus, ExpenseStatus, PaymentMethod } from '../../types';
import { AccountingService } from '../../services/accounting';
import { PdfService } from '../../services/pdfService';
import { validateFyGuard } from '../../utils/fyGuard';
import {
  Wallet, Landmark, Receipt, FileText, Search,
  PlusCircle, Edit, Trash2, CheckCircle2, RotateCcw,
  RefreshCcw, Printer, Filter, X, ChevronDown, ChevronUp,
  AlertTriangle, Check, Eye
} from 'lucide-react';

export const IncomeExpenseView = () => {
  const { db, setDb, activeUser, showNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  
  // Form states
  const [formData, setFormData] = useState<any>({});
  const [correctionReason, setCorrectionReason] = useState('');

  // Check if admin
  const isFinanceAdmin = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'].includes(activeUser?.role || '');

  // Active Financial Year check
  const activeYear = (db.financialYears || []).find(fy => fy.status === 'ACTIVE');

  if (!isFinanceAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">You do not have permission to access organization finances.</p>
      </div>
    );
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // -------------------------------------------------------------
  // INCOME ACTIONS
  // -------------------------------------------------------------
  const saveIncomeDraft = () => {
    if (!formData.incomeHead || formData.amount <= 0 || !formData.paymentMethod || !formData.date) {
      showNotification('দয়া করে সমস্ত আবশ্যক তথ্য দিন।', 'error');
      return;
    }
    
    if (formData.paymentMethod === 'Bank' && !formData.bankAccountId) {
      showNotification('ব্যাংক নির্বাচন করুন।', 'error');
      return;
    }

    const result = AccountingService.saveIncomeDraft(db, {
      ...formData,
      createdBy: activeUser?.fullName || 'SYSTEM'
    });

    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
      setShowIncomeModal(false);
      setFormData({});
    } else {
      showNotification(result.message, 'error');
    }
  };

  const postIncome = (id: string) => {
    if (!activeUser) return;
    const result = AccountingService.postIncomeDraft(db, id, activeUser.userId, activeUser.fullName);
    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'error');
    }
  };

  const deleteIncomeDraft = (id: string) => {
    if (!activeUser) return;
    if (!window.confirm('আপনি কি এই খসড়া আয় মুছে ফেলতে চান?')) return;
    const result = AccountingService.deleteIncomeDraft(db, id, activeUser.userId, activeUser.fullName);
    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'error');
    }
  };

  const reverseIncome = () => {
    if (!activeUser || !selectedRecord || !correctionReason) return;
    if (!window.confirm('আপনি কি নিশ্চিত যে এই লেনদেনটি বাতিল করতে চান?')) return;
    
    const result = AccountingService.reverseIncome(db, selectedRecord.incomeId, activeUser.userId, activeUser.fullName, correctionReason);
    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
      setShowReversalModal(false);
      setCorrectionReason('');
      setSelectedRecord(null);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const correctIncome = () => {
    if (!activeUser || !selectedRecord || !correctionReason) return;
    if (!formData.incomeHead || formData.amount <= 0 || !formData.paymentMethod) {
      showNotification('দয়া করে সমস্ত আবশ্যক তথ্য দিন।', 'error');
      return;
    }

    const result = AccountingService.correctIncome(db, selectedRecord.incomeId, formData, activeUser.userId, activeUser.fullName, correctionReason);
    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
      setShowCorrectionModal(false);
      setCorrectionReason('');
      setSelectedRecord(null);
      setFormData({});
    } else {
      showNotification(result.message, 'error');
    }
  };

  // -------------------------------------------------------------
  // EXPENSE ACTIONS
  // -------------------------------------------------------------
  const saveExpenseDraft = () => {
    if (!formData.expenseHead || formData.amount <= 0 || !formData.paymentMethod || !formData.date) {
      showNotification('দয়া করে সমস্ত আবশ্যক তথ্য দিন।', 'error');
      return;
    }
    
    if (formData.paymentMethod === 'Bank' && !formData.bankAccountId) {
      showNotification('ব্যাংক নির্বাচন করুন।', 'error');
      return;
    }

    const result = AccountingService.saveExpenseDraft(db, {
      ...formData,
      createdBy: activeUser?.fullName || 'SYSTEM'
    });

    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
      setShowExpenseModal(false);
      setFormData({});
    } else {
      showNotification(result.message, 'error');
    }
  };

  const submitExpense = (id: string) => {
    if (!activeUser) return;
    const result = AccountingService.submitExpenseDraft(db, id, activeUser.userId, activeUser.fullName);
    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'error');
    }
  };

  const approveExpense = (id: string) => {
    if (!activeUser) return;
    const result = AccountingService.approveExpense(db, id, activeUser.userId, activeUser.fullName);
    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'error');
    }
  };

  const postExpense = (id: string) => {
    if (!activeUser) return;
    const result = AccountingService.postExpenseDraft(db, id, activeUser.userId, activeUser.fullName);
    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'error');
    }
  };

  const deleteExpenseDraft = (id: string) => {
    if (!activeUser) return;
    if (!window.confirm('আপনি কি এই খসড়া ব্যয় মুছে ফেলতে চান?')) return;
    const result = AccountingService.deleteExpenseDraft(db, id, activeUser.userId, activeUser.fullName);
    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
    } else {
      showNotification(result.message, 'error');
    }
  };

  const reverseExpense = () => {
    if (!activeUser || !selectedRecord || !correctionReason) return;
    if (!window.confirm('আপনি কি নিশ্চিত যে এই লেনদেনটি বাতিল করতে চান?')) return;
    
    const result = AccountingService.reverseExpense(db, selectedRecord.expenseId, activeUser.userId, activeUser.fullName, correctionReason);
    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
      setShowReversalModal(false);
      setCorrectionReason('');
      setSelectedRecord(null);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const correctExpense = () => {
    if (!activeUser || !selectedRecord || !correctionReason) return;
    if (!formData.expenseHead || formData.amount <= 0 || !formData.paymentMethod) {
      showNotification('দয়া করে সমস্ত আবশ্যক তথ্য দিন।', 'error');
      return;
    }

    const result = AccountingService.correctExpense(db, selectedRecord.expenseId, formData, activeUser.userId, activeUser.fullName, correctionReason);
    if (result.success) {
      setDb(result.updatedDb!);
      showNotification(result.message, 'success');
      setShowCorrectionModal(false);
      setCorrectionReason('');
      setSelectedRecord(null);
      setFormData({});
    } else {
      showNotification(result.message, 'error');
    }
  };


  // -------------------------------------------------------------
  // CALCULATIONS & FILTERS
  // -------------------------------------------------------------
  const incomes = (db.incomes || []).filter(i => 
    i.voucherNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.incomeHead?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const expenses = (db.expenses || []).filter(e => 
    e.voucherNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.expenseHead?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Summaries (Only POSTED and not reversed out of net effect)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().split('T')[0];

  const validIncomes = (db.incomes || []).filter(i => i.status === 'POSTED' && i.correctionStatus !== 'ORIGINAL');
  const validExpenses = (db.expenses || []).filter(e => e.approvalStatus === 'POSTED' && e.correctionStatus !== 'ORIGINAL');

  const incomeSummary = {
    total: validIncomes.reduce((s, i) => s + i.amount, 0),
    thisMonth: validIncomes.filter(i => i.date.startsWith(currentMonth)).reduce((s, i) => s + i.amount, 0),
    today: validIncomes.filter(i => i.date === today).reduce((s, i) => s + i.amount, 0),
    cash: validIncomes.filter(i => i.paymentMethod === 'Cash').reduce((s, i) => s + i.amount, 0),
    bank: validIncomes.filter(i => i.paymentMethod === 'Bank').reduce((s, i) => s + i.amount, 0),
    draft: (db.incomes || []).filter(i => i.status === 'DRAFT').length
  };

  const expenseSummary = {
    total: validExpenses.reduce((s, e) => s + e.amount, 0),
    thisMonth: validExpenses.filter(e => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0),
    today: validExpenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0),
    cash: validExpenses.filter(e => e.paymentMethod === 'Cash').reduce((s, e) => s + e.amount, 0),
    bank: validExpenses.filter(e => e.paymentMethod === 'Bank').reduce((s, e) => s + e.amount, 0),
    draft: (db.expenses || []).filter(e => ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL'].includes(e.approvalStatus)).length
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'DRAFT': return <span className="px-2 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600">DRAFT</span>;
      case 'POSTED': return <span className="px-2 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">POSTED</span>;
      case 'REVERSED': return <span className="px-2 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-700">REVERSED</span>;
      case 'SUBMITTED':
      case 'PENDING_APPROVAL': return <span className="px-2 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700">PENDING</span>;
      case 'APPROVED': return <span className="px-2 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">APPROVED</span>;
      case 'REJECTED': return <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">REJECTED</span>;
      default: return <span className="px-2 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  // -------------------------------------------------------------
  // RENDERS
  // -------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Income & Expense</h1>
          <p className="text-slate-500">Professional financial management with safe correction workflow</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFormData({ date: new Date().toISOString().split('T')[0], paymentMethod: 'Cash' });
              setShowIncomeModal(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            New Income
          </button>
          <button
            onClick={() => {
              setFormData({ date: new Date().toISOString().split('T')[0], paymentMethod: 'Cash' });
              setShowExpenseModal(true);
            }}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            New Expense
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('INCOME')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'INCOME' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Income Register
        </button>
        <button
          onClick={() => setActiveTab('EXPENSE')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'EXPENSE' ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Expense Register
        </button>
      </div>

      {/* SUMMARY CARDS */}
      {activeTab === 'INCOME' ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2">
            <p className="text-sm text-slate-500 mb-1">Total Valid Income</p>
            <p className="text-2xl font-black text-emerald-700">৳{incomeSummary.total.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">This Month</p>
            <p className="text-lg font-bold text-slate-800">৳{incomeSummary.thisMonth.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Today</p>
            <p className="text-lg font-bold text-slate-800">৳{incomeSummary.today.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Cash Income</p>
            <p className="text-lg font-bold text-slate-800">৳{incomeSummary.cash.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
            <p className="text-sm text-emerald-600 mb-1">Drafts</p>
            <p className="text-lg font-bold text-emerald-800">{incomeSummary.draft} pending</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2">
            <p className="text-sm text-slate-500 mb-1">Total Valid Expense</p>
            <p className="text-2xl font-black text-rose-700">৳{expenseSummary.total.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">This Month</p>
            <p className="text-lg font-bold text-slate-800">৳{expenseSummary.thisMonth.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Today</p>
            <p className="text-lg font-bold text-slate-800">৳{expenseSummary.today.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Cash Expense</p>
            <p className="text-lg font-bold text-slate-800">৳{expenseSummary.cash.toLocaleString()}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
            <p className="text-sm text-amber-600 mb-1">Pending/Drafts</p>
            <p className="text-lg font-bold text-amber-800">{expenseSummary.draft} pending</p>
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by voucher, head..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Voucher</th>
              <th className="px-4 py-3 font-semibold">Head</th>
              <th className="px-4 py-3 font-semibold">{activeTab === 'INCOME' ? 'Member/Ref' : 'Payee'}</th>
              <th className="px-4 py-3 font-semibold text-right">Amount</th>
              <th className="px-4 py-3 font-semibold">Method</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(activeTab === 'INCOME' ? incomes : expenses).map((record: any) => {
              const id = activeTab === 'INCOME' ? record.incomeId : record.expenseId;
              const status = activeTab === 'INCOME' ? record.status : record.approvalStatus;
              
              return (
                <tr key={id} className={`hover:bg-slate-50 transition-colors ${record.correctionStatus === 'REVERSED' || status === 'REVERSED' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-slate-600">{record.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{record.voucherNo}</td>
                  <td className="px-4 py-3">{activeTab === 'INCOME' ? record.incomeHead : record.expenseHead}</td>
                  <td className="px-4 py-3 truncate max-w-[150px]">{activeTab === 'INCOME' ? (record.memberName || record.reference) : record.payee}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">৳{record.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{record.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      {getStatusBadge(status)}
                      {record.correctionStatus === 'CORRECTION' && <span className="text-[10px] text-amber-600 font-bold">CORRECTED</span>}
                      {record.correctionStatus === 'ORIGINAL' && <span className="text-[10px] text-rose-600 font-bold">REVERSED OUT</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setSelectedRecord(record); setShowViewModal(true); }} className="text-slate-400 hover:text-indigo-600" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {status === 'DRAFT' && (
                        <>
                          <button onClick={() => {
                            setFormData({ ...record });
                            activeTab === 'INCOME' ? setShowIncomeModal(true) : setShowExpenseModal(true);
                          }} className="text-slate-400 hover:text-blue-600" title="Edit Draft">
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {activeTab === 'INCOME' && (
                            <button onClick={() => postIncome(id)} className="text-slate-400 hover:text-emerald-600" title="Post to Ledger">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          
                          {activeTab === 'EXPENSE' && (
                            <button onClick={() => submitExpense(id)} className="text-slate-400 hover:text-emerald-600" title="Submit">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button onClick={() => activeTab === 'INCOME' ? deleteIncomeDraft(id) : deleteExpenseDraft(id)} className="text-slate-400 hover:text-red-600" title="Delete Draft">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      {activeTab === 'EXPENSE' && status === 'PENDING_APPROVAL' && (
                         <button onClick={() => approveExpense(id)} className="text-slate-400 hover:text-indigo-600" title="Approve">
                           <CheckCircle2 className="w-4 h-4" />
                         </button>
                      )}

                      {activeTab === 'EXPENSE' && status === 'APPROVED' && (
                         <button onClick={() => postExpense(id)} className="text-slate-400 hover:text-emerald-600" title="Post to Ledger">
                           <CheckCircle2 className="w-4 h-4" />
                         </button>
                      )}

                      {status === 'POSTED' && record.correctionStatus !== 'ORIGINAL' && (
                        <>
                          <button onClick={() => {
                            setSelectedRecord(record);
                            setFormData({ ...record });
                            setShowCorrectionModal(true);
                          }} className="text-slate-400 hover:text-amber-600" title="Correct Entry">
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                          <button onClick={() => {
                            setSelectedRecord(record);
                            setShowReversalModal(true);
                          }} className="text-slate-400 hover:text-rose-600" title="Reverse Entry">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(activeTab === 'INCOME' ? incomes : expenses).length === 0 && (
          <div className="p-8 text-center text-slate-500">No records found.</div>
        )}
      </div>

      {/* NEW INCOME / EDIT DRAFT MODAL */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{formData.incomeId ? 'Edit Income Draft' : 'নতুন আয় এন্ট্রি (New Income)'}</h2>
              <button onClick={() => setShowIncomeModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                  <input type="date" value={formData.date || ''} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full p-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (৳)</label>
                  <input type="number" min="1" value={formData.amount || ''} onChange={(e) => handleInputChange('amount', Number(e.target.value))} className="w-full p-2 border rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Income Head</label>
                <input type="text" placeholder="e.g. Admission Fee" value={formData.incomeHead || ''} onChange={(e) => handleInputChange('incomeHead', e.target.value)} className="w-full p-2 border rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select value={formData.paymentMethod || 'Cash'} onChange={(e) => handleInputChange('paymentMethod', e.target.value)} className="w-full p-2 border rounded-xl">
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Mobile Banking">Mobile Banking</option>
                  </select>
                </div>
                {formData.paymentMethod === 'Bank' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Bank Account</label>
                    <input type="text" placeholder="Account No" value={formData.bankAccountId || ''} onChange={(e) => handleInputChange('bankAccountId', e.target.value)} className="w-full p-2 border rounded-xl" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Remarks / Description</label>
                <textarea rows={3} value={formData.remarks || ''} onChange={(e) => handleInputChange('remarks', e.target.value)} className="w-full p-2 border rounded-xl" />
              </div>
              
              <div className="text-xs text-slate-500 pt-2 border-t">
                Entered By: <span className="font-bold">{activeUser?.fullName}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowIncomeModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancel</button>
              <button onClick={saveIncomeDraft} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-sm">Save Draft</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW EXPENSE / EDIT DRAFT MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{formData.expenseId ? 'Edit Expense Draft' : 'নতুন ব্যয় এন্ট্রি (New Expense)'}</h2>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                  <input type="date" value={formData.date || ''} onChange={(e) => handleInputChange('date', e.target.value)} className="w-full p-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Amount (৳)</label>
                  <input type="number" min="1" value={formData.amount || ''} onChange={(e) => handleInputChange('amount', Number(e.target.value))} className="w-full p-2 border rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Expense Head</label>
                <input type="text" placeholder="e.g. Office Rent" value={formData.expenseHead || ''} onChange={(e) => handleInputChange('expenseHead', e.target.value)} className="w-full p-2 border rounded-xl" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Payee (প্রাপক)</label>
                <input type="text" placeholder="Name of recipient" value={formData.payee || ''} onChange={(e) => handleInputChange('payee', e.target.value)} className="w-full p-2 border rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select value={formData.paymentMethod || 'Cash'} onChange={(e) => handleInputChange('paymentMethod', e.target.value)} className="w-full p-2 border rounded-xl">
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Mobile Banking">Mobile Banking</option>
                  </select>
                </div>
                {formData.paymentMethod === 'Bank' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Bank Account</label>
                    <input type="text" placeholder="Account No" value={formData.bankAccountId || ''} onChange={(e) => handleInputChange('bankAccountId', e.target.value)} className="w-full p-2 border rounded-xl" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Remarks / Description</label>
                <textarea rows={3} value={formData.remarks || ''} onChange={(e) => handleInputChange('remarks', e.target.value)} className="w-full p-2 border rounded-xl" />
              </div>
              
              <div className="text-xs text-slate-500 pt-2 border-t">
                Entered By: <span className="font-bold">{activeUser?.fullName}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancel</button>
              <button onClick={saveExpenseDraft} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-sm">Save Draft</button>
            </div>
          </div>
        </div>
      )}

      {/* CORRECTION MODAL */}
      {showCorrectionModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl">
            <h2 className="text-xl font-bold text-amber-600 mb-2">ভুল এন্ট্রি সংশোধন (Correct Entry)</h2>
            <p className="text-sm text-slate-600 mb-4">You are correcting {selectedRecord.voucherNo}. The original will be reversed.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Corrected Amount (৳)</label>
                <input type="number" min="1" value={formData.amount || ''} onChange={(e) => handleInputChange('amount', Number(e.target.value))} className="w-full p-2 border rounded-xl border-amber-300 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Corrected Head</label>
                <input type="text" value={formData.incomeHead || formData.expenseHead || ''} onChange={(e) => handleInputChange(activeTab === 'INCOME' ? 'incomeHead' : 'expenseHead', e.target.value)} className="w-full p-2 border rounded-xl border-amber-300 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Correction Reason (REQUIRED)</label>
                <textarea required rows={2} value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} className="w-full p-2 border rounded-xl border-amber-400 focus:ring-amber-500" placeholder="Why is this correction being made?" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowCorrectionModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancel</button>
              <button onClick={() => activeTab === 'INCOME' ? correctIncome() : correctExpense()} disabled={!correctionReason} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-sm">Create Correction</button>
            </div>
          </div>
        </div>
      )}

      {/* REVERSAL MODAL */}
      {showReversalModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border-t-4 border-rose-500">
            <h2 className="text-xl font-bold text-rose-600 mb-2">Reverse Transaction</h2>
            <p className="text-sm text-slate-600 mb-4">This will completely cancel {selectedRecord.voucherNo} by posting a reversing journal entry. This cannot be undone.</p>
            
            <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm font-mono">
              <div>Voucher: {selectedRecord.voucherNo}</div>
              <div>Amount: ৳{selectedRecord.amount}</div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Reversal Reason (REQUIRED)</label>
              <textarea required rows={3} value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} className="w-full p-2 border rounded-xl border-rose-300 focus:ring-rose-500" placeholder="Explain why this is being reversed..." />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowReversalModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancel</button>
              <button onClick={() => activeTab === 'INCOME' ? reverseIncome() : reverseExpense()} disabled={!correctionReason} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-sm">Reverse Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {showViewModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Transaction Details</h2>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div><span className="text-slate-500 block text-xs">Voucher No</span><span className="font-bold">{selectedRecord.voucherNo}</span></div>
                <div><span className="text-slate-500 block text-xs">Date</span><span className="font-medium">{selectedRecord.date}</span></div>
                <div><span className="text-slate-500 block text-xs">Head</span><span className="font-medium">{activeTab === 'INCOME' ? selectedRecord.incomeHead : selectedRecord.expenseHead}</span></div>
                <div><span className="text-slate-500 block text-xs">Amount</span><span className="font-bold text-lg">৳{selectedRecord.amount.toLocaleString()}</span></div>
                <div><span className="text-slate-500 block text-xs">Payment Method</span><span className="font-medium">{selectedRecord.paymentMethod}</span></div>
                <div><span className="text-slate-500 block text-xs">Status</span>{getStatusBadge(activeTab === 'INCOME' ? selectedRecord.status : selectedRecord.approvalStatus)}</div>
              </div>

              <div className="pt-4 border-t">
                <span className="text-slate-500 block text-xs mb-1">Remarks</span>
                <p className="bg-slate-50 p-2 rounded-lg">{selectedRecord.remarks || 'No remarks provided.'}</p>
              </div>

              {selectedRecord.correctionStatus && (
                <div className="pt-4 border-t bg-amber-50 p-3 rounded-lg mt-4">
                  <h4 className="font-bold text-amber-800 mb-2 text-xs">CORRECTION INFO</h4>
                  <div><span className="text-amber-700 block text-xs">Status</span><span className="font-medium">{selectedRecord.correctionStatus}</span></div>
                  {selectedRecord.correctionReason && (
                    <div className="mt-2"><span className="text-amber-700 block text-xs">Reason</span><span className="font-medium">{selectedRecord.correctionReason}</span></div>
                  )}
                  {selectedRecord.correctedFromId && (
                    <div className="mt-2"><span className="text-amber-700 block text-xs">Original ID</span><span className="font-mono text-xs">{selectedRecord.correctedFromId}</span></div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t text-xs text-slate-500">
                <p>Created By: {selectedRecord.createdBy}</p>
                <p>Created At: {new Date(selectedRecord.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowViewModal(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium shadow-sm">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

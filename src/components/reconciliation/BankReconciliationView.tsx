import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Landmark, Plus, Save, CheckCircle, Eye, Trash2, Edit, FileWarning, RefreshCw } from 'lucide-react';
import { BankReconciliation, BankStatementTransaction, BankTransaction } from '../../types';
import { format } from 'date-fns';
import { validateFyGuard } from '../../utils/fyGuard';

export const BankReconciliationView: React.FC = () => {
  const { db, setDb, activeUser } = useApp();
  const isBangla = db.settings.language === 'bn';

  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'DETAIL'>('LIST');
  const [selectedRecord, setSelectedRecord] = useState<BankReconciliation | null>(null);

  // Form State
  const [bankAccountId, setBankAccountId] = useState('');
  const [statementDateFrom, setStatementDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [statementDateTo, setStatementDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [statementOpeningBalance, setStatementOpeningBalance] = useState<string>('');
  const [statementClosingBalance, setStatementClosingBalance] = useState<string>('');
  const [explanation, setExplanation] = useState('');
  const [remarks, setRemarks] = useState('');
  
  const [statementTransactions, setStatementTransactions] = useState<BankStatementTransaction[]>([]);
  
  // Transaction Entry Form
  const [txDate, setTxDate] = useState(statementDateTo);
  const [txNo, setTxNo] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txType, setTxType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txRef, setTxRef] = useState('');

  const [rejectionReason, setRejectionReason] = useState('');

  // Permissions
  const canReconcile = activeUser.role === 'ADMIN' || activeUser.role === 'SUPER_ADMIN' || activeUser.role === 'FINANCE_MANAGER';

  const activeBankAccounts = (db.bankAccounts || []).filter(b => b.status === 'ACTIVE');

  if (!canReconcile) {
    return (
      <div className="p-8 text-center bg-rose-50 m-4 rounded-xl">
        <FileWarning className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-rose-700">{isBangla ? 'অনুমতি নেই' : 'Access Denied'}</h2>
        <p className="text-slate-600 mt-2">{isBangla ? 'এই পেজটি দেখার জন্য আপনার পর্যাপ্ত অনুমতি নেই।' : 'You do not have permission to access this page.'}</p>
      </div>
    );
  }

  // Calculate Book Balances
  const bookBalances = useMemo(() => {
    if (!bankAccountId) return { opening: 0, closing: 0, bookTransactions: [] as BankTransaction[] };
    
    let opening = 0;
    let closing = 0;
    const account = db.bankAccounts?.find(b => b.id === bankAccountId);
    if (account) opening = account.openingBalance || 0; // simplistic, ideally calculate prior to From Date

    let runningBalance = opening;
    
    // Calculate running balance up to 'From' date
    const priorTransactions = (db.bankTransactions || []).filter(t => t.bankAccountId === bankAccountId && t.date < statementDateFrom);
    priorTransactions.forEach(t => {
        runningBalance += (t.deposit || 0) - (t.withdrawal || 0);
    });
    
    const openingAtFromDate = runningBalance;
    
    // Calculate during period
    const periodTransactions = (db.bankTransactions || []).filter(t => t.bankAccountId === bankAccountId && t.date >= statementDateFrom && t.date <= statementDateTo);
    periodTransactions.forEach(t => {
        runningBalance += (t.deposit || 0) - (t.withdrawal || 0);
    });
    
    return { opening: openingAtFromDate, closing: runningBalance, bookTransactions: periodTransactions };
  }, [db.bankAccounts, db.bankTransactions, bankAccountId, statementDateFrom, statementDateTo]);

  // Match Engine
  const matchTransactions = () => {
      let updatedSt = [...statementTransactions];
      let bookTx = [...bookBalances.bookTransactions].map(t => ({
        ...t,
        id: t.transactionId,
        type: (t.deposit > 0 ? 'DEPOSIT' : 'WITHDRAWAL') as 'DEPOSIT' | 'WITHDRAWAL',
        amount: t.deposit > 0 ? t.deposit : t.withdrawal,
        matched: false
      }));
      
      updatedSt = updatedSt.map(st => {
          // Exact amount & type match, closest date
          const possibleMatches = bookTx.filter(bt => !bt.matched && bt.type === st.type && bt.amount === st.amount);
          
          if (possibleMatches.length > 0) {
              // find best match by date
              const bestMatch = possibleMatches.reduce((prev, curr) => {
                  return Math.abs(new Date(curr.date).getTime() - new Date(st.transactionDate).getTime()) < 
                         Math.abs(new Date(prev.date).getTime() - new Date(st.transactionDate).getTime()) ? curr : prev;
              });
              
              const btIndex = bookTx.findIndex(t => t.id === bestMatch.id);
              if (btIndex >= 0) bookTx[btIndex].matched = true;
              
              return { ...st, matchStatus: 'MATCHED' as any, matchedBookTransactionId: bestMatch.id };
          }
          return { ...st, matchStatus: 'BANK_ONLY' as any, matchedBookTransactionId: undefined };
      });
      
      setStatementTransactions(updatedSt);
  };

  const addStatementTransaction = () => {
      if (!txDate || !txAmount || !txDesc) {
          alert('Date, Amount and Description are required.');
          return;
      }
      
      const newTx: BankStatementTransaction = {
          id: `ST-${Date.now()}`,
          bankReconciliationId: '', // placeholder
          transactionDate: txDate,
          transactionNumber: txNo,
          description: txDesc,
          type: txType,
          amount: Number(txAmount),
          reference: txRef,
          matchStatus: 'UNMATCHED',
      };
      
      setStatementTransactions([...statementTransactions, newTx]);
      setTxNo('');
      setTxDesc('');
      setTxAmount('');
      setTxRef('');
  };
  
  const removeStatementTransaction = (id: string) => {
      setStatementTransactions(statementTransactions.filter(t => t.id !== id));
  };

  // Re-run matching automatically if statement tx changes
  useEffect(() => {
      // Not calling matchTransactions automatically on every change to allow user control, 
      // but providing a button for it. Actually, auto-match on adding is fine.
  }, [statementTransactions.length]);

  const calcSummary = () => {
      let matchedAmt = 0;
      let bankOnlyAmt = 0;
      
      statementTransactions.forEach(st => {
          if (st.matchStatus === 'MATCHED') matchedAmt += st.amount;
          if (st.matchStatus === 'BANK_ONLY') bankOnlyAmt += st.amount;
      });
      
      const bookOnlyAmt = bookBalances.bookTransactions.filter(bt => !statementTransactions.some(st => st.matchedBookTransactionId === bt.transactionId)).reduce((acc, t) => acc + (t.deposit > 0 ? t.deposit : t.withdrawal), 0);
      
      const statClosing = Number(statementClosingBalance) || 0;
      const diff = statClosing - bookBalances.closing;
      
      return { matchedAmt, bankOnlyAmt, bookOnlyAmt, statClosing, diff };
  };

  const summary = calcSummary();
  let formStatus: BankReconciliation['status'] = summary.diff === 0 ? 'MATCHED' : 'DIFFERENCE';
  if (selectedRecord && selectedRecord.status !== 'OPEN' && selectedRecord.status !== 'MATCHED' && selectedRecord.status !== 'DIFFERENCE') {
      formStatus = selectedRecord.status;
  }

  const handleSave = (submit: boolean) => {
    if (!bankAccountId) {
        alert('Please select a bank account');
        return;
    }
    if (!validateFyGuard(statementDateTo, db, isBangla)) return;

    if (summary.diff !== 0 && submit && !explanation.trim()) {
      alert(isBangla ? 'পার্থক্যের কারণ উল্লেখ করুন' : 'Explanation is required for difference');
      return;
    }

    let newStatus = submit ? (summary.diff === 0 ? 'MATCHED' : 'DIFFERENCE') : 'OPEN';
    if (submit) newStatus = 'SUBMITTED';

    let action: any = submit ? 'BANK_RECONCILIATION_SUBMITTED' : 'BANK_RECONCILIATION_CREATED';

    const recId = selectedRecord ? selectedRecord.id : `BR-${Date.now()}`;
    const baseRecord: BankReconciliation = {
      id: recId,
      financialYearId: db.settings.currentFinancialYear,
      bankAccountId,
      statementDateFrom,
      statementDateTo,
      bookOpeningBalance: bookBalances.opening,
      bookClosingBalance: bookBalances.closing,
      statementOpeningBalance: Number(statementOpeningBalance) || 0,
      statementClosingBalance: summary.statClosing,
      matchedAmount: summary.matchedAmt,
      bookOnlyAmount: summary.bookOnlyAmt,
      bankOnlyAmount: summary.bankOnlyAmt,
      difference: summary.diff,
      status: newStatus as any,
      explanation: explanation.trim() || undefined,
      remarks: remarks.trim() || undefined,
      preparedBy: activeUser.fullName,
      preparedAt: new Date().toISOString(),
    };
    
    // Check if duplicate for same date period exists for this bank
    const existing = db.bankReconciliations.find(r => r.bankAccountId === bankAccountId && r.statementDateTo === statementDateTo && r.id !== baseRecord.id);
    if (existing) {
        alert(isBangla ? 'এই তারিখের রিকনসিলিয়েশন ইতিমধ্যে বিদ্যমান' : 'Reconciliation for this date already exists for this bank');
        return;
    }
    
    const finalizedTxs = statementTransactions.map((st, index) => ({...st, bankReconciliationId: recId}));

    try {
        const updatedDb = {
            ...db,
            bankReconciliations: selectedRecord 
                ? db.bankReconciliations.map(r => r.id === baseRecord.id ? baseRecord : r)
                : [...(db.bankReconciliations || []), baseRecord],
            bankStatementTransactions: [
                ...(db.bankStatementTransactions || []).filter(t => t.bankReconciliationId !== recId),
                ...finalizedTxs
            ],
            auditLogs: [
                {
                    auditId: `AUD-${Date.now()}`,
                    userId: activeUser.userId,
                    userName: activeUser.fullName,
                    dateTime: new Date().toISOString(),
                    module: 'BANK_RECONCILIATION' as any,
                    action,
                    recordId: baseRecord.id,
                    remarks: submit ? 'Bank reconciliation submitted' : 'Bank reconciliation draft saved'
                },
                ...(db.auditLogs || [])
            ]
        };
        
        setDb(updatedDb);
        alert(submit ? (isBangla ? 'সফলভাবে সাবমিট করা হয়েছে' : 'Successfully submitted') : (isBangla ? 'খসড়া সফলভাবে সংরক্ষণ করা হয়েছে।' : 'Draft saved successfully.'));
        setViewMode('LIST');
        setSelectedRecord(null);
    } catch (error) {
        alert(isBangla ? 'সংরক্ষণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' : 'Failed to save. Try again.');
    }
  };
  
  const handleDeleteDraft = (id: string) => {
      const record = db.bankReconciliations.find(r => r.id === id);
      if (!record || (record.status !== 'OPEN' && record.status !== 'REJECTED')) {
          alert('Only draft/rejected records can be deleted');
          return;
      }
      
      if (!confirm('Are you sure you want to delete this draft?')) return;
      
      const updatedDb = {
          ...db,
          bankReconciliations: db.bankReconciliations.filter(r => r.id !== id),
          bankStatementTransactions: (db.bankStatementTransactions || []).filter(t => t.bankReconciliationId !== id),
          auditLogs: [
              {
                  auditId: `AUD-${Date.now()}`,
                  userId: activeUser.userId,
                  userName: activeUser.fullName,
                  dateTime: new Date().toISOString(),
                  module: 'BANK_RECONCILIATION' as any,
                  action: 'BANK_RECONCILIATION_DRAFT_DELETED' as any,
                  recordId: id,
                  remarks: 'Bank reconciliation draft deleted'
              },
              ...(db.auditLogs || [])
          ]
      };
      setDb(updatedDb);
  };
  
  const changeStatus = (id: string, newStatus: BankReconciliation['status'], actionStr: string) => {
      const record = db.bankReconciliations.find(r => r.id === id);
      if (!record) return;
      if (!validateFyGuard(record.statementDateTo, db, isBangla)) return;
      
      if (newStatus === 'REJECTED' && !rejectionReason.trim()) {
          alert('Rejection reason required');
          return;
      }
      
      const updatedRecord = { ...record, status: newStatus };
      if (newStatus === 'APPROVED' || newStatus === 'REJECTED' || newStatus === 'RECONCILED') {
          updatedRecord.approvedBy = activeUser.fullName;
          updatedRecord.approvedAt = new Date().toISOString();
          if (newStatus === 'REJECTED') {
              updatedRecord.rejectionReason = rejectionReason;
          }
      }
      if (newStatus === 'UNDER_REVIEW') {
          updatedRecord.reviewedBy = activeUser.fullName;
          updatedRecord.reviewedAt = new Date().toISOString();
      }
      if (newStatus === 'RECONCILED') {
          updatedRecord.reconciledBy = activeUser.fullName;
          updatedRecord.reconciledAt = new Date().toISOString();
      }
      
      const updatedDb = {
          ...db,
          bankReconciliations: db.bankReconciliations.map(r => r.id === id ? updatedRecord : r),
          auditLogs: [
              {
                  auditId: `AUD-${Date.now()}`,
                  userId: activeUser.userId,
                  userName: activeUser.fullName,
                  dateTime: new Date().toISOString(),
                  module: 'BANK_RECONCILIATION' as any,
                  action: actionStr as any,
                  recordId: id,
                  remarks: `Status changed to ${newStatus}`
              },
              ...(db.auditLogs || [])
          ]
      };
      setDb(updatedDb);
      setViewMode('LIST');
      setSelectedRecord(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold">Draft</span>;
      case 'SUBMITTED': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Submitted</span>;
      case 'UNDER_REVIEW': return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">Reviewing</span>;
      case 'MATCHED': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">Matched</span>;
      case 'DIFFERENCE': return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold">Difference</span>;
      case 'APPROVED': return <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-semibold">Approved</span>;
      case 'REJECTED': return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-semibold">Rejected</span>;
      case 'RECONCILED': return <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-xs font-bold">Reconciled</span>;
      default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold">{status}</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="w-7 h-7 text-emerald-600" />
            {isBangla ? 'ব্যাংক সমন্বয় (Bank Reconciliation)' : 'Bank Reconciliation'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isBangla ? 'ব্যাংক স্টেটমেন্টের সাথে বুক ব্যালেন্স সমন্বয়' : 'Reconcile bank statements with book balance'}
          </p>
        </div>
        
        {viewMode === 'LIST' && (
          <button
            onClick={() => {
              setSelectedRecord(null);
              setBankAccountId('');
              setStatementDateFrom(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
              setStatementDateTo(new Date().toISOString().split('T')[0]);
              setStatementOpeningBalance('');
              setStatementClosingBalance('');
              setExplanation('');
              setRemarks('');
              setStatementTransactions([]);
              setViewMode('FORM');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            {isBangla ? 'নতুন সমন্বয়' : 'New Reconciliation'}
          </button>
        )}
        {(viewMode === 'FORM' || viewMode === 'DETAIL') && (
          <button
            onClick={() => {
                setViewMode('LIST');
                setSelectedRecord(null);
            }}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50"
          >
            {isBangla ? 'তালিকায় ফিরে যান' : 'Back to List'}
          </button>
        )}
      </div>

      {viewMode === 'LIST' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 text-sm font-semibold text-slate-600">ID</th>
                  <th className="p-3 text-sm font-semibold text-slate-600">Bank Account</th>
                  <th className="p-3 text-sm font-semibold text-slate-600">Period</th>
                  <th className="p-3 text-sm font-semibold text-slate-600 text-right">Book Balance</th>
                  <th className="p-3 text-sm font-semibold text-slate-600 text-right">Statement Balance</th>
                  <th className="p-3 text-sm font-semibold text-slate-600 text-right">Difference</th>
                  <th className="p-3 text-sm font-semibold text-slate-600 text-center">Status</th>
                  <th className="p-3 text-sm font-semibold text-slate-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(db.bankReconciliations || []).length === 0 ? (
                    <tr key="empty"><td colSpan={8} className="p-8 text-center text-slate-500">কোনো reconciliation পাওয়া যায়নি।</td></tr>
                ) : (
                    [...(db.bankReconciliations || [])].sort((a,b) => new Date(b.statementDateTo).getTime() - new Date(a.statementDateTo).getTime()).map((record, index) => {
                      const bank = db.bankAccounts?.find(b => b.id === record.bankAccountId);
                      return (
                      <tr key={`${record.id}_${index}`} className="hover:bg-slate-50/50">
                        <td className="p-3 text-sm font-medium text-slate-800">{record.id}</td>
                        <td className="p-3 text-sm text-slate-800">{bank ? `${bank.bankName} - ${bank.accountNumber}` : record.bankAccountId}</td>
                        <td className="p-3 text-sm text-slate-600">{format(new Date(record.statementDateFrom), 'dd MMM yyyy')} - {format(new Date(record.statementDateTo), 'dd MMM yyyy')}</td>
                        <td className="p-3 text-sm text-slate-800 text-right font-mono">৳{record.bookClosingBalance.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-sm text-slate-800 text-right font-mono">৳{(record.statementClosingBalance || 0).toLocaleString('en-IN')}</td>
                        <td className={`p-3 text-sm text-right font-mono font-semibold ${record.difference < 0 ? 'text-rose-600' : record.difference > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {record.difference !== 0 ? (record.difference > 0 ? '+' : '') + '৳' + record.difference.toLocaleString('en-IN') : '-'}
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(record.status)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                                onClick={() => {
                                    setSelectedRecord(record);
                                    const txs = (db.bankStatementTransactions || []).filter(t => t.bankReconciliationId === record.id);
                                    setStatementTransactions(txs);
                                    setViewMode('DETAIL');
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View">
                                <Eye className="w-4 h-4" />
                            </button>
                            {(record.status === 'OPEN' || record.status === 'REJECTED') && (
                                <>
                                    <button 
                                        onClick={() => {
                                            setSelectedRecord(record);
                                            setBankAccountId(record.bankAccountId);
                                            setStatementDateFrom(record.statementDateFrom);
                                            setStatementDateTo(record.statementDateTo);
                                            setStatementOpeningBalance(String(record.statementOpeningBalance || ''));
                                            setStatementClosingBalance(String(record.statementClosingBalance || ''));
                                            setExplanation(record.explanation || '');
                                            setRemarks(record.remarks || '');
                                            
                                            const txs = (db.bankStatementTransactions || []).filter(t => t.bankReconciliationId === record.id);
                                            setStatementTransactions(txs);
                                            setViewMode('FORM');
                                        }}
                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Edit">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteDraft(record.id)}
                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" title="Delete Draft">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )})
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'FORM' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-2">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
                <p className="text-xs text-slate-500 font-semibold mb-1">Book Balance</p>
                <p className="text-lg font-bold font-mono text-slate-800">৳{bookBalances.closing.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
                <p className="text-xs text-slate-500 font-semibold mb-1">Statement</p>
                <p className="text-lg font-bold font-mono text-slate-800">৳{summary.statClosing.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm col-span-2 md:col-span-1 bg-emerald-50/30">
                <p className="text-xs text-emerald-700 font-semibold mb-1">Matched</p>
                <p className="text-lg font-bold font-mono text-emerald-700">৳{summary.matchedAmt.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm col-span-2 md:col-span-1 bg-blue-50/30">
                <p className="text-xs text-blue-700 font-semibold mb-1">Book Only</p>
                <p className="text-lg font-bold font-mono text-blue-700">৳{summary.bookOnlyAmt.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-sm col-span-2 md:col-span-1 bg-purple-50/30">
                <p className="text-xs text-purple-700 font-semibold mb-1">Bank Only</p>
                <p className="text-lg font-bold font-mono text-purple-700">৳{summary.bankOnlyAmt.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
                <p className="text-xs text-slate-500 font-semibold mb-1">Difference</p>
                <p className={`text-lg font-bold font-mono ${summary.diff < 0 ? 'text-rose-600' : summary.diff > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {summary.diff !== 0 ? (summary.diff > 0 ? '+' : '') + '৳' + summary.diff.toLocaleString('en-IN') : '৳0'}
                </p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pb-6 border-b border-slate-100">
                <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Bank Account</label>
                        <select
                            value={bankAccountId}
                            onChange={(e) => setBankAccountId(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
                            disabled={!!selectedRecord}
                        >
                            <option value="">Select Account...</option>
                            {activeBankAccounts.map(b => (
                                <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Statement From Date</label>
                      <input
                        type="date"
                        value={statementDateFrom}
                        onChange={(e) => setStatementDateFrom(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        disabled={!!selectedRecord}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Statement To Date</label>
                      <input
                        type="date"
                        value={statementDateTo}
                        onChange={(e) => setStatementDateTo(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                        disabled={!!selectedRecord}
                      />
                    </div>
                </div>
                
                <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Book Opening Bal.</label>
                        <input type="text" value={`৳${bookBalances.opening.toLocaleString('en-IN')}`} disabled className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Statement Opening Bal.</label>
                        <input type="number" value={statementOpeningBalance} onChange={e => setStatementOpeningBalance(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Book Closing Bal.</label>
                        <input type="text" value={`৳${bookBalances.closing.toLocaleString('en-IN')}`} disabled className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Statement Closing Bal.</label>
                        <input type="number" value={statementClosingBalance} onChange={e => setStatementClosingBalance(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold" />
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Statement Transactions</h3>
                    <button onClick={matchTransactions} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold text-sm rounded-lg hover:bg-indigo-100 flex items-center gap-2 border border-indigo-200">
                        <RefreshCw className="w-4 h-4" /> Auto Match
                    </button>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 flex flex-wrap items-end gap-3">
                    <div className="w-32">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                        <input type="date" value={txDate} onChange={e=>setTxDate(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </div>
                    <div className="w-24">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                        <select value={txType} onChange={e=>setTxType(e.target.value as any)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white">
                            <option value="DEPOSIT">Deposit</option>
                            <option value="WITHDRAWAL">Withdraw</option>
                        </select>
                    </div>
                    <div className="w-32">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
                        <input type="number" value={txAmount} onChange={e=>setTxAmount(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm font-mono" />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                        <input type="text" value={txDesc} onChange={e=>setTxDesc(e.target.value)} placeholder="Tx details..." className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </div>
                    <div className="w-32">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Ref / Cheque</label>
                        <input type="text" value={txRef} onChange={e=>setTxRef(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </div>
                    <button onClick={addStatementTransaction} className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm font-semibold hover:bg-slate-900 mb-px">
                        Add Line
                    </button>
                </div>
                
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 border-y border-slate-200">
                        <tr>
                            <th className="p-2">Date</th>
                            <th className="p-2">Description</th>
                            <th className="p-2">Ref</th>
                            <th className="p-2 text-right">Deposit</th>
                            <th className="p-2 text-right">Withdrawal</th>
                            <th className="p-2 text-center">Match Status</th>
                            <th className="p-2 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {statementTransactions.length === 0 ? (
                            <tr key="empty"><td colSpan={7} className="p-4 text-center text-slate-500">No statement transactions entered.</td></tr>
                        ) : statementTransactions.map((st, index) => (
                            <tr key={`${st.id}_${index}`}>
                                <td className="p-2 whitespace-nowrap">{format(new Date(st.transactionDate), 'dd MMM yy')}</td>
                                <td className="p-2">{st.description}</td>
                                <td className="p-2 text-slate-500">{st.reference}</td>
                                <td className="p-2 text-right font-mono text-emerald-600">{st.type === 'DEPOSIT' ? st.amount.toLocaleString() : ''}</td>
                                <td className="p-2 text-right font-mono text-rose-600">{st.type === 'WITHDRAWAL' ? st.amount.toLocaleString() : ''}</td>
                                <td className="p-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        st.matchStatus === 'MATCHED' ? 'bg-emerald-100 text-emerald-700' :
                                        st.matchStatus === 'BANK_ONLY' ? 'bg-purple-100 text-purple-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                        {st.matchStatus}
                                    </span>
                                </td>
                                <td className="p-2 text-center">
                                    <button onClick={() => removeStatementTransaction(st.id)} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                                </td>
                            </tr>
                        ))}
                        
                        {/* Show BOOK ONLY transactions too */}
                        {bookBalances.bookTransactions.filter(bt => !statementTransactions.some(st => st.matchedBookTransactionId === bt.transactionId)).map((bt, index) => {
                             const amount = bt.deposit > 0 ? bt.deposit : bt.withdrawal;
                             const type = bt.deposit > 0 ? "DEPOSIT" : "WITHDRAWAL";
                             return (
                              <tr key={`${bt.transactionId}_${index}`} className="bg-blue-50/30">
                                 <td className="p-2 whitespace-nowrap">{format(new Date(bt.date), "dd MMM yy")}</td>
                                 <td className="p-2">{bt.description} <span className="text-[10px] text-blue-500">(Book)</span></td>
                                 <td className="p-2 text-slate-500">{bt.transactionNo}</td>
                                 <td className="p-2 text-right font-mono text-emerald-600">{type === "DEPOSIT" ? amount.toLocaleString() : ""}</td>
                                 <td className="p-2 text-right font-mono text-rose-600">{type === "WITHDRAWAL" ? amount.toLocaleString() : ""}</td>
                                 <td className="p-2 text-center">
                                     <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">BOOK_ONLY</span>
                                 </td>
                                 <td></td>
                             </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Explanation {summary.diff !== 0 && <span className="text-rose-500">* (Required for difference)</span>}
                  </label>
                  <textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    rows={2}
                    placeholder="Provide explanation for any difference or unmatched items..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
            </div>

            <div className="mt-8 flex gap-3">
                <button
                    onClick={() => handleSave(false)}
                    className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    Save Draft
                </button>
                <button
                    onClick={() => handleSave(true)}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <CheckCircle className="w-4 h-4" />
                    Submit for Review
                </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'DETAIL' && selectedRecord && (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-1">Reconciliation {selectedRecord.id}</h2>
                        <p className="text-sm text-slate-500">
                            Bank Account: {db.bankAccounts?.find(b => b.id === selectedRecord.bankAccountId)?.bankName || selectedRecord.bankAccountId}<br/>
                            Period: {format(new Date(selectedRecord.statementDateFrom), 'dd MMM yy')} to {format(new Date(selectedRecord.statementDateTo), 'dd MMM yy')}
                        </p>
                    </div>
                    {getStatusBadge(selectedRecord.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8 border-y border-slate-100 py-6">
                    <div className="col-span-1">
                        <p className="text-xs text-slate-500 font-semibold mb-1">Book Balance</p>
                        <p className="text-lg font-bold font-mono text-slate-800">৳{selectedRecord.bookClosingBalance.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-1">
                        <p className="text-xs text-slate-500 font-semibold mb-1">Statement</p>
                        <p className="text-lg font-bold font-mono text-slate-800">৳{(selectedRecord.statementClosingBalance || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-1">
                        <p className="text-xs text-emerald-700 font-semibold mb-1">Matched</p>
                        <p className="text-lg font-bold font-mono text-emerald-700">৳{selectedRecord.matchedAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-1">
                        <p className="text-xs text-blue-700 font-semibold mb-1">Book Only</p>
                        <p className="text-lg font-bold font-mono text-blue-700">৳{selectedRecord.bookOnlyAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-1">
                        <p className="text-xs text-purple-700 font-semibold mb-1">Bank Only</p>
                        <p className="text-lg font-bold font-mono text-purple-700">৳{selectedRecord.bankOnlyAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-1">
                        <p className="text-xs text-slate-500 font-semibold mb-1">Difference</p>
                        <p className={`text-lg font-bold font-mono ${selectedRecord.difference < 0 ? 'text-rose-600' : selectedRecord.difference > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {selectedRecord.difference !== 0 ? (selectedRecord.difference > 0 ? '+' : '') + '৳' + selectedRecord.difference.toLocaleString('en-IN') : '৳0'}
                        </p>
                    </div>
                </div>
                
                {selectedRecord.status === 'DIFFERENCE' && (
                    <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800">
                        <FileWarning className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm">সমন্বয় প্রয়োজন (Reconciliation Needed)</p>
                            <p className="text-xs mt-1">Book Only অথবা Bank Only লেনদেনের জন্য পার্থক্য তৈরি হয়েছে। দয়া করে মূল লেনদেনগুলো যাচাই করুন। Reconciliation স্বয়ংক্রিয়ভাবে কোনো আয়/ব্যয় বা Journal Entry তৈরি করে না।</p>
                        </div>
                    </div>
                )}

                <div className="space-y-4 mb-8">
                    <div>
                        <p className="text-sm font-semibold text-slate-700">Explanation</p>
                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mt-1 border border-slate-100">{selectedRecord.explanation || 'No explanation provided.'}</p>
                    </div>
                    {selectedRecord.remarks && (
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Remarks</p>
                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mt-1 border border-slate-100">{selectedRecord.remarks}</p>
                        </div>
                    )}
                    {selectedRecord.rejectionReason && (
                        <div>
                            <p className="text-sm font-semibold text-rose-700">Rejection Reason</p>
                            <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg mt-1 border border-rose-100">{selectedRecord.rejectionReason}</p>
                        </div>
                    )}
                </div>
                
                {/* We could render the matched/unmatched transactions list here as well, similar to form */}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500 bg-slate-50 p-4 rounded-lg mb-8">
                    <div>
                        <p className="font-semibold text-slate-700">Prepared By</p>
                        <p>{selectedRecord.preparedBy}</p>
                        <p>{selectedRecord.preparedAt && format(new Date(selectedRecord.preparedAt), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    {selectedRecord.reviewedBy && (
                        <div>
                            <p className="font-semibold text-slate-700">Reviewed By</p>
                            <p>{selectedRecord.reviewedBy}</p>
                            <p>{selectedRecord.reviewedAt && format(new Date(selectedRecord.reviewedAt), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                    )}
                    {selectedRecord.approvedBy && (
                        <div>
                            <p className="font-semibold text-slate-700">Approved By</p>
                            <p>{selectedRecord.approvedBy}</p>
                            <p>{selectedRecord.approvedAt && format(new Date(selectedRecord.approvedAt), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                    )}
                    {selectedRecord.reconciledBy && (
                        <div>
                            <p className="font-semibold text-slate-700">Reconciled By</p>
                            <p>{selectedRecord.reconciledBy}</p>
                            <p>{selectedRecord.reconciledAt && format(new Date(selectedRecord.reconciledAt), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                    {selectedRecord.status === 'SUBMITTED' && (
                        <button onClick={() => changeStatus(selectedRecord.id, 'UNDER_REVIEW', 'BANK_RECONCILIATION_REVIEW_STARTED')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold">Start Review</button>
                    )}
                    {selectedRecord.status === 'UNDER_REVIEW' && (
                        <>
                            <button onClick={() => changeStatus(selectedRecord.id, 'APPROVED', 'BANK_RECONCILIATION_APPROVED')} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold">Approve</button>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Rejection reason..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm" />
                                <button onClick={() => changeStatus(selectedRecord.id, 'REJECTED', 'BANK_RECONCILIATION_REJECTED')} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-semibold">Reject</button>
                            </div>
                        </>
                    )}
                    {selectedRecord.status === 'APPROVED' && (
                        <button onClick={() => changeStatus(selectedRecord.id, 'RECONCILED', 'BANK_RECONCILIATION_RECONCILED')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold">Mark as Reconciled</button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

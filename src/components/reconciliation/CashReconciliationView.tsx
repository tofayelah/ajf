import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Banknote, Plus, Save, FileText, CheckCircle, XCircle, Info, Calculator, FileWarning, Search, Eye, Trash2, Edit } from 'lucide-react';
import { CashReconciliation } from '../../types';
import { format } from 'date-fns';
import { validateFyGuard } from '../../utils/fyGuard';
import { AccountingService } from '../../services/accounting';

export const CashReconciliationView: React.FC = () => {
  const { db, setDb, activeUser } = useApp();
  const isBangla = db.settings.language === 'bn';

  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'DETAIL'>('LIST');
  const [selectedRecord, setSelectedRecord] = useState<CashReconciliation | null>(null);

  // Form State
  const [reconDate, setReconDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [explanation, setExplanation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [manualPhysicalCash, setManualPhysicalCash] = useState<string>('');
  const [useDenominations, setUseDenominations] = useState(false);
  const [denominations, setDenominations] = useState({
    note1000: 0, note500: 0, note200: 0, note100: 0, note50: 0, note20: 0, note10: 0, note5: 0, note2: 0, note1: 0
  });
  
  const [rejectionReason, setRejectionReason] = useState('');

  // Permissions
  const canReconcile = activeUser.role === 'ADMIN' || activeUser.role === 'ACCOUNTANT';

  if (!canReconcile) {
    return (
      <div className="p-8 text-center bg-rose-50 m-4 rounded-xl">
        <FileWarning className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-rose-700">{isBangla ? 'অনুমতি নেই' : 'Access Denied'}</h2>
        <p className="text-slate-600 mt-2">{isBangla ? 'এই পেজটি দেখার জন্য আপনার পর্যাপ্ত অনুমতি নেই।' : 'You do not have permission to access this page.'}</p>
      </div>
    );
  }

  // Book Balance calculation up to reconDate
  const bookBalance = useMemo(() => {
    let cashIn = 0;
    let cashOut = 0;
    
    db.cashTransactions.forEach(tx => {
      if (tx.date <= reconDate) {
        cashIn += tx.cashIn || 0;
        cashOut += tx.cashOut || 0;
      }
    });
    
    return cashIn - cashOut;
  }, [db.cashTransactions, reconDate]);

  const calculatedPhysicalCash = useMemo(() => {
    if (!useDenominations) return Number(manualPhysicalCash) || 0;
    return (denominations.note1000 * 1000) +
           (denominations.note500 * 500) +
           (denominations.note200 * 200) +
           (denominations.note100 * 100) +
           (denominations.note50 * 50) +
           (denominations.note20 * 20) +
           (denominations.note10 * 10) +
           (denominations.note5 * 5) +
           (denominations.note2 * 2) +
           (denominations.note1 * 1);
  }, [denominations, manualPhysicalCash, useDenominations]);

  const difference = calculatedPhysicalCash - bookBalance;
  let formStatus: CashReconciliation['status'] = difference === 0 ? 'MATCHED' : 'DIFFERENCE';
  if (selectedRecord && selectedRecord.status !== 'OPEN' && selectedRecord.status !== 'MATCHED' && selectedRecord.status !== 'DIFFERENCE') {
      formStatus = selectedRecord.status;
  }

  const handleSave = (submit: boolean) => {
    if (!validateFyGuard(reconDate, db, isBangla)) return;
    
    if (calculatedPhysicalCash < 0) {
      alert(isBangla ? 'নগদ অর্থ ঋণাত্মক হতে পারে না' : 'Physical cash cannot be negative');
      return;
    }

    if (difference !== 0 && submit && !explanation.trim()) {
      alert(isBangla ? 'পার্থক্যের কারণ উল্লেখ করুন' : 'Explanation is required for difference');
      return;
    }

    const denoms = useDenominations ? [
      { denomination: 1000, quantity: denominations.note1000, amount: denominations.note1000 * 1000 },
      { denomination: 500, quantity: denominations.note500, amount: denominations.note500 * 500 },
      { denomination: 200, quantity: denominations.note200, amount: denominations.note200 * 200 },
      { denomination: 100, quantity: denominations.note100, amount: denominations.note100 * 100 },
      { denomination: 50, quantity: denominations.note50, amount: denominations.note50 * 50 },
      { denomination: 20, quantity: denominations.note20, amount: denominations.note20 * 20 },
      { denomination: 10, quantity: denominations.note10, amount: denominations.note10 * 10 },
      { denomination: 5, quantity: denominations.note5, amount: denominations.note5 * 5 },
      { denomination: 2, quantity: denominations.note2, amount: denominations.note2 * 2 },
      { denomination: 1, quantity: denominations.note1, amount: denominations.note1 * 1 },
    ].filter(d => d.quantity > 0) : undefined;

    let newStatus = submit ? (difference === 0 ? 'MATCHED' : 'DIFFERENCE') : 'OPEN';
    if (submit) newStatus = 'SUBMITTED';

    let action: any = submit ? 'CASH_RECONCILIATION_SUBMITTED' : 'CASH_RECONCILIATION_CREATED';

    const baseRecord = {
      financialYearId: db.settings.currentFinancialYear,
      reconciliationDate: reconDate,
      bookBalance,
      physicalCash: calculatedPhysicalCash,
      difference,
      status: newStatus as any,
      denominationBreakdown: denoms,
      explanation: explanation.trim() || undefined,
      remarks: remarks.trim() || undefined,
      preparedBy: activeUser.fullName,
      preparedAt: new Date().toISOString(),
    };

    let newRecord: CashReconciliation;
    if (selectedRecord) {
      newRecord = {
        ...selectedRecord,
        ...baseRecord,
        id: selectedRecord.id,
      };
    } else {
      newRecord = {
        ...baseRecord,
        id: `CR-${Date.now()}`
      };
    }
    
    // Check if duplicate for same date exists
    const existing = db.cashReconciliations.find(r => r.reconciliationDate === reconDate && r.id !== newRecord.id);
    if (existing) {
        alert(isBangla ? 'এই তারিখের রিকনসিলিয়েশন ইতিমধ্যে বিদ্যমান' : 'Reconciliation for this date already exists');
        return;
    }

    try {
        const updatedDb = {
            ...db,
            cashReconciliations: selectedRecord 
                ? db.cashReconciliations.map(r => r.id === newRecord.id ? newRecord : r)
                : [...(db.cashReconciliations || []), newRecord],
            auditLogs: [
                {
                    auditId: `AUD-${Date.now()}`,
                    userId: activeUser.userId,
                    userName: activeUser.fullName,
                    dateTime: new Date().toISOString(),
                    module: 'CASH_RECONCILIATION' as any,
                    action,
                    recordId: newRecord.id,
                    remarks: submit ? 'Cash reconciliation submitted' : 'Cash reconciliation draft saved'
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
      const record = db.cashReconciliations.find(r => r.id === id);
      if (!record || (record.status !== 'OPEN' && record.status !== 'REJECTED')) {
          alert('Only draft/rejected records can be deleted');
          return;
      }
      
      if (!confirm('Are you sure you want to delete this draft?')) return;
      
      const updatedDb = {
          ...db,
          cashReconciliations: db.cashReconciliations.filter(r => r.id !== id),
          auditLogs: [
              {
                  auditId: `AUD-${Date.now()}`,
                  userId: activeUser.userId,
                  userName: activeUser.fullName,
                  dateTime: new Date().toISOString(),
                  module: 'CASH_RECONCILIATION' as any,
                  action: 'CASH_RECONCILIATION_DRAFT_DELETED' as any,
                  recordId: id,
                  remarks: 'Cash reconciliation draft deleted'
              },
              ...(db.auditLogs || [])
          ]
      };
      setDb(updatedDb);
  };
  
  const changeStatus = (id: string, newStatus: CashReconciliation['status'], actionStr: string) => {
      const record = db.cashReconciliations.find(r => r.id === id);
      if (!record) return;
      if (!validateFyGuard(record.reconciliationDate, db, isBangla)) return;
      
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
          cashReconciliations: db.cashReconciliations.map(r => r.id === id ? updatedRecord : r),
          auditLogs: [
              {
                  auditId: `AUD-${Date.now()}`,
                  userId: activeUser.userId,
                  userName: activeUser.fullName,
                  dateTime: new Date().toISOString(),
                  module: 'CASH_RECONCILIATION' as any,
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
            <Banknote className="w-7 h-7 text-emerald-600" />
            {isBangla ? 'নগদ সমন্বয় (Cash Reconciliation)' : 'Cash Reconciliation'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isBangla ? 'ফিজিক্যাল ক্যাশ এবং ক্যাশ বুকের মধ্যে সমন্বয়' : 'Reconcile physical cash with cash book'}
          </p>
        </div>
        
        {viewMode === 'LIST' && (
          <button
            onClick={() => {
              setSelectedRecord(null);
              setReconDate(new Date().toISOString().split('T')[0]);
              setExplanation('');
              setRemarks('');
              setManualPhysicalCash('');
              setUseDenominations(false);
              setDenominations({note1000: 0, note500: 0, note200: 0, note100: 0, note50: 0, note20: 0, note10: 0, note5: 0, note2: 0, note1: 0});
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
                  <th className="p-3 text-sm font-semibold text-slate-600">Date</th>
                  <th className="p-3 text-sm font-semibold text-slate-600 text-right">Book Balance</th>
                  <th className="p-3 text-sm font-semibold text-slate-600 text-right">Physical Cash</th>
                  <th className="p-3 text-sm font-semibold text-slate-600 text-right">Difference</th>
                  <th className="p-3 text-sm font-semibold text-slate-600 text-center">Status</th>
                  <th className="p-3 text-sm font-semibold text-slate-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(db.cashReconciliations || []).length === 0 ? (
                    <tr key="empty"><td colSpan={7} className="p-8 text-center text-slate-500">কোনো reconciliation পাওয়া যায়নি।</td></tr>
                ) : (
                    [...(db.cashReconciliations || [])].sort((a,b) => new Date(b.reconciliationDate).getTime() - new Date(a.reconciliationDate).getTime()).map((record, index) => (
                      <tr key={`${record.id}_${index}`} className="hover:bg-slate-50/50">
                        <td className="p-3 text-sm font-medium text-slate-800">{record.id}</td>
                        <td className="p-3 text-sm text-slate-600">{format(new Date(record.reconciliationDate), 'dd MMM yyyy')}</td>
                        <td className="p-3 text-sm text-slate-800 text-right font-mono">৳{record.bookBalance.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-sm text-slate-800 text-right font-mono">৳{record.physicalCash.toLocaleString('en-IN')}</td>
                        <td className={`p-3 text-sm text-right font-mono font-semibold ${record.difference < 0 ? 'text-rose-600' : record.difference > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {record.difference !== 0 ? (record.difference > 0 ? '+' : '') + '৳' + record.difference.toLocaleString('en-IN') : '-'}
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(record.status)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                                onClick={() => {
                                    setSelectedRecord(record);
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
                                            setReconDate(record.reconciliationDate);
                                            setExplanation(record.explanation || '');
                                            setRemarks(record.remarks || '');
                                            if (record.denominationBreakdown) {
                                                setUseDenominations(true);
                                                const d = {note1000: 0, note500: 0, note200: 0, note100: 0, note50: 0, note20: 0, note10: 0, note5: 0, note2: 0, note1: 0};
                                                record.denominationBreakdown.forEach(item => {
                                                    if (item.denomination === 1000) d.note1000 = item.quantity;
                                                    if (item.denomination === 500) d.note500 = item.quantity;
                                                    if (item.denomination === 200) d.note200 = item.quantity;
                                                    if (item.denomination === 100) d.note100 = item.quantity;
                                                    if (item.denomination === 50) d.note50 = item.quantity;
                                                    if (item.denomination === 20) d.note20 = item.quantity;
                                                    if (item.denomination === 10) d.note10 = item.quantity;
                                                    if (item.denomination === 5) d.note5 = item.quantity;
                                                    if (item.denomination === 2) d.note2 = item.quantity;
                                                    if (item.denomination === 1) d.note1 = item.quantity;
                                                });
                                                setDenominations(d);
                                            } else {
                                                setUseDenominations(false);
                                                setManualPhysicalCash(record.physicalCash.toString());
                                            }
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
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'FORM' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold mb-1">Cash Book Balance</p>
                <p className="text-xl font-bold font-mono text-slate-800">৳{bookBalance.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold mb-1">Physical Cash</p>
                <p className="text-xl font-bold font-mono text-slate-800">৳{calculatedPhysicalCash.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold mb-1">Difference</p>
                <p className={`text-xl font-bold font-mono ${difference < 0 ? 'text-rose-600' : difference > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {difference !== 0 ? (difference > 0 ? '+' : '') + '৳' + difference.toLocaleString('en-IN') : '৳0'}
                </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold mb-1">Status</p>
                <div className="mt-1">{getStatusBadge(formStatus)}</div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Reconciliation Date</label>
                  <input
                    type="date"
                    value={reconDate}
                    onChange={(e) => setReconDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    disabled={selectedRecord?.status === 'SUBMITTED' || selectedRecord?.status === 'UNDER_REVIEW' || selectedRecord?.status === 'APPROVED' || selectedRecord?.status === 'RECONCILED'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Financial Year</label>
                  <input
                    type="text"
                    value={db.settings.currentFinancialYear}
                    disabled
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500"
                  />
                </div>
            </div>

            <div className="mt-6">
                <label className="flex items-center gap-2 mb-4">
                    <input type="checkbox" checked={useDenominations} onChange={e => setUseDenominations(e.target.checked)} className="rounded border-slate-300" />
                    <span className="text-sm font-semibold text-slate-700">Use Denomination Breakdown</span>
                </label>

                {useDenominations ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        {[1000, 500, 200, 100, 50, 20, 10, 5, 2, 1].map(denom => (
                            <div key={denom}>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">৳{denom} ×</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={(denominations as any)[`note${denom}`] || ''}
                                    onChange={e => setDenominations({...denominations, [`note${denom}`]: parseInt(e.target.value) || 0})}
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Physical Cash Amount (৳)</label>
                        <input
                            type="number"
                            value={manualPhysicalCash}
                            onChange={e => setManualPhysicalCash(e.target.value)}
                            className="w-full max-w-xs px-4 py-2 border border-slate-300 rounded-lg font-mono text-lg"
                        />
                    </div>
                )}
            </div>

            <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Explanation {difference !== 0 && <span className="text-rose-500">* (Required for difference)</span>}
                  </label>
                  <textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                    rows={3}
                    placeholder="Provide explanation for any difference..."
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
                        <p className="text-sm text-slate-500">Date: {format(new Date(selectedRecord.reconciliationDate), 'dd MMMM yyyy')}</p>
                    </div>
                    {getStatusBadge(selectedRecord.status)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 border-y border-slate-100 py-6">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Book Balance</p>
                        <p className="text-2xl font-bold font-mono text-slate-800">৳{selectedRecord.bookBalance.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Physical Cash</p>
                        <p className="text-2xl font-bold font-mono text-slate-800">৳{selectedRecord.physicalCash.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Difference</p>
                        <p className={`text-2xl font-bold font-mono ${selectedRecord.difference < 0 ? 'text-rose-600' : selectedRecord.difference > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {selectedRecord.difference !== 0 ? (selectedRecord.difference > 0 ? '+' : '') + '৳' + selectedRecord.difference.toLocaleString('en-IN') : '৳0'}
                        </p>
                    </div>
                </div>

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

                {selectedRecord.denominationBreakdown && selectedRecord.denominationBreakdown.length > 0 && (
                    <div className="mb-8">
                        <p className="text-sm font-semibold text-slate-700 mb-3">Denomination Breakdown</p>
                        <table className="w-full max-w-sm text-sm text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="p-2">Note</th>
                                    <th className="p-2 text-right">Quantity</th>
                                    <th className="p-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedRecord.denominationBreakdown.map((d, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="p-2">৳{d.denomination}</td>
                                        <td className="p-2 text-right">{d.quantity}</td>
                                        <td className="p-2 text-right font-mono">৳{d.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

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
                        <button onClick={() => changeStatus(selectedRecord.id, 'UNDER_REVIEW', 'CASH_RECONCILIATION_REVIEW_STARTED')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold">Start Review</button>
                    )}
                    {selectedRecord.status === 'UNDER_REVIEW' && (
                        <>
                            <button onClick={() => changeStatus(selectedRecord.id, 'APPROVED', 'CASH_RECONCILIATION_APPROVED')} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold">Approve</button>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Rejection reason..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm" />
                                <button onClick={() => changeStatus(selectedRecord.id, 'REJECTED', 'CASH_RECONCILIATION_REJECTED')} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-semibold">Reject</button>
                            </div>
                        </>
                    )}
                    {selectedRecord.status === 'APPROVED' && (
                        <button onClick={() => changeStatus(selectedRecord.id, 'RECONCILED', 'CASH_RECONCILIATION_RECONCILED')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold">Mark as Reconciled</button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

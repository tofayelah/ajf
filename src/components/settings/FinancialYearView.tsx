import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarDays, Plus, CheckCircle, Lock, AlertTriangle, FileWarning, ExternalLink } from 'lucide-react';
import { FinancialYear } from '../../types';
import { format } from 'date-fns';
import { AccountingService } from '../../services/accounting';

export const FinancialYearView: React.FC = () => {
  const { db, setDb, activeUser } = useApp();
  const isBangla = db.settings.language === 'bn';

  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'CLOSING_WIZARD'>('LIST');
  const [closingYear, setClosingYear] = useState<FinancialYear | null>(null);

  // Form State
  const [yearCode, setYearCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // Opening balances
  const [opCash, setOpCash] = useState<number>(0);
  const [opBank, setOpBank] = useState<number>(0);
  const [opCapital, setOpCapital] = useState<number>(0);
  const [opLoan, setOpLoan] = useState<number>(0);
  const [opInvestment, setOpInvestment] = useState<number>(0);
  const [opWelfare, setOpWelfare] = useState<number>(0);
  const [opEmergency, setOpEmergency] = useState<number>(0);
  const [opReserve, setOpReserve] = useState<number>(0);
  const [opRetained, setOpRetained] = useState<number>(0);

  // Permissions
  const canManageFY = activeUser.role === 'ADMIN' || activeUser.role === 'SUPER_ADMIN' || activeUser.role === 'FINANCE_MANAGER';

  if (!canManageFY) {
    return (
      <div className="p-8 text-center bg-rose-50 m-4 rounded-xl">
        <FileWarning className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-rose-700">{isBangla ? 'অনুমতি নেই' : 'Access Denied'}</h2>
        <p className="text-slate-600 mt-2">{isBangla ? 'এই পেজটি দেখার জন্য আপনার পর্যাপ্ত অনুমতি নেই।' : 'You do not have permission to access this page.'}</p>
      </div>
    );
  }

  const activeFy = (db.financialYears || []).find(fy => fy.status === 'ACTIVE');

  const handleSave = () => {
    if (!yearCode || !startDate || !endDate) {
      alert(isBangla ? 'আবশ্যকীয় তথ্য পূরণ করুন' : 'Please fill all required fields');
      return;
    }

    if (startDate >= endDate) {
      alert(isBangla ? 'শুরুর তারিখ শেষের তারিখের আগে হতে হবে' : 'Start date must be before end date');
      return;
    }

    const duplicate = (db.financialYears || []).find(f => f.yearCode === yearCode);
    if (duplicate) {
      alert(isBangla ? 'এই অর্থবছর কোড ইতিমধ্যে বিদ্যমান' : 'This Financial Year code already exists');
      return;
    }

    // Check overlaps
    const overlap = (db.financialYears || []).find(f => 
      (startDate >= f.startDate && startDate <= f.endDate) ||
      (endDate >= f.startDate && endDate <= f.endDate) ||
      (startDate <= f.startDate && endDate >= f.endDate)
    );
    if (overlap) {
      alert(isBangla ? 'তারিখ অন্যান্য অর্থবছরের সাথে মিলে যাচ্ছে' : 'Dates overlap with an existing Financial Year');
      return;
    }

    const newFY: FinancialYear = {
      id: `FY-${Date.now()}`,
      yearCode,
      startDate,
      endDate,
      status: 'OPEN',
      openingBalances: {
        cash: opCash,
        bank: opBank,
        memberCapital: opCapital,
        loanReceivable: opLoan,
        investment: opInvestment,
        welfareFund: opWelfare,
        emergencyFund: opEmergency,
        reserveFund: opReserve,
        retainedProfit: opRetained
      },
      remarks,
      createdAt: new Date().toISOString(),
      createdBy: activeUser.fullName
    };

    const auditLog = {
      auditId: `AL-${Date.now()}`,
      userId: activeUser.userId,
      userName: activeUser.fullName,
      dateTime: new Date().toISOString(),
      module: 'FINANCIAL_YEAR',
      action: 'FINANCIAL_YEAR_CREATED' as any,
      recordId: newFY.id,
      remarks: `Financial Year ${yearCode} created.`
    };

    setDb({
      ...db,
      financialYears: [...(db.financialYears || []), newFY],
      auditLogs: [...(db.auditLogs || []), auditLog, ...(db.financialYears?.some(f => f.status === 'CLOSED') ? [{ auditId: `AL-OP-${Date.now()}`, userId: activeUser.userId, userName: activeUser.fullName, dateTime: new Date().toISOString(), module: 'FINANCIAL_YEAR', action: 'OPENING_BALANCE_CARRIED_FORWARD' as any, recordId: newFY.id, remarks: 'Opening balances carried forward' }] : [])]
    });

    setViewMode('LIST');
  };

  
  const startClosing = () => {
    if (!closingYear) return;
    const updated = { ...closingYear, status: 'CLOSING' as const, closingStartedAt: new Date().toISOString(), closingStartedBy: activeUser.fullName };
    
    setDb({
      ...db,
      financialYears: db.financialYears.map(f => f.id === closingYear.id ? updated : f),
      auditLogs: [...(db.auditLogs || []), {
        auditId: `AL-${Date.now()}`,
        userId: activeUser.userId,
        userName: activeUser.fullName,
        dateTime: new Date().toISOString(),
        module: 'FINANCIAL_YEAR',
        action: 'FINANCIAL_YEAR_CLOSING_STARTED' as any,
        recordId: closingYear.id,
        remarks: `Closing started for ${closingYear.yearCode}`
      }]
    });
    setClosingYear(updated);
  };

  const executeClose = () => {
    if (!closingYear) return;
    
    // Recalculate everything just to be sure
    const summary = AccountingService.calculateFinancialSummary(db);
    
    const profitFinalized = (db.historicalProfits || []).some(p => p.financialYear === closingYear.yearCode);
    const hasPendingLoans = (db.loans || []).some(l => l.status === 'PENDING');
    const hasPendingExpenses = (db.expenses || []).some(e => e.approvalStatus === 'DRAFT' || e.approvalStatus === 'SUBMITTED');
    const openCashRecon = (db.cashReconciliations || []).some(r => r.status === 'OPEN' || r.status === 'DIFFERENCE');
    const openBankRecon = (db.bankReconciliations || []).some(r => r.status === 'OPEN' || r.status === 'DIFFERENCE');
    
    let totalDebit = 0;
    let totalCredit = 0;
    (db.journalLines || []).forEach(l => {
      totalDebit += l.debit;
      totalCredit += l.credit;
    });
    
    const isReady = profitFinalized && !hasPendingLoans && !hasPendingExpenses && !openCashRecon && !openBankRecon && totalDebit === totalCredit;
    
    if (!isReady) {
      alert(isBangla ? 'যাচাইকরণ ব্যর্থ হয়েছে। সমস্ত শর্ত পূরণ করুন।' : 'Validation failed. Please satisfy all conditions.');
      return;
    }

    if (!window.confirm(isBangla ? 'অর্থবছর বন্ধ করলে এই বছরের আর্থিক লেনদেন সাধারণভাবে সম্পাদন করা যাবে না। আপনি কি নিশ্চিত?' : 'Once closed, normal financial transactions for this year will be blocked. Are you sure?')) {
      return;
    }

    const closed = { ...closingYear, status: 'CLOSED' as const, closedAt: new Date().toISOString(), closedBy: activeUser.fullName };
    
    setDb({
      ...db,
      financialYears: db.financialYears.map(f => f.id === closingYear.id ? closed : f),
      settings: { ...db.settings, currentFinancialYear: '' }, // Clear active year
      auditLogs: [...(db.auditLogs || []), {
        auditId: `AL-${Date.now()}`,
        userId: activeUser.userId,
        userName: activeUser.fullName,
        dateTime: new Date().toISOString(),
        module: 'FINANCIAL_YEAR',
        action: 'FINANCIAL_YEAR_CLOSED' as any,
        recordId: closingYear.id,
        remarks: `Financial Year ${closingYear.yearCode} closed.`
      }]
    });
    
    setViewMode('LIST');
  };

  const renderClosingWizard = () => {
    if (!closingYear) return null;
    
    const summary = AccountingService.calculateFinancialSummary(db);
    
    const profitFinalized = (db.historicalProfits || []).some(p => p.financialYear === closingYear.yearCode);
    const hasPendingLoans = (db.loans || []).some(l => l.status === 'PENDING');
    const hasPendingExpenses = (db.expenses || []).some(e => e.approvalStatus === 'DRAFT' || e.approvalStatus === 'SUBMITTED');
    const openCashRecon = (db.cashReconciliations || []).some(r => r.status === 'OPEN' || r.status === 'DIFFERENCE');
    const openBankRecon = (db.bankReconciliations || []).some(r => r.status === 'OPEN' || r.status === 'DIFFERENCE');
    
    let totalDebit = 0;
    let totalCredit = 0;
    (db.journalLines || []).forEach(l => {
      totalDebit += l.debit;
      totalCredit += l.credit;
    });
    
    const checks = [
      { label: 'Profit Finalized', pass: profitFinalized, critical: true },
      { label: 'No Pending Expenses', pass: !hasPendingExpenses, critical: true },
      { label: 'No Pending Loans', pass: !hasPendingLoans, critical: true },
      { label: 'Cash Reconciliation Completed', pass: !openCashRecon, critical: true },
      { label: 'Bank Reconciliation Completed', pass: !openBankRecon, critical: true },
      { label: 'Journal Debit = Credit', pass: totalDebit === totalCredit, critical: true },
    ];
    
    const allCriticalPassed = checks.filter(c => c.critical).every(c => c.pass);

    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{isBangla ? 'অর্থবছর বন্ধকরণ (Closing Year)' : 'Closing Financial Year'}</h2>
          <button onClick={() => setViewMode('LIST')} className="text-slate-500 hover:text-slate-700">
            {isBangla ? 'ফিরে যান' : 'Back'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{closingYear.yearCode}</h3>
              <p className="text-sm text-slate-500">{closingYear.startDate} to {closingYear.endDate}</p>
            </div>
            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg text-sm font-bold">{closingYear.status}</span>
          </div>

          {closingYear.status === 'ACTIVE' ? (
            <div className="text-center py-8 space-y-4">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
              <h4 className="text-lg font-bold text-slate-800">{isBangla ? 'বন্ধের প্রক্রিয়া শুরু করুন' : 'Start Closing Process'}</h4>
              <p className="text-slate-600 max-w-md mx-auto">
                {isBangla 
                  ? 'এই প্রক্রিয়া শুরু করলে সিস্টেম কিছু নির্দিষ্ট ভ্যালিডেশন চেক করবে। আপনি কি শুরু করতে চান?' 
                  : 'Starting this process will run validation checks. Do you want to proceed?'}
              </p>
              <button 
                onClick={startClosing}
                className="bg-amber-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-amber-700"
              >
                {isBangla ? 'শুরু করুন (Start)' : 'Start Closing'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <h4 className="font-bold text-slate-800">{isBangla ? 'যাচাইকরণ (Validation Checks)' : 'Validation Checks'}</h4>
              <div className="space-y-3">
                {checks.map((check, i) => (
                  <div key={i} className={`p-3 rounded-lg flex items-center justify-between border ${check.pass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    <span className="font-medium text-sm text-slate-800">{check.label}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${check.pass ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                      {check.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-slate-200 pt-6 flex justify-end">
                <button
                  onClick={executeClose}
                  disabled={!allCriticalPassed}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md ${allCriticalPassed ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  {isBangla ? 'চূড়ান্তভাবে বন্ধ করুন (Final Close)' : 'Final Close Year'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };


  const handleActivate = (fy: FinancialYear) => {
    if (activeFy && activeFy.id !== fy.id) {
      alert(isBangla ? `প্রথমে বর্তমান অর্থবছর (${activeFy.yearCode}) বন্ধ করুন` : `Please close the current active year (${activeFy.yearCode}) first`);
      return;
    }

    if (!window.confirm(isBangla ? 'আপনি কি নিশ্চিত?' : 'Are you sure you want to activate this Financial Year?')) {
      return;
    }

    const updatedFy = { ...fy, status: 'ACTIVE' as const, openedAt: new Date().toISOString(), openedBy: activeUser.fullName };
    
    const auditLog = {
      auditId: `AL-${Date.now()}`,
      userId: activeUser.userId,
      userName: activeUser.fullName,
      dateTime: new Date().toISOString(),
      module: 'FINANCIAL_YEAR',
      action: 'FINANCIAL_YEAR_ACTIVATED' as any,
      recordId: fy.id,
      oldValue: fy.status,
      newValue: 'ACTIVE',
      remarks: `Financial Year ${fy.yearCode} activated.`
    };

    setDb({
      ...db,
      financialYears: db.financialYears.map(f => f.id === fy.id ? updatedFy : f),
      settings: {
        ...db.settings,
        currentFinancialYear: fy.yearCode // Auto sync with settings
      },
      auditLogs: [...(db.auditLogs || []), auditLog]
    });
  };

  const renderList = () => (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-indigo-600" />
            {isBangla ? 'অর্থবছর ব্যবস্থাপনা (Financial Year)' : 'Financial Year Management'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isBangla ? 'অর্থবছর খোলা, বন্ধ এবং ব্যালেন্স ব্যবস্থাপনা' : 'Manage financial years, statuses and opening balances'}
          </p>
        </div>
        <button
          
          onClick={() => {
            setYearCode('');
            setStartDate('');
            setEndDate('');
            setRemarks('');
            
            // Try to find the last CLOSED year to prepopulate balances
            const closedYears = [...(db.financialYears || [])].filter(y => y.status === 'CLOSED').sort((a,b) => b.endDate.localeCompare(a.endDate));
            const lastClosed = closedYears[0];
            
            if (lastClosed) {
              const summary = AccountingService.calculateFinancialSummary(db); // In a real app we'd calculate exactly for that year's end date
              // Simplification: we'll use current summary as previous closing, assuming no transactions happened outside it
              // A better way is to sum transactions up to lastClosed.endDate
              
              setOpCash(summary.cashBalance || 0);
              setOpBank(summary.bankBalance || 0);
              setOpCapital(summary.totalCapital || 0);
              setOpLoan(summary.outstandingLoans || 0);
              setOpInvestment(summary.totalInvestments || 0);
              setOpWelfare(summary.welfareFundBalance || 0);
              setOpEmergency(summary.emergencyFundBalance || 0);
              setOpReserve(summary.reserveFundBalance || 0);
              setOpRetained(summary.distributableProfit || 0);
            } else {
              setOpCash(0); setOpBank(0); setOpCapital(0); setOpLoan(0); setOpInvestment(0);
              setOpWelfare(0); setOpEmergency(0); setOpReserve(0); setOpRetained(0);
            }
            setViewMode('FORM');
          }}

          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {isBangla ? 'নতুন অর্থবছর' : 'New Financial Year'}
        </button>
      </div>

      {activeFy && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-indigo-900 font-bold text-lg">{isBangla ? 'বর্তমান অর্থবছর:' : 'Current Active Year:'} {activeFy.yearCode}</h3>
            <p className="text-indigo-700 text-sm">
              {format(new Date(activeFy.startDate), 'dd MMM yyyy')} - {format(new Date(activeFy.endDate), 'dd MMM yyyy')}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600 text-sm">{isBangla ? 'কোড' : 'Year Code'}</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">{isBangla ? 'শুরুর তারিখ' : 'Start Date'}</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">{isBangla ? 'শেষের তারিখ' : 'End Date'}</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">{isBangla ? 'পদক্ষেপ' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {(db.financialYears || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {isBangla ? 'কোনো রেকর্ড নেই' : 'No records found'}
                  </td>
                </tr>
              ) : (
                [...(db.financialYears || [])].sort((a,b) => b.yearCode.localeCompare(a.yearCode)).map(fy => (
                  <tr key={fy.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 text-sm font-bold text-slate-800">{fy.yearCode}</td>
                    <td className="p-4 text-sm text-slate-600">{format(new Date(fy.startDate), 'dd MMM yyyy')}</td>
                    <td className="p-4 text-sm text-slate-600">{format(new Date(fy.endDate), 'dd MMM yyyy')}</td>
                    <td className="p-4 text-sm">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider ${
                        fy.status === 'ACTIVE' ? 'bg-indigo-100 text-indigo-800' :
                        fy.status === 'CLOSED' ? 'bg-slate-100 text-slate-800' :
                        fy.status === 'CLOSING' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {fy.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {fy.status === 'OPEN' && (
                        <button
                          onClick={() => handleActivate(fy)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1 justify-end w-full"
                        >
                          <ExternalLink className="w-4 h-4" /> {isBangla ? 'চালু করুন' : 'Activate'}
                        </button>
                      )}
                      {fy.status === 'ACTIVE' && (
                        <div className="flex justify-end gap-2">
                          <span className="text-indigo-600 text-sm font-bold flex items-center gap-1 justify-end">
                            <CheckCircle className="w-4 h-4" /> {isBangla ? 'সক্রিয়' : 'Active'}
                          </span>
                          <button
                            onClick={() => { setClosingYear(fy); setViewMode('CLOSING_WIZARD'); }}
                            className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1 rounded-lg text-xs font-semibold"
                          >
                            {isBangla ? 'বন্ধ করুন' : 'Close Year'}
                          </button>
                        </div>
                      )}
                      {fy.status === 'CLOSING' && (
                        <div className="flex justify-end gap-2">
                           <span className="text-amber-600 text-sm font-bold flex items-center gap-1 justify-end">
                            <CheckCircle className="w-4 h-4" /> {isBangla ? 'বন্ধ হচ্ছে' : 'Closing...'}
                          </span>
                          <button
                            onClick={() => { setClosingYear(fy); setViewMode('CLOSING_WIZARD'); }}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1 rounded-lg text-xs font-semibold"
                          >
                            {isBangla ? 'চালিয়ে যান' : 'Continue'}
                          </button>
                        </div>
                      )}
                      {false && (
                        <span className="text-indigo-600 text-sm font-bold flex items-center gap-1 justify-end w-full">
                          <CheckCircle className="w-4 h-4" /> {isBangla ? 'সক্রিয়' : 'Active'}
                        </span>
                      )}
                      {fy.status === 'CLOSED' && (
                        <span className="text-slate-500 text-sm font-medium flex items-center gap-1 justify-end w-full">
                          <Lock className="w-4 h-4" /> {isBangla ? 'বন্ধ' : 'Closed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">{isBangla ? 'নতুন অর্থবছর' : 'New Financial Year'}</h2>
        <button onClick={() => setViewMode('LIST')} className="text-slate-500 hover:text-slate-700">
          {isBangla ? 'ফিরে যান' : 'Back'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-4">{isBangla ? 'সাধারণ তথ্য' : 'General Info'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{isBangla ? 'অর্থবছর কোড *' : 'Financial Year Code *'}</label>
                <input 
                  type="text" 
                  value={yearCode}
                  onChange={(e) => setYearCode(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  placeholder="e.g. 2026-2027"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{isBangla ? 'শুরুর তারিখ *' : 'Start Date *'}</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{isBangla ? 'শেষের তারিখ *' : 'End Date *'}</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{isBangla ? 'মন্তব্য' : 'Remarks'}</label>
                <textarea 
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {isBangla ? 'প্রারম্ভিক ব্যালেন্স (Opening Balances)' : 'Opening Balances'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Cash Balance</label>
                <input type="number" value={opCash || ''} onChange={(e) => setOpCash(parseFloat(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Bank Balance</label>
                <input type="number" value={opBank || ''} onChange={(e) => setOpBank(parseFloat(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Member Capital</label>
                <input type="number" value={opCapital || ''} onChange={(e) => setOpCapital(parseFloat(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Loan Receivable</label>
                <input type="number" value={opLoan || ''} onChange={(e) => setOpLoan(parseFloat(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Investments</label>
                <input type="number" value={opInvestment || ''} onChange={(e) => setOpInvestment(parseFloat(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Welfare Fund</label>
                <input type="number" value={opWelfare || ''} onChange={(e) => setOpWelfare(parseFloat(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Emergency Fund</label>
                <input type="number" value={opEmergency || ''} onChange={(e) => setOpEmergency(parseFloat(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Reserve Fund</label>
                <input type="number" value={opReserve || ''} onChange={(e) => setOpReserve(parseFloat(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-600 mb-1">Retained Profit</label>
                <input type="number" value={opRetained || ''} onChange={(e) => setOpRetained(parseFloat(e.target.value) || 0)} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
              </div>
            </div>
            
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-slate-200">
        <button 
          onClick={handleSave}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm transition-colors shadow-md"
        >
          {isBangla ? 'সংরক্ষণ করুন (Save)' : 'Save Financial Year'}
        </button>
      </div>
    </div>
  );

  return viewMode === 'LIST' ? renderList() : viewMode === 'CLOSING_WIZARD' ? renderClosingWizard() : renderForm();
};

export default FinancialYearView;

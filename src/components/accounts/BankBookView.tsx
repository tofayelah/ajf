import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PdfService } from '../../services/pdfService';
import { AccountingService } from '../../services/accounting';
import { BankAccount } from '../../types';
import { ContraEntryModal } from './ContraEntryModal';
import { BankAccountModal } from './BankAccountModal';
import {
  Landmark,
  Search,
  Printer,
  Plus,
  ArrowRightLeft,
  Building,
  CheckCircle2,
  Filter,
  Edit2,
  Layers,
  Power
} from 'lucide-react';

export const BankBookView: React.FC = () => {
  const { db, language, activeUser } = useApp();
  const isBangla = language === 'bn';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [isContraModalOpen, setIsContraModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<BankAccount | null>(null);

  const bankAccounts = db.bankAccounts || [];

  // Filter bank transactions by selected account
  const filteredBankTxns = useMemo(() => {
    let txns = [...(db.bankTransactions || [])];
    if (selectedAccountId !== 'ALL') {
      const selectedAcc = bankAccounts.find(b => b.id === selectedAccountId);
      if (selectedAcc) {
        txns = txns.filter(t => {
          if (t.bankAccountId) return t.bankAccountId === selectedAccountId;
          // Fallback matching by name or masked number
          return (
            (t.bankName && selectedAcc.bankName && t.bankName.includes(selectedAcc.bankName)) ||
            (t.accountNumberMasked && selectedAcc.accountNumber && t.accountNumberMasked.includes(selectedAcc.accountNumber.slice(-4)))
          );
        });
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      txns = txns.filter(t => {
        const vNo = (t.transactionNo || (t as any).voucherNo || t.transactionId || '').toLowerCase();
        const desc = (t.description || (t as any).particulars || '').toLowerCase();
        const ref = (t.reference || '').toLowerCase();
        const bName = (t.bankName || '').toLowerCase();
        return vNo.includes(term) || desc.includes(term) || ref.includes(term) || bName.includes(term);
      });
    }

    return txns.sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (new Date(b.createdAt || '').getTime() || 0) - (new Date(a.createdAt || '').getTime() || 0);
    });
  }, [db.bankTransactions, selectedAccountId, bankAccounts, searchTerm]);

  // Overall and account-specific KPIs
  const currentTotalBankBalance = useMemo(() => {
    if (selectedAccountId === 'ALL') {
      return AccountingService.getBankBalance(db.bankTransactions);
    }
    return AccountingService.getBankAccountBalance(db, selectedAccountId);
  }, [db.bankTransactions, db.bankAccounts, selectedAccountId]);

  const totalBankDeposits = useMemo(() => {
    return filteredBankTxns.reduce((sum, t) => {
      const dep = Number(t.deposit ?? (t as any).amountIn ?? ((t as any).type === 'DEPOSIT' ? (t as any).amount : 0) ?? 0);
      return sum + (dep > 0 ? dep : 0);
    }, 0);
  }, [filteredBankTxns]);

  const totalBankWithdrawals = useMemo(() => {
    return filteredBankTxns.reduce((sum, t) => {
      const wth = Number(t.withdrawal ?? (t as any).amountOut ?? ((t as any).type === 'WITHDRAWAL' ? (t as any).amount : 0) ?? 0);
      return sum + (wth > 0 ? wth : 0);
    }, 0);
  }, [filteredBankTxns]);

  const handlePrint = () => {
    PdfService.printElement('printable-bank-book', 'Bank_Book_Ledger');
  };

  const handleOpenEditAccount = (acc: BankAccount) => {
    setAccountToEdit(acc);
    setIsAccountModalOpen(true);
  };

  const handleOpenNewAccount = () => {
    setAccountToEdit(null);
    setIsAccountModalOpen(true);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-teal-700" />
            <span>{isBangla ? 'ব্যাংক বই ও বহু-হিসাব বিবরণী (Bank Book & Multi-Accounts)' : 'Bank Book & Multi-Accounts'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'সকল প্রাতিষ্ঠানিক ব্যাংক হিসাবের সমন্বিত জমা, উত্তোলন ও রানিং ব্যালেন্স'
              : 'Multi-bank accounts ledger, deposit slips, and running balances'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsContraModalOpen(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{isBangla ? 'কন্ট্রা এন্ট্রি (তহবিল স্থানান্তর)' : 'Contra Entry'}</span>
          </button>

          <button
            onClick={handleOpenNewAccount}
            className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{isBangla ? 'নতুন ব্যাংক হিসাব' : 'Add Bank Account'}</span>
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

      {/* Bank Account Selector Tabs / Cards */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-teal-700" />
            <span>{isBangla ? 'ব্যাংক হিসাব নির্বাচন ও স্থিতি' : 'Select Bank Account & Balance'}</span>
          </span>
          <span className="text-[11px] text-slate-400">
            মোট ব্যাংক হিসাব: {bankAccounts.length} টি
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* ALL ACCOUNTS TAB */}
          <button
            onClick={() => setSelectedAccountId('ALL')}
            className={`p-3 rounded-xl border text-left transition-all relative ${
              selectedAccountId === 'ALL'
                ? 'bg-teal-900 text-white border-teal-950 shadow-md ring-2 ring-teal-600/30'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedAccountId === 'ALL' ? 'text-teal-200' : 'text-slate-500'}`}>
                {isBangla ? 'সকল ব্যাংক হিসাব' : 'All Accounts'}
              </span>
              <Layers className={`w-4 h-4 ${selectedAccountId === 'ALL' ? 'text-teal-300' : 'text-slate-400'}`} />
            </div>
            <div className={`text-base font-black font-mono ${selectedAccountId === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              ৳{AccountingService.getBankBalance(db.bankTransactions).toLocaleString()}
            </div>
            <div className={`text-[10px] truncate mt-0.5 ${selectedAccountId === 'ALL' ? 'text-teal-200' : 'text-slate-400'}`}>
              সমন্বিত সর্বমোট ব্যালেন্স
            </div>
          </button>

          {/* INDIVIDUAL BANK ACCOUNTS */}
          {bankAccounts.map(b => {
            const isSelected = selectedAccountId === b.id;
            const bal = AccountingService.getBankAccountBalance(db, b.id);
            return (
              <div
                key={b.id}
                onClick={() => setSelectedAccountId(b.id)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all relative group ${
                  isSelected
                    ? 'bg-teal-50 border-teal-600 text-teal-950 shadow-md ring-2 ring-teal-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold truncate max-w-[130px]">{b.bankName}</span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        b.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {b.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenEditAccount(b);
                      }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                      title="সংশোধন করুন"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="text-base font-black font-mono text-teal-900">
                  ৳{bal.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                  {b.accountNumber} ({b.branchName})
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            {selectedAccountId === 'ALL'
              ? (isBangla ? 'সর্বমোট ব্যাংক হিসাব স্থিতি' : 'Total Closing Balance')
              : (isBangla ? 'নির্বাচিত ব্যাংক স্থিতি' : 'Selected Account Balance')}
          </span>
          <span className="text-2xl font-black text-teal-900 font-mono">
            ৳{currentTotalBankBalance.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            {selectedAccountId === 'ALL'
              ? 'সকল ব্যাংক একাউন্টের যোগফল'
              : bankAccounts.find(b => b.id === selectedAccountId)?.bankName}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            {isBangla ? 'মোট ব্যাংক জমা (Deposits)' : 'Total Deposits'}
          </span>
          <span className="text-2xl font-black text-emerald-700 font-mono">
            +৳{totalBankDeposits.toLocaleString()}
          </span>
          <span className="text-[11px] text-emerald-600 block mt-1">
            কন্ট্রা জমা ও সরাসরি কালেকশন
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            {isBangla ? 'মোট ব্যাংক উত্তোলন (Withdrawals)' : 'Total Withdrawals'}
          </span>
          <span className="text-2xl font-black text-rose-700 font-mono">
            -৳{totalBankWithdrawals.toLocaleString()}
          </span>
          <span className="text-[11px] text-rose-600 block mt-1">
            কন্ট্রা উত্তোলন ও বিনিয়োগ ব্যয়
          </span>
        </div>
      </div>

      {/* Bank Book Table */}
      <div id="printable-bank-book" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              {isBangla ? 'ব্যাংক লেনদেনের বিস্তারিত খতিয়ান' : 'Bank Transactions Ledger'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {selectedAccountId === 'ALL'
                ? 'সকল ব্যাংক হিসাবের সর্বমোট লেনদেন তালিকা'
                : `${bankAccounts.find(b => b.id === selectedAccountId)?.bankName} (${bankAccounts.find(b => b.id === selectedAccountId)?.accountNumber})`}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="ভাউচার, বিবরণ বা স্লিপ নং..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3">তারিখ</th>
                <th className="p-3">ভাউচার নং</th>
                <th className="p-3">ব্যাংক হিসাব</th>
                <th className="p-3">বিবরণ (Particulars)</th>
                <th className="p-3">চেক / স্লিপ রেফারেন্স</th>
                <th className="p-3 text-right">জমা (Deposit ৳)</th>
                <th className="p-3 text-right">উত্তোলন (Withdraw ৳)</th>
                <th className="p-3 text-right">ব্যালেন্স (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBankTxns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    কোনো ব্যাংক লেনদেন পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredBankTxns.map(t => {
                  const depAmount = Number(t.deposit ?? (t as any).amountIn ?? ((t as any).type === 'DEPOSIT' ? (t as any).amount : 0) ?? 0);
                  const wthAmount = Number(t.withdrawal ?? (t as any).amountOut ?? ((t as any).type === 'WITHDRAWAL' ? (t as any).amount : 0) ?? 0);
                  const desc = t.description || (t as any).particulars || (depAmount > 0 ? 'ব্যাংক জমা' : 'ব্যাংক উত্তোলন');
                  const ref = t.reference || t.transactionNo || '-';
                  const bal = t.balance !== undefined ? t.balance : ((t as any).runningBalance !== undefined ? (t as any).runningBalance : null);

                  return (
                    <tr key={t.transactionId} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-[11px] whitespace-nowrap">{t.date}</td>
                      <td className="p-3 font-mono font-bold text-teal-800 whitespace-nowrap">
                        {t.transactionNo || (t as any).voucherNo || t.transactionId}
                      </td>
                      <td className="p-3 font-medium text-slate-800 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{t.bankName || 'সোনালী ব্যাংক'}</div>
                        {t.accountNumberMasked && (
                          <div className="text-[10px] text-slate-400 font-mono">{t.accountNumberMasked}</div>
                        )}
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        <div>{desc}</div>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px] font-mono">{ref}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {depAmount > 0 ? `+৳${depAmount.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                        {wthAmount > 0 ? `-৳${wthAmount.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-teal-950 whitespace-nowrap">
                        {bal !== null ? `৳${bal.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ContraEntryModal
        isOpen={isContraModalOpen}
        onClose={() => setIsContraModalOpen(false)}
        defaultType="CASH_TO_BANK"
        defaultBankAccountId={selectedAccountId !== 'ALL' ? selectedAccountId : undefined}
      />

      <BankAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setAccountToEdit(null);
        }}
        accountToEdit={accountToEdit}
      />
    </div>
  );
};

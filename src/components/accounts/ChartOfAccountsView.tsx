import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PdfService } from '../../services/pdfService';
import { ChartAccount, AccountCategory } from '../../types';
import {
  Building,
  Search,
  Printer,
  Plus,
  Edit2,
  X,
  Save,
  AlertCircle
} from 'lucide-react';

// Centralized Legacy Mapping Helpers
export const getAccountCode = (acc: any): string => String(acc?.accountCode || acc?.code || "");
export const getAccountBanglaName = (acc: any): string => String(acc?.banglaName || acc?.accountNameBn || acc?.nameBn || acc?.accountName || acc?.name || "");
export const getAccountEnglishName = (acc: any): string => String(acc?.accountName || acc?.nameEn || acc?.name || "");
export const getAccountCategory = (acc: any): string => String(acc?.category || acc?.accountType || acc?.type || "");
export const getAccountGroup = (acc: any): string => String(acc?.group || acc?.accountGroup || "");
export const getNormalBalance = (acc: any): string => String(acc?.normalBalance || "");
export const getAccountStatus = (acc: any): boolean => acc?.isActive !== undefined ? acc.isActive : true;

export const ChartOfAccountsView: React.FC = () => {
  const { db, setDb, language } = useApp();
  const isBangla = language === 'bn';
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<ChartAccount>>({
    accountCode: '',
    accountName: '',
    banglaName: '',
    category: 'Asset',
    group: '',
    normalBalance: 'DEBIT',
    isActive: true,
    isSystem: false
  });
  const [formError, setFormError] = useState('');

  const accountsArray = Array.isArray(db.accounts) ? db.accounts : [];

  const filteredCOA = useMemo(() => {
    return accountsArray.filter(item => {
      if (!item) return false;
      const code = getAccountCode(item).toLowerCase();
      const bnName = getAccountBanglaName(item).toLowerCase();
      const enName = getAccountEnglishName(item).toLowerCase();
      const group = getAccountGroup(item).toLowerCase();
      const type = getAccountCategory(item);
      
      const search = searchTerm.toLowerCase();
      const matchesSearch = code.includes(search) || bnName.includes(search) || enName.includes(search) || group.includes(search);
      const matchesType = typeFilter === 'ALL' || type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [accountsArray, searchTerm, typeFilter]);

  const handlePrint = () => {
    PdfService.printElement('printable-coa', 'Chart_Of_Accounts');
  };

  const openModal = (acc?: ChartAccount) => {
    setFormError('');
    if (acc) {
      setEditingAccount(acc);
      setFormData({
        accountCode: getAccountCode(acc),
        accountName: getAccountEnglishName(acc),
        banglaName: getAccountBanglaName(acc),
        category: getAccountCategory(acc) as AccountCategory,
        group: getAccountGroup(acc),
        normalBalance: getNormalBalance(acc) as "DEBIT" | "CREDIT",
        isActive: getAccountStatus(acc),
        isSystem: acc.isSystem || false
      });
    } else {
      setEditingAccount(null);
      setFormData({
        accountCode: '',
        accountName: '',
        banglaName: '',
        category: 'Asset',
        group: '',
        normalBalance: 'DEBIT',
        isActive: true,
        isSystem: false
      });
    }
    setIsModalOpen(true);
  };

  const handleCategoryChange = (cat: string) => {
    const category = cat as AccountCategory;
    let normalBalance: "DEBIT" | "CREDIT" = 'DEBIT';
    if (['Liability','Member Capital','Income'].includes(category)) {
      normalBalance = 'CREDIT';
    }
    setFormData({ ...formData, category, normalBalance });
  };

  const saveAccount = () => {
    if (!formData.accountCode || !formData.banglaName || !formData.category || !formData.group || !formData.normalBalance) {
      setFormError(isBangla ? 'অনুগ্রহ করে সব বাধ্যতামূলক তথ্য দিন।' : 'Please fill all required fields.');
      return;
    }

    const codeExists = accountsArray.some(a => getAccountCode(a) === formData.accountCode && (!editingAccount || getAccountCode(a) !== getAccountCode(editingAccount)));
    if (codeExists) {
      setFormError(isBangla ? 'এই হিসাব কোডটি ইতিমধ্যে ব্যবহৃত হচ্ছে।' : 'This Account Code is already in use.');
      return;
    }

    const newAccount: ChartAccount = {
      accountCode: formData.accountCode,
      accountName: formData.accountName || '',
      banglaName: formData.banglaName,
      category: formData.category as AccountCategory,
      group: formData.group,
      normalBalance: formData.normalBalance as "DEBIT" | "CREDIT",
      isActive: formData.isActive ?? true,
      isSystem: formData.isSystem ?? false
    };

    let updatedAccounts;
    if (editingAccount) {
      updatedAccounts = accountsArray.map(a => getAccountCode(a) === getAccountCode(editingAccount) ? { ...a, ...newAccount } : a);
    } else {
      updatedAccounts = [...accountsArray, newAccount];
    }
    
    // Quick sort by code
    updatedAccounts.sort((a, b) => getAccountCode(a).localeCompare(getAccountCode(b)));

    setDb({ ...db, accounts: updatedAccounts });
    setIsModalOpen(false);
  };

  // Summary stats
  const totalAccounts = accountsArray.length;
  const assetsCount = accountsArray.filter(a => getAccountCategory(a) === 'Asset').length;
  const liabCount = accountsArray.filter(a => getAccountCategory(a) === 'Liability').length;
  const eqCount = accountsArray.filter(a => getAccountCategory(a) === 'Member Capital').length;
  const revCount = accountsArray.filter(a => getAccountCategory(a) === 'Income').length;
  const expCount = accountsArray.filter(a => getAccountCategory(a) === 'Expense').length;

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'চার্ট অব একাউন্টস (Chart of Accounts - COA)' : 'Chart of Accounts'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'ডাবল এন্ট্রি নীতিমালায় সম্পদ, দায়, ইকুইটি, আয় ও ব্যয় খাতের প্রমিত কোডিং'
              : 'Standard double-entry chart of accounts master'}
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
          <button
            onClick={() => openModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{isBangla ? 'নতুন অ্যাকাউন্ট' : 'New Account'}</span>
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Total</p>
          <p className="text-lg font-black text-slate-800">{totalAccounts}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm text-center">
          <p className="text-[10px] uppercase font-bold text-blue-500 mb-1">Assets</p>
          <p className="text-lg font-black text-blue-700">{assetsCount}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm text-center">
          <p className="text-[10px] uppercase font-bold text-amber-500 mb-1">Liabilities</p>
          <p className="text-lg font-black text-amber-700">{liabCount}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm text-center">
          <p className="text-[10px] uppercase font-bold text-purple-500 mb-1">Equity</p>
          <p className="text-lg font-black text-purple-700">{eqCount}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm text-center">
          <p className="text-[10px] uppercase font-bold text-emerald-500 mb-1">Revenue</p>
          <p className="text-lg font-black text-emerald-700">{revCount}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm text-center">
          <p className="text-[10px] uppercase font-bold text-rose-500 mb-1">Expense</p>
          <p className="text-lg font-black text-rose-700">{expCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={isBangla ? "কোড বা খাতের নাম দিয়ে খুঁজুন..." : "Search by code or name..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
        >
          <option value="ALL">{isBangla ? "সকল প্রকার (All Types)" : "All Types"}</option>
          <option value="Asset">{isBangla ? "সম্পদ (Assets)" : "Assets"}</option>
          <option value="Liability">{isBangla ? "দায় (Liabilities)" : "Liabilities"}</option>
          <option value="Member Capital">{isBangla ? "ইকুইটি / মূলধন (Equity)" : "Equity"}</option>
          <option value="Income">{isBangla ? "আয় / রাজস্ব (Revenue)" : "Revenue"}</option>
          <option value="Expense">{isBangla ? "ব্যয় / খরচ (Expense)" : "Expense"}</option>
        </select>
      </div>

      {/* COA Table */}
      <div id="printable-coa" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3">{isBangla ? 'হিসাব কোড' : 'Account Code'}</th>
                <th className="p-3">{isBangla ? 'হিসাবের নাম (বাংলা)' : 'Account Name (Bangla)'}</th>
                <th className="p-3">{isBangla ? 'হিসাবের নাম (ইংরেজি)' : 'Account Name (English)'}</th>
                <th className="p-3">{isBangla ? 'হিসাবের ধরন' : 'Category'}</th>
                <th className="p-3">{isBangla ? 'গ্রুপ' : 'Group'}</th>
                <th className="p-3 text-center">{isBangla ? 'স্বাভাবিক ব্যালেন্স' : 'Normal Balance'}</th>
                <th className="p-3 text-center">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="p-3 text-right no-print">{isBangla ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCOA.map(acc => {
                const code = getAccountCode(acc);
                const category = getAccountCategory(acc);
                const normalBalance = getNormalBalance(acc);
                const isActive = getAccountStatus(acc);
                
                return (
                  <tr key={code} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {code}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{getAccountBanglaName(acc)}</td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{getAccountEnglishName(acc)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          category === 'Asset'
                            ? 'bg-blue-100 text-blue-800'
                            : category === 'Liability'
                            ? 'bg-amber-100 text-amber-800'
                            : category === 'Member Capital'
                            ? 'bg-purple-100 text-purple-800'
                            : category === 'Income'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {category}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 text-[11px] font-medium">{getAccountGroup(acc) || "—"}</td>
                    <td className="p-3 text-center font-mono font-bold text-[11px]">
                      {normalBalance === 'DEBIT' ? (
                        <span className="text-blue-700">Dr</span>
                      ) : (
                        <span className="text-emerald-700">Cr</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {isActive ? (
                        <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          {isBangla ? 'সক্রিয়' : 'Active'}
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                          {isBangla ? 'নিষ্ক্রিয়' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right no-print">
                      <button 
                        onClick={() => openModal(acc)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredCOA.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    {isBangla ? 'কোনো হিসাব খাত পাওয়া যায়নি।' : 'No accounts found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-bold text-slate-800">
                {editingAccount ? (isBangla ? 'হিসাব খাত আপডেট করুন' : 'Edit Account') : (isBangla ? 'নতুন হিসাব খাত যোগ করুন' : 'Add New Account')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isBangla ? 'হিসাব কোড *' : 'Account Code *'}</label>
                  <input
                    type="text"
                    value={formData.accountCode}
                    onChange={e => setFormData({ ...formData, accountCode: e.target.value })}
                    disabled={!!editingAccount && !!formData.isSystem}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    placeholder="e.g. 1000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isBangla ? 'স্ট্যাটাস' : 'Status'}</label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={e => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    disabled={!!formData.isSystem}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  >
                    <option value="true">{isBangla ? 'সক্রিয় (Active)' : 'Active'}</option>
                    <option value="false">{isBangla ? 'নিষ্ক্রিয় (Inactive)' : 'Inactive'}</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isBangla ? 'হিসাবের নাম (বাংলা) *' : 'Account Name (Bangla) *'}</label>
                <input
                  type="text"
                  value={formData.banglaName}
                  onChange={e => setFormData({ ...formData, banglaName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. নগদ হিসাব"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isBangla ? 'হিসাবের নাম (ইংরেজি)' : 'Account Name (English)'}</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Cash in Hand"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isBangla ? 'হিসাবের ধরন *' : 'Account Type *'}</label>
                  <select
                    value={formData.category}
                    onChange={e => handleCategoryChange(e.target.value)}
                    disabled={!!editingAccount && !!formData.isSystem}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  >
                    <option value="Asset">{isBangla ? 'সম্পদ (Asset)' : 'Asset'}</option>
                    <option value="Liability">{isBangla ? 'দায় (Liability)' : 'Liability'}</option>
                    <option value="Member Capital">{isBangla ? 'ইকুইটি (Equity)' : 'Member Capital'}</option>
                    <option value="Income">{isBangla ? 'আয় (Revenue)' : 'Income'}</option>
                    <option value="Expense">{isBangla ? 'ব্যয় (Expense)' : 'Expense'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isBangla ? 'গ্রুপ *' : 'Account Group *'}</label>
                  <input
                    type="text"
                    value={formData.group}
                    onChange={e => setFormData({ ...formData, group: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Current Asset"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isBangla ? 'স্বাভাবিক ব্যালেন্স *' : 'Normal Balance *'}</label>
                <div className="flex gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="normalBalance" 
                      value="DEBIT"
                      checked={formData.normalBalance === 'DEBIT'}
                      onChange={() => setFormData({ ...formData, normalBalance: 'DEBIT' })}
                      disabled={!!editingAccount && !!formData.isSystem}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">{isBangla ? 'ডেবিট (Debit)' : 'Debit'}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="normalBalance" 
                      value="CREDIT"
                      checked={formData.normalBalance === 'CREDIT'}
                      onChange={() => setFormData({ ...formData, normalBalance: 'CREDIT' })}
                      disabled={!!editingAccount && !!formData.isSystem}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">{isBangla ? 'ক্রেডিট (Credit)' : 'Credit'}</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={saveAccount}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-200"
              >
                <Save className="w-4 h-4" />
                <span>{isBangla ? 'সংরক্ষণ করুন' : 'Save Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

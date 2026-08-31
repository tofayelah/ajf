import React, { useState } from 'react';
import { processImageFile } from '../../utils/imageUtils';
import { useApp } from '../../context/AppContext';
import { AppSetting, UserRole } from '../../types';
import { createFreshDatabase } from '../../services/db';
import {
  Settings,
  ShieldCheck,
  Building,
  DollarSign,
  Landmark,
  Save,
  Download,
  Upload,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  AlertCircle,
  Scale,
  Sparkles
} from 'lucide-react';
import { AccountingMigrationView } from './AccountingMigrationView';
import { AJFLogo } from '../common/AJFLogo';

export const SettingsView: React.FC = () => {
  const appCtx = useApp();
  const db = appCtx?.db;
  const setDb = appCtx?.setDb;
  const updateSettings = appCtx?.updateSettings;
  const language = appCtx?.language || 'bn';
  const activeUser = appCtx?.activeUser;
  const showNotification = appCtx?.showNotification || (() => {});
  const resetTestData = appCtx?.resetTestData;
  const clearDatabase = appCtx?.clearDatabase;
  const isBangla = language === 'bn';
  
  const [showMigrationView, setShowMigrationView] = useState(false);
  const [formData, setFormData] = useState<AppSetting>({
    receiptPrefix: 'REC',
    voucherPrefix: 'VCH',
    memberIdPrefix: 'AJM',
    loanPrefix: 'LN',
    investmentPrefix: 'INV',
    resolutionPrefix: 'RES',
    notificationSettings: {
      dueReminder: true,
      loanDueReminder: true,
      pendingApprovalAlert: true,
      pendingReconciliationAlert: true,
      yearClosingAlert: true,
      backupReminder: true,
    },
    ...db?.settings 
  });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  
  const [resetModalState, setResetModalState] = useState<{
    isOpen: boolean;
    type: 'test_data' | 'factory' | null;
    inputText: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    type: null,
    inputText: '',
    isProcessing: false,
  });

  const [logoError, setLogoError] = useState<string>('');
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  if (showMigrationView) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowMigrationView(false)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span>← {isBangla ? 'সেটিংস পেজে ফিরে যান' : 'Back to Settings'}</span>
        </button>
        <AccountingMigrationView onClose={() => setShowMigrationView(false)} />
      </div>
    );
  }

  const exportDataBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `somiti_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    if (updateSettings) {
      updateSettings({ lastBackupDate: new Date().toISOString() });
    }
    showNotification(
    isBangla ? 'ব্যাকআপ ডাউনলোড সম্পন্ন হয়েছে' : 'Backup download completed', 'success');
  };

  const importDataBackup = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        setDb?.(parsed);
        showNotification(
    isBangla ? 'ব্যাকআপ সফলভাবে রিস্টোর করা হয়েছে' : 'Backup restored successfully', 'success');
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleResetConfirm = async () => {
    if (!resetModalState.type) return;
    
    setResetModalState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      if (resetModalState.type === 'test_data') {
        const success = await resetTestData?.();
        if (success) {
          showNotification("Test data সফলভাবে মুছে ফেলা হয়েছে।", "success");
          setTimeout(() => window.location.reload(), 500);
        } else {
          showNotification("ডেটা মুছে ফেলা সম্ভব হয়নি।", "error");
          setResetModalState(prev => ({ ...prev, isProcessing: false }));
        }
      } else if (resetModalState.type === 'factory') {
        const success = await clearDatabase?.();
        if (success) {
          showNotification("সমিতির সমস্ত ডেটা সফলভাবে মুছে ফেলা হয়েছে। নতুনভাবে শুরু করার জন্য সিস্টেম প্রস্তুত।", "success");
          setTimeout(() => window.location.reload(), 500);
        } else {
          showNotification("ফ্যাক্টরি রিসেট ব্যর্থ হয়েছে।", "error");
          setResetModalState(prev => ({ ...prev, isProcessing: false }));
        }
      }
    } catch (error) {
      console.error(error);
      showNotification("ত্রুটি ঘটেছে।", "error");
      setResetModalState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    
    const prev = db.settings;
    if (prev.receiptPrefix !== formData.receiptPrefix && activeUser) {
      db.auditLogs.push({ auditId: `AL-${Date.now()}-1`, userId: activeUser.userId, userName: activeUser.fullName, dateTime: new Date().toISOString(), module: 'SETTINGS', action: 'RECEIPT_PREFIX_UPDATED' as any, recordId: 'SETTINGS', remarks: `Receipt prefix changed from ${prev.receiptPrefix} to ${formData.receiptPrefix}` });
    }
    if (prev.voucherPrefix !== formData.voucherPrefix && activeUser) {
      db.auditLogs.push({ auditId: `AL-${Date.now()}-2`, userId: activeUser.userId, userName: activeUser.fullName, dateTime: new Date().toISOString(), module: 'SETTINGS', action: 'VOUCHER_PREFIX_UPDATED' as any, recordId: 'SETTINGS', remarks: `Voucher prefix changed from ${prev.voucherPrefix} to ${formData.voucherPrefix}` });
    }
    if (prev.memberIdPrefix !== formData.memberIdPrefix && activeUser) {
      db.auditLogs.push({ auditId: `AL-${Date.now()}-3`, userId: activeUser.userId, userName: activeUser.fullName, dateTime: new Date().toISOString(), module: 'SETTINGS', action: 'MEMBER_ID_PREFIX_UPDATED' as any, recordId: 'SETTINGS', remarks: `Member ID prefix changed from ${prev.memberIdPrefix} to ${formData.memberIdPrefix}` });
    }
    
    // Check if notification settings changed
    if (JSON.stringify(prev.notificationSettings) !== JSON.stringify(formData.notificationSettings) && activeUser) {
       db.auditLogs.push({ auditId: `AL-${Date.now()}-4`, userId: activeUser.userId, userName: activeUser.fullName, dateTime: new Date().toISOString(), module: 'SETTINGS', action: 'NOTIFICATION_SETTINGS_UPDATED' as any, recordId: 'SETTINGS', remarks: `Notification settings updated` });
    }

    updateSettings?.(formData);

    setSaveMessage('সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const success = importDataBackup(content);
      if (success) {
        setImportStatus('ডাটাবেজ সফলভাবে রিস্টোর করা হয়েছে!');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        alert('ত্রুটি: ব্যাকআপ ফাইলটি সঠিক নয়।');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'সিস্টেম ও সমিতি নীতিমালা সেটিংস (Settings)' : 'System Settings'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'গঠনতন্ত্রের নিয়মাবলী, আর্থিক হার, ব্যাংক হিসাব, ব্যাকআপ ও ব্যবহারকারী ভূমিকা'
              : 'Society parameters, rules, backup & role management'}
          </p>
        </div>
        {saveMessage && (
          <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>{saveMessage}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* 1. Society Identity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-2">
            <Building className="w-4 h-4 text-emerald-700" />
            <span>সমিতির নাম ও সাংগঠনিক পরিচয়</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2 flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="relative w-24 h-24 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-white flex-shrink-0 flex items-center justify-center p-2">
                {formData.orgLogoUrl ? (
                  <img src={formData.orgLogoUrl} alt="Logo" className="w-full h-full object-contain bg-white" />
                ) : (
                  <AJFLogo variant="md" className="w-20 h-20" />
                )}
              </div>
              <div className="flex-1 w-full space-y-2">
                <label className="block text-xs font-bold text-slate-700">Organization Logo</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/jpeg, image/png, image/webp"
                    className="hidden"
                    ref={logoInputRef}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setLogoError('');
                        const base64 = await processImageFile(file, 5);
                        setFormData({ ...formData, orgLogoUrl: base64 });
                      } catch (err: any) {
                        setLogoError(err.message);
                      }
                      if (logoInputRef.current) logoInputRef.current.value = '';
                    }}
                  />
                  <button type="button" onClick={() => logoInputRef.current?.click()} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm">
                    {formData.orgLogoUrl ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  {formData.orgLogoUrl && (
                    <button type="button" onClick={() => setFormData({ ...formData, orgLogoUrl: undefined })} className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold">
                      Remove
                    </button>
                  )}
                </div>
                {logoError && <p className="text-[10px] text-rose-600 font-medium">{logoError}</p>}
                <p className="text-[10px] text-slate-500">Supported formats: JPG, PNG, WEBP. Max size: 5MB.</p>
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">সমিতির নাম (বাংলা)</label>
              <input
                type="text"
                required
                value={formData.orgNameBangla || ''}
                onChange={e => setFormData({ ...formData, orgNameBangla: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Society Name (English)</label>
              <input
                type="text"
                required
                value={formData.orgName || ''}
                onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">কার্যালয়ের ঠিকানা</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">যোগাযোগ মোবাইল নং</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>
        </div>
        {/* 2. Financial Parameters & Rules */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-2">
            <DollarSign className="w-4 h-4 text-emerald-700" />
            <span>গঠনতন্ত্রের আর্থিক হার ও সঞ্চয় বিধি (Financial Parameters)</span>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">মাসিক চাঁদা (টাকা)</label>
              <input
                type="number"
                min={100}
                required
                value={formData.monthlyContribution || ''}
                onChange={e =>
                  setFormData({ ...formData, monthlyContribution: Number(e.target.value) })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-emerald-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ভর্তি ফি (টাকা)</label>
              <input
                type="number"
                min={0}
                required
                value={formData.admissionFee || ''}
                onChange={e => setFormData({ ...formData, admissionFee: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-emerald-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">সদস্যের মূলধন আমানত</label>
              <input
                type="number"
                min={1000}
                required
                value={formData.capitalDeposit || ''}
                onChange={e => setFormData({ ...formData, capitalDeposit: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-indigo-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">মাসিক বিলম্ব ফি (টাকা)</label>
              <input
                type="number"
                min={0}
                value={formData.lateFine || ''}
                onChange={e => setFormData({ ...formData, lateFine: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-rose-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ঋণ সার্ভিস চার্জ (%)</label>
              <input
                type="number"
                min={0}
                value={formData.loanInterestRate || ''}
                onChange={e => setFormData({ ...formData, loanInterestRate: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">সদস্য লভ্যাংশ (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.profitMemberPercent || ''}
                onChange={e =>
                  setFormData({ ...formData, profitMemberPercent: Number(e.target.value) })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">কল্যাণ তহবিল (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.profitWelfarePercent || ''}
                onChange={e =>
                  setFormData({ ...formData, profitWelfarePercent: Number(e.target.value) })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-purple-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">জরুরী তহবিল (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.profitEmergencyPercent || ''}
                onChange={e =>
                  setFormData({ ...formData, profitEmergencyPercent: Number(e.target.value) })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">সংরক্ষিত তহবিল (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.profitReservePercent || ''}
                onChange={e =>
                  setFormData({ ...formData, profitReservePercent: Number(e.target.value) })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-blue-800"
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-600 font-medium">
              গঠনতন্ত্র নীতি: ৬০% সদস্য + ২০% কল্যাণ + ১০% জরুরী + ১০% সংরক্ষিত = ১০০%
            </span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded text-xs ${
                (Number(formData.profitMemberPercent || 0) +
                  Number(formData.profitWelfarePercent || 0) +
                  Number(formData.profitEmergencyPercent || 0) +
                  Number(formData.profitReservePercent || 0)) === 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              মোট: {Number(formData.profitMemberPercent || 0) +
                Number(formData.profitWelfarePercent || 0) +
                Number(formData.profitEmergencyPercent || 0) +
                Number(formData.profitReservePercent || 0)}%
            </span>
          </div>
        </div>

        {/* 3. Numbering Settings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-2">
            <RefreshCw className="w-4 h-4 text-emerald-700" />
            <span>Numbering Configuration (Prefixes)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receipt Prefix</label>
              <input
                type="text"
                required
                value={formData.receiptPrefix || ''}
                onChange={e => setFormData({ ...formData, receiptPrefix: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-blue-900"
              />
              <p className="text-[10px] text-slate-500 mt-1">Preview: {formData.receiptPrefix}-2026-000001</p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Voucher Prefix</label>
              <input
                type="text"
                required
                value={formData.voucherPrefix || ''}
                onChange={e => setFormData({ ...formData, voucherPrefix: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-blue-900"
              />
              <p className="text-[10px] text-slate-500 mt-1">Preview: {formData.voucherPrefix}-2026-000001</p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Member ID Prefix</label>
              <input
                type="text"
                required
                value={formData.memberIdPrefix || ''}
                onChange={e => setFormData({ ...formData, memberIdPrefix: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-blue-900"
              />
              <p className="text-[10px] text-slate-500 mt-1">Preview: {formData.memberIdPrefix}-000001</p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Loan Prefix</label>
              <input
                type="text"
                required
                value={formData.loanPrefix || ''}
                onChange={e => setFormData({ ...formData, loanPrefix: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-blue-900"
              />
              <p className="text-[10px] text-slate-500 mt-1">Preview: {formData.loanPrefix}-2026-000001</p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Investment Prefix</label>
              <input
                type="text"
                required
                value={formData.investmentPrefix || ''}
                onChange={e => setFormData({ ...formData, investmentPrefix: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-blue-900"
              />
              <p className="text-[10px] text-slate-500 mt-1">Preview: {formData.investmentPrefix}-2026-000001</p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Resolution Prefix</label>
              <input
                type="text"
                required
                value={formData.resolutionPrefix || ''}
                onChange={e => setFormData({ ...formData, resolutionPrefix: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-blue-900"
              />
              <p className="text-[10px] text-slate-500 mt-1">Preview: {formData.resolutionPrefix}-2026-000001</p>
            </div>
          </div>
        </div>

        {/* 4. Bank Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-2">
            <Landmark className="w-4 h-4 text-emerald-700" />
            <span>অফিসিয়াল ব্যাংক হিসাবের তথ্য (Official Banking Info)</span>
          </h3>
          <p className="text-xs text-slate-500 mb-2">এই তথ্য রশিদ এবং অফিসিয়াল রিপোর্টে ব্যবহৃত হবে।</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ব্যাংকের নাম</label>
              <input
                type="text"
                value={formData.organizationBankName || formData.bankName || ''}
                onChange={e => setFormData({ ...formData, organizationBankName: e.target.value, bankName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">হিসাবের নাম</label>
              <input
                type="text"
                value={formData.organizationAccountName || ''}
                onChange={e => setFormData({ ...formData, organizationAccountName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">হিসাব নম্বর</label>
              <input
                type="text"
                value={formData.organizationAccountNumber || formData.bankAccountMask || ''}
                onChange={e => setFormData({ ...formData, organizationAccountNumber: e.target.value, bankAccountMask: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold"
              />
            </div>
            
            <div>
              <label className="block font-semibold text-slate-700 mb-1">শাখার নাম</label>
              <input
                type="text"
                value={formData.branchName || formData.bankBranch || ''}
                onChange={e => setFormData({ ...formData, branchName: e.target.value, bankBranch: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">রাউটিং নম্বর</label>
              <input
                type="text"
                value={formData.routingNumber || ''}
                onChange={e => setFormData({ ...formData, routingNumber: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">সুইফট কোড (SWIFT)</label>
              <input
                type="text"
                value={formData.swiftCode || ''}
                onChange={e => setFormData({ ...formData, swiftCode: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono uppercase"
              />
            </div>
            
            <div className="lg:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">ব্যাংকের ঠিকানা</label>
              <input
                type="text"
                value={formData.bankAddress || ''}
                onChange={e => setFormData({ ...formData, bankAddress: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
          </div>
          
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p><strong>নিরাপত্তা সতর্কতা:</strong> কোনো অবস্থাতেই ইন্টারনেট ব্যাংকিং পাসওয়ার্ড, OTP, ATM PIN, কার্ডের পিন বা অনলাইন ব্যাংকিং পিন এখানে সংরক্ষণ করবেন না।</p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2 bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-200 hover:bg-emerald-800 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>সংরক্ষণ করুন (Save)</span>
          </button>
        </div>
      </form>

      {/* Database Management Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 mt-8">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-2">
          <HardDrive className="w-4 h-4 text-emerald-700" />
          <span>ডেটাবেজ ও ব্যাকআপ ব্যবস্থাপনা (Database & Backup)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-purple-200 bg-purple-50/60 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2">
            <Scale className="w-6 h-6 text-purple-700" />
            <h4 className="font-bold text-xs text-slate-800">অ্যাকাউন্টিং মাইগ্রেশন (Phase 2)</h4>
            <p className="text-[10px] text-slate-500 mb-2">ঐতিহাসিক জার্নাল খতিয়ান রিক্লাসিফিকেশন ও সংশোধন</p>
            <button
              type="button"
              id="btn-open-accounting-migration"
              onClick={() => setShowMigrationView(true)}
              className="px-4 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold w-full hover:bg-purple-800 transition-colors shadow-sm"
            >
              Open Migration Tool
            </button>
          </div>

          <div className="border border-emerald-100 bg-emerald-50/50 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2">
            <Download className="w-6 h-6 text-emerald-700" />
            <h4 className="font-bold text-xs text-slate-800">ডেটা ব্যাকআপ ডাউনলোড</h4>
            <p className="text-[10px] text-slate-500 mb-2">সম্পূর্ণ ডেটাবেজ JSON ফরম্যাটে ডাউনলোড করুন</p>
            <button
              onClick={() => exportDataBackup()}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold w-full hover:bg-emerald-700 transition-colors"
            >
              Export Backup
            </button>
          </div>

          <div className="border border-blue-100 bg-blue-50/50 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2 relative">
            <Upload className="w-6 h-6 text-blue-700" />
            <h4 className="font-bold text-xs text-slate-800">ব্যাকআপ থেকে রিস্টোর</h4>
            <p className="text-[10px] text-slate-500 mb-2">JSON ব্যাকআপ ফাইল থেকে ডেটা রিস্টোর করুন</p>
            
            <label className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold w-full hover:bg-blue-700 transition-colors cursor-pointer">
              <span>Import Backup</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            {importStatus && (
              <div className="absolute -bottom-8 w-full text-center text-xs font-bold text-emerald-600">
                {importStatus}
              </div>
            )}
          </div>

          <div className="border border-rose-100 bg-rose-50/50 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <h4 className="font-bold text-xs text-slate-800">ফ্যাক্টরি রিসেট (ডেটা মুছুন)</h4>
            <p className="text-[10px] text-slate-500 mb-2">সমিতির সমস্ত ডেটা মুছে নতুন করে শুরু করুন</p>
            <button
              onClick={() => setResetModalState({ isOpen: true, type: 'factory', inputText: '', isProcessing: false })}
              className="px-4 py-1.5 bg-white border-2 border-rose-600 text-rose-700 rounded-lg text-xs font-bold w-full hover:bg-rose-50 transition-colors"
            >
              Factory Reset
            </button>
          </div>

          <div className="border border-amber-100 bg-amber-50/50 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <h4 className="font-bold text-xs text-slate-800">Test Data Reset</h4>
            <p className="text-[10px] text-slate-500 mb-2">Clear transactional records only. Keeps settings & users.</p>
            <button
              onClick={() => setResetModalState({ isOpen: true, type: 'test_data', inputText: '', isProcessing: false })}
              className="px-4 py-1.5 bg-white border-2 border-amber-600 text-amber-700 rounded-lg text-xs font-bold w-full hover:bg-amber-50 transition-colors"
            >
              Reset Test Data
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {resetModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                {resetModalState.type === 'factory' ? 'Factory Reset Confirmation' : 'Test Data Reset Confirmation'}
              </h3>
              {!resetModalState.isProcessing && (
                <button
                  onClick={() => setResetModalState(prev => ({ ...prev, isOpen: false }))}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="p-5 space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm">
                <p className="font-bold mb-1">Production Environment Safety Check</p>
                <p>
                  {resetModalState.type === 'factory' 
                    ? "Are you sure you want to clear all data? This cannot be undone."
                    : "Are you sure you want to clear all transactional test data? This will NOT delete settings, users, or configuration."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Please type <span className="font-bold font-mono text-rose-600 bg-rose-100 px-1 rounded">{resetModalState.type === 'factory' ? 'RESET' : 'RESET TEST DATA'}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={resetModalState.inputText}
                  onChange={(e) => setResetModalState(prev => ({ ...prev, inputText: e.target.value }))}
                  disabled={resetModalState.isProcessing}
                  placeholder={resetModalState.type === 'factory' ? 'RESET' : 'RESET TEST DATA'}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setResetModalState(prev => ({ ...prev, isOpen: false }))}
                disabled={resetModalState.isProcessing}
                className="px-5 py-2 text-slate-600 font-semibold hover:bg-slate-200 bg-slate-100 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                disabled={
                  resetModalState.isProcessing || 
                  (resetModalState.type === 'factory' && resetModalState.inputText !== 'RESET') ||
                  (resetModalState.type === 'test_data' && resetModalState.inputText !== 'RESET TEST DATA')
                }
                className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl text-sm shadow-md shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                {resetModalState.isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

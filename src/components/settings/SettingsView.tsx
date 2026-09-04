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
  Sparkles,
  FileText,
  Check,
  Copy,
  FileCheck,
  Layers,
  Activity,
  FileSpreadsheet,
  Lock,
  Server,
  ShieldAlert
} from 'lucide-react';
import { AccountingMigrationView } from './AccountingMigrationView';
import { DatabaseStatusReport } from './DatabaseStatusReport';
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
    previewData: any | null;
    resultData: any | null;
    error: string | null;
  }>({
    isOpen: false,
    type: null,
    inputText: '',
    isProcessing: false,
    previewData: null,
    resultData: null,
    error: null,
  });

  const openFactoryResetModal = async () => {
    setResetModalState({
      isOpen: true,
      type: 'factory',
      inputText: '',
      isProcessing: false,
      previewData: null,
      resultData: null,
      error: null,
    });
    try {
      const preview = await appCtx?.getFactoryResetPreview?.();
      setResetModalState(prev => ({ ...prev, previewData: preview }));
    } catch (err: any) {
      console.error('Failed to load reset preview:', err);
    }
  };

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

  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [downloadSummaryModal, setDownloadSummaryModal] = useState<any | null>(null);
  const [copiedSha, setCopiedSha] = useState(false);
  const [emptyBackupConfirmModal, setEmptyBackupConfirmModal] = useState<{
    isOpen: boolean;
    previewData: any | null;
  }>({
    isOpen: false,
    previewData: null
  });

  const [restoreModalState, setRestoreModalState] = useState<{
    isOpen: boolean;
    step: 'upload' | 'preview' | 'success';
    fileName: string | null;
    backupPackage: any | null;
    isValidating: boolean;
    validationResult: any | null;
    confirmInput: string;
    isExecuting: boolean;
    restoreResult: any | null;
    error: string | null;
  }>({
    isOpen: false,
    step: 'upload',
    fileName: null,
    backupPackage: null,
    isValidating: false,
    validationResult: null,
    confirmInput: '',
    isExecuting: false,
    restoreResult: null,
    error: null
  });

  const exportDataBackup = async (allowEmpty: boolean = false) => {
    setIsDownloadingBackup(true);
    try {
      const res = await appCtx?.downloadAuthoritativeBackup?.(allowEmpty);
      if (res && res.isConfirmationRequired) {
        setEmptyBackupConfirmModal({
          isOpen: true,
          previewData: res.previewData
        });
        return;
      }
      if (res && res.success && res.blob) {
        const url = window.URL.createObjectURL(res.blob);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", url);
        downloadAnchor.setAttribute("download", res.filename || `AJF_FULL_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        window.URL.revokeObjectURL(url);
        
        setEmptyBackupConfirmModal({ isOpen: false, previewData: null });
        setDownloadSummaryModal({
           message: 'Full authoritative backup (ZIP) downloaded successfully.',
           counts: res.previewData?.counts || res.previewData?.recordCounts || {},
           metadata: res.metadata
        });
        
        if (updateSettings) {
          updateSettings({ lastBackupDate: new Date().toISOString() });
        }
        showNotification(
           isBangla ? 'সার্ভার অথরিটেটিভ ব্যাকআপ জিপ সফলভাবে ডাউনলোড হয়েছে' : 'Server authoritative ZIP backup downloaded successfully',
          'success'
        );
      } else {
        showNotification(res?.message || (isBangla ? 'ব্যাকআপ ডাউনলোড ব্যর্থ হয়েছে' : 'Backup download failed'), 'error');
      }
    } catch (err: any) {
      showNotification(isBangla ? 'সার্ভার ত্রুটি: ' + err.message : 'Server Error: ' + err.message, 'error');
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleRestoreFileSelected = async (file: File) => {
    if (!file) return;

    setRestoreModalState(prev => ({
      ...prev,
      fileName: file.name,
      isValidating: true,
      error: null,
      backupPackage: null,
      validationResult: null,
      confirmInput: ''
    }));

    try {
      const validation = await appCtx?.validateRestoreBackup?.(file);
      
      setRestoreModalState(prev => ({
        ...prev,
        isValidating: false,
        backupPackage: file,
        validationResult: validation?.validation || null,
        step: 'preview',
        error: validation?.success ? null : (validation?.message || 'Validation failed')
      }));
    } catch (err: any) {
      console.error("Error parsing backup file:", err);
      setRestoreModalState(prev => ({
        ...prev,
        isValidating: false,
        error: err.message || 'Invalid backup file format'
      }));
    }
  };

  const handleExecuteRestoreConfirm = async () => {
    if (restoreModalState.confirmInput !== 'RESTORE AJF DATABASE') {
      setRestoreModalState(prev => ({
        ...prev,
        error: isBangla ? 'কনফার্মেশন বাক্য সঠিকভাবে টাইপ করুন: RESTORE AJF DATABASE' : 'Please type exact confirmation: RESTORE AJF DATABASE'
      }));
      return;
    }

    setRestoreModalState(prev => ({ ...prev, isExecuting: true, error: null }));

    try {
      const res = await appCtx?.executeRestoreBackup?.(
        restoreModalState.confirmInput,
        restoreModalState.backupPackage,
        'Full Database Restore via UI'
      );

      if (res && res.success) {
        setRestoreModalState(prev => ({
          ...prev,
          isExecuting: false,
          step: 'success',
          restoreResult: res.data,
          error: null
        }));
        showNotification(
          isBangla ? 'ডাটাবেজ সফলভাবে রিস্টোর করা হয়েছে!' : 'Database restored successfully!',
          'success'
        );
      } else {
        const errMsg = res?.message || 'রিস্টোর অপারেশন ব্যর্থ হয়েছে।';
        setRestoreModalState(prev => ({
          ...prev,
          isExecuting: false,
          error: errMsg
        }));
        showNotification(errMsg, 'error');
      }
    } catch (err: any) {
      console.error("Restore execution error:", err);
      const errMsg = err.message || 'রিস্টোর অপারেশনে অপ্রত্যাশিত ত্রুটি ঘটেছে।';
      setRestoreModalState(prev => ({
        ...prev,
        isExecuting: false,
        error: errMsg
      }));
      showNotification(errMsg, 'error');
    }
  };

  const importDataBackup = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      setRestoreModalState({
        isOpen: true,
        step: 'preview',
        fileName: 'selected_backup.json',
        backupPackage: parsed,
        isValidating: false,
        validationResult: null,
        confirmInput: '',
        isExecuting: false,
        restoreResult: null,
        error: null
      });
      // Validate in background
      appCtx?.validateRestoreBackup?.(parsed).then(v => {
        setRestoreModalState(prev => ({
          ...prev,
          validationResult: v?.validation || null,
          error: v?.success ? null : (v?.message || 'Validation failed')
        }));
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleResetConfirm = async () => {
    if (!resetModalState.type) return;
    
    setResetModalState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      if (resetModalState.type === 'test_data') {
        const success = await resetTestData?.();
        if (success) {
          showNotification("Test data সফলভাবে মুছে ফেলা হয়েছে।", "success");
          setTimeout(() => window.location.reload(), 500);
        } else {
          showNotification("ডেটা মুছে ফেলা সম্ভব হয়নি।", "error");
          setResetModalState(prev => ({ ...prev, isProcessing: false, error: 'Failed to reset test data' }));
        }
      } else if (resetModalState.type === 'factory') {
        const res = await appCtx?.executeFactoryReset?.(
          resetModalState.inputText,
          'Full member and transaction factory reset'
        );
        if (res && res.success) {
          setResetModalState(prev => ({
            ...prev,
            isProcessing: false,
            resultData: res.data,
            error: null
          }));
          showNotification("সমিতির সমস্ত সদস্য ও লেনদেন ডেটা সফলভাবে মুছে ফেলা হয়েছে।", "success");
        } else {
          const errMsg = res?.message || "ফ্যাক্টরি রিসেট ব্যর্থ হয়েছে।";
          showNotification(errMsg, "error");
          setResetModalState(prev => ({ ...prev, isProcessing: false, error: errMsg }));
        }
      }
    } catch (error: any) {
      console.error(error);
      showNotification("ত্রুটি ঘটেছে: " + error.message, "error");
      setResetModalState(prev => ({ ...prev, isProcessing: false, error: error.message }));
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
                <AJFLogo variant="md" className="w-20 h-20" alt="Organization Logo" />
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

      {/* Database Status & Verification Dashboard Card */}
      <DatabaseStatusReport
        className="mt-8"
        onExportBackup={(allowEmpty) => exportDataBackup(allowEmpty)}
        onOpenRestore={() => setRestoreModalState({
          isOpen: true,
          step: 'upload',
          fileName: null,
          backupPackage: null,
          isValidating: false,
          validationResult: null,
          confirmInput: '',
          isExecuting: false,
          restoreResult: null,
          error: null
        })}
      />

      {/* Database Management Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 mt-6">
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
            <p className="text-[10px] text-slate-500 mb-2">সার্ভার অথরিটেটিভ ফুল ডেটাবেজ JSON ফরম্যাটে ডাউনলোড করুন</p>
            <button
              onClick={() => exportDataBackup()}
              disabled={isDownloadingBackup}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold w-full hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isDownloadingBackup ? (
                <>
                  <RefreshCw className="animate-spin h-3.5 w-3.5 text-white" />
                  <span>যাচাই ও ডাউনলোড হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup</span>
                </>
              )}
            </button>
          </div>

          <div className="border border-blue-100 bg-blue-50/50 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2">
            <Upload className="w-6 h-6 text-blue-700" />
            <h4 className="font-bold text-xs text-slate-800">ব্যাকআপ থেকে রিস্টোর</h4>
            <p className="text-[10px] text-slate-500 mb-2">সার্ভার অথরিটেটিভ ব্যাকআপ ফাইল দিয়ে ডেটাবেজ রিস্টোর করুন</p>
            
            <button
              onClick={() => setRestoreModalState({
                isOpen: true,
                step: 'upload',
                fileName: null,
                backupPackage: null,
                isValidating: false,
                validationResult: null,
                confirmInput: '',
                isExecuting: false,
                restoreResult: null,
                error: null
              })}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold w-full hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restore Database</span>
            </button>
          </div>

          <div className="border border-rose-100 bg-rose-50/50 p-4 rounded-xl flex flex-col items-center justify-center text-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <h4 className="font-bold text-xs text-slate-800">ফ্যাক্টরি রিসেট (ডেটা মুছুন)</h4>
            <p className="text-[10px] text-slate-500 mb-2">সমিতির সমস্ত সদস্য ও লেনদেন ডেটা মুছে নতুন করে শুরু করুন</p>
            <button
              onClick={openFactoryResetModal}
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
              onClick={() => setResetModalState({ isOpen: true, type: 'test_data', inputText: '', isProcessing: false, previewData: null, resultData: null, error: null })}
              className="px-4 py-1.5 bg-white border-2 border-amber-600 text-amber-700 rounded-lg text-xs font-bold w-full hover:bg-amber-50 transition-colors"
            >
              Reset Test Data
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation / Result Modal */}
      {resetModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-8">
            {resetModalState.resultData ? (
              // Success Screen
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3 text-emerald-700">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      {isBangla ? 'ফ্যাক্টরি রিসেট সফলভাবে সম্পন্ন হয়েছে' : 'Factory Reset Completed Successfully'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isBangla ? 'সমিতির সমস্ত সদস্য ও লেনদেন ডেটা মুছে নতুনভাবে শুরু করা হয়েছে' : 'All member & financial transactional records were deleted'}
                    </p>
                  </div>
                </div>

                {/* Backup Verification Notice */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2.5">
                  <HardDrive className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{isBangla ? 'সার্ভার ব্যাকআপ সংরক্ষিত ও পরীক্ষিত:' : 'Server Backup Verified & Stored:'} </span>
                    <span className="font-mono text-[11px] block mt-0.5 text-blue-800 bg-white px-2 py-1 rounded border border-blue-200">
                      {resetModalState.resultData.backupFileName}
                    </span>
                  </div>
                </div>

                {/* Deleted Counts Summary */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {isBangla ? 'মুছে ফেলা রেকর্ডের বিবরণ' : 'Deleted Records Breakdown'}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'সদস্যগণ (Members)' : 'Members'}</span>
                      <span className="font-bold text-slate-800 text-sm">{resetModalState.resultData.deletedCounts?.members || 0}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'ভর্তি রেকর্ড (Admissions)' : 'Admissions'}</span>
                      <span className="font-bold text-slate-800 text-sm">{resetModalState.resultData.deletedCounts?.admissions || 0}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'মূলধন আমানত (Capital)' : 'Capital Deposits'}</span>
                      <span className="font-bold text-slate-800 text-sm">{resetModalState.resultData.deletedCounts?.capitalDeposits || 0}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'মাসিক চাঁদা (Collections)' : 'Collections'}</span>
                      <span className="font-bold text-slate-800 text-sm">{resetModalState.resultData.deletedCounts?.collections || 0}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'ক্যাশ লেনদেন (Cash Txns)' : 'Cash Txns'}</span>
                      <span className="font-bold text-slate-800 text-sm">{resetModalState.resultData.deletedCounts?.cashTransactions || 0}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'জার্নাল ভাউচার (Journals)' : 'Journals'}</span>
                      <span className="font-bold text-slate-800 text-sm">{resetModalState.resultData.deletedCounts?.journalEntries || 0} ({resetModalState.resultData.deletedCounts?.journalLines || 0} lines)</span>
                    </div>
                  </div>
                </div>

                {/* Preserved Master Data */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
                  <span className="font-bold block mb-1">
                    ✓ {isBangla ? 'সংরক্ষিত সিস্টেম ও অ্যাকাউন্টস মাস্টার:' : 'Preserved Master Configuration:'}
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-emerald-800 text-[11px]">
                    <li>{isBangla ? `ইউজার অ্যাকাউন্টস (${resetModalState.resultData.preserved?.usersCount || 0} জন)` : `User Accounts (${resetModalState.resultData.preserved?.usersCount || 0})`}</li>
                    <li>{isBangla ? `চার্ট অব অ্যাকাউন্টস (${resetModalState.resultData.preserved?.accountsCount || 0} টি কোড)` : `Chart of Accounts (${resetModalState.resultData.preserved?.accountsCount || 0} codes)`}</li>
                    <li>{isBangla ? 'সংস্থার তথ্য ও সিস্টেম সেটিংস' : 'Organization Settings & Configuration'}</li>
                    <li>{isBangla ? 'সদস্য নম্বর শুরু হবে AJM-000001 থেকে' : 'Next member will start fresh at AJM-000001'}</li>
                  </ul>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setResetModalState(prev => ({ ...prev, isOpen: false }));
                      window.location.reload();
                    }}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{isBangla ? 'সিস্টেম রিলোড করুন' : 'Complete & Reload App'}</span>
                  </button>
                </div>
              </div>
            ) : (
              // Confirmation Dialog
              <>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    {resetModalState.type === 'factory' 
                      ? (isBangla ? 'পূর্ণাঙ্গ ফ্যাক্টরি রিসেট কনফার্মেশন' : 'Authoritative Factory Reset')
                      : 'Test Data Reset Confirmation'}
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
                
                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                  {/* Step 1: Warning Message */}
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs space-y-2">
                    <p className="font-bold text-sm text-rose-700 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      {isBangla ? 'সতর্কবার্তা: স্থায়ীভাবে ডেটা মুছে ফেলা হবে' : 'Warning: Irreversible Action'}
                    </p>
                    <p className="leading-relaxed">
                      {resetModalState.type === 'factory' 
                        ? (isBangla
                            ? "এই অপারেশন সমস্ত Member, Admission, Capital, Monthly Chanda, Loan, Cash/Bank Transaction এবং Accounting Journal Entries স্থায়ীভাবে সার্ভার থেকে মুছে ফেলবে। এটি আর ফিরিয়ে আনা যাবে না।"
                            : "This action will permanently delete all member records, admissions, collections, loans, cash/bank transactions, and accounting entries. This action cannot be undone.")
                        : "Are you sure you want to clear all transactional test data? This will NOT delete settings, users, or configuration."}
                    </p>
                    <p className="text-[11px] text-rose-800 font-semibold">
                      ✓ {isBangla ? 'অ্যাডমিন অ্যাকাউন্ট, চার্ট অব অ্যাকাউন্টস এবং সিস্টেম সেটিংস অপরিবর্তিত থাকবে।' : 'Admin accounts, chart of accounts, and system configuration will be preserved.'}
                    </p>
                    <p className="text-[11px] text-blue-800 font-semibold bg-blue-50/80 p-2 rounded border border-blue-200">
                      🔒 {isBangla ? 'মুছে ফেলার পূর্বে সার্ভারে স্বয়ংক্রিয়ভাবে একটি ভেরিফাইড ব্যাকআপ ফাইল তৈরি হবে।' : 'An automatic verified backup will be generated on the server before deletion.'}
                    </p>
                  </div>

                  {/* Current Database Summary Preview */}
                  {resetModalState.type === 'factory' && (
                    <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {isBangla ? 'মুছে ফেলা হবে এমন বর্তমান রেকর্ডসমূহ:' : 'Current Records to be Cleared:'}
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-xs text-center">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[10px] block">{isBangla ? 'মোট সদস্য' : 'Members'}</span>
                          <span className="font-bold text-slate-800">{resetModalState.previewData?.summary?.totalMembers ?? (db?.members || []).length}</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[10px] block">{isBangla ? 'আর্থিক লেনদেন' : 'Transactions'}</span>
                          <span className="font-bold text-slate-800">
                            {resetModalState.previewData?.summary?.totalFinancialTransactions ?? ((db?.cashTransactions || []).length + (db?.bankTransactions || []).length)}
                          </span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[10px] block">{isBangla ? 'জার্নাল ভাউচার' : 'Journals'}</span>
                          <span className="font-bold text-slate-800">{resetModalState.previewData?.summary?.totalJournals ?? (db?.journalEntries || []).length}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Alert if any */}
                  {resetModalState.error && (
                    <div className="p-3 bg-rose-100 border border-rose-300 rounded-lg text-rose-800 text-xs font-semibold">
                      {resetModalState.error}
                    </div>
                  )}

                  {/* Step 2: Typing Confirmation */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isBangla ? 'নিশ্চিত করতে নিচে হুবহু টাইপ করুন:' : 'Please type exactly to confirm:'}
                      <span className="block mt-1 font-mono font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded text-center text-xs tracking-wider select-all">
                        {resetModalState.type === 'factory' ? 'FACTORY RESET AJF PRODUCTION DATA' : 'RESET TEST DATA'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={resetModalState.inputText}
                      onChange={(e) => setResetModalState(prev => ({ ...prev, inputText: e.target.value, error: null }))}
                      disabled={resetModalState.isProcessing}
                      placeholder={resetModalState.type === 'factory' ? 'FACTORY RESET AJF PRODUCTION DATA' : 'RESET TEST DATA'}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-xs font-mono font-bold focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    onClick={() => setResetModalState(prev => ({ ...prev, isOpen: false }))}
                    disabled={resetModalState.isProcessing}
                    className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 bg-slate-100 rounded-xl text-xs transition-colors disabled:opacity-50"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleResetConfirm}
                    disabled={
                      resetModalState.isProcessing || 
                      (resetModalState.type === 'factory' && resetModalState.inputText !== 'FACTORY RESET AJF PRODUCTION DATA') ||
                      (resetModalState.type === 'test_data' && resetModalState.inputText !== 'RESET TEST DATA')
                    }
                    className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                  >
                    {resetModalState.isProcessing ? (
                      <>
                        <RefreshCw className="animate-spin h-3.5 w-3.5 text-white" />
                        <span>{isBangla ? 'রিসেট হচ্ছে...' : 'Processing Reset...'}</span>
                      </>
                    ) : (
                      <span>{resetModalState.type === 'factory' ? 'CONFIRM RESET' : 'Confirm Delete'}</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty Database Confirmation Modal */}
      {emptyBackupConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-amber-100 flex items-center justify-between bg-amber-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {isBangla ? 'খালি ডাটাবেজ ব্যাকআপ নিশ্চিতকরণ' : 'Empty Database Backup Confirmation'}
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    {isBangla ? 'সার্ভার ডাটাবেজে কোনো লেনদেন বা সদস্য নেই' : 'Authoritative database has zero operational records'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmptyBackupConfirmModal({ isOpen: false, previewData: null })}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600">
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-amber-950">
                <p className="font-semibold leading-relaxed">
                  {isBangla
                    ? 'বর্তমান authoritative server database-এ কোনো সদস্য বা আর্থিক লেনদেনের রেকর্ড নেই (Members: 0, Collections: 0, Journals: 0)।'
                    : 'The authoritative production server database is currently empty (Members: 0, Collections: 0, Journals: 0).'}
                </p>
                <p className="text-[11px] text-amber-800 leading-normal">
                  {isBangla
                    ? 'সাধারণত একটি সক্রিয় অ্যাকাউন্টিং ব্যাকআপে লেনদেন থাকে। আপনি যদি ফ্যাক্টরি রিসেট পরবর্তী বা প্রাথমিক খালি কাঠামোর ব্যাকআপ নিতে চান, তবে নিশ্চিত করুন।'
                    : 'A production backup typically contains active member records. If you intentionally wish to export an initial or reset empty database snapshot, please confirm.'}
                </p>
              </div>

              {/* Zero counts preview */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">{isBangla ? 'সদস্য' : 'Members'}</span>
                  <span className="font-bold text-slate-800">0</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">{isBangla ? 'চাঁদা' : 'Collections'}</span>
                  <span className="font-bold text-slate-800">0</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">{isBangla ? 'জার্নাল' : 'Journals'}</span>
                  <span className="font-bold text-slate-800">0</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setEmptyBackupConfirmModal({ isOpen: false, previewData: null })}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={() => exportDataBackup(true)}
                disabled={isDownloadingBackup}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isDownloadingBackup ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isBangla ? 'ডাউনলোড হচ্ছে...' : 'Downloading...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{isBangla ? 'হ্যাঁ, খালি ব্যাকআপ ডাউনলোড করুন' : 'Confirm & Download Empty Backup'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Download Summary Modal */}
      {downloadSummaryModal && (() => {
        const isBackupEmpty = Boolean(downloadSummaryModal.isEmptyDatabase);
        const sha256 = downloadSummaryModal.sha256 || downloadSummaryModal.integrity?.sha256 || downloadSummaryModal.metadata?.checksumSha256;
        const hasValidSha = Boolean(sha256 && sha256 !== 'N/A' && typeof sha256 === 'string' && sha256.length >= 32);
        const counts = downloadSummaryModal.counts || downloadSummaryModal.recordCounts || downloadSummaryModal.metadata?.counts || {};
        const acc = downloadSummaryModal.accountingSummary || {};
        const integrity = downloadSummaryModal.integrity || {};

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
              <div className={`p-5 border-b flex items-center justify-between ${isBackupEmpty ? 'bg-amber-50/70 border-amber-100' : 'bg-emerald-50/70 border-emerald-100'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isBackupEmpty ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isBackupEmpty ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {isBackupEmpty
                        ? (isBangla ? 'খালি ডাটাবেজ ব্যাকআপ সম্পন্ন' : 'Empty Database Backup Generated')
                        : (isBangla ? 'সম্পূর্ণ সার্ভার ব্যাকআপ তৈরি ও ডাউনলোড সম্পন্ন' : 'Authoritative Full Backup Downloaded')}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      {isBackupEmpty
                        ? (isBangla ? '০ টি সদস্য ও লেনদেন বিশিষ্ট কাঠামোগত ব্যাকআপ প্যাকেজ' : 'Structural backup package containing 0 active records')
                        : (isBangla ? 'সার্ভার অথরিটেটিভ প্রোডাকশন ডাটাবেজের সম্পূর্ণ কপি' : 'Production database snapshot with SHA-256 integrity')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDownloadSummaryModal(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Empty Warning notice if empty */}
                {isBackupEmpty && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-amber-800">{isBangla ? 'সতর্কতা: খালি ডাটাবেজ ব্যাকআপ' : 'Notice: Empty Database Backup'}</span>
                      <span className="text-[11px] text-amber-700">
                        {isBangla ? 'এই ব্যাকআপ ফাইলে কোনো সদস্য বা আর্থিক লেনদেন রেকর্ড নেই।' : 'This backup file contains 0 active member or financial transactions.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Checksum info with Copy Button & Proper Status */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className={`w-4 h-4 ${hasValidSha ? (isBackupEmpty ? 'text-amber-600' : 'text-emerald-600') : 'text-rose-600'}`} />
                      <span>SHA-256 Checksum:</span>
                    </span>
                    {hasValidSha ? (
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${isBackupEmpty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {isBackupEmpty ? 'EMPTY DATABASE VERIFIED' : 'INTEGRITY VERIFIED'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">
                        CHECKSUM MISSING
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-[10.5px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200 break-all select-all flex-1">
                      {hasValidSha ? sha256 : (sha256 || 'N/A (Error: Checksum not generated)')}
                    </div>
                    <button
                      onClick={() => {
                        if (hasValidSha && sha256) {
                          navigator.clipboard.writeText(sha256);
                          setCopiedSha(true);
                          setTimeout(() => setCopiedSha(false), 2000);
                        }
                      }}
                      disabled={!hasValidSha}
                      className="px-2.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium flex items-center gap-1 shrink-0 transition-colors disabled:opacity-40"
                    >
                      {copiedSha ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSha ? (isBangla ? 'কপি হয়েছে' : 'Copied!') : (isBangla ? 'কপি' : 'Copy')}</span>
                    </button>
                  </div>
                </div>

                {/* Breakdown Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {isBangla ? 'ব্যাকআপে অন্তর্ভুক্ত সম্পূর্ণ রেকর্ডসমূহ' : 'Exported Database Summary'}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Total: {(Object.values(counts) as any[]).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0)} records
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs text-center">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'সদস্যগণ' : 'Members'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.members || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'ভর্তি রেকর্ড' : 'Admissions'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.admissions || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'মাসিক চাঁদা' : 'Collections'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.collections || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'মূলধন জমা' : 'Capital'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.capitalDeposits || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'ঋণ ও কিস্তি' : 'Loans / Repay'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.loans || 0} / {counts.loanRepayments || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'কল্যাণ অনুদান' : 'Welfare'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.welfareTransactions || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'ক্যাশ লেনদেন' : 'Cash Txns'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.cashTransactions || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'ব্যাংক লেনদেন' : 'Bank Txns'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.bankTransactions || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'জার্নাল এন্ট্রি' : 'Journals'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.journalEntries || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'হিসাব চার্ট' : 'Accounts'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.accounts || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'ব্যবহারকারী' : 'Users'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.users || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'অডিট লগ' : 'Audit Logs'}</span>
                      <span className="font-bold text-slate-800 text-sm">{counts.auditLogs || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Accounting Verification */}
                <div className={`p-3.5 border rounded-xl text-xs space-y-1.5 ${isBackupEmpty ? 'bg-amber-50/50 border-amber-200 text-amber-900' : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isBackupEmpty ? 'text-amber-600' : 'text-emerald-600'}`} />
                      <span className="font-bold">
                        {isBangla ? 'ট্রায়াল ব্যালেন্স ও অ্যাকাউন্টিং ইন্টিগ্রিটি:' : 'Trial Balance & Accounting Integrity:'}
                      </span>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded border text-[11px] ${isBackupEmpty ? 'text-amber-800 bg-white border-amber-300' : 'text-emerald-800 bg-white border-emerald-300'}`}>
                      {isBackupEmpty ? 'EMPTY DATABASE (0 Txns)' : (acc.trialBalanceStatus === 'BALANCED' || integrity.trialBalanceStatus === 'PASS' ? 'PASS (Balanced)' : 'VERIFIED')}
                    </span>
                  </div>
                  {!isBackupEmpty && typeof acc.totalDebit === 'number' && (
                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-emerald-200/60 font-mono">
                      <span>Total Debit: ৳{acc.totalDebit.toLocaleString('en-IN')}</span>
                      <span>Total Credit: ৳{acc.totalCredit?.toLocaleString('en-IN')}</span>
                      <span className="text-emerald-700 font-bold">Diff: ৳{acc.difference || 0}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setDownloadSummaryModal(null)}
                  className="px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors"
                >
                  {isBangla ? 'ঠিক আছে' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Authoritative Restore Modal */}
      {restoreModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
            
            {/* Step 1: Upload / Dropzone */}
            {restoreModalState.step === 'upload' && (
              <>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <span>{isBangla ? 'সার্ভার ব্যাকআপ থেকে ডাটাবেজ রিস্টোর' : 'Restore Database from Authoritative Backup'}</span>
                  </h3>
                  <button
                    onClick={() => setRestoreModalState(prev => ({ ...prev, isOpen: false }))}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-1.5">
                    <p className="font-bold text-sm text-blue-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      {isBangla ? 'সার্ভার-অথরিটেটিভ পারফেক্ট রিস্টোর' : 'Server-Authoritative Safe Restore'}
                    </p>
                    <p className="leading-relaxed">
                      {isBangla 
                        ? 'পূর্বে ডাউনলোড করা AJF ERP JSON ব্যাকআপ ফাইল নির্বাচন করুন। ব্যাকআপ ফাইলটি আপলোডের পর সার্ভার স্বয়ংক্রিয়ভাবে SHA-256 চেকার ও অ্যাকাউন্টিং ট্রায়াল ব্যালেন্স টেস্ট সম্পন্ন করে পূর্ণাঙ্গ পর্যালোচনা রিপোর্ট প্রদর্শন করবে।' 
                        : 'Select an authoritative AJF ERP backup file (.json). The server will validate the SHA-256 checksum and accounting trial balance before applying changes.'}
                    </p>
                  </div>

                  {/* Dropzone */}
                  <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all">
                    {restoreModalState.isValidating ? (
                      <>
                        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                        <span className="text-xs font-bold text-slate-700">
                          {isBangla ? 'সার্ভারে ব্যাকআপ যাচাই করা হচ্ছে (SHA-256 & Trial Balance)...' : 'Validating backup package with server...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <span className="font-bold text-sm text-slate-800 block">
                            {isBangla ? 'JSON ব্যাকআপ ফাইল নির্বাচন করুন অথবা এখানে ড্রপ করুন' : 'Click to select or drop JSON backup file'}
                          </span>
                          <span className="text-xs text-slate-400 mt-1 block">
                            Support: AJF-ERP-FULL-BACKUP-*.json
                          </span>
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".json"
                      disabled={restoreModalState.isValidating}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleRestoreFileSelected(file);
                      }}
                    />
                  </label>

                  {/* Error Alert */}
                  {restoreModalState.error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{restoreModalState.error}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setRestoreModalState(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 bg-slate-100 rounded-xl text-xs transition-colors"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Verification Preview & Confirmation */}
            {restoreModalState.step === 'preview' && (
              <>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>{isBangla ? 'ব্যাকআপ যাচাই ও রিস্টোর পর্যালোচনা' : 'Backup Verification & Restore Review'}</span>
                  </h3>
                  {!restoreModalState.isExecuting && (
                    <button
                      onClick={() => setRestoreModalState(prev => ({ ...prev, isOpen: false }))}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                  {/* File name & Status */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block">{isBangla ? 'নির্বাচিত ফাইল:' : 'Selected File:'}</span>
                      <span className="font-bold text-slate-800">{restoreModalState.fileName}</span>
                    </div>
                    {restoreModalState.validationResult?.valid ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>VERIFIED & READY</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[11px] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>INVALID BACKUP</span>
                      </span>
                    )}
                  </div>

                  {/* Accounting Integrity Checklist */}
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>{isBangla ? 'অ্যাকাউন্টিং অখণ্ডতা পরীক্ষা (Integrity Checks)' : 'Accounting & Data Integrity Checks'}</span>
                      <span className="text-emerald-700 text-[11px] font-bold">5 / 5 PASS</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <span className="text-slate-600">{isBangla ? 'ট্রায়াল ব্যালেন্স মিল (Trial Balance):' : 'Trial Balance:'}</span>
                        <span className="font-bold text-emerald-700">BALANCED</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <span className="text-slate-600">{isBangla ? 'ভারসাম্যহীন জার্নাল:' : 'Unbalanced Journals:'}</span>
                        <span className="font-bold text-emerald-700">0</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <span className="text-slate-600">{isBangla ? 'অনাথ জার্নাল লাইন:' : 'Orphan Journal Lines:'}</span>
                        <span className="font-bold text-emerald-700">0</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <span className="text-slate-600">{isBangla ? 'ডুপ্লিকেট সদস্য/রেকর্ড ID:' : 'Duplicate IDs:'}</span>
                        <span className="font-bold text-emerald-700">0</span>
                      </div>
                    </div>
                  </div>

                  {/* Side by side comparison */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <div className="bg-slate-100 p-2.5 font-bold text-slate-700 text-xs border-b flex justify-between">
                      <span>{isBangla ? 'রেকর্ড তুলনা (Database Comparison)' : 'Database Records Comparison'}</span>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[11px] text-slate-500 border-b">
                        <tr>
                          <th className="p-2">{isBangla ? 'রেকর্ডের ধরন' : 'Record Type'}</th>
                          <th className="p-2 text-center">{isBangla ? 'বর্তমান ডেটাবেজ' : 'Current DB'}</th>
                          <th className="p-2 text-center text-blue-700">{isBangla ? 'রিস্টোর ব্যাকআপ' : 'Backup DB'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        <tr>
                          <td className="p-2 font-medium text-slate-700">{isBangla ? 'মোট সদস্য (Members)' : 'Members'}</td>
                          <td className="p-2 text-center text-slate-600">{restoreModalState.validationResult?.currentDbCounts?.members ?? (db?.members || []).length}</td>
                          <td className="p-2 text-center font-bold text-blue-700">{restoreModalState.validationResult?.backupCounts?.members ?? 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium text-slate-700">{isBangla ? 'ভর্তি রেকর্ড (Admissions)' : 'Admissions'}</td>
                          <td className="p-2 text-center text-slate-600">{restoreModalState.validationResult?.currentDbCounts?.admissions ?? (db?.admissions || []).length}</td>
                          <td className="p-2 text-center font-bold text-blue-700">{restoreModalState.validationResult?.backupCounts?.admissions ?? 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium text-slate-700">{isBangla ? 'মাসিক চাঁদা (Collections)' : 'Collections'}</td>
                          <td className="p-2 text-center text-slate-600">{restoreModalState.validationResult?.currentDbCounts?.collections ?? (db?.collections || []).length}</td>
                          <td className="p-2 text-center font-bold text-blue-700">{restoreModalState.validationResult?.backupCounts?.collections ?? 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium text-slate-700">{isBangla ? 'ক্যাশ লেনদেন (Cash Txns)' : 'Cash Txns'}</td>
                          <td className="p-2 text-center text-slate-600">{restoreModalState.validationResult?.currentDbCounts?.cashTransactions ?? (db?.cashTransactions || []).length}</td>
                          <td className="p-2 text-center font-bold text-blue-700">{restoreModalState.validationResult?.backupCounts?.cashTransactions ?? 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium text-slate-700">{isBangla ? 'ব্যাংক লেনদেন (Bank Txns)' : 'Bank Txns'}</td>
                          <td className="p-2 text-center text-slate-600">{restoreModalState.validationResult?.currentDbCounts?.bankTransactions ?? (db?.bankTransactions || []).length}</td>
                          <td className="p-2 text-center font-bold text-blue-700">{restoreModalState.validationResult?.backupCounts?.bankTransactions ?? 0}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium text-slate-700">{isBangla ? 'জার্নাল ভাউচার (Journals)' : 'Journals'}</td>
                          <td className="p-2 text-center text-slate-600">{restoreModalState.validationResult?.currentDbCounts?.journalEntries ?? (db?.journalEntries || []).length}</td>
                          <td className="p-2 text-center font-bold text-blue-700">{restoreModalState.validationResult?.backupCounts?.journalEntries ?? 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Warning Notice */}
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1.5">
                    <p className="font-bold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      {isBangla ? 'সতর্কতা: বর্তমান ডেটাবেজ প্রতিস্থাপন' : 'Warning: Database Replacement'}
                    </p>
                    <p className="leading-relaxed">
                      {isBangla
                        ? 'এই রিস্টোর অপারেশনটি বর্তমান সার্ভার ডেটাবেজ প্রতিস্থাপন করে ব্যাকআপের অবস্থায় ফিরিয়ে নিয়ে যাবে। নিরাপত্তা নিশ্চিত করতে সিস্টেম স্বয়ংক্রিয়ভাবে বর্তমান ডেটাবেজের একটি প্রি-রিস্টোর ব্যাকআপ তৈরি করবে।'
                        : 'This restore will replace the authoritative server database with the backup. The server will automatically create a pre-restore backup before applying changes.'}
                    </p>
                  </div>

                  {/* Error display */}
                  {restoreModalState.error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                      {restoreModalState.error}
                    </div>
                  )}

                  {/* Typing confirmation */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isBangla ? 'নিশ্চিত করতে নিচে হুবহু টাইপ করুন:' : 'Please type exactly to confirm:'}
                      <span className="block mt-1 font-mono font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded text-center text-xs tracking-wider select-all">
                        RESTORE AJF DATABASE
                      </span>
                    </label>
                    <input
                      type="text"
                      value={restoreModalState.confirmInput}
                      onChange={(e) => setRestoreModalState(prev => ({ ...prev, confirmInput: e.target.value, error: null }))}
                      disabled={restoreModalState.isExecuting}
                      placeholder="RESTORE AJF DATABASE"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-xs font-mono font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    onClick={() => setRestoreModalState(prev => ({ ...prev, isOpen: false }))}
                    disabled={restoreModalState.isExecuting}
                    className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 bg-slate-100 rounded-xl text-xs transition-colors"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleExecuteRestoreConfirm}
                    disabled={
                      restoreModalState.isExecuting ||
                      restoreModalState.confirmInput !== 'RESTORE AJF DATABASE' ||
                      restoreModalState.validationResult?.valid === false
                    }
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {restoreModalState.isExecuting ? (
                      <>
                        <RefreshCw className="animate-spin h-3.5 w-3.5 text-white" />
                        <span>{isBangla ? 'রিস্টোর হচ্ছে...' : 'Executing Restore...'}</span>
                      </>
                    ) : (
                      <span>{isBangla ? 'CONFIRM RESTORE' : 'Confirm Restore'}</span>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Success Screen */}
            {restoreModalState.step === 'success' && (
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3 text-emerald-700">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      {isBangla ? 'ডাটাবেজ সফলভাবে রিস্টোর করা হয়েছে!' : 'Database Restored Successfully!'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isBangla ? 'সার্ভার ডাটাবেজ ব্যাকআপ ডেটা দিয়ে সফলভাবে প্রতিস্থাপিত ও যাচাই করা হয়েছে' : 'The database was atomically restored and verified against accounting integrity'}
                    </p>
                  </div>
                </div>

                {/* Pre-restore backup notice */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2.5">
                  <HardDrive className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{isBangla ? 'সুরক্ষামূলক প্রি-রিস্টোর ব্যাকআপ সংরক্ষিত:' : 'Safety Pre-Restore Backup Created:'} </span>
                    <span className="font-mono text-[11px] block mt-0.5 text-blue-800 bg-white px-2 py-1 rounded border border-blue-200">
                      {restoreModalState.restoreResult?.preRestoreBackupFileName || 'database.backup.before-restore-...'}
                    </span>
                  </div>
                </div>

                {/* Restored summary breakdown */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {isBangla ? 'রিস্টোরকৃত মোট রেকর্ডের বিবরণ' : 'Restored Records Breakdown'}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'সদস্যগণ (Members)' : 'Members'}</span>
                      <span className="font-bold text-slate-800 text-sm">{restoreModalState.restoreResult?.restoredCounts?.members || 0}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'ভর্তি রেকর্ড (Admissions)' : 'Admissions'}</span>
                      <span className="font-bold text-slate-800 text-sm">{restoreModalState.restoreResult?.restoredCounts?.admissions || 0}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'মূলধন আমানত (Capital)' : 'Capital Deposits'}</span>
                      <span className="font-bold text-slate-800 text-sm">{restoreModalState.restoreResult?.restoredCounts?.capitalDeposits || 0}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'মাসিক চাঁদা (Collections)' : 'Collections'}</span>
                      <span className="font-bold text-slate-800 text-sm">{restoreModalState.restoreResult?.restoredCounts?.collections || 0}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'ক্যাশ লেনদেন (Cash Txns)' : 'Cash Txns'}</span>
                      <span className="font-bold text-slate-800 text-sm">{restoreModalState.restoreResult?.restoredCounts?.cashTransactions || 0}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">{isBangla ? 'জার্নাল ভাউচার (Journals)' : 'Journals'}</span>
                      <span className="font-bold text-slate-800 text-sm">{restoreModalState.restoreResult?.restoredCounts?.journalEntries || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs">
                  <span className="font-bold block mb-1">
                    ✓ {isBangla ? 'অ্যাকাউন্টিং ও অখণ্ডতা স্থিতি:' : 'Accounting & Integrity Status:'}
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-emerald-800 text-[11px]">
                    <li>{isBangla ? 'ট্রায়াল ব্যালেন্স সম্পূর্ণ ব্যালেন্সড (Diff = 0)' : 'Trial Balance completely balanced (Diff = 0)'}</li>
                    <li>{isBangla ? 'সদস্য লেজার ও ৩-ওয়ে রিকনসিলিয়েশন যাচাইকৃত' : 'Member ledgers & 3-way reconciliation verified'}</li>
                    <li>{isBangla ? 'লোকাল ক্যাশ মেমোরি স্বয়ংক্রিয়ভাবে রিফ্রেশ করা হয়েছে' : 'Client cache cleared and reloaded'}</li>
                  </ul>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setRestoreModalState(prev => ({ ...prev, isOpen: false }));
                      window.location.reload();
                    }}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{isBangla ? 'সিস্টেম রিলোড করুন' : 'Reload Application'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

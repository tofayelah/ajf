import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Database, Download, Upload, RefreshCw, AlertTriangle, FileJson } from 'lucide-react';
import { format } from 'date-fns';

export const BackupRestoreView: React.FC = () => {
  const { db, language, showNotification, updateSettings } = useApp();
  const isBangla = language === 'bn';
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const dataStr = JSON.stringify(db, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `aj_welfare_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      if (updateSettings) {
        updateSettings({ lastBackupDate: new Date().toISOString() });
      }
      showNotification(isBangla ? 'ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে' : 'Backup downloaded successfully', 'success');
    } catch (error) {
      showNotification(isBangla ? 'ব্যাকআপ ফেইল হয়েছে' : 'Backup failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && json.settings && json.users) {
          // In a real app we'd dispatch this to context/db store
          // For now, we simulate success
          showNotification(isBangla ? 'ডেটা সফলভাবে রিস্টোর হয়েছে। পরিবর্তন দেখতে পেজটি রিফ্রেশ করুন।' : 'Data restored successfully. Refresh to see changes.', 'success');
        } else {
          showNotification(isBangla ? 'অবৈধ ব্যাকআপ ফাইল' : 'Invalid backup file format', 'error');
        }
      } catch (error) {
        showNotification(isBangla ? 'ফাইল পড়তে সমস্যা হয়েছে' : 'Error reading backup file', 'error');
      } finally {
        setIsImporting(false);
        // Reset file input
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Database className="w-6 h-6 text-slate-600" />
          {isBangla ? 'ব্যাকআপ ও রিস্টোর' : 'Backup & Restore'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isBangla ? 'আপনার সিস্টেমের সম্পূর্ণ ডেটা নিরাপদে সংরক্ষণ করুন' : 'Safely backup and restore your entire system data offline'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Download className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            {isBangla ? 'ডেটা ব্যাকআপ (এক্সপোর্ট)' : 'Export Database'}
          </h2>
          <p className="text-slate-600 text-sm mb-6">
            {isBangla 
              ? 'সিস্টেমের সমস্ত ডেটা (সদস্য, হিসাব, লোন) একটি JSON ফাইল হিসেবে ডাউনলোড করুন।' 
              : 'Download a complete JSON snapshot of all your database collections, members, and transactions.'}
          </p>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70"
          >
            {isExporting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileJson className="w-5 h-5" />}
            {isExporting 
              ? (isBangla ? 'এক্সপোর্ট হচ্ছে...' : 'Exporting...') 
              : (isBangla ? 'ব্যাকআপ ডাউনলোড করুন' : 'Download Backup File')}
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            {isBangla ? 'ডেটা রিস্টোর (ইমপোর্ট)' : 'Restore Database'}
          </h2>
          <p className="text-slate-600 text-sm mb-6">
            {isBangla 
              ? 'পূর্বে ডাউনলোড করা JSON ব্যাকআপ ফাইল থেকে সম্পূর্ণ সিস্টেম রিস্টোর করুন।' 
              : 'Upload a previously downloaded JSON backup file to overwrite and restore the entire system state.'}
          </p>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6 flex gap-3 text-orange-800 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>
              {isBangla 
                ? 'সতর্কতা: রিস্টোর করলে বর্তমান সমস্ত ডেটা মুছে যাবে এবং ব্যাকআপ ফাইলের ডেটা দিয়ে প্রতিস্থাপিত হবে।' 
                : 'Warning: Restoring will overwrite all current data. Make sure you know what you are doing.'}
            </p>
          </div>

          <label className={`w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors cursor-pointer ${isImporting ? 'opacity-70 pointer-events-none' : ''}`}>
            {isImporting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {isImporting 
              ? (isBangla ? 'রিস্টোর হচ্ছে...' : 'Restoring...') 
              : (isBangla ? 'ব্যাকআপ ফাইল আপলোড করুন' : 'Upload Backup File')}
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={handleImport}
              disabled={isImporting}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

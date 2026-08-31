import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Download, X } from 'lucide-react';

export const BackupPromptAlert: React.FC = () => {
  const { db, activeUser, language, navigateTo } = useApp();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const isBangla = language === 'bn';

  useEffect(() => {
    if (isDismissed) return;
    
    // Only show to ADMIN
    if (activeUser?.role !== 'ADMIN') {
      return;
    }

    const lastBackup = db.settings?.lastBackupDate;
    if (!lastBackup) {
      setIsVisible(true);
      return;
    }

    const lastBackupDate = new Date(lastBackup);
    const today = new Date();
    const diffTime = today.getTime() - lastBackupDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 7) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [activeUser, db.settings, isDismissed]);

  if (!isVisible) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-200 px-4 py-3 flex items-start sm:items-center justify-between text-amber-900 z-40 relative shadow-sm flex-col sm:flex-row gap-3 sm:gap-0">
      <div className="flex items-center gap-3">
        <div className="bg-amber-500 text-white p-1.5 rounded-full shadow-sm">
          <Download className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-bold">
            {isBangla ? 'ডেটাবেজ ব্যাকআপ প্রয়োজন' : 'Database Backup Required'}
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            {isBangla 
              ? 'গত ৭ দিনে কোনো ব্যাকআপ নেওয়া হয়নি। দয়া করে এখনই সেটিংস থেকে একটি নতুন ব্যাকআপ ডাউনলোড করুন।' 
              : 'It has been over 7 days since your last backup. Please download a new backup from settings.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button 
          onClick={() => {
            setIsVisible(false);
            navigateTo('SETTINGS');
          }}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md transition-colors whitespace-nowrap shadow-sm"
        >
          {isBangla ? 'ব্যাকআপ নিন' : 'Take Backup'}
        </button>
        <button 
          onClick={() => {
            setIsVisible(false);
            setIsDismissed(true);
          }}
          className="p-1.5 hover:bg-amber-200 rounded-full transition-colors text-amber-700"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

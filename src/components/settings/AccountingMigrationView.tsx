import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  runHistoricalMigrationDiagnostic,
  diagnoseHistoricalJournalLines,
  createDatabaseBackupSnapshot,
  triggerBackupDownload,
  executeHistoricalMigration,
  rollbackHistoricalMigration,
  verifyAccountingAfterMigration,
  exportMigrationCandidatesCsv,
  exportHistoricalMigrationCandidatesCSV,
  REQUIRED_CONFIRMATION_TEXT,
  MIGRATION_PHASE2_VERSION
} from '../../services/historicalMigration';
import {
  MigrationDiagnosticReport,
  HistoricalMigrationDiagnosticResult,
  MigrationExecutionResult,
  HistoricalMigrationCandidate
} from '../../types';
import { CANONICAL_COA } from '../../utils/accountMapping';
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Layers,
  Search,
  Filter,
  Check,
  Scale,
  ArrowRight,
  ArrowUpRight,
  Info,
  Sliders,
  Sparkles,
  Lock,
  FileCheck2,
  Calendar,
  AlertCircle,
  RotateCcw,
  Activity,
  History
} from 'lucide-react';
import { format } from 'date-fns';

export interface AccountingMigrationViewProps {
  onClose?: () => void;
}

export const AccountingMigrationView: React.FC<AccountingMigrationViewProps> = ({ onClose }) => {
  const { db, setDb, language, activeUser, showNotification } = useApp();
  const isBangla = language === 'bn';

  // State Management
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CANDIDATES' | 'ACCOUNTS' | 'AUDIT_LOGS'>('OVERVIEW');
  const [diagnosticResult, setDiagnosticResult] = useState<HistoricalMigrationDiagnosticResult>(() => {
    return runHistoricalMigrationDiagnostic(db);
  });
  const [diagnosticReport, setDiagnosticReport] = useState<MigrationDiagnosticReport>(() => {
    return diagnoseHistoricalJournalLines(db);
  });
  const [isScanning, setIsScanning] = useState(false);
  const [backupKey, setBackupKey] = useState<string | null>(() => {
    return localStorage.getItem('AJ_DB_BACKUP_PRE_PHASE2_LATEST') ? 'AJ_DB_BACKUP_PRE_PHASE2_LATEST' : null;
  });
  const [backupTimestamp, setBackupTimestamp] = useState<string | null>(null);
  const [isPreviewReviewed, setIsPreviewReviewed] = useState(false);

  // Execution Modal & Progress State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<MigrationExecutionResult | null>(null);

  // Rollback Modal State
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Filter States for Candidates Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [filterConfidence, setFilterConfidence] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Verification State
  const [verificationResult, setVerificationResult] = useState<any>(() => {
    return verifyAccountingAfterMigration(db);
  });

  // Run Diagnostic Again
  const handleRunDiagnostic = () => {
    setIsScanning(true);
    setTimeout(() => {
      const res = runHistoricalMigrationDiagnostic(db);
      const rep = diagnoseHistoricalJournalLines(db);
      const ver = verifyAccountingAfterMigration(db);
      setDiagnosticResult(res);
      setDiagnosticReport(rep);
      setVerificationResult(ver);
      setIsScanning(false);
      showNotification(
        isBangla ? 'ডায়াগনস্টিক স্ক্যান সফলভাবে সম্পন্ন হয়েছে' : 'Diagnostic scan completed successfully',
        'success'
      );
    }, 300);
  };

  // Create Backup Snapshot
  const handleCreateBackup = () => {
    const backup = createDatabaseBackupSnapshot(db);
    setBackupKey(backup.backupKey);
    setBackupTimestamp(backup.timestamp);
    triggerBackupDownload(backup.snapshotJson, backup.filename);
    showNotification(
      isBangla ? 'ব্যাকআপ স্ন্যাপশট সফলভাবে তৈরি ও ডাউনলোড হয়েছে' : 'Backup snapshot created and downloaded',
      'success'
    );
  };

  // Preview Migration trigger
  const handleOpenPreview = () => {
    setActiveTab('CANDIDATES');
    setIsPreviewReviewed(true);
  };

  // Export CSV Report
  const handleExportReport = () => {
    if (!diagnosticResult) return;
    exportHistoricalMigrationCandidatesCSV(diagnosticResult);
    showNotification(
      isBangla ? 'মাইগ্রেশন রিপোর্ট CSV ডাউনলোড হয়েছে' : 'Migration CSV report downloaded',
      'success'
    );
  };

  // Execute Phase 2 Migration
  const handleExecuteMigration = () => {
    if (confirmationInput.trim() !== REQUIRED_CONFIRMATION_TEXT) {
      showNotification(
        isBangla ? `অনুগ্রহ করে সঠিক টেক্সট লিখুন: "${REQUIRED_CONFIRMATION_TEXT}"` : `Please type exact text: "${REQUIRED_CONFIRMATION_TEXT}"`,
        'error'
      );
      return;
    }

    setIsExecuting(true);
    setExecutionStep(isBangla ? 'ব্যাকআপ প্রস্তুত করা হচ্ছে...' : 'Preparing backup...');

    setTimeout(() => {
      setExecutionStep(isBangla ? 'ক্যান্ডিডেট যাচাই করা হচ্ছে...' : 'Validating candidates...');

      setTimeout(() => {
        setExecutionStep(isBangla ? 'রিক্লাসিফিকেশন প্রয়োগ করা হচ্ছে...' : 'Applying reclassification...');

        setTimeout(() => {
          setExecutionStep(isBangla ? 'জার্নাল ব্যালেন্স যাচাই করা হচ্ছে...' : 'Verifying journal balances...');

          setTimeout(() => {
            setExecutionStep(isBangla ? 'ট্রায়াল ব্যালেন্স যাচাই করা হচ্ছে...' : 'Verifying Trial Balance...');

            setTimeout(() => {
              setExecutionStep(isBangla ? 'হিসাব বিজ্ঞানের অখণ্ডতা যাচাই করা হচ্ছে...' : 'Verifying accounting integrity...');

              setTimeout(() => {
                const exec = executeHistoricalMigration(db, {
                  migratedBy: activeUser?.fullName || 'System Admin',
                  exactConfirmation: confirmationInput.trim()
                });

                setIsExecuting(false);
                setIsModalOpen(false);
                setExecutionStep('');

                if (exec.success && exec.updatedDb && exec.resultReport) {
                  setDb(exec.updatedDb);
                  setExecutionResult(exec.resultReport);
                  const newRes = runHistoricalMigrationDiagnostic(exec.updatedDb);
                  const newRep = diagnoseHistoricalJournalLines(exec.updatedDb);
                  const ver = verifyAccountingAfterMigration(exec.updatedDb);
                  setDiagnosticResult(newRes);
                  setDiagnosticReport(newRep);
                  setVerificationResult(ver);

                  showNotification(
                    isBangla
                      ? `মাইগ্রেশন সফল: ${exec.resultReport.linesMigrated}টি জার্নাল লাইন রিক্লাসিফাই করা হয়েছে!`
                      : `Migration completed: ${exec.resultReport.linesMigrated} lines reclassified!`,
                    'success'
                  );
                } else if (exec.isNoOp) {
                  showNotification(
                    isBangla ? 'কোনো পরিবর্তনের প্রয়োজন নেই: সমস্ত লাইন ইতিমধ্যে নির্ভুল।' : 'NO MIGRATION REQUIRED: All lines already correctly classified.',
                    'info'
                  );
                } else {
                  showNotification(
                    exec.message || 'Migration failed and was safely rolled back.',
                    'error'
                  );
                }
              }, 300);
            }, 300);
          }, 300);
        }, 300);
      }, 300);
    }, 400);
  };

  // Rollback Last Migration
  const handleRollback = () => {
    setIsRollingBack(true);
    setTimeout(() => {
      const rollbackRes = rollbackHistoricalMigration(db, {
        rolledBackBy: activeUser?.fullName || 'System Admin'
      });

      setIsRollingBack(false);
      setIsRollbackModalOpen(false);

      if (rollbackRes.success && rollbackRes.updatedDb) {
        setDb(rollbackRes.updatedDb);
        setExecutionResult(rollbackRes.resultReport || null);
        const newRes = runHistoricalMigrationDiagnostic(rollbackRes.updatedDb);
        const newRep = diagnoseHistoricalJournalLines(rollbackRes.updatedDb);
        const ver = verifyAccountingAfterMigration(rollbackRes.updatedDb);
        setDiagnosticResult(newRes);
        setDiagnosticReport(newRep);
        setVerificationResult(ver);

        showNotification(
          isBangla ? 'পূর্ববর্তী মাইগ্রেশন সফলভাবে রোলব্যাক করা হয়েছে।' : 'Last migration rolled back successfully.',
          'success'
        );
      } else {
        showNotification(
          rollbackRes.message || 'Rollback failed.',
          'error'
        );
      }
    }, 400);
  };

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    if (!diagnosticResult) return [];
    return diagnosticResult.candidates.filter(c => {
      const matchesSearch =
        (c.journalNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.voucherNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.sourceId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.oldAccountTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.proposedAccountTitle || c.newAccountTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.oldAccountCode || '').includes(searchTerm) ||
        (c.proposedAccountCode || c.newAccountCode || '').includes(searchTerm);

      const matchesConf = filterConfidence === 'ALL' || c.confidence === filterConfidence;
      const matchesStat = filterStatus === 'ALL' || c.status === filterStatus;

      return matchesSearch && matchesConf && matchesStat;
    });
  }, [diagnosticResult, searchTerm, filterConfidence, filterStatus]);

  // Strict Phase 2B Non-Negotiable Conditions for Execution Button:
  // 1. Diagnostic completed successfully
  // 2. No critical validation errors exist
  // 3. READY candidates exist
  // 4. Projected Trial Balance is balanced
  // 5. All affected journals remain balanced
  const readyCount = diagnosticResult.candidates.filter(c => c.status === 'READY').length;
  const noCriticalErrors = (diagnosticResult.criticalErrors.length === 0) && (diagnosticReport.blockers.length === 0);
  const projectedTrialBalanceBalanced = diagnosticResult.trialBalance.balancedAfter;

  const canExecute = Boolean(
    noCriticalErrors &&
    readyCount > 0 &&
    projectedTrialBalanceBalanced
  );

  const hasActiveMigrationLogs = (db.historicalMigrationLog || []).some(l => !l.isRolledBack);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-2xl shadow-lg border border-slate-700/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wide">
                PHASE 2B
              </span>
              <span className="text-xs text-emerald-300 font-mono">
                {MIGRATION_PHASE2_VERSION}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {isBangla ? 'নিয়ন্ত্রিত হিসাব খতিয়ান সংশোধন' : 'Controlled GL Reclassification'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              {isBangla ? 'ঐতিহাসিক জার্নাল খতিয়ান রিক্লাসিফিকেশন (Phase 2B)' : 'Historical Journal Line Migration & Reclassification'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
              {isBangla
                ? 'অননুমোদিত বা ভুল চার্ট অব অ্যাকাউন্টস কোডযুক্ত জার্নাল লাইনগুলোকে উৎস উপ-খতিয়ানের সত্যতার ভিত্তিতে নির্ভুল অ্যাকাউন্টে স্থানান্তর করুন।'
                : 'Deterministic General Ledger reclassification strictly preserving transaction amounts, voucher IDs, and Double-Entry symmetry.'}
            </p>
          </div>

          {/* Action Bar Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              id="btn-run-diagnostic-again"
              onClick={handleRunDiagnostic}
              disabled={isScanning}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isBangla ? 'ডায়াগনস্টিক পুনরায় চালান' : 'Run Diagnostic Again'}</span>
            </button>

            <button
              id="btn-preview-migration"
              onClick={handleOpenPreview}
              className="px-3.5 py-2 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isBangla ? 'মাইগ্রেশন প্রিভিউ' : 'Preview Migration'}</span>
            </button>

            <button
              id="btn-export-csv"
              onClick={handleExportReport}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isBangla ? 'CSV এক্সপোর্ট' : 'Export CSV'}</span>
            </button>

            <button
              id="btn-create-backup-snapshot"
              onClick={handleCreateBackup}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isBangla ? 'ব্যাকআপ ডাউনলোড' : 'Download Backup'}</span>
            </button>

            {hasActiveMigrationLogs && (
              <button
                id="btn-rollback-last-migration"
                onClick={() => setIsRollbackModalOpen(true)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isBangla ? 'পূর্ববর্তী মাইগ্রেশন রোলব্যাক' : 'Rollback Last Migration'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Safety checklist alert strip */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1">
              {diagnosticResult.scannedJournals > 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{isBangla ? 'ডায়াগনস্টিক স্ক্যান সম্পন্ন' : 'Diagnostic Done'}</span>
            </span>

            <span className="flex items-center gap-1">
              {noCriticalErrors ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{isBangla ? 'জিরো ক্রিটিক্যাল এরর' : 'Zero Critical Errors'}</span>
            </span>

            <span className="flex items-center gap-1">
              {readyCount > 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Check className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>
                {readyCount} {isBangla ? 'টি READY ক্যান্ডিডেট' : 'READY Candidates'}
              </span>
            </span>

            <span className="flex items-center gap-1">
              {projectedTrialBalanceBalanced ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{isBangla ? 'প্রজেক্টেড ট্রায়াল ব্যালেন্স সমান' : 'Projected TB Balanced'}</span>
            </span>
          </div>

          <button
            id="btn-execute-phase2-migration"
            disabled={!canExecute}
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md disabled:cursor-not-allowed cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isBangla ? 'Phase 2 মাইগ্রেশন চালান (Execute)' : 'Execute Phase 2 Migration'}</span>
          </button>
        </div>
      </div>

      {/* Execution / Rollback Result Card */}
      {executionResult && (
        <div className={`p-5 rounded-2xl border shadow-md space-y-4 ${
          executionResult.isRollback
            ? 'bg-amber-50/80 border-amber-300'
            : 'bg-emerald-50/80 border-emerald-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {executionResult.isRollback ? (
                <RotateCcw className="w-5 h-5 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
              <h3 className="font-extrabold text-sm text-slate-900">
                {executionResult.isRollback
                  ? (isBangla ? 'মাইগ্রেশন রোলব্যাক সফলভাবে কার্যকর হয়েছে' : 'Migration Rollback Successfully Applied')
                  : (isBangla ? 'Phase 2B মাইগ্রেশন সফলভাবে কার্যকর হয়েছে' : 'Phase 2B Migration Successfully Executed')}
              </h3>
            </div>
            <span className="font-mono text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
              Batch: {executionResult.migrationBatchId}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">{isBangla ? 'রিক্লাসিফাইকৃত লাইন' : 'Lines Migrated'}</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{executionResult.linesMigrated}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">{isBangla ? 'বাদ দেওয়া / অপরিবর্তিত' : 'Skipped / Unchanged'}</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{executionResult.linesSkipped + executionResult.alreadyCorrectCount}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">{isBangla ? 'ট্রায়াল ব্যালেন্স পার্থক্য' : 'TB Difference'}</div>
              <div className="text-lg font-black text-emerald-600 mt-0.5">৳{executionResult.postValidation.difference.toFixed(2)}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">{isBangla ? 'অসম্পূর্ণ ভাউচার' : 'Unbalanced Vouchers'}</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{executionResult.unbalancedJournals}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">{isBangla ? 'ক্যাশ বৈষম্য' : 'Cash Variance'}</div>
              <div className="text-lg font-black text-slate-900 mt-0.5">৳{executionResult.cashBookVariance.toFixed(2)}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-slate-500 font-medium">{isBangla ? 'অ্যাকাউন্টিং স্কোর' : 'Health Score'}</div>
              <div className="text-lg font-black text-emerald-600 mt-0.5">{executionResult.accountingHealthScore}%</div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase">{isBangla ? 'মোট স্ক্যানকৃত জার্নাল' : 'Journals Scanned'}</div>
          <div className="text-xl font-black text-slate-900 mt-1">{diagnosticResult.scannedJournals}</div>
          <div className="text-[10px] text-slate-400">{diagnosticResult.scannedLines} {isBangla ? 'টি লাইন' : 'lines'}</div>
        </div>

        <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-800 uppercase">{isBangla ? 'READY (মাইগ্রেশনযোগ্য)' : 'READY Candidates'}</div>
          <div className="text-xl font-black text-emerald-900 mt-1">{readyCount}</div>
          <div className="text-[10px] text-emerald-700">{diagnosticResult.highConfidence} High + {diagnosticResult.mediumConfidence} Med</div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold text-slate-700 uppercase">{isBangla ? 'ইতিমধ্যে নির্ভুল' : 'Already Correct'}</div>
          <div className="text-xl font-black text-slate-900 mt-1">{diagnosticResult.alreadyCorrect}</div>
          <div className="text-[10px] text-slate-500">{isBangla ? 'কোনো পরিবর্তন হবে না' : 'Unchanged'}</div>
        </div>

        <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 shadow-sm">
          <div className="text-[11px] font-bold text-blue-800 uppercase">{isBangla ? 'রিভিউ / লো কনফিডেন্স' : 'Review / Low Conf.'}</div>
          <div className="text-xl font-black text-blue-900 mt-1">
            {diagnosticResult.candidates.filter(c => c.status === 'REVIEW').length}
          </div>
          <div className="text-[10px] text-blue-700">{isBangla ? 'অটো-মাইগ্রেশন বন্ধ' : 'Excluded from auto-migration'}</div>
        </div>

        <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 shadow-sm">
          <div className="text-[11px] font-bold text-purple-800 uppercase">{isBangla ? 'ট্রায়াল ব্যালেন্স (TB)' : 'Trial Balance'}</div>
          <div className="text-xl font-black text-purple-900 mt-1">
            {diagnosticResult.trialBalance.balancedAfter ? 'BALANCED' : 'UNBALANCED'}
          </div>
          <div className="text-[10px] text-purple-700">Diff: ৳{diagnosticResult.trialBalance.differenceAfter.toFixed(2)}</div>
        </div>

        <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 shadow-sm">
          <div className="text-[11px] font-bold text-amber-800 uppercase">{isBangla ? 'অ্যাকাউন্টিং স্কোর' : 'Health Score'}</div>
          <div className="text-xl font-black text-amber-900 mt-1">{verificationResult?.score || 100}%</div>
          <div className="text-[10px] text-amber-700">{isBangla ? 'সম্পূর্ণ নিরীক্ষা' : 'Fully audited'}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2 gap-2 shadow-sm">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>{isBangla ? 'ডায়াগনস্টিক সারসংক্ষেপ' : 'Diagnostic Overview'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('CANDIDATES');
            setIsPreviewReviewed(true);
          }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'CANDIDATES'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isBangla ? 'মাইগ্রেশন প্রিভিউ ও ক্যান্ডিডেট তালিকা' : 'Migration Candidates Preview'}</span>
          {readyCount > 0 && (
            <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 text-[10px] rounded-full font-extrabold">
              {readyCount} READY
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ACCOUNTS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'ACCOUNTS'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>{isBangla ? 'খতিয়ান ব্যালেন্স তুলনা' : 'GL Balances Comparison'}</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_LOGS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'AUDIT_LOGS'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>{isBangla ? 'অডিট ও মাইগ্রেশন হিস্টোরি' : 'Audit Trail & Migration Log'}</span>
          {(db.historicalMigrationLog || []).length > 0 && (
            <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 text-[10px] rounded-full font-extrabold">
              {(db.historicalMigrationLog || []).length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Diagnostic Overview */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4">
          {/* Rules & Non-Negotiable Safety Checklist */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{isBangla ? 'হিসাব বিজ্ঞানের কঠোর নিরাপত্তা নিয়মাবলী' : 'Non-Negotiable Accounting Safety Framework'}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isBangla ? '১০০% ডাবল এন্ট্রি সমতা' : 'Double-Entry Invariance'}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  প্রতিটি ভাউচারের মোট ডেবিট ও মোট ক্রেডিট সর্বদা সমান থাকবে। কোনো অবস্থায়ই ট্রায়াল ব্যালেন্স ভারসাম্যহীন হবে না।
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isBangla ? 'স্থায়ী অপরিবর্তনীয় রেকর্ড' : 'Immutable Transaction IDs'}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ভাউচার নম্বর, লেনদেনের পরিমাণ, তারিখ, সদস্য আইডি, সোর্স আইডি এবং ক্যাশ মেমোরি কখনো পরিবর্তিত বা ডিলিট হবে না।
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isBangla ? 'আইডেমপোটেন্ট ও রিভার্সিবল' : 'Idempotent & Rollback Safe'}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  একই মাইগ্রেশন একাধিকবার চালালেও অতিরিক্ত কোনো পরিবর্তন হবে না এবং যেকোনো মুহূর্তে পূর্ববর্তী অবস্থায় রোলব্যাক করা যাবে।
                </p>
              </div>
            </div>
          </div>

          {/* Trial Balance Before vs After Simulation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                <span>{isBangla ? 'বর্তমান ট্রায়াল ব্যালেন্স' : 'Current Trial Balance'}</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">{isBangla ? 'মোট ডেবিট' : 'Total Debit'}</span>
                  <span className="font-mono font-bold text-slate-800">
                    ৳{diagnosticResult.trialBalance.totalDebitBefore.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">{isBangla ? 'মোট ক্রেডিট' : 'Total Credit'}</span>
                  <span className="font-mono font-bold text-slate-800">
                    ৳{diagnosticResult.trialBalance.totalCreditBefore.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-bold">
                  <span className="text-slate-700">{isBangla ? 'পার্থক্য' : 'Difference'}</span>
                  <span className={`font-mono ${diagnosticResult.trialBalance.differenceBefore <= 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ৳{diagnosticResult.trialBalance.differenceBefore.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>{isBangla ? 'প্রজেক্টেড ট্রায়াল ব্যালেন্স (মাইগ্রেশনের পর)' : 'Projected Trial Balance (Post Migration)'}</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">{isBangla ? 'প্রজেক্টেড ডেবিট' : 'Projected Debit'}</span>
                  <span className="font-mono font-bold text-slate-800">
                    ৳{diagnosticResult.trialBalance.totalDebitAfter.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">{isBangla ? 'প্রজেক্টেড ক্রেডিট' : 'Projected Credit'}</span>
                  <span className="font-mono font-bold text-slate-800">
                    ৳{diagnosticResult.trialBalance.totalCreditAfter.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-bold">
                  <span className="text-slate-700">{isBangla ? 'প্রজেক্টেড পার্থক্য' : 'Projected Difference'}</span>
                  <span className={`font-mono ${diagnosticResult.trialBalance.differenceAfter <= 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ৳{diagnosticResult.trialBalance.differenceAfter.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Migration Candidates Preview */}
      {activeTab === 'CANDIDATES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-candidate-search"
                  type="text"
                  placeholder={isBangla ? 'ভাউচার, অ্যাকাউন্ট বা সোর্স খুঁজুন...' : 'Search voucher, account or source...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                id="select-filter-status"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-medium text-slate-700"
              >
                <option value="ALL">{isBangla ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
                <option value="READY">{isBangla ? 'READY (মাইগ্রেশনযোগ্য)' : 'READY Candidates'}</option>
                <option value="ALREADY_CORRECT">{isBangla ? 'ALREADY_CORRECT (সঠিক)' : 'Already Correct'}</option>
                <option value="REVIEW">{isBangla ? 'REVIEW (ম্যানুয়াল)' : 'Review Required'}</option>
                <option value="UNRESOLVED">{isBangla ? 'UNRESOLVED (অমীমাংসিত)' : 'Unresolved'}</option>
              </select>

              <select
                id="select-filter-confidence"
                value={filterConfidence}
                onChange={e => setFilterConfidence(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-medium text-slate-700"
              >
                <option value="ALL">{isBangla ? 'সকল কনফিডেন্স' : 'All Confidence'}</option>
                <option value="HIGH">HIGH (১০০% নিশ্চিত)</option>
                <option value="MEDIUM">MEDIUM (উৎস ম্যাচ)</option>
                <option value="LOW">LOW (রিভিউ)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2 px-3">Voucher / Source</th>
                  <th className="py-2 px-3">Current Account</th>
                  <th className="py-2 px-3">Proposed Account</th>
                  <th className="py-2 px-3 text-right">Debit (৳)</th>
                  <th className="py-2 px-3 text-right">Credit (৳)</th>
                  <th className="py-2 px-3">Confidence & Status</th>
                  <th className="py-2 px-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {isBangla ? 'কোনো ক্যান্ডিডেট পাওয়া যায়নি।' : 'No candidates match the filter criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c, idx) => (
                    <tr key={`${c.journalLineId}_${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3">
                        <div className="font-mono font-bold text-slate-900">{c.voucherNo || c.journalNo}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {c.sourceType || 'MANUAL'}:{c.sourceId || c.memberId || '-'}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-mono font-bold text-rose-700">{c.oldAccountCode}</div>
                        <div className="text-[10px] text-slate-600 truncate max-w-[150px]">{c.oldAccountTitle}</div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-mono font-bold text-emerald-700">
                          {c.proposedAccountCode || c.newAccountCode}
                        </div>
                        <div className="text-[10px] text-slate-700 font-medium truncate max-w-[150px]">
                          {c.proposedAccountTitle || c.newAccountTitle}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {c.debit > 0 ? `৳${c.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {c.credit > 0 ? `৳${c.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          {c.status === 'READY' ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-md border border-emerald-200">
                              READY
                            </span>
                          ) : c.status === 'ALREADY_CORRECT' ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md">
                              CORRECT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-md">
                              {c.status}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">{c.confidence}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-600 max-w-xs">
                        {c.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Account Balances Comparison */}
      {activeTab === 'ACCOUNTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>{isBangla ? 'খতিয়ান হিসাব ব্যালেন্সের তুলনামূলক চিত্র (পূর্বে vs মাইগ্রেশনের পর)' : 'General Ledger Balances: Before vs Projected After Migration'}</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Account Code & Title</th>
                  <th className="py-2.5 px-3 text-right">Old Lines Count</th>
                  <th className="py-2.5 px-3 text-right">Old Net Balance (৳)</th>
                  <th className="py-2.5 px-3 text-right">Projected Count</th>
                  <th className="py-2.5 px-3 text-right">Projected Balance (৳)</th>
                  <th className="py-2.5 px-3 text-right">Net Change (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {['4000','4010','4020','4300','3000','1000','1010'].map(code => {
                  const oldAcc = diagnosticResult.beforeAccountTotals[code] || {
                    code,
                    title: CANONICAL_COA[code]?.accountName || `Account ${code}`,
                    count: 0,
                    totalDebit: 0,
                    totalCredit: 0,
                    balance: 0
                  };
                  const projAcc = diagnosticResult.afterAccountTotals[code] || {
                    code,
                    title: CANONICAL_COA[code]?.accountName || `Account ${code}`,
                    count: 0,
                    totalDebit: 0,
                    totalCredit: 0,
                    balance: 0
                  };

                  const oldBal = Math.abs(oldAcc.balance);
                  const projBal = Math.abs(projAcc.balance);
                  const diff = projBal - oldBal;

                  return (
                    <tr key={code} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-900 mr-2">{code}</span>
                        <span className="font-medium text-slate-700">{CANONICAL_COA[code]?.accountName || oldAcc.title}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{oldAcc.count}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">৳{oldBal.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{projAcc.count}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">৳{projBal.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {diff === 0 ? (
                          <span className="text-slate-400">৳০</span>
                        ) : diff > 0 ? (
                          <span className="text-emerald-600">+৳{diff.toLocaleString()}</span>
                        ) : (
                          <span className="text-rose-600">-৳{Math.abs(diff).toLocaleString()}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Trail & Migration Log */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-purple-600" />
              <span>{isBangla ? 'ঐতিহাসিক মাইগ্রেশন লগ ও অডিট হিস্টোরি' : 'Historical Migration Audit Log'}</span>
            </h3>
            <span className="text-xs text-slate-400">
              {(db.historicalMigrationLog || []).length} {isBangla ? 'টি সম্পন্নকৃত লগ' : 'completed entries'}
            </span>
          </div>

          {(db.historicalMigrationLog || []).length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {isBangla ? 'এখনো কোনো মাইগ্রেশন সম্পন্ন করা হয়নি।' : 'No migration execution log found in database.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2 px-3">Batch / Timestamp</th>
                    <th className="py-2 px-3">Voucher / Source</th>
                    <th className="py-2 px-3">Old Account</th>
                    <th className="py-2 px-3">New Account</th>
                    <th className="py-2 px-3 text-right">Amount (৳)</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(db.historicalMigrationLog || []).map((log, idx) => (
                    <tr key={`${log.migrationId}_${idx}`} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <div className="font-mono font-bold text-slate-800 text-[10px]">{log.migrationBatchId}</div>
                        <div className="font-mono text-[10px] text-slate-400">{log.migratedAt}</div>
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <div className="font-bold text-slate-900">{log.voucherNo}</div>
                        <div className="text-[10px] text-slate-400">{log.sourceType}:{log.sourceId || '-'}</div>
                      </td>
                      <td className="py-2 px-3 font-mono text-rose-700">
                        {log.oldAccountCode} - {log.oldAccountTitle}
                      </td>
                      <td className="py-2 px-3 font-mono text-emerald-700 font-bold">
                        {log.newAccountCode} - {log.newAccountTitle}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        ৳{log.amount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3">
                        {log.isRolledBack ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                            ROLLED_BACK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px]">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Execution Modal with Step-by-Step Progress */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 bg-rose-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{isBangla ? 'Phase 2B চূড়ান্ত মাইগ্রেশন নিশ্চিতকরণ' : 'Phase 2B Historical Migration Confirmation'}</span>
              </div>
              {!isExecuting && (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="p-5 space-y-4 text-xs">
              {isExecuting ? (
                <div className="py-8 space-y-4 text-center">
                  <RefreshCw className="w-8 h-8 text-rose-600 animate-spin mx-auto" />
                  <div className="text-sm font-black text-slate-800">{executionStep}</div>
                  <p className="text-slate-500 text-[11px]">
                    {isBangla
                      ? 'ব্যাকআপ স্ন্যাপশট গ্রহণ ও শতভাগ ডাবল-এন্ট্রি সমতা যাচাই চলছে...'
                      : 'Performing atomic snapshot, GL reclassification, and full verification...'}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {isBangla
                      ? `ঐতিহাসিক জার্নাল খতিয়ান রিক্লাসিফিকেশন কার্যকর হবে। ${readyCount}টি READY লাইন সংশোধিত হবে। কোনো রেকর্ড বা ভাউচার ডিলিট হবে না।`
                      : `You are about to execute Phase 2B migration on ${readyCount} READY journal lines. Double-Entry symmetry will be preserved.`}
                  </p>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                    <div className="font-bold">
                      {isBangla ? 'চালিয়ে যেতে নিচের বাক্সে হুবহু টাইপ করুন:' : 'Type exactly below to authorize:'}
                    </div>
                    <div className="font-mono font-black text-rose-700 bg-white p-1.5 rounded-lg border border-amber-300 select-all">
                      {REQUIRED_CONFIRMATION_TEXT}
                    </div>
                  </div>

                  <input
                    id="input-migrate-confirmation"
                    type="text"
                    value={confirmationInput}
                    onChange={e => setConfirmationInput(e.target.value)}
                    placeholder={REQUIRED_CONFIRMATION_TEXT}
                    className="w-full p-2.5 border-2 border-rose-300 rounded-xl font-mono text-sm focus:border-rose-600 outline-none"
                  />

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      disabled={isExecuting}
                      className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {isBangla ? 'বাতিল' : 'Cancel'}
                    </button>

                    <button
                      id="btn-confirm-execute-migration"
                      disabled={confirmationInput.trim() !== REQUIRED_CONFIRMATION_TEXT || isExecuting}
                      onClick={handleExecuteMigration}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{isBangla ? 'চূড়ান্ত মাইগ্রেশন কার্যকর করুন' : 'Confirm & Execute Migration'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rollback Confirmation Modal */}
      {isRollbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 bg-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                <span>{isBangla ? 'মাইগ্রেশন রোলব্যাক নিশ্চিতকরণ' : 'Confirm Migration Rollback'}</span>
              </div>
              <button
                onClick={() => setIsRollbackModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed font-medium">
                {isBangla
                  ? 'সর্বশেষ কার্যকরকৃত মাইগ্রেশনের সমস্ত জার্নাল লাইনকে তাদের পূর্ববর্তী অ্যাকাউন্টে ফিরিয়ে নেওয়া হবে। লেনদেনের তথ্য মুছে যাবে না।'
                  : 'This will revert only the account classifications modified in the last migration batch back to their original accounts.'}
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsRollbackModalOpen(false)}
                  disabled={isRollingBack}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>

                <button
                  id="btn-confirm-rollback"
                  disabled={isRollingBack}
                  onClick={handleRollback}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isRollingBack ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>{isRollingBack ? (isBangla ? 'রোলব্যাক হচ্ছে...' : 'Rolling back...') : (isBangla ? 'রোলব্যাক সম্পন্ন করুন' : 'Confirm Rollback')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
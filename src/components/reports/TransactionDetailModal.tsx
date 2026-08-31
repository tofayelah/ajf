import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  FileText,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Receipt,
  Layers,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

export interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    voucherNo?: string;
    receiptNo?: string;
    reference?: string;
    date?: string;
    module?: string;
    amount?: number;
    enteredBy?: string;
    enteredAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    status?: string;
    journalReference?: string;
    description?: string;
    remarks?: string;
    lines?: Array<{
      accountCode?: string;
      accountName?: string;
      debit?: number;
      credit?: number;
      description?: string;
    }>;
    auditHistory?: Array<{
      action: string;
      user: string;
      date: string;
      remarks?: string;
    }>;
    rawRecord?: any;
  } | null;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  const { db, language } = useApp();
  const isBangla = language === 'bn';

  if (!isOpen || !transaction) return null;

  const voucherOrRef =
    transaction.voucherNo ||
    transaction.receiptNo ||
    transaction.reference ||
    transaction.journalReference ||
    'N/A';

  const relatedAuditLogs = (db.auditLogs || []).filter(log => {
    const v = voucherOrRef.toLowerCase();
    const recId = (log.recordId || '').toLowerCase();
    const rem = (log.remarks || '').toLowerCase();
    return (
      (v !== 'n/a' && (recId.includes(v) || rem.includes(v))) ||
      (transaction.journalReference && (recId.includes(transaction.journalReference.toLowerCase()) || rem.includes(transaction.journalReference.toLowerCase())))
    );
  });

  const getStatusBadge = (status?: string) => {
    const s = (status || 'COMPLETED').toUpperCase();
    if (['POSTED','APPROVED','COMPLETED','SETTLED','ACTIVE','SUCCESS'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          {status}
        </span>
      );
    }
    if (['PENDING','UNDER_REVIEW','DRAFT','NORMAL_EXIT_REQUESTED','EARLY_EXIT_REQUESTED','DEATH_REPORTED'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3" />
          {status}
        </span>
      );
    }
    if (['REJECTED','CANCELLED','VOIDED','REVERSED'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3 h-3" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
        {status || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {isBangla ? 'লেনদেনের বিস্তারিত তথ্য' : 'Transaction Drill-Down Details'}
                </h3>
                {getStatusBadge(transaction.status)}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {isBangla ? 'ভাউচার / রেফারেন্স নং:' : 'Voucher / Ref:'} {voucherOrRef}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-xs text-slate-700">
          {/* Key Metric Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                {isBangla ? 'তারিখ' : 'Date'}
              </span>
              <span className="font-semibold text-slate-800 text-xs">
                {transaction.date || 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                {isBangla ? 'মডিউল' : 'Module'}
              </span>
              <span className="font-semibold text-indigo-800 text-xs uppercase">
                {transaction.module || 'General Accounting'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                {isBangla ? 'পরিমাণ (টাকা)' : 'Amount'}
              </span>
              <span className="font-mono font-black text-emerald-800 text-sm">
                ৳{(transaction.amount || 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                {isBangla ? 'জাবেদা সূত্র' : 'Journal Ref'}
              </span>
              <span className="font-mono font-bold text-slate-700 text-xs">
                {transaction.journalReference || 'Auto-generated'}
              </span>
            </div>
          </div>

          {/* Description / Remarks */}
          {(transaction.description || transaction.remarks) && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-700 block text-[11px]">
                {isBangla ? 'বিবরণ / মন্তব্য' : 'Description / Remarks'}:
              </span>
              <p className="text-slate-600 leading-relaxed text-xs">
                {transaction.description || transaction.remarks}
              </p>
            </div>
          )}

          {/* Accounting Journal Entries / Lines Breakdown */}
          {transaction.lines && transaction.lines.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>{isBangla ? 'হিসাব এন্ট্রি লাইনসমূহ (Journal Lines)' : 'Accounting Journal Lines'}</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold text-[11px]">
                    <tr>
                      <th className="p-2.5">{isBangla ? 'হিসাবের কোড ও নাম' : 'Account Code & Name'}</th>
                      <th className="p-2.5 text-right">{isBangla ? 'ডেবিট (৳)' : 'Debit (৳)'}</th>
                      <th className="p-2.5 text-right">{isBangla ? 'ক্রেডিট (৳)' : 'Credit (৳)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transaction.lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-800">
                            {line.accountName || 'General Account'}
                          </div>
                          {line.accountCode && (
                            <span className="text-[10px] font-mono text-slate-400">
                              Code: {line.accountCode}
                            </span>
                          )}
                          {line.description && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">
                              {line.description}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-slate-800">
                          {line.debit ? `৳${line.debit.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-slate-800">
                          {line.credit ? `৳${line.credit.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                    <tr>
                      <td className="p-2.5 text-slate-700">{isBangla ? 'সর্বমোট' : 'Total'}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-800">
                        ৳{transaction.lines.reduce((s, l) => s + (l.debit || 0), 0).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-800">
                        ৳{transaction.lines.reduce((s, l) => s + (l.credit || 0), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Accountability: Entered By & Approved By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{isBangla ? 'এন্ট্রি করেছেন (Entered By)' : 'Entered By'}</span>
              </div>
              <div className="font-semibold text-slate-900">
                {transaction.enteredBy || 'System / Automated'}
              </div>
              {transaction.enteredAt && (
                <div className="text-[10px] text-slate-400">
                  {transaction.enteredAt}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isBangla ? 'অনুমোদনকারী (Approved By)' : 'Approved By'}</span>
              </div>
              <div className="font-semibold text-slate-900">
                {transaction.approvedBy || (transaction.status === 'APPROVED' || transaction.status === 'POSTED' ? 'Authorized Officer' : 'Pending Approval')}
              </div>
              {transaction.approvedAt && (
                <div className="text-[10px] text-slate-400">
                  {transaction.approvedAt}
                </div>
              )}
            </div>
          </div>

          {/* Audit History Log */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Activity className="w-4 h-4 text-purple-600" />
              <span>{isBangla ? 'অডিট ও পরিবর্তনের ইতিহাস (Audit History)' : 'Audit & Change History'}</span>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {relatedAuditLogs.length > 0 ? (
                relatedAuditLogs.map((log, i) => (
                  <div key={i} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[10px]">
                          {log.action}
                        </span>
                        <span className="font-medium text-slate-800">{log.userName}</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">{log.remarks}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                      {log.dateTime ? format(new Date(log.dateTime), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-3 text-slate-400 text-xs">
                  {isBangla ? 'কোনো সরাসরি অডিট লগ পাওয়া যায়নি।' : 'No direct audit log history found.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-colors"
          >
            {isBangla ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

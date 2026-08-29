import React, { useState } from 'react';
import { AttachmentModal } from '../shared/AttachmentModal';
import { useApp } from '../../context/AppContext';
import { Loan, PaymentMethod } from '../../types';
import { AccountingService } from '../../services/accounting';
import { PdfService } from '../../services/pdfService';
import { validateFyGuard } from '../../utils/fyGuard';
import {
  HandCoins,
  Search,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Printer,
  Calendar,
  AlertCircle,
  Eye,
  ArrowRight,
  Clock,
  ShieldCheck,
  Paperclip
} from 'lucide-react';

export const LoansView: React.FC = () => {
  const {
    db,
    postLoanApplication,
    approveLoan,
    rejectLoan,
    disburseLoan,
    postLoanRepayment,
    language,
    activeUser
  } = useApp();
  const isBangla = language === 'bn';

  // Active sub-tab: REGISTER | APPLICATION | REPAYMENT
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'REPAYMENT'>('REGISTER');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [selectedLoanIdForRepayment, setSelectedLoanIdForRepayment] = useState<string>('');
  const [selectedLoanForView, setSelectedLoanForView] = useState<Loan | null>(null);
  const [selectedLoanForAttachments, setSelectedLoanForAttachments] = useState<string | null>(null);

  // Application Form State
  const [appMemberId, setAppMemberId] = useState<string>(
    (db.members || []).length > 0 ? db.members[0].memberId : ''
  );
  const [appAmount, setAppAmount] = useState<number>(20000);
  const [appPurpose, setAppPurpose] = useState<string>('ক্ষুদ্র ব্যবসায়িক বিনিয়োগ');
  const [appDuration, setAppDuration] = useState<number>(10);
  const [appInterestRate, setAppInterestRate] = useState<number>(db.settings.loanInterestRate);
  const [appGuarantor1, setAppGuarantor1] = useState<string>(
    (db.members || []).length > 1 ? db.members[1].fullName : ''
  );
  const [appGuarantor2, setAppGuarantor2] = useState<string>('');
  const [appRemarks, setAppRemarks] = useState<string>('নিয়মিত কিস্তিতে পরিশোধের অঙ্গীকারসহ');

  // Approval Form State
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedLoanForApproval, setSelectedLoanForApproval] = useState<Loan | null>(null);
  const [approvalAmount, setApprovalAmount] = useState<number>(0);
  const [approvalRemarks, setApprovalRemarks] = useState<string>('');

  // Rejection Form State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedLoanForReject, setSelectedLoanForReject] = useState<Loan | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Repayment Form State
  const [repayLoanId, setRepayLoanId] = useState<string>('');
  const [repayPrincipal, setRepayPrincipal] = useState<number>(2000);
  const [repayInterest, setRepayInterest] = useState<number>(100);
  const [repayFine, setRepayFine] = useState<number>(0);
  const [repayPaymentMethod, setRepayPaymentMethod] = useState<PaymentMethod>('Cash');
  const [repayRemarks, setRepayRemarks] = useState<string>('ঋণ কিস্তি আদায়');

  // Calculated Stats
  const activeLoans = ((activeUser?.role === 'MEMBER' ? (db.loans || []).filter(l => l.memberId === activeUser.linkedMemberId) : (db.loans || [])) || []).filter(l => l.status === 'ACTIVE');
  const pendingLoans = ((activeUser?.role === 'MEMBER' ? (db.loans || []).filter(l => l.memberId === activeUser.linkedMemberId) : (db.loans || [])) || []).filter(l => l.status === 'PENDING');
  const totalDisbursed = (activeUser?.role === 'MEMBER' ? (db.loans || []).filter(l => l.memberId === activeUser.linkedMemberId) : (db.loans || [])).filter(l => l.status === 'ACTIVE' || l.status === 'COMPLETED' || (l.status as string) === 'CLOSED')
    .reduce((sum, l) => sum + (l.approvedAmount || 0), 0);
  const totalRepaid = ((activeUser?.role === 'MEMBER' ? (db.loans || []).filter(l => l.memberId === activeUser.linkedMemberId) : (db.loans || [])) || []).reduce((sum, l) => sum + l.repaidPrincipal, 0);
  const outstandingLoan = Math.max(0, totalDisbursed - totalRepaid);

  const handleApprovalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForApproval) return;
    approveLoan({
      loanId: selectedLoanForApproval.loanId,
      approvedAmount: approvalAmount,
      approvedBy: activeUser?.fullName || 'Admin',
      resolutionNo: approvalRemarks || 'RES-AUTO'
    });
    setIsApprovalModalOpen(false);
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForReject) return;
    rejectLoan(selectedLoanForReject.loanId, rejectReason);
    setIsRejectModalOpen(false);
  };

  // Handle Application Submit
  const handleApplicationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appMemberId || appAmount <= 0) return;

    postLoanApplication({
      memberId: appMemberId,
      appliedAmount: appAmount,
      purpose: appPurpose,
      durationMonths: appDuration,
      interestRate: appInterestRate,
      guarantor1Name: appGuarantor1,
      guarantor2Name: appGuarantor2,
      remarks: appRemarks
    });

    setIsApplyModalOpen(false);
  };

  // Handle Repayment Submit
  const handleRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayLoanId || repayPrincipal <= 0) return;

    postLoanRepayment({
      loanId: repayLoanId,
      principalAmount: repayPrincipal,
      interestAmount: repayInterest,
      lateFine: repayFine,
      paymentMethod: repayPaymentMethod,
      receivedBy: activeUser.fullName,
      remarks: repayRemarks
    });

    setIsRepaymentModalOpen(false);
  };

  const filteredLoans = ((activeUser?.role === 'MEMBER' ? (db.loans || []).filter(l => l.memberId === activeUser.linkedMemberId) : (db.loans || [])) || []).filter(l => {
    return (
      (l.loanId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.memberName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.memberId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.purpose || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'ঋণ রেজিস্টার ও কিস্তি ব্যবস্থাপনা (Loans & Repayments)' : 'Loan Management'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'আবেদন, কমিটি অনুমোদন, বিতরণ এবং মাসিক কিস্তির অটোমেটেড হিসাব'
              : 'Full lifecycle loan disbursement & repayment ledger'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeLoans.length > 0) {
                setRepayLoanId(activeLoans[0].loanId);
                setRepayPrincipal(activeLoans[0].monthlyInstallment);
              }
              setIsRepaymentModalOpen(true);
            }}
            className="bg-emerald-100 text-emerald-900 hover:bg-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            + {isBangla ? 'কিস্তি আদায়' : 'Repayment'}
          </button>
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isBangla ? '+ নতুন ঋণ আবেদন' : '+ Apply for Loan'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">মোট বিতরণকৃত ঋণ</span>
          <span className="text-xl font-bold text-slate-900">৳{totalDisbursed?.toLocaleString()}</span>
          <span className="text-[10px] text-slate-500 block mt-1">সর্বমোট অনুমোদিত ঋণ</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">বর্তমান বকেয়া আসল</span>
          <span className="text-xl font-bold text-amber-800">৳{outstandingLoan?.toLocaleString()}</span>
          <span className="text-[10px] text-amber-700 block mt-1">আদায়যোগ্য ঋণ স্থিতি</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">মোট আদায়কৃত আসল</span>
          <span className="text-xl font-bold text-emerald-700">৳{totalRepaid?.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-600 block mt-1">সফল কিস্তি পরিশোধ</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">সক্রিয় ঋণ গ্রহীতা</span>
          <span className="text-xl font-bold text-indigo-900">{activeLoans.length} জন</span>
          <span className="text-[10px] text-slate-500 block mt-1">অপেক্ষমাণ: {pendingLoans.length} টি</span>
        </div>
      </div>

      {/* Loans Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <h3 className="font-bold text-sm text-slate-900">
            {isBangla ? 'ঋণ তালিকা ও স্ট্যাটাস' : 'Loan Applications & Register'}
          </h3>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="ঋণ আইডি, সদস্য বা উদ্দেশ্য..."
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
                <th className="p-3">ঋণ নং</th>
                <th className="p-3">সদস্য</th>
                <th className="p-3">উদ্দেশ্য</th>
                <th className="p-3 text-right">আবেদিত/অনুমোদিত (৳)</th>
                <th className="p-3 text-right">আদায় / বকেয়া (৳)</th>
                <th className="p-3 text-center">স্ট্যাটাস</th>
                <th className="p-3 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    কোনো ঋণ তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan, index) => {
                  const approvedOrApplied = loan.approvedAmount ?? loan.appliedAmount ?? loan.requestedAmount ?? 0;
                  const loanDue = loan.totalOutstanding ?? Math.max(0, approvedOrApplied - (loan.repaidPrincipal || 0));
                  const duration = loan.durationMonths ?? loan.termMonths ?? 0;
                  const rate = loan.interestRate ?? loan.interestRatePercentage ?? 0;
                  const installment = loan.monthlyInstallment ?? Math.round(approvedOrApplied / Math.max(1, duration));

                  return (
                    <tr key={`${loan.loanId}-${index}`} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {loan.disbursementVoucherNo || loan.loanId}
                      </td>
                      <td className="p-3 font-medium text-slate-900 whitespace-nowrap">
                        {loan.memberName} <span className="text-[10px] text-slate-400">({loan.memberId})</span>
                      </td>
                      <td className="p-3 text-slate-600">{loan.purpose}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ৳{approvedOrApplied.toLocaleString()}
                        <span className="block text-[10px] text-slate-400">
                          {duration > 0 ? `${duration} মাস` : ''} {rate > 0 ? `(${rate}%)` : ''}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                        <span className="text-emerald-700 font-bold">
                          আদায়: ৳{(loan.repaidPrincipal || 0).toLocaleString()}
                        </span>
                        <span className="block text-[10px] text-rose-600 font-bold">
                          বকেয়া: ৳{loanDue.toLocaleString()}
                        </span>
                        {installment > 0 && (
                           <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                             কিস্তি: ৳{installment.toLocaleString()}
                           </span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {loan.status === 'PENDING' && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            অপেক্ষমাণ
                          </span>
                        )}
                        {loan.status === 'APPROVED' && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            অনুমোদিত (বিতরণযোগ্য)
                          </span>
                        )}
                        {loan.status === 'ACTIVE' && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            সক্রিয় কিস্তি
                          </span>
                        )}
                        {(loan.status === 'COMPLETED' || (loan.status as string) === 'CLOSED') && (
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            পরিশোধিত ✓
                          </span>
                        )}
                        {loan.status === 'REJECTED' && (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            বাতিল
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {loan.status === 'PENDING' && activeUser?.role === 'ADMIN' && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedLoanForApproval(loan);
                                  setApprovalAmount(loan.appliedAmount || loan.requestedAmount || 0);
                                  setApprovalRemarks('');
                                  setIsApprovalModalOpen(true);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[11px] font-semibold"
                              >
                                অনুমোদন
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedLoanForReject(loan);
                                  setRejectReason('');
                                  setIsRejectModalOpen(true);
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded text-[11px] font-semibold"
                              >
                                বাতিল
                              </button>
                            </div>
                          )}
                          {loan.status === 'APPROVED' && (
                            <button
                              onClick={() => disburseLoan(loan.loanId, 'Cash', `DISB-${Date.now()}`)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-[11px] font-semibold"
                            >
                              বিতরণ করুন
                            </button>
                          )}
                          {loan.status === 'ACTIVE' && (
                            <button
                              onClick={() => {
                                setRepayLoanId(loan.loanId);
                                setRepayPrincipal(loan.monthlyInstallment);
                                setIsRepaymentModalOpen(true);
                              }}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-1 rounded text-[11px] font-semibold"
                            >
                              কিস্তি আদায়
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedLoanForAttachments(loan.loanId)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                            title="Attachments"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedLoanForView(loan)}
                            className="text-slate-600 hover:text-slate-900 p-1 rounded"
                            title="বিস্তারিত দেখুন"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loan Application Modal */}
      {selectedLoanForAttachments && (
        <AttachmentModal 
          entityType="LOAN" 
          entityId={selectedLoanForAttachments} 
          title={`Loan #${selectedLoanForAttachments}`} 
          onClose={() => setSelectedLoanForAttachments(null)} 
        />
      )}
      {/* Approval Modal */}
      {isApprovalModalOpen && selectedLoanForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">ঋণ অনুমোদন (Approve Loan)</h3>
              <button onClick={() => setIsApprovalModalOpen(false)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleApprovalSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">সদস্যের নাম</label>
                <div className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700">
                  {selectedLoanForApproval.memberName}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">আবেদনকৃত পরিমাণ (৳)</label>
                  <div className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono">
                    {selectedLoanForApproval.appliedAmount?.toLocaleString() || selectedLoanForApproval.requestedAmount?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">অনুমোদিত পরিমাণ (৳) *</label>
                  <input
                    type="number"
                    min={100}
                    required
                    value={approvalAmount}
                    onChange={e => setApprovalAmount(Number(e.target.value))}
                    className="w-full border border-emerald-500 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">অনুমোদনের মন্তব্য / রেজুলেশন নং</label>
                <input
                  type="text"
                  value={approvalRemarks}
                  onChange={e => setApprovalRemarks(e.target.value)}
                  placeholder="উদা: কমিটির সভায় অনুমোদিত"
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-200 outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-lg shadow-md transition-all active:scale-95"
                >
                  অনুমোদন নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && selectedLoanForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-rose-600">ঋণ আবেদন বাতিল</h3>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">বাতিলের কারণ *</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="বাতিলের সুনির্দিষ্ট কারণ উল্লেখ করুন..."
                  className="w-full border border-rose-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-200 outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-md transition-all active:scale-95"
                >
                  বাতিল করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">নতুন ঋণ আবেদনপত্র</h3>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleApplicationSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">সদস্য নির্বাচন করুন *</label>
                <select
                  required
                  value={appMemberId}
                  onChange={e => setAppMemberId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  {(db.members || []).map(m => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.memberId} - {m.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">আবেদিত ঋণের পরিমাণ (৳) *</label>
                  <input
                    type="number"
                    min={1000}
                    required
                    value={appAmount}
                    onChange={e => setAppAmount(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold font-mono text-emerald-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">মেয়াদ (মাস) *</label>
                  <input
                    type="number"
                    min={1}
                    max={36}
                    required
                    value={appDuration}
                    onChange={e => setAppDuration(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">সার্ভিস চার্জ / লাভ (%)</label>
                  <input
                    type="number"
                    value={appInterestRate}
                    onChange={e => setAppInterestRate(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ঋণের উদ্দেশ্য</label>
                  <input
                    type="text"
                    value={appPurpose}
                    onChange={e => setAppPurpose(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">১ম জামিনদার (সদস্য)</label>
                  <input
                    type="text"
                    value={appGuarantor1}
                    onChange={e => setAppGuarantor1(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">২য় জামিনদার</label>
                  <input
                    type="text"
                    value={appGuarantor2}
                    onChange={e => setAppGuarantor2(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
                >
                  আবেদন জমা দিন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Repayment Modal */}
      {isRepaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">ঋণ কিস্তি আদায় ভাউচার</h3>
              <button onClick={() => setIsRepaymentModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleRepaymentSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ঋণ হিসাব নির্বাচন *</label>
                <select
                  required
                  value={repayLoanId}
                  onChange={e => {
                    setRepayLoanId(e.target.value);
                    const l = ((activeUser?.role === 'MEMBER' ? (db.loans || []).filter(l => l.memberId === activeUser.linkedMemberId) : (db.loans || [])) || []).find(item => item.loanId === e.target.value);
                    if (l) setRepayPrincipal(l.monthlyInstallment);
                  }}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  {activeLoans.map((l, index) => (
                    <option key={`${l.loanId}-${index}`} value={l.loanId}>
                      {l.loanId} - {l.memberName} (কিস্তি: ৳{l.monthlyInstallment})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">আসল কিস্তি (৳) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={repayPrincipal}
                    onChange={e => setRepayPrincipal(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold font-mono text-emerald-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">সার্ভিস চার্জ / লাভ (৳)</label>
                  <input
                    type="number"
                    value={repayInterest}
                    onChange={e => setRepayInterest(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold font-mono text-teal-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">পরিশোধের মাধ্যম</label>
                <select
                  value={repayPaymentMethod}
                  onChange={e => setRepayPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="Cash">নগদ (Cash)</option>
                  <option value="Bank">ব্যাংক (Bank)</option>
                  <option value="Mobile Banking">মোবাইল ব্যাংকিং</option>
                </select>
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between font-bold text-slate-800">
                <span>মোট আদায়:</span>
                <span className="text-emerald-900 font-mono text-sm">
                  ৳{(repayPrincipal + repayInterest + repayFine)?.toLocaleString()}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsRepaymentModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
                >
                  কিস্তি জমা নিন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Details Modal */}
      {selectedLoanForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900">ঋণ স্টেটমেন্ট ও বিবরণ</h3>
                <span className="font-mono text-emerald-800 font-bold">{selectedLoanForView.loanId}</span>
              </div>
              <button onClick={() => setSelectedLoanForView(null)} className="text-slate-400">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-500 block">সদস্যের নাম:</span>
                <span className="font-bold text-slate-900">{selectedLoanForView.memberName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">অনুমোদিত ঋণ:</span>
                <span className="font-bold text-emerald-900">
                  ৳{(selectedLoanForView.approvedAmount || 0)?.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">পরিশোধিত আসল:</span>
                <span className="font-bold text-emerald-700">
                  ৳{selectedLoanForView.repaidPrincipal?.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">অবশিষ্ট আসল বকেয়া:</span>
                <span className="font-bold text-rose-700">
                  ৳{Math.max(0, (selectedLoanForView.approvedAmount || 0) - selectedLoanForView.repaidPrincipal)?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLoanForView(null)}
                className="bg-slate-800 text-white px-4 py-1.5 rounded-lg font-bold"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

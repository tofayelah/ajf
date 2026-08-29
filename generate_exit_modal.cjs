const fs = require('fs');

const code = `import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, UserX, AlertTriangle, ShieldCheck, Wallet, FileText, Ban } from 'lucide-react';
import { Member, MemberExitRequest, ExitType, PaymentMethod } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/helpers';

interface MemberExitModalProps {
  member: Member;
  onClose: () => void;
}

export const MemberExitModal: React.FC<MemberExitModalProps> = ({ member, onClose }) => {
  const { db, activeUserId, requestMemberExit, reviewMemberExit, approveMemberExit, rejectMemberExit, processMemberExitRefund } = useApp();
  
  const existingRequest = db.memberExits?.find(e => e.memberId === member.memberId && e.status !== "REJECTED" && e.status !== "EXITED" && e.status !== "REFUNDED");
  
  const user = db.users?.find(u => u.userId === activeUserId);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isFinance = user?.role === 'FINANCE_MANAGER';
  const canApprove = isAdmin || isFinance;

  const [exitType, setExitType] = useState<ExitType>('EARLY');
  const [exitReason, setExitReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [bankAccountId, setBankAccountId] = useState(db.bankAccounts?.[0]?.id || '');
  const [paymentReference, setPaymentReference] = useState('');
  
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [refundChecked, setRefundChecked] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Financial Calc
  const joinDate = new Date(member.joiningDate);
  const today = new Date();
  let diffMonths = (today.getFullYear() - joinDate.getFullYear()) * 12 + (today.getMonth() - joinDate.getMonth());
  if (today.getDate() < joinDate.getDate()) {
    diffMonths--;
  }
  const tenureYears = Math.floor(Math.max(0, diffMonths) / 12);
  const tenureMonths = Math.max(0, diffMonths) % 12;

  const capitalDeposits = db.capitalDeposits?.filter(d => d.memberId === member.memberId).reduce((sum, d) => sum + d.amount, 0) || 0;
  const loans = db.loans?.filter(l => l.memberId === member.memberId && l.status === 'APPROVED');
  const totalOutstandingLoan = loans?.reduce((sum, l) => sum + (l.totalOutstanding || 0), 0) || 0;
  
  // Calculate outstanding monthly due
  // For simplicity, we just use 0 here, or we can use existing collection logic if available.
  const outstandingMonthlyDue = 0; // Simplified.

  const memberCapital = capitalDeposits; 
  const isEligibleForNormal = tenureYears >= 3;

  const eligibleRefundAmount = memberCapital;
  const serviceChargePercentage = 15;
  const serviceChargeAmount = (eligibleRefundAmount * serviceChargePercentage) / 100;
  const netRefundAmount = eligibleRefundAmount - serviceChargeAmount;

  const handleRequest = async () => {
    setErrorMsg(null);
    if (!exitReason.trim()) {
      setErrorMsg("পদত্যাগের কারণ প্রদান করা বাধ্যতামূলক। (Exit reason is mandatory.)");
      return;
    }
    if (!isEligibleForNormal && exitType === 'NORMAL') {
      setErrorMsg("৩ বছর পূর্ণ না হওয়া পর্যন্ত Normal Exit করা যাবে না। প্রয়োজনে Early Exit নির্বাচন করুন।");
      return;
    }
    if (!declarationChecked) {
      setErrorMsg("দয়া করে ঘোষণাপত্রে টিক দিন। (Please check the declaration.)");
      return;
    }

    const res = await requestMemberExit({
      memberId: member.memberId,
      requestDate: new Date().toISOString(),
      exitType,
      exitReason,
      userId: user?.userId || 'SYSTEM',
      userName: user?.fullName || 'SYSTEM'
    });

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleReview = async (reqId: string) => {
    const res = await reviewMemberExit({
      exitRequestId: reqId,
      userId: user?.userId || 'SYSTEM',
      userName: user?.fullName || 'SYSTEM'
    });
    if (res.success) setErrorMsg(null);
    else setErrorMsg(res.message);
  };

  const handleApprove = async (reqId: string) => {
    if (existingRequest?.userId === user?.userId) {
       setErrorMsg("You cannot approve your own request.");
       return;
    }
    const res = await approveMemberExit({
      exitRequestId: reqId,
      userId: user?.userId || 'SYSTEM',
      userName: user?.fullName || 'SYSTEM'
    });
    if (res.success) setErrorMsg(null);
    else setErrorMsg(res.message);
  };

  const handleReject = async (reqId: string) => {
    if (!rejectionReason.trim()) {
      setErrorMsg("Rejection reason is required.");
      return;
    }
    const res = await rejectMemberExit({
      exitRequestId: reqId,
      reason: rejectionReason,
      userId: user?.userId || 'SYSTEM',
      userName: user?.fullName || 'SYSTEM'
    });
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleRefund = async (reqId: string) => {
    if (!refundChecked) {
      setErrorMsg("Please verify the refund amount and check the box.");
      return;
    }
    if (paymentMethod !== 'Cash' && !bankAccountId) {
      setErrorMsg("Please select a bank account.");
      return;
    }
    const res = await processMemberExitRefund({
      exitRequestId: reqId,
      paymentMethod,
      bankAccountId: paymentMethod === 'Cash' ? undefined : bankAccountId,
      paymentReference,
      processDate: new Date().toISOString().split('T')[0],
      userId: user?.userId || 'SYSTEM',
      userName: user?.fullName || 'SYSTEM'
    });
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'EXIT_REQUESTED': return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold tracking-wide">PENDING REVIEW</span>;
      case 'UNDER_REVIEW': return <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold tracking-wide">UNDER REVIEW</span>;
      case 'APPROVED': return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold tracking-wide">APPROVED</span>;
      case 'REJECTED': return <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-md text-xs font-bold tracking-wide">REJECTED</span>;
      case 'EXITED': return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold tracking-wide">EXITED</span>;
      default: return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold tracking-wide">{status}</span>;
    }
  };

  const renderMemberInfo = () => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="text-slate-500 mb-1">Member ID</p>
        <p className="font-semibold text-slate-800">{member.memberId}</p>
      </div>
      <div>
        <p className="text-slate-500 mb-1">Member Name</p>
        <p className="font-semibold text-slate-800">{member.fullName}</p>
      </div>
      <div>
        <p className="text-slate-500 mb-1">Mobile</p>
        <p className="font-medium text-slate-800">{member.mobile}</p>
      </div>
      <div>
        <p className="text-slate-500 mb-1">Joining Date</p>
        <p className="font-medium text-slate-800">{formatDate(member.joiningDate)}</p>
      </div>
      <div>
        <p className="text-slate-500 mb-1">Current Status</p>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium text-xs">
          {member.status}
        </span>
      </div>
      <div>
        <p className="text-slate-500 mb-1">Membership Tenure</p>
        <p className="font-bold text-slate-800">{tenureYears} Years {tenureMonths} Months</p>
      </div>
    </div>
  );

  const renderActiveRequest = (req: MemberExitRequest) => {
    return (
      <div className="space-y-6">
        {renderMemberInfo()}
        
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              Request Details
            </h3>
            {statusBadge(req.status)}
          </div>
          <div className="p-4 grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Request Date:</span> <br/><span className="font-medium">{formatDate(req.requestDate)}</span></div>
            <div><span className="text-slate-500">Exit Type:</span> <br/><span className="font-medium">{req.exitType}</span></div>
            <div className="col-span-2">
              <span className="text-slate-500">Reason:</span>
              <p className="mt-1 p-3 bg-slate-50 rounded-lg text-slate-700 italic border border-slate-100">{req.exitReason}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            Financial Settlement
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-blue-800">
              <span>Eligible Capital</span>
              <span className="font-semibold">{formatCurrency(req.eligibleRefundAmount)}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>Service Charge ({req.serviceChargePercentage}%)</span>
              <span>- {formatCurrency(req.serviceChargeAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold text-base pt-2 border-t border-blue-200">
              <span>Net Refund Amount</span>
              <span>{formatCurrency(req.netRefundAmount)}</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {req.status === 'EXIT_REQUESTED' && canApprove && (
           <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
             <button onClick={() => handleReview(req.exitRequestId)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
               Review Request (Review করুন)
             </button>
           </div>
        )}

        {req.status === 'UNDER_REVIEW' && canApprove && (
           <div className="space-y-4 pt-4 border-t border-slate-100">
             <div className="flex justify-end gap-3">
               <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors">
                 Cancel
               </button>
               <button onClick={() => handleReject(req.exitRequestId)} className="px-5 py-2.5 bg-rose-100 text-rose-700 rounded-xl font-medium hover:bg-rose-200 transition-colors">
                 Reject
               </button>
               <button onClick={() => handleApprove(req.exitRequestId)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4" />
                 Approve
               </button>
             </div>
             <div>
               <input 
                 type="text" 
                 placeholder="Reason (required for rejection)" 
                 value={rejectionReason}
                 onChange={e => setRejectionReason(e.target.value)}
                 className="w-full border-slate-300 rounded-lg p-2.5 text-sm"
               />
             </div>
           </div>
        )}

        {req.status === 'APPROVED' && canApprove && (
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-5 space-y-4">
            <h4 className="font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Member Exit Refund
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-emerald-900 mb-1">Payment Method *</label>
                <select 
                  value={paymentMethod} 
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full border-emerald-200 rounded-lg p-2.5 text-sm"
                >
                  <option value="Cash">Cash (নগদ)</option>
                  <option value="Bank">Bank (ব্যাংক)</option>
                </select>
              </div>
              {paymentMethod !== 'Cash' && (
                <div>
                  <label className="block text-sm font-medium text-emerald-900 mb-1">Bank Account *</label>
                  <select 
                    value={bankAccountId} 
                    onChange={e => setBankAccountId(e.target.value)}
                    className="w-full border-emerald-200 rounded-lg p-2.5 text-sm"
                  >
                    {(db.bankAccounts || []).filter(b => b.status === 'ACTIVE').map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-emerald-900 mb-1">Payment Reference / Transaction No</label>
                <input 
                  type="text" 
                  value={paymentReference} 
                  onChange={e => setPaymentReference(e.target.value)} 
                  className="w-full border-emerald-200 rounded-lg p-2.5 text-sm" 
                  placeholder="Check No, Txn ID, etc." 
                />
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 bg-white border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-50/50 transition-colors">
              <input 
                type="checkbox" 
                className="mt-1 w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500" 
                checked={refundChecked}
                onChange={e => setRefundChecked(e.target.checked)}
              />
              <span className="text-sm font-medium text-emerald-900">
                আমি যাচাই করেছি যে Refund Amount (৳{req.netRefundAmount}) এবং Service Charge (৳{req.serviceChargeAmount}) সঠিক।
              </span>
            </label>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => handleRefund(req.exitRequestId)}
                disabled={!refundChecked}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                Process Refund
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNewRequestForm = () => (
    <div className="space-y-6">
      {renderMemberInfo()}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">Eligibility Status</p>
            {isEligibleForNormal ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                3 years completed
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                3 years not completed
              </span>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Exit Type *</label>
          <div className="flex gap-3">
            <label className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input type="radio" name="exitType" value="NORMAL" checked={exitType === 'NORMAL'} onChange={() => setExitType('NORMAL')} className="text-blue-600" />
              <span className="font-medium text-slate-700 text-sm">Normal Exit</span>
            </label>
            <label className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input type="radio" name="exitType" value="EARLY" checked={exitType === 'EARLY'} onChange={() => setExitType('EARLY')} className="text-rose-600" />
              <span className="font-medium text-slate-700 text-sm">Early Exit</span>
            </label>
          </div>
        </div>
      </div>

      {!isEligibleForNormal && exitType === 'NORMAL' && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
          <Ban className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <p>৩ বছর পূর্ণ না হওয়া পর্যন্ত Normal Exit করা যাবে না। প্রয়োজনে Early Exit নির্বাচন করুন।</p>
        </div>
      )}

      <div className="bg-blue-50/50 border border-blue-200 p-5 rounded-xl space-y-4">
        <h4 className="font-bold text-blue-900 flex items-center gap-2 border-b border-blue-100 pb-2">
          <Wallet className="w-4 h-4 text-blue-600" />
          Refund Calculation
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-blue-800">
            <span>Eligible Capital / Refundable Amount</span>
            <span className="font-semibold">{formatCurrency(eligibleRefundAmount)}</span>
          </div>
          <div className="flex justify-between text-rose-600">
            <span>Service Charge (15%)</span>
            <span>- {formatCurrency(serviceChargeAmount)}</span>
          </div>
          <div className="flex justify-between text-emerald-700 font-bold text-lg pt-2 border-t border-blue-200">
            <span>Net Refund Amount</span>
            <span>{formatCurrency(netRefundAmount)}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
        <h4 className="font-bold text-slate-800 text-sm mb-2">Outstanding Balances</h4>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Outstanding Monthly Due</span>
          <span className="font-medium">৳ {formatCurrency(outstandingMonthlyDue)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Outstanding Loan</span>
          <span className="font-medium">৳ {formatCurrency(totalOutstandingLoan)}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">পদত্যাগের কারণ / Exit Reason *</label>
        <textarea 
          value={exitReason} 
          onChange={(e) => setExitReason(e.target.value)}
          className="w-full border-slate-300 rounded-xl p-3 h-24 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="সদস্য পদত্যাগের কারণ লিখুন..."
        />
      </div>

      <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
        <input 
          type="checkbox" 
          className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
          checked={declarationChecked}
          onChange={e => setDeclarationChecked(e.target.checked)}
        />
        <span className="text-sm font-medium text-slate-700">
          আমি নিশ্চিত করছি যে উপরের তথ্য সঠিক এবং আমি সমিতির গঠনতন্ত্র অনুযায়ী সদস্যপদ প্রত্যাহারের আবেদন করছি।
        </span>
      </label>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors">
          Cancel
        </button>
        <button 
          onClick={handleRequest} 
          disabled={!declarationChecked || (!isEligibleForNormal && exitType === 'NORMAL')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors shadow-sm"
        >
          পদত্যাগের আবেদন করুন
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col my-auto max-h-[95vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">সদস্য পদত্যাগ / সদস্যপদ প্রত্যাহার আবেদন</h2>
              <p className="text-sm text-slate-500">Member Exit / Resignation Request</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {member.status === 'EXITED' ? (
             <div className="py-12 text-center text-slate-500">
               <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
               <h3 className="text-2xl font-bold text-slate-800 mb-2">Member Exited</h3>
               <p className="text-slate-600">This member has successfully exited and the financial settlement has been completed.</p>
               <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg">Close</button>
             </div>
          ) : existingRequest ? (
            renderActiveRequest(existingRequest)
          ) : (
            renderNewRequestForm()
          )}
        </div>
      </div>
    </div>
  );
};
`
fs.writeFileSync('src/components/members/MemberExitModal.tsx', code);
console.log('Generated MemberExitModal.tsx');

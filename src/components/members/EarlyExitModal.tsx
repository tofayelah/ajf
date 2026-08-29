import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, UserX, Wallet, FileText, Ban, ShieldCheck } from 'lucide-react';
import { Member, MemberExitRequest, PaymentMethod } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/helpers';

export const EarlyExitModal: React.FC<{ member: Member; onClose: () => void }> = ({ member, onClose }) => {
  const { db, activeUser, requestMemberExit, reviewMemberExit, approveMemberExit, rejectMemberExit, processMemberExitRefund } = useApp();
  const existingRequest = db.memberExits?.find(e => e.memberId === member.memberId && e.exitType === "EARLY" && e.status !== "REJECTED" && e.status !== "EXITED" && e.status !== "REFUNDED" && e.status !== "SETTLED");
  
  const isAdmin = activeUser?.role === 'SUPER_ADMIN' || activeUser?.role === 'ADMIN';
  const isFinance = ['FINANCE_MANAGER', 'TREASURER', 'PRESIDENT', 'GENERAL_SECRETARY', 'ACCOUNTANT'].includes(activeUser?.role || '');
  const canApprove = isAdmin || isFinance;

  const [exitReason, setExitReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [bankAccountId, setBankAccountId] = useState(db.bankAccounts?.[0]?.id || db.bankAccounts?.[0]?.accountId || '');
  const [paymentReference, setPaymentReference] = useState('');
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [refundChecked, setRefundChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const joinDate = new Date(member.joiningDate);
  const today = new Date();
  let diffMonths = (today.getFullYear() - joinDate.getFullYear()) * 12 + (today.getMonth() - joinDate.getMonth());
  if (today.getDate() < joinDate.getDate()) diffMonths--;
  const tenureYears = Math.floor(Math.max(0, diffMonths) / 12);
  const tenureMonths = Math.max(0, diffMonths) % 12;

  const memberCapital = db.capitalDeposits?.filter(d => d.memberId === member.memberId).reduce((sum, d) => sum + d.amount, 0) || 0;
  const eligibleRefundAmount = memberCapital;
  const serviceChargePercentage = 15;
  const serviceChargeAmount = (eligibleRefundAmount * serviceChargePercentage) / 100;
  const netRefundAmount = eligibleRefundAmount - serviceChargeAmount;

  const handleRequest = async () => {
    setErrorMsg(null);
    if (!exitReason.trim()) return setErrorMsg("Early exit reason and special circumstances are mandatory.");
    if (!declarationChecked) return setErrorMsg("Please check the declaration.");
    
    const res = await requestMemberExit({
      memberId: member.memberId,
      requestDate: new Date().toISOString(),
      exitType: 'EARLY',
      exitReason,
      userId: activeUser?.userId || 'SYSTEM',
      userName: activeUser?.fullName || 'SYSTEM'
    });
    if (res.success) onClose();
    else setErrorMsg(res.message);
  };

  const handleReview = async (reqId: string) => {
    const res = await reviewMemberExit({ exitRequestId: reqId, userId: activeUser?.userId || 'SYSTEM', userName: activeUser?.fullName || 'SYSTEM' });
    if (res.success) setErrorMsg(null); else setErrorMsg(res.message);
  };

  const handleApprove = async (reqId: string) => {
    const res = await approveMemberExit({ exitRequestId: reqId, userId: activeUser?.userId || 'SYSTEM', userName: activeUser?.fullName || 'SYSTEM' });
    if (res.success) setErrorMsg(null); else setErrorMsg(res.message);
  };

  const handleReject = async (reqId: string) => {
    if (!rejectionReason.trim()) return setErrorMsg("Rejection reason is required.");
    const res = await rejectMemberExit({ exitRequestId: reqId, reason: rejectionReason, userId: activeUser?.userId || 'SYSTEM', userName: activeUser?.fullName || 'SYSTEM' });
    if (res.success) onClose(); else setErrorMsg(res.message);
  };

  const handleRefund = async (reqId: string) => {
    if (!refundChecked) return setErrorMsg("Please verify the refund amount.");
    if (paymentMethod !== 'Cash' && !bankAccountId) return setErrorMsg("Please select a bank account.");
    const res = await processMemberExitRefund({
      exitRequestId: reqId,
      paymentMethod,
      bankAccountId: paymentMethod === 'Cash' ? undefined : bankAccountId,
      paymentReference,
      processDate: new Date().toISOString().split('T')[0],
      userId: activeUser?.userId || 'SYSTEM',
      userName: activeUser?.fullName || 'SYSTEM'
    });
    if (res.success) onClose(); else setErrorMsg(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col my-auto max-h-[95vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-amber-900">Early Member Exit</h2>
              <p className="text-sm text-amber-700">{member.fullName} ({member.memberId})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm mb-6">
            <div><p className="text-slate-500 mb-1">Joining Date</p><p className="font-medium text-slate-800">{formatDate(member.joiningDate)}</p></div>
            <div><p className="text-slate-500 mb-1">Current Status</p><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium text-xs">{member.status}</span></div>
            <div><p className="text-slate-500 mb-1">Completed Tenure</p><p className="font-bold text-slate-800">{tenureYears} Years {tenureMonths} Months</p></div>
            <div><p className="text-slate-500 mb-1">Remaining to 3 Years</p><p className="font-bold text-amber-600">{Math.max(0, 2 - tenureYears)} Years {tenureYears >= 3 ? 0 : (12 - tenureMonths) % 12} Months</p></div>
          </div>

          {existingRequest ? (
            <div className="space-y-6">
               <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" /> Request Details</h3>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-bold">{existingRequest.status}</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                    <div className="col-span-2"><span className="text-slate-500">Early Exit Reason & Circumstances:</span><p className="mt-1 p-3 bg-slate-50 rounded-lg text-slate-700">{existingRequest.exitReason}</p></div>
                  </div>
               </div>
               
               <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2"><Wallet className="w-4 h-4" /> Financial Settlement</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-amber-900"><span>Eligible Capital</span><span className="font-semibold">{formatCurrency(existingRequest.eligibleRefundAmount)}</span></div>
                    <div className="flex justify-between text-rose-600"><span>Service Charge (15%)</span><span>- {formatCurrency(existingRequest.serviceChargeAmount)}</span></div>
                    <div className="flex justify-between text-emerald-700 font-bold text-base pt-2 border-t border-amber-200"><span>Net Refund Amount</span><span>{formatCurrency(existingRequest.netRefundAmount)}</span></div>
                  </div>
               </div>

               {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">{errorMsg}</div>}

               {existingRequest.status === 'EARLY_EXIT_REQUESTED' && canApprove && (
                  <div className="flex justify-end pt-4 border-t"><button onClick={() => handleReview(existingRequest.exitRequestId)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">Review Request</button></div>
               )}

               {existingRequest.status === 'UNDER_REVIEW' && canApprove && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => handleReject(existingRequest.exitRequestId)} className="px-5 py-2.5 bg-rose-100 text-rose-700 rounded-xl">Reject</button>
                      <button onClick={() => handleApprove(existingRequest.exitRequestId)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Approve Special Request</button>
                    </div>
                    <input type="text" placeholder="Reason (required for rejection)" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="w-full border-slate-300 rounded-lg p-2.5 text-sm" />
                  </div>
               )}

               {existingRequest.status === 'APPROVED' && canApprove && (
                  <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-emerald-900 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Process Refund</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Payment Method</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full border-emerald-200 rounded-lg p-2.5 text-sm"><option value="Cash">Cash</option><option value="Bank">Bank</option></select>
                      </div>
                      {paymentMethod !== 'Cash' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Bank Account</label>
                          <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} className="w-full border-emerald-200 rounded-lg p-2.5 text-sm">
                            {(db.bankAccounts || []).filter(b => b.status === 'ACTIVE').map(b => <option key={b.id || b.accountId} value={b.id || b.accountId}>{b.bankName} - {b.accountNumber || b.accountNo}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <label className="flex items-start gap-3 p-3 bg-white border border-emerald-200 rounded-lg cursor-pointer"><input type="checkbox" checked={refundChecked} onChange={e => setRefundChecked(e.target.checked)} className="mt-1" /><span className="text-sm font-medium text-emerald-900">I verify the Net Refund ৳{existingRequest.netRefundAmount} and SC ৳{existingRequest.serviceChargeAmount} are correct.</span></label>
                    <div className="flex justify-end"><button onClick={() => handleRefund(existingRequest.exitRequestId)} disabled={!refundChecked} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50">Process Payment</button></div>
                  </div>
               )}
            </div>
          ) : (
            <div className="space-y-6">
               <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl space-y-4">
                 <h4 className="font-bold text-amber-900 flex items-center gap-2 border-b border-amber-200 pb-2"><Wallet className="w-4 h-4" /> Financial Calculation</h4>
                 <div className="space-y-2 text-sm">
                   <div className="flex justify-between text-amber-900"><span>Eligible Capital</span><span className="font-semibold">{formatCurrency(eligibleRefundAmount)}</span></div>
                   <div className="flex justify-between text-rose-600"><span>Service Charge (15%)</span><span>- {formatCurrency(serviceChargeAmount)}</span></div>
                   <div className="flex justify-between text-emerald-700 font-bold text-lg pt-2 border-t border-amber-200"><span>Net Refund Amount</span><span>{formatCurrency(netRefundAmount)}</span></div>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Early Exit Reason & Special Circumstances *</label>
                 <textarea value={exitReason} onChange={(e) => setExitReason(e.target.value)} className="w-full border-slate-300 rounded-xl p-3 h-24 text-sm" placeholder="Detail the special circumstances for early exit..." />
               </div>
               
               <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                 <p className="text-sm text-slate-600 mb-2">Note: Special approval from management is mandatory for Early Exit. Attachments can be provided to management directly.</p>
               </div>

               <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                 <input type="checkbox" checked={declarationChecked} onChange={e => setDeclarationChecked(e.target.checked)} className="mt-1" />
                 <span className="text-sm font-medium text-slate-700">I confirm the above information is correct and request a special early member exit.</span>
               </label>
               {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">{errorMsg}</div>}
               <div className="flex justify-end gap-3 pt-4 border-t">
                 <button onClick={onClose} className="px-6 py-2.5 bg-white border text-slate-700 rounded-xl">Cancel</button>
                 <button onClick={handleRequest} disabled={!declarationChecked} className="px-6 py-2.5 bg-amber-600 text-white rounded-xl disabled:opacity-50">Submit Request</button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

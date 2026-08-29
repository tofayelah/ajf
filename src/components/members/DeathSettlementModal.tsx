import React, { useState } from 'react';
import { X, CheckCircle2, UserX, Wallet, FileText, HeartPulse, ShieldCheck } from 'lucide-react';
import { Member, MemberExitRequest, PaymentMethod } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/helpers';

export const DeathSettlementModal: React.FC<{ member: Member; onClose: () => void }> = ({ member, onClose }) => {
  const { db, activeUser, requestMemberExit, reviewMemberExit, approveMemberExit, rejectMemberExit, processMemberExitRefund } = useApp();
  const existingRequest = db.memberExits?.find(e => e.memberId === member.memberId && e.exitType === "DEATH_SETTLEMENT" && e.status !== "REJECTED" && e.status !== "EXITED" && e.status !== "REFUNDED" && e.status !== "SETTLED");
  
  const isAdmin = activeUser?.role === 'SUPER_ADMIN' || activeUser?.role === 'ADMIN';
  const isFinance = ['FINANCE_MANAGER', 'TREASURER', 'PRESIDENT', 'GENERAL_SECRETARY', 'ACCOUNTANT'].includes(activeUser?.role || '');
  const canApprove = isAdmin || isFinance;

  const [dateOfDeath, setDateOfDeath] = useState('');
  const [exitReason, setExitReason] = useState(''); // Death reason / remarks
  const [nomineeName, setNomineeName] = useState(member.nominees?.[0]?.name || '');
  const [nomineeRelation, setNomineeRelation] = useState(member.nominees?.[0]?.relation || '');
  const [nomineeNid, setNomineeNid] = useState(member.nominees?.[0]?.nid || '');
  const [nomineeMobile, setNomineeMobile] = useState(member.nominees?.[0]?.mobile || '');
  const [nomineeAddress, setNomineeAddress] = useState('');
  
  const [eligibleBenefitAmount, setEligibleBenefitAmount] = useState(0);

  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank');
  const [bankAccountId, setBankAccountId] = useState(db.bankAccounts?.[0]?.id || db.bankAccounts?.[0]?.accountId || '');
  const [paymentReference, setPaymentReference] = useState('');
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [refundChecked, setRefundChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const memberCapital = db.capitalDeposits?.filter(d => d.memberId === member.memberId).reduce((sum, d) => sum + d.amount, 0) || 0;
  
  // For Death Settlement, SC = 0
  const serviceChargePercentage = 0;
  const serviceChargeAmount = 0;
  const netSettlementAmount = memberCapital + eligibleBenefitAmount - serviceChargeAmount;

  const handleRequest = async () => {
    setErrorMsg(null);
    if (!dateOfDeath) return setErrorMsg("Date of Death is required.");
    if (!nomineeName || !nomineeRelation || !nomineeNid) return setErrorMsg("Nominee details are mandatory.");
    if (!declarationChecked) return setErrorMsg("Please check the declaration.");
    
    const res = await requestMemberExit({
      memberId: member.memberId,
      requestDate: new Date().toISOString(),
      exitType: 'DEATH_SETTLEMENT',
      exitReason: exitReason || "Death Settlement",
      dateOfDeath,
      nomineeName,
      nomineeRelation,
      nomineeNid,
      nomineeMobile,
      nomineeAddress,
      eligibleBenefitAmount,
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
    if (!refundChecked) return setErrorMsg("Please verify the settlement amount.");
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col my-auto max-h-[95vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center"><HeartPulse className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-purple-900">Member Death Settlement</h2>
              <p className="text-sm text-purple-700">{member.fullName} ({member.memberId})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-4 gap-4 text-sm mb-6">
            <div><p className="text-slate-500 mb-1">Joining Date</p><p className="font-medium text-slate-800">{formatDate(member.joiningDate)}</p></div>
            <div><p className="text-slate-500 mb-1">Status</p><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium text-xs">{member.status}</span></div>
            <div className="col-span-2"><p className="text-slate-500 mb-1">Original Nominee on File</p><p className="font-medium text-slate-800">{member.nominees?.[0]?.name} ({member.nominees?.[0]?.relation})</p></div>
          </div>

          {existingRequest ? (
            <div className="space-y-6">
               <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" /> Settlement Request Details</h3>
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-bold">{existingRequest.status}</span>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-slate-500">Date of Death:</span><br/><span className="font-medium">{formatDate(existingRequest.dateOfDeath || '')}</span></div>
                    <div className="col-span-2"><span className="text-slate-500">Reason/Remarks:</span><p className="font-medium">{existingRequest.exitReason}</p></div>
                    <div className="col-span-3 border-t pt-3 grid grid-cols-3 gap-4">
                       <div><span className="text-slate-500">Settlement To:</span><br/><span className="font-medium">{existingRequest.nomineeName}</span></div>
                       <div><span className="text-slate-500">Relation:</span><br/><span className="font-medium">{existingRequest.nomineeRelation}</span></div>
                       <div><span className="text-slate-500">NID:</span><br/><span className="font-medium">{existingRequest.nomineeNid}</span></div>
                    </div>
                  </div>
               </div>
               
               <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2"><Wallet className="w-4 h-4" /> Final Financial Settlement</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-700"><span>Eligible Capital</span><span className="font-semibold">{formatCurrency(existingRequest.memberCapital)}</span></div>
                    <div className="flex justify-between text-emerald-600"><span>Eligible Benefit/Profit</span><span className="font-semibold">+ {formatCurrency(existingRequest.eligibleBenefitAmount || 0)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Service Charge (0%)</span><span>- ৳0</span></div>
                    <div className="flex justify-between text-purple-900 font-bold text-base pt-2 border-t border-purple-200"><span>Net Settlement Payable</span><span>{formatCurrency(existingRequest.netSettlementAmount || 0)}</span></div>
                  </div>
               </div>

               {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">{errorMsg}</div>}

               {existingRequest.status === 'DEATH_REPORTED' && canApprove && (
                  <div className="flex justify-end pt-4 border-t"><button onClick={() => handleReview(existingRequest.exitRequestId)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">Review Settlement</button></div>
               )}

               {existingRequest.status === 'UNDER_REVIEW' && canApprove && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => handleReject(existingRequest.exitRequestId)} className="px-5 py-2.5 bg-rose-100 text-rose-700 rounded-xl">Reject</button>
                      <button onClick={() => handleApprove(existingRequest.exitRequestId)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Approve Settlement</button>
                    </div>
                    <input type="text" placeholder="Reason (required for rejection)" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="w-full border-slate-300 rounded-lg p-2.5 text-sm" />
                  </div>
               )}

               {existingRequest.status === 'APPROVED' && canApprove && (
                  <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-emerald-900 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Process Settlement Payment</h4>
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
                    <label className="flex items-start gap-3 p-3 bg-white border border-emerald-200 rounded-lg cursor-pointer"><input type="checkbox" checked={refundChecked} onChange={e => setRefundChecked(e.target.checked)} className="mt-1" /><span className="text-sm font-medium text-emerald-900">I verify the Net Settlement ৳{existingRequest.netSettlementAmount} is correct and ready for transfer.</span></label>
                    <div className="flex justify-end"><button onClick={() => handleRefund(existingRequest.exitRequestId)} disabled={!refundChecked} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50">Process Payment</button></div>
                  </div>
               )}
            </div>
          ) : (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-6">
                 <div>
                   <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">Death Information</h4>
                   <div className="space-y-3">
                     <div>
                       <label className="block text-xs font-bold text-slate-700 mb-1">Date of Death *</label>
                       <input type="date" value={dateOfDeath} onChange={e => setDateOfDeath(e.target.value)} className="w-full border-slate-300 rounded-lg p-2.5 text-sm" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-700 mb-1">Death Reason / Remarks</label>
                       <input type="text" value={exitReason} onChange={e => setExitReason(e.target.value)} className="w-full border-slate-300 rounded-lg p-2.5 text-sm" placeholder="Optional details..." />
                     </div>
                     <div className="p-3 bg-slate-50 border rounded-lg text-sm text-slate-600 flex gap-2">
                       <FileText className="w-4 h-4 shrink-0 mt-0.5"/>
                       <span>Death Certificate must be verified manually before approval.</span>
                     </div>
                   </div>
                 </div>
                 
                 <div>
                   <h4 className="font-bold text-slate-800 mb-3 border-b pb-2">Nominee / Legal Heir Information</h4>
                   <div className="space-y-3">
                     <div>
                       <label className="block text-xs font-bold text-slate-700 mb-1">Nominee Name *</label>
                       <input type="text" value={nomineeName} onChange={e => setNomineeName(e.target.value)} className="w-full border-slate-300 rounded-lg p-2.5 text-sm" />
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                       <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Relationship *</label>
                         <input type="text" value={nomineeRelation} onChange={e => setNomineeRelation(e.target.value)} className="w-full border-slate-300 rounded-lg p-2.5 text-sm" />
                       </div>
                       <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">NID *</label>
                         <input type="text" value={nomineeNid} onChange={e => setNomineeNid(e.target.value)} className="w-full border-slate-300 rounded-lg p-2.5 text-sm" />
                       </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                       <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Mobile</label>
                         <input type="text" value={nomineeMobile} onChange={e => setNomineeMobile(e.target.value)} className="w-full border-slate-300 rounded-lg p-2.5 text-sm" />
                       </div>
                       <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                         <input type="text" value={nomineeAddress} onChange={e => setNomineeAddress(e.target.value)} className="w-full border-slate-300 rounded-lg p-2.5 text-sm" />
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="bg-purple-50 border border-purple-200 p-5 rounded-xl space-y-4 mt-6">
                 <h4 className="font-bold text-purple-900 flex items-center gap-2 border-b border-purple-200 pb-2"><Wallet className="w-4 h-4" /> Settlement Calculation</h4>
                 
                 <div className="space-y-3 text-sm">
                   <div className="flex justify-between items-center">
                     <span className="text-slate-700 font-medium">Eligible Member Capital</span>
                     <span className="font-semibold text-base">{formatCurrency(memberCapital)}</span>
                   </div>
                   
                   <div className="flex justify-between items-center bg-white p-2 rounded border border-purple-100">
                     <span className="text-emerald-700 font-medium">Eligible Profit / Benefit</span>
                     <div className="flex items-center gap-2">
                       <span className="text-xs text-slate-500">৳</span>
                       <input type="number" value={eligibleBenefitAmount || ''} onChange={e => setEligibleBenefitAmount(Number(e.target.value) || 0)} className="border-slate-300 rounded-md p-1.5 w-32 text-right font-medium" />
                     </div>
                   </div>
                   
                   <div className="flex justify-between text-slate-500 pt-2 border-t border-purple-100">
                     <span>Service Charge (0%)</span><span>- ৳0</span>
                   </div>
                   
                   <div className="flex justify-between text-purple-900 font-bold text-lg pt-2 border-t border-purple-200">
                     <span>Net Settlement Payable</span>
                     <span>{formatCurrency(netSettlementAmount)}</span>
                   </div>
                 </div>
               </div>

               <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                 <input type="checkbox" checked={declarationChecked} onChange={e => setDeclarationChecked(e.target.checked)} className="mt-1" />
                 <span className="text-sm font-medium text-slate-700">I confirm the reported death and settlement information is accurate.</span>
               </label>
               
               {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">{errorMsg}</div>}
               
               <div className="flex justify-end gap-3 pt-4 border-t">
                 <button onClick={onClose} className="px-6 py-2.5 bg-white border text-slate-700 rounded-xl">Cancel</button>
                 <button onClick={handleRequest} disabled={!declarationChecked} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl disabled:opacity-50">Submit Settlement Request</button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

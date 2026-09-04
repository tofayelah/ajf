import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getAdminPaymentRequestsAPI, approvePaymentRequestAPI, rejectPaymentRequestAPI } from '../../services/api';
import { MemberPaymentRequest } from '../../types';
import { CheckCircle2, XCircle, Clock, FileText, Search, Filter } from 'lucide-react';

export const PaymentRequestsAdminView: React.FC = () => {
  const { language, db } = useApp();
  const isBangla = language === 'bn';
  const [requests, setRequests] = useState<MemberPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await getAdminPaymentRequestsAPI();
      setRequests(res.requests || []);
    } catch (err) {
      console.error('Failed to fetch payment requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (req: MemberPaymentRequest) => {
    if (!window.confirm(isBangla ? 'আপনি কি এই পেমেন্ট অনুমোদন করতে নিশ্চিত?' : 'Are you sure you want to approve this payment?')) return;
    
    setProcessingId(req.id);
    
    const collectionData = {
      collectionId: `COL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      receiptNo: `REC-${new Date().getFullYear()}${(db.collections?.length || 0) + 1}`,
      memberId: req.memberId,
      date: req.paymentDate,
      financialYearId: req.financialYearId,
      month: req.month,
      year: req.year,
      monthlySubscription: req.requestedAmount,
      totalAmount: req.requestedAmount,
      status: 'ACTIVE',
      paymentMethod: 'bKash',
      createdAt: new Date().toISOString()
    };
    
    try {
      await approvePaymentRequestAPI(req.id, { collectionData });
      await fetchRequests(); // refresh list
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: MemberPaymentRequest) => {
    const reason = window.prompt(isBangla ? 'প্রত্যাখ্যানের কারণ লিখুন:' : 'Enter rejection reason:');
    if (reason === null) return;
    
    setProcessingId(req.id);
    try {
      await rejectPaymentRequestAPI(req.id, reason || 'Rejected by Admin');
      await fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(r => filter === 'ALL' || r.status === filter);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            {isBangla ? 'পেমেন্ট অনুরোধসমূহ' : 'Payment Requests'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isBangla ? 'সদস্যদের পেমেন্ট অনুরোধ যাচাই করুন' : 'Verify and manage member payment requests'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                filter === f 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium bg-slate-50/50">
            {isBangla ? 'কোন অনুরোধ পাওয়া যায়নি' : 'No requests found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold border-b border-slate-100">Request Details</th>
                  <th className="p-4 font-bold border-b border-slate-100">Member</th>
                  <th className="p-4 font-bold border-b border-slate-100">Amount & Month</th>
                  <th className="p-4 font-bold border-b border-slate-100">TrxID / Method</th>
                  <th className="p-4 font-bold border-b border-slate-100">Status</th>
                  <th className="p-4 font-bold border-b border-slate-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <p className="text-xs font-mono font-semibold text-slate-600">{req.id}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(req.submittedAt).toLocaleString()}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-slate-800">{req.memberNameSnapshot}</p>
                      <p className="text-xs text-slate-500">{req.memberId}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-slate-800">৳{req.requestedAmount.toLocaleString()}</p>
                      <p className="text-xs text-indigo-600 font-medium">{req.month} {req.year}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-mono font-bold text-slate-700 uppercase bg-slate-100 inline-block px-1.5 py-0.5 rounded">{req.transactionId}</p>
                      <p className="text-xs text-slate-500 mt-1">{req.paymentMethod} • {req.senderMobile}</p>
                    </td>
                    <td className="p-4">
                      {req.status === 'PENDING' && <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded-lg"><Clock className="w-3 h-3"/> PENDING</span>}
                      {req.status === 'APPROVED' && <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg"><CheckCircle2 className="w-3 h-3"/> APPROVED</span>}
                      {req.status === 'REJECTED' && <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-rose-100 text-rose-800 rounded-lg"><XCircle className="w-3 h-3"/> REJECTED</span>}
                    </td>
                    <td className="p-4 text-right">
                      {req.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleReject(req)}
                            disabled={processingId === req.id}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => handleApprove(req)}
                            disabled={processingId === req.id}
                            className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                          >
                            Verify & Approve
                          </button>
                        </div>
                      )}
                      {req.status === 'APPROVED' && req.approvedReceiptNo && (
                        <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Rec: {req.approvedReceiptNo}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getMemberPaymentRequestsAPI } from '../../services/api';
import { Clock, CheckCircle2, XCircle, FileText, Calendar } from 'lucide-react';
import { MemberPaymentRequest } from '../../types';

interface Props {
  memberId: string;
}

export const PaymentRequestsList: React.FC<Props> = ({ memberId }) => {
  const { language } = useApp();
  const isBangla = language === 'bn';
  const [requests, setRequests] = useState<MemberPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await getMemberPaymentRequestsAPI();
        setRequests(res.requests || []);
      } catch (err) {
        console.error('Failed to fetch payment requests', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  if (loading) {
    return <div className="p-4 text-center text-slate-500 text-sm">Loading requests...</div>;
  }

  if (requests.length === 0) {
    return null; // Don't show the section if no requests
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          {isBangla ? 'আমার পেমেন্ট অনুরোধসমূহ' : 'My Payment Requests'}
        </h3>
      </div>
      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {requests.map((req) => (
          <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800">{req.month} {req.year}</p>
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{req.id}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(req.submittedAt).toLocaleDateString()}
                </span>
                <span className="font-mono">TrxID: {req.transactionId}</span>
              </div>
              {req.status === 'REJECTED' && req.rejectionReason && (
                <p className="text-xs text-rose-600 mt-1 font-medium bg-rose-50 px-2 py-1 rounded inline-block">
                  Reason: {req.rejectionReason}
                </p>
              )}
            </div>
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
              <p className="font-black text-lg text-slate-700">৳{req.requestedAmount.toLocaleString()}</p>
              
              {req.status === 'PENDING' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  {isBangla ? 'অপেক্ষমাণ' : 'PENDING'}
                </div>
              )}
              {req.status === 'APPROVED' && (
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isBangla ? 'অনুমোদিত' : 'APPROVED'}
                  </div>
                  {req.approvedReceiptNo && (
                    <span className="text-[10px] text-emerald-600 font-mono mt-1 pr-1">Rec: {req.approvedReceiptNo}</span>
                  )}
                </div>
              )}
              {req.status === 'REJECTED' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-200">
                  <XCircle className="w-3.5 h-3.5" />
                  {isBangla ? 'প্রত্যাখ্যাত' : 'REJECTED'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

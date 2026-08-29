import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Search, Eye, Download, DollarSign, CheckCircle, X, CreditCard } from 'lucide-react';
import { MemberExitRequest, PaymentMethod } from '../../types';

export const CompletedSettlementsView = () => {
  const { db, language, activeUser, processMemberExitRefund, showNotification } = useApp();
  const isBangla = language === 'bn';
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'APPROVED' | 'COMPLETED'>('APPROVED');
  const [viewingExitId, setViewingExitId] = useState<string | null>(null);

  // Refund Modal State
  const [refundingExitId, setRefundingExitId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [bankAccountId, setBankAccountId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processDate, setProcessDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allExits = db.memberExits || [];

  const approvedExits = allExits.filter(e => e.status === 'APPROVED' || (e as any).settlementStatus === 'APPROVED');
  const completedExits = allExits.filter(e => ['REFUNDED', 'SETTLED', 'EXITED', 'DECEASED'].includes(e.status) || (e as any).settlementStatus === 'SETTLED');

  const currentList = activeTab === 'APPROVED' ? approvedExits : completedExits;

  const filteredExits = currentList.filter(exit => {
    const member = db.members?.find(m => m.memberId === exit.memberId);
    const matchesSearch = 
      exit.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exit.exitRequestId || (exit as any).id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const exitTypeNormalized = exit.exitType === 'DEATH_SETTLEMENT' ? 'DEATH' : exit.exitType;
    const matchesType = typeFilter === 'ALL' || exitTypeNormalized === typeFilter || exit.exitType === typeFilter;
    return matchesSearch && matchesType;
  });

  const selectedRefundExit = refundingExitId ? allExits.find(e => (e.exitRequestId === refundingExitId || (e as any).id === refundingExitId)) : null;
  const selectedRefundMember = selectedRefundExit ? db.members?.find(m => m.memberId === selectedRefundExit.memberId) : null;

  const selectedViewExit = viewingExitId ? allExits.find(e => (e.exitRequestId === viewingExitId || (e as any).id === viewingExitId)) : null;
  const selectedViewMember = selectedViewExit ? db.members?.find(m => m.memberId === selectedViewExit.memberId) : null;

  const handleOpenRefund = (exitId: string) => {
    setRefundingExitId(exitId);
    setPaymentMethod('Cash');
    setBankAccountId(db.bankAccounts?.[0]?.id || '');
    setPaymentReference('');
    setProcessDate(new Date().toISOString().split('T')[0]);
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefundExit || !activeUser) return;
    if (paymentMethod === 'Bank' && !bankAccountId) {
      alert(isBangla ? 'ব্যাংক অ্যাকাউন্ট নির্বাচন করুন' : 'Please select a bank account');
      return;
    }

    const realId = selectedRefundExit.exitRequestId || (selectedRefundExit as any).id;
    setIsSubmitting(true);

    try {
      const res = await processMemberExitRefund({
        exitRequestId: realId,
        paymentMethod,
        bankAccountId: paymentMethod === 'Bank' ? bankAccountId : undefined,
        paymentReference: paymentReference.trim() || undefined,
        processDate,
        userId: activeUser.userId,
        userName: activeUser.fullName || activeUser.username
      });

      if (res.success) {
        showNotification(isBangla ? `রিফান্ড ভাউচার ${res.voucherNo || ''} সফলভাবে সম্পন্ন হয়েছে।` : `Refund processed. Voucher: ${res.voucherNo || ''}`, 'success');
        setRefundingExitId(null);
        setActiveTab('COMPLETED');
      } else {
        alert(res.message || 'Failed to process refund');
      }
    } catch (err: any) {
      alert(err?.message || 'Error processing refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>{isBangla ? 'অনুমোদিত ও সম্পন্ন নিষ্পত্তি' : 'Approved & Completed Settlements'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBangla ? 'অনুমোদিত আবেদনের রিফান্ড বিতরণ এবং সম্পন্ন নিষ্পত্তির হিসাব' : 'Disburse refunds for approved requests and view settled history'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t-xl gap-4">
        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'APPROVED'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>{isBangla ? 'অনুমোদিত (রিফান্ড অপেক্ষমাণ)' : 'Approved (Pending Refund)'}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
            {approvedExits.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'COMPLETED'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>{isBangla ? 'সম্পন্ন নিষ্পত্তি (ইতিহাস)' : 'Completed Settlements'}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
            {completedExits.length}
          </span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isBangla ? 'সদস্য আইডি, আবেদন নং বা নাম খুঁজুন...' : 'Search by Member ID, Request No, or Name...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700"
          >
            <option value="ALL">{isBangla ? 'সকল ধরন' : 'All Types'}</option>
            <option value="NORMAL">{isBangla ? 'সাধারণ প্রস্থান' : 'Normal Exit'}</option>
            <option value="EARLY">{isBangla ? 'আগাম প্রস্থান' : 'Early Exit'}</option>
            <option value="DEATH">{isBangla ? 'মৃত্যু নিষ্পত্তি' : 'Death Settlement'}</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'আইডি' : 'ID'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'সদস্যের নাম' : 'Member Name'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'ধরন' : 'Type'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'তারিখ' : 'Date'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'মূলধন' : 'Capital'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'সার্ভিস চার্জ' : 'Service Charge'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'নিট নিষ্পত্তি' : 'Net Settlement'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'অবস্থা' : 'Status'}</th>
                {activeTab === 'COMPLETED' && (
                  <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'ভাউচার নং' : 'Voucher No'}</th>
                )}
                <th className="px-4 py-3 whitespace-nowrap text-right">{isBangla ? 'পদক্ষেপ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExits.map(exit => {
                const realId = exit.exitRequestId || (exit as any).id;
                const member = db.members?.find(m => m.memberId === exit.memberId);
                const capital = exit.memberCapital || (exit as any).eligibleCapital || exit.eligibleRefundAmount || 0;
                const serviceCharge = exit.serviceChargeAmount || 0;
                const netAmount = exit.netRefundAmount || exit.netSettlementAmount || (capital - serviceCharge);

                return (
                  <tr key={realId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {realId}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <div>{member?.fullName || 'Unknown'}</div>
                      <div className="text-xs text-slate-500 font-mono">{exit.memberId}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        exit.exitType === 'NORMAL' ? 'bg-emerald-100 text-emerald-800' :
                        exit.exitType === 'EARLY' ? 'bg-amber-100 text-amber-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {exit.exitType === 'NORMAL' ? (isBangla ? 'সাধারণ প্রস্থান' : 'Normal Exit') :
                         exit.exitType === 'EARLY' ? (isBangla ? 'আগাম প্রস্থান' : 'Early Exit') :
                         (isBangla ? 'মৃত্যু নিষ্পত্তি' : 'Death Settlement')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {exit.refundProcessDate || exit.requestDate || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      ৳{capital.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-rose-600 whitespace-nowrap">
                      ৳{serviceCharge.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      ৳{netAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {activeTab === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          {isBangla ? 'অনুমোদিত' : 'Approved'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                          {isBangla ? 'নিষ্পত্তি সম্পন্ন' : 'Settled'}
                        </span>
                      )}
                    </td>
                    {activeTab === 'COMPLETED' && (
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {exit.refundVoucherNo || (exit as any).settlementVoucherNo || 'N/A'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          id={`completed-view-${realId}`}
                          onClick={() => setViewingExitId(realId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300 transition-colors shadow-xs"
                          title={isBangla ? 'বিস্তারিত দেখুন' : 'View Details'}
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>{isBangla ? 'ভিউ' : 'View'}</span>
                        </button>

                        {activeTab === 'APPROVED' && (
                          <button
                            type="button"
                            id={`completed-refund-${realId}`}
                            onClick={() => handleOpenRefund(realId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-xs"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{isBangla ? 'রিফান্ড প্রদান' : 'Process Refund'}</span>
                          </button>
                        )}

                        {activeTab === 'COMPLETED' && (
                          <button
                            type="button"
                            id={`completed-details-${realId}`}
                            onClick={() => setViewingExitId(realId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors shadow-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isBangla ? 'নিষ্পত্তি বিবরণ' : 'Settlement Details'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredExits.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'COMPLETED' ? 10 : 9} className="px-4 py-8 text-center text-slate-500">
                    {activeTab === 'APPROVED' 
                      ? (isBangla ? 'কোন অনুমোদিত আবেদন রিফান্ডের জন্য অপেক্ষমাণ নেই।' : 'No approved settlements waiting for refund.') 
                      : (isBangla ? 'কোন সম্পন্ন নিষ্পত্তির রেকর্ড পাওয়া যায়নি।' : 'No completed settlements found.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      {selectedViewExit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base sm:text-lg">
                  {isBangla ? 'সদস্য নিষ্পত্তির বিস্তারিত তথ্য' : 'Settlement Request Details'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setViewingExitId(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500 block">{isBangla ? 'আবেদন আইডি' : 'Request ID'}:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedViewExit.exitRequestId || (selectedViewExit as any).id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isBangla ? 'বর্তমান অবস্থা' : 'Current Status'}:</span>
                  <span className="font-bold text-emerald-700">{selectedViewExit.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isBangla ? 'সদস্যের নাম' : 'Member Name'}:</span>
                  <span className="font-bold text-slate-900">{selectedViewMember?.fullName || 'N/A'} ({selectedViewExit.memberId})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isBangla ? 'নিষ্পত্তির ধরন' : 'Exit Type'}:</span>
                  <span className="font-bold text-slate-800">{selectedViewExit.exitType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isBangla ? 'আবেদনের তারিখ' : 'Request Date'}:</span>
                  <span className="font-medium text-slate-800">{selectedViewExit.requestDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{isBangla ? 'সদস্যতার মেয়াদ' : 'Membership Tenure'}:</span>
                  <span className="font-medium text-slate-800">
                    {selectedViewExit.membershipTenureYears || 0} {isBangla ? 'বছর' : 'Years'} {selectedViewExit.membershipTenureMonths || 0} {isBangla ? 'মাস' : 'Months'}
                  </span>
                </div>
              </div>

              {/* Financial breakdown */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs sm:text-sm">
                <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                  {isBangla ? 'আর্থিক হিসাব বিবরণী' : 'Financial Settlement Summary'}
                </h4>
                <div className="flex justify-between">
                  <span className="text-slate-600">{isBangla ? 'জমা কৃত মূলধন' : 'Member Capital'}:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ৳{(selectedViewExit.memberCapital || (selectedViewExit as any).eligibleCapital || selectedViewExit.eligibleRefundAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>{isBangla ? 'সার্ভিস চার্জ' : 'Service Charge'} ({selectedViewExit.serviceChargePercentage || 0}%):</span>
                  <span className="font-mono font-semibold">
                    - ৳{(selectedViewExit.serviceChargeAmount || 0).toLocaleString()}
                  </span>
                </div>
                {selectedViewExit.eligibleBenefitAmount ? (
                  <div className="flex justify-between text-blue-600">
                    <span>{isBangla ? 'মৃত্যু কল্যাণ সুবিধা' : 'Death Benefit'}:</span>
                    <span className="font-mono font-semibold">
                      + ৳{selectedViewExit.eligibleBenefitAmount.toLocaleString()}
                    </span>
                  </div>
                ) : null}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-emerald-800 text-sm">
                  <span>{isBangla ? 'প্রদেয় নিট নিষ্পত্তি' : 'Net Refund/Settlement'}:</span>
                  <span className="font-mono text-base font-black">
                    ৳{(selectedViewExit.netRefundAmount || selectedViewExit.netSettlementAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Workflow log */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <h4 className="font-bold text-slate-800 mb-1">{isBangla ? 'অনুমোদন ও নিষ্পত্তির তথ্য' : 'Approval & Settlement Log'}</h4>
                <div><span className="text-slate-500">{isBangla ? 'আবেদনকারী' : 'Requested By'}:</span> <span className="font-medium text-slate-800">{selectedViewExit.userName || selectedViewExit.userId || selectedViewExit.requestedBy || 'N/A'}</span></div>
                {selectedViewExit.approvedBy && (
                  <div><span className="text-slate-500">{isBangla ? 'অনুমোদনকারী' : 'Approved By'}:</span> <span className="font-medium text-emerald-700">{selectedViewExit.approvedByUserName || selectedViewExit.approvedBy} ({selectedViewExit.approvedAt ? new Date(selectedViewExit.approvedAt).toLocaleDateString() : ''})</span></div>
                )}
                {selectedViewExit.refundVoucherNo && (
                  <div><span className="text-slate-500">{isBangla ? 'ভাউচার নং' : 'Voucher No'}:</span> <span className="font-mono font-bold text-indigo-700">{selectedViewExit.refundVoucherNo}</span></div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingExitId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors shadow-xs"
              >
                {isBangla ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Refund Modal */}
      {selectedRefundExit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base sm:text-lg">
                  {isBangla ? 'সদস্য নিষ্পত্তি রিফান্ড প্রদান' : 'Disburse Settlement Refund'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setRefundingExitId(null)}
                className="text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRefund} className="p-6 space-y-4 text-sm">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isBangla ? 'সদস্য:' : 'Member:'}</span>
                  <span className="font-bold text-slate-900">{selectedRefundMember?.fullName || 'N/A'} ({selectedRefundExit.memberId})</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>{isBangla ? 'পরিশোধযোগ্য নিট অর্থ:' : 'Net Refund Payable:'}</span>
                  <span className="font-mono text-base font-black">
                    ৳{(selectedRefundExit.netRefundAmount || selectedRefundExit.netSettlementAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {isBangla ? 'পেমেন্ট মেথড *' : 'Payment Method *'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`py-2 px-3 rounded-lg border text-sm font-semibold transition-colors ${
                      paymentMethod === 'Cash'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isBangla ? 'নগদ (Cash)' : 'Cash in Hand'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Bank')}
                    className={`py-2 px-3 rounded-lg border text-sm font-semibold transition-colors ${
                      paymentMethod === 'Bank'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isBangla ? 'ব্যাংক (Bank)' : 'Bank Transfer'}
                  </button>
                </div>
              </div>

              {paymentMethod === 'Bank' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {isBangla ? 'ব্যাংক অ্যাকাউন্ট নির্বাচন করুন *' : 'Select Bank Account *'}
                  </label>
                  <select
                    required
                    value={bankAccountId}
                    onChange={e => setBankAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- {isBangla ? 'অ্যাকাউন্ট বাছাই করুন' : 'Select Account'} --</option>
                    {(db.bankAccounts || []).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber} (৳{(b.currentBalance ?? b.openingBalance ?? 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {isBangla ? 'প্রদানের তারিখ *' : 'Process Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={processDate}
                    onChange={e => setProcessDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {isBangla ? 'রেফারেন্স / চেক নং' : 'Payment Reference / Cheque'}
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder={isBangla ? 'চেক নম্বর বা লেনদেন রেফারেন্স' : 'Ref / Cheque number'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRefundingExitId(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSubmitting ? (isBangla ? 'প্রক্রিয়াকরণ হচ্ছে...' : 'Processing...') : (isBangla ? 'রিফান্ড ভাউচার তৈরি করুন' : 'Confirm & Issue Voucher')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

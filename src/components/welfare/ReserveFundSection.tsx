import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { ShieldCheck, PlusCircle, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { ReserveUtilization } from '../../types';

export const ReserveFundSection: React.FC = () => {
  const { db, addReserveUtilization, updateReserveUtilizationStatus, payReserveUtilization, activeUser, language } = useApp();
  const isBangla = language === 'bn';

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'REQUESTS' | 'UNDER_REVIEW' | 'APPROVED' | 'PAID' | 'REJECTED'>('OVERVIEW');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'REVIEW' | 'PAY'>('CREATE');
  const [selectedUtil, setSelectedUtil] = useState<ReserveUtilization | null>(null);

  // Form State
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Bank');
  const [resolutionRequired, setResolutionRequired] = useState(false);
  const [resolutionNo, setResolutionNo] = useState('');
  const [remarks, setRemarks] = useState('');

  // Calculate Reserve Fund balances properly
  const historicalAllocations = (db.historicalProfits || []).reduce((sum, hp) => sum + (hp.reserveAmount || 0), 0);
  
  // Actually, wait: do we have any direct income to Reserve Fund?
  const otherAllocations = (db.welfareTransactions || []).filter(w => w.fundType === 'RESERVE' && w.income > 0).reduce((sum, w) => sum + w.income, 0);
  
  const totalAllocated = historicalAllocations + otherAllocations;
  const totalPaidUtilizations = (db.reserveUtilizations || []).filter(u => u.status === 'PAID').reduce((sum, u) => sum + u.amount, 0);
  
  // From requirements: "Available Balance = Opening Balance + Total Allocation - Total Paid Utilization"
  // Assuming opening balance is 0 for now.
  const openingBalance = 0;
  const availableBalance = openingBalance + totalAllocated - totalPaidUtilizations;

  const handleOpenCreate = () => {
    setModalMode('CREATE');
    setPurpose('');
    setDescription('');
    setAmount(0);
    setRemarks('');
    setSelectedUtil(null);
    setIsModalOpen(true);
  };

  const handleOpenReview = (u: ReserveUtilization) => {
    setModalMode('REVIEW');
    setSelectedUtil(u);
    if (u.status === 'REQUESTED') {
       updateReserveUtilizationStatus(u.utilizationId, 'UNDER_REVIEW');
       u.status = 'UNDER_REVIEW'; // Optimistic local update
    }
    setIsModalOpen(true);
  };

  const handleOpenPay = (u: ReserveUtilization) => {
    setModalMode('PAY');
    setSelectedUtil(u);
    setPaymentMethod(u.paymentMethod === 'Cash' ? 'Cash' : 'Bank');
    setIsModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return alert('Amount must be greater than 0');
    if (amount > availableBalance) return alert(isBangla ? 'রিজার্ভ তহবিলে পর্যাপ্ত ব্যালেন্স নেই।' : 'Insufficient Reserve Fund balance.');
    
    addReserveUtilization({
      utilizationId: `RFU-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      date: new Date().toISOString(),
      purpose,
      description,
      amount,
      requestedBy: activeUser?.fullName || 'System',
      paymentMethod,
      status: 'REQUESTED',
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(false);
  };

  const handleReviewAction = (action: 'APPROVE' | 'REJECT') => {
    if (!selectedUtil) return;
    updateReserveUtilizationStatus(
      selectedUtil.utilizationId, 
      action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      activeUser?.fullName,
      resolutionRequired ? resolutionNo : undefined,
      remarks
    );
    setIsModalOpen(false);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUtil) return;
    if (selectedUtil.amount > availableBalance) {
      alert(isBangla ? 'রিজার্ভ তহবিলে পর্যাপ্ত ব্যালেন্স নেই।' : 'Insufficient Reserve Fund balance.');
      return;
    }
    
    const res = await payReserveUtilization({
      utilizationId: selectedUtil.utilizationId,
      paymentMethod,
      amount: selectedUtil.amount,
      approvedBy: activeUser?.fullName,
      resolutionNo: selectedUtil.resolutionNo || resolutionNo,
      purpose: selectedUtil.purpose
    });
    
    if (!res.success) {
       alert(res.message);
    } else {
       setIsModalOpen(false);
    }
  };

  const filteredUtils = (db.reserveUtilizations || []).filter(u => {
    if (activeTab === 'OVERVIEW') return true;
    if (activeTab === 'REQUESTS') return u.status === 'REQUESTED';
    if (activeTab === 'UNDER_REVIEW') return u.status === 'UNDER_REVIEW';
    if (activeTab === 'APPROVED') return u.status === 'APPROVED';
    if (activeTab === 'PAID') return u.status === 'PAID';
    if (activeTab === 'REJECTED') return u.status === 'REJECTED';
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const canCreate = activeUser?.role !== 'MEMBER';
  const canReview = activeUser?.role === 'ADMIN';

  return (
    <div className="space-y-4">
      {/* Dashboard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-bold mb-1">Opening Balance</div>
          <div className="text-lg font-black text-slate-800">৳{openingBalance.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-bold mb-1">Total Allocated</div>
          <div className="text-lg font-black text-emerald-700">৳{totalAllocated.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500 font-bold mb-1">Total Utilized (Paid)</div>
          <div className="text-lg font-black text-rose-700">৳{totalPaidUtilizations.toLocaleString()}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <div className="text-xs text-blue-600 font-bold mb-1">Available Balance</div>
          <div className="text-xl font-black text-blue-800">৳{availableBalance.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex gap-2 overflow-x-auto">
          {['OVERVIEW', 'REQUESTS', 'UNDER_REVIEW', 'APPROVED', 'PAID', 'REJECTED'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === tab ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
        {canCreate && (
          <button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
          >
            + {isBangla ? 'রিজার্ভ ব্যবহারের আবেদন' : 'Utilization Request'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-bold">
            <tr>
              <th className="p-3 border-b border-slate-200">Utilization ID</th>
              <th className="p-3 border-b border-slate-200">Date</th>
              <th className="p-3 border-b border-slate-200">Purpose</th>
              <th className="p-3 border-b border-slate-200 text-right">Amount</th>
              <th className="p-3 border-b border-slate-200 text-center">Status</th>
              <th className="p-3 border-b border-slate-200 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUtils.map(u => (
              <tr key={u.utilizationId} className="hover:bg-slate-50">
                <td className="p-3 font-mono font-bold text-slate-700">{u.utilizationId}</td>
                <td className="p-3">{new Date(u.date || new Date().toISOString()).toLocaleDateString()}</td>
                <td className="p-3 font-semibold text-slate-800">{u.purpose}</td>
                <td className="p-3 text-right font-mono font-bold text-slate-900">৳{u.amount.toLocaleString()}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    u.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                    u.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                    u.status === 'REJECTED' || u.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                    u.status === 'UNDER_REVIEW' ? 'bg-purple-100 text-purple-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {canReview && (u.status === 'REQUESTED' || u.status === 'UNDER_REVIEW') && (
                    <button onClick={() => handleOpenReview(u)} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-blue-100">
                      Review
                    </button>
                  )}
                  {canReview && u.status === 'APPROVED' && (
                    <button onClick={() => handleOpenPay(u)} className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-emerald-100">
                      পেমেন্ট সম্পন্ন করুন
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredUtils.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal logic */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">
                {modalMode === 'CREATE' ? 'Reserve Fund Utilization Request' : modalMode === 'REVIEW' ? 'Review Request' : 'Complete Payment'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-5 h-5"/></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {modalMode === 'CREATE' ? (
                <form id="create-util-form" onSubmit={handleCreateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Purpose *</label>
                    <input required type="text" value={purpose} onChange={e=>setPurpose(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount *</label>
                    <input required type="number" min="1" value={amount} onChange={e=>setAmount(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                    <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm"></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Payment Method</label>
                    <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as any)} className="w-full border border-slate-300 rounded-lg p-2 text-sm">
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                    </select>
                  </div>
                </form>
              ) : modalMode === 'REVIEW' && selectedUtil ? (
                <div className="space-y-4 text-sm">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                     <p><strong>ID:</strong> {selectedUtil.utilizationId}</p>
                     <p><strong>Requested By:</strong> {selectedUtil.requestedBy}</p>
                     <p><strong>Purpose:</strong> {selectedUtil.purpose}</p>
                     <p><strong>Amount:</strong> ৳{selectedUtil.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Requires Resolution?</label>
                    <input type="checkbox" checked={resolutionRequired} onChange={e => setResolutionRequired(e.target.checked)} /> Yes
                  </div>
                  {resolutionRequired && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Resolution No</label>
                      <input type="text" value={resolutionNo} onChange={e=>setResolutionNo(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Review Remarks</label>
                    <textarea value={remarks} onChange={e=>setRemarks(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm"></textarea>
                  </div>
                </div>
              ) : modalMode === 'PAY' && selectedUtil ? (
                <form id="pay-util-form" onSubmit={handlePaySubmit} className="space-y-4">
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
                     <p className="text-amber-800 text-xs">You are about to authorize a payment of <strong>৳{selectedUtil.amount.toLocaleString()}</strong>.</p>
                     <p className="text-amber-800 text-xs">Available Reserve: <strong>৳{availableBalance.toLocaleString()}</strong></p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                    <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as any)} className="w-full border border-slate-300 rounded-lg p-2 text-sm">
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                    </select>
                  </div>
                </form>
              ) : null}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold text-xs hover:bg-slate-100">Cancel</button>
               {modalMode === 'CREATE' && (
                 <button form="create-util-form" type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700">Submit Request</button>
               )}
               {modalMode === 'REVIEW' && (
                 <>
                   <button onClick={() => handleReviewAction('REJECT')} className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg font-bold text-xs hover:bg-rose-200">Reject</button>
                   <button onClick={() => handleReviewAction('APPROVE')} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700">Approve</button>
                 </>
               )}
               {modalMode === 'PAY' && (
                 <button form="pay-util-form" type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700">Confirm Payment</button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserMinus, Search, Eye, Plus, CheckCircle, XCircle } from 'lucide-react';

export const NormalMemberExitView = () => {
  const { db, language, activeUser, navigateTo, requestMemberExit } = useApp();
  const isBangla = language === 'bn';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [showModal, setShowModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [exitReason, setExitReason] = useState('');

  const exits = (db.memberExits || []).filter(e => e.exitType === 'NORMAL');

  const filteredExits = exits.filter(exit => {
    const member = db.members?.find(m => m.memberId === exit.memberId);
    const matchesSearch = 
      exit.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || exit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeMembers = (db.members || []).filter(m => m.status === 'ACTIVE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !exitReason || !activeUser) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    const res = await requestMemberExit({
      memberId: selectedMemberId,
      requestDate: today,
      exitType: 'NORMAL',
      exitReason: exitReason,
      userId: activeUser.userId || 'SYSTEM',
      userName: activeUser.username || 'Admin'
    });
    
    if (res.success) {
      setShowModal(false);
      setSelectedMemberId('');
      setExitReason('');
      alert(isBangla ? 'অনুরোধ সফলভাবে তৈরি হয়েছে' : 'Request created successfully');
    } else {
      alert(res.message || 'Failed to create request');
    }
  };

  return (
    <div className="space-y-4 pb-12 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'সাধারণ প্রস্থান' : 'Normal Member Exit'}</span>
          </h2>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{isBangla ? 'নতুন অনুরোধ' : 'New Request'}</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isBangla ? 'সদস্য আইডি বা নাম খুঁজুন...' : 'Search by Member ID or Name...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="NORMAL_EXIT_REQUESTED">Pending Request</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REFUND_PROCESSING">Refund Processing</option>
            <option value="REFUNDED">Refunded</option>
            <option value="EXITED">Exited</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Member Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Capital</th>
                <th className="px-4 py-3 whitespace-nowrap">Service Charge (15%)</th>
                <th className="px-4 py-3 whitespace-nowrap">Net Refund</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExits.map(exit => {
                const member = db.members?.find(m => m.memberId === exit.memberId);
                const realId = exit.exitRequestId || (exit as any).id;
                const capital = exit.memberCapital || (exit as any).eligibleCapital || exit.eligibleRefundAmount || 0;
                return (
                  <tr key={realId} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-emerald-900 whitespace-nowrap">
                      {exit.memberId}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {member?.fullName || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      ৳{capital.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-rose-600 whitespace-nowrap">
                      ৳{(exit.serviceChargeAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      ৳{(exit.netRefundAmount || exit.netSettlementAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-medium">
                        {exit.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredExits.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No normal exit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">
                {isBangla ? 'নতুন সাধারণ প্রস্থান' : 'New Normal Exit'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isBangla ? 'সদস্য নির্বাচন করুন' : 'Select Member'}
                </label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={e => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- {isBangla ? 'সদস্য নির্বাচন করুন' : 'Select Member'} --</option>
                  {activeMembers.map(m => (
                    <option key={m.memberId} value={m.memberId}>
                      {m.memberId} - {m.fullName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isBangla ? 'প্রস্থানের কারণ' : 'Reason for Exit'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={exitReason}
                  onChange={e => setExitReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder={isBangla ? 'কারণ লিখুন...' : 'Enter reason...'}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  {isBangla ? 'অনুরোধ জমা দিন' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

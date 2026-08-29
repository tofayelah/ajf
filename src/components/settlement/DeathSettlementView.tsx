import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { HeartHandshake, Search, Eye, Plus, CheckCircle, XCircle } from 'lucide-react';

export const DeathSettlementView = () => {
  const { db, language, activeUser, navigateTo, requestMemberExit } = useApp();
  const isBangla = language === 'bn';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [showModal, setShowModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [dateOfDeath, setDateOfDeath] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');
  const [exitReason, setExitReason] = useState('Member Deceased');

  const exits = (db.memberExits || []).filter(e => e.exitType === 'DEATH_SETTLEMENT' || (e.exitType as any) === 'DEATH');

  const filteredExits = exits.filter(exit => {
    const member = db.members?.find(m => m.memberId === exit.memberId);
    const matchesSearch = 
      exit.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || exit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeMembers = (db.members || []).filter(m => m.status === 'ACTIVE');

  const handleMemberSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const memberId = e.target.value;
    setSelectedMemberId(memberId);
    const member = db.members?.find(m => m.memberId === memberId);
    if (member && member.nominees && member.nominees.length > 0) {
      setNomineeName(member.nominees[0].name);
      setNomineeRelation(member.nominees[0].relation);
    } else {
      setNomineeName('');
      setNomineeRelation('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !dateOfDeath || !activeUser) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    const res = await requestMemberExit({
      memberId: selectedMemberId,
      requestDate: today,
      exitType: 'DEATH',
      exitReason: exitReason,
      userId: activeUser.userId || 'SYSTEM',
      userName: activeUser.username || 'Admin',
      dateOfDeath: dateOfDeath,
      nomineeName: nomineeName,
      nomineeRelation: nomineeRelation
    });
    
    if (res.success) {
      setShowModal(false);
      setSelectedMemberId('');
      setDateOfDeath('');
      setNomineeName('');
      setNomineeRelation('');
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
            <HeartHandshake className="w-5 h-5 text-purple-700" />
            <span>{isBangla ? 'মৃত্যু নিষ্পত্তি' : 'Death Settlement'}</span>
          </h2>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{isBangla ? 'নতুন রিপোর্ট' : 'Report Death'}</span>
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
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="DEATH_REPORTED">Reported</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="SETTLEMENT_PROCESSING">Processing</option>
            <option value="SETTLED">Settled</option>
            <option value="DECEASED">Deceased</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap">Member Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Date of Death</th>
                <th className="px-4 py-3 whitespace-nowrap">Capital</th>
                <th className="px-4 py-3 whitespace-nowrap">Benefit</th>
                <th className="px-4 py-3 whitespace-nowrap">Service Charge (0%)</th>
                <th className="px-4 py-3 whitespace-nowrap">Net Settlement</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExits.map(exit => {
                const member = db.members?.find(m => m.memberId === exit.memberId);
                const realId = exit.exitRequestId || (exit as any).id;
                const capital = exit.memberCapital || (exit as any).eligibleCapital || exit.eligibleRefundAmount || 0;
                const benefit = exit.eligibleBenefitAmount || (exit as any).eligibleBenefit || 0;
                const netAmount = exit.netRefundAmount || exit.netSettlementAmount || (capital + benefit);
                return (
                  <tr key={realId} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-emerald-900 whitespace-nowrap">
                      {exit.memberId}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {member?.fullName || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {exit.dateOfDeath || exit.requestDate || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                      ৳{capital.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-600 whitespace-nowrap">
                      ৳{benefit.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      ৳0
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-purple-700 whitespace-nowrap">
                      ৳{netAmount.toLocaleString()}
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
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No death settlement records found.
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
                {isBangla ? 'মৃত্যু রিপোর্ট' : 'Report Death'}
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
                  onChange={handleMemberSelect}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
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
                  {isBangla ? 'মৃত্যুর তারিখ' : 'Date of Death'}
                </label>
                <input
                  type="date"
                  required
                  value={dateOfDeath}
                  onChange={e => setDateOfDeath(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isBangla ? 'নমিনীর নাম' : 'Nominee Name'}
                </label>
                <input
                  type="text"
                  required
                  value={nomineeName}
                  onChange={e => setNomineeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter nominee name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isBangla ? 'সম্পর্ক' : 'Relation'}
                </label>
                <input
                  type="text"
                  required
                  value={nomineeRelation}
                  onChange={e => setNomineeRelation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="E.g. Son, Wife, etc."
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
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  {isBangla ? 'রিপোর্ট জমা দিন' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

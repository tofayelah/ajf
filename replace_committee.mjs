import fs from 'fs';
const content = `import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CommitteeService } from '../../services/committeeService';
import { Users, Calendar, Shield, Clock, Plus, Edit, UserMinus, UserPlus, CheckCircle, AlertTriangle, FileText, X } from 'lucide-react';
import { CommitteePosition } from '../../types';

export const CommitteeManagementView: React.FC = () => {
  const { db, activeUser, language, setDb, showNotification } = useApp();
  const isBangla = language === "bn";

  const activeCommittee = CommitteeService.getActiveCommittee(db);

  const [activeTab, setActiveTab] = useState<'CURRENT' | 'HISTORY'>('CURRENT');
  
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Committee Form
  const [cForm, setCForm] = useState({
    committeeName: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    resolutionNo: '',
    resolutionDate: '',
    remarks: ''
  });

  // Calculate endDate based on startDate initially and when startDate changes
  useEffect(() => {
    if (cForm.startDate) {
      const d = new Date(cForm.startDate);
      d.setFullYear(d.getFullYear() + 2);
      d.setDate(d.getDate() - 1);
      setCForm(prev => ({ ...prev, endDate: d.toISOString().split('T')[0] }));
    }
  }, [cForm.startDate]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cForm.committeeName || !cForm.startDate || !cForm.endDate) {
        showNotification(isBangla ? 'অনুগ্রহ করে সকল আবশ্যকীয় তথ্য দিন' : 'Please fill all required fields', 'error');
        return;
    }

    const newCommittee = {
      committeeId: "COM-" + Date.now(),
      committeeName: cForm.committeeName,
      startDate: cForm.startDate,
      endDate: cForm.endDate,
      resolutionNo: cForm.resolutionNo,
      resolutionDate: cForm.resolutionDate,
      remarks: cForm.remarks,
      status: "ACTIVE" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedCommittees = (db.committees || []).map(c => 
      c.status === "ACTIVE" ? { ...c, status: "EXPIRED" as const } : c
    );

    setDb({
      ...db,
      committees: [...updatedCommittees, newCommittee]
    });

    showNotification(isBangla ? 'নতুন কমিটি সফলভাবে গঠিত হয়েছে' : 'New committee created successfully', 'success');
    setIsCreating(false);
    setCForm({
      committeeName: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      resolutionNo: '',
      resolutionDate: '',
      remarks: ''
    });
  };

  // Member Form
  const [mForm, setMForm] = useState({
    memberId: '',
    position: 'MEMBER' as CommitteePosition,
    appointmentDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  const POSITIONS = [
    { value: 'PRESIDENT', labelBn: 'সভাপতি', labelEn: 'President' },
    { value: 'GENERAL_SECRETARY', labelBn: 'সাধারণ সম্পাদক', labelEn: 'General Secretary' },
    { value: 'TREASURER', labelBn: 'কোষাধ্যক্ষ', labelEn: 'Treasurer' },
    { value: 'VICE_PRESIDENT', labelBn: 'সহ-সভাপতি', labelEn: 'Vice President' },
    { value: 'JOINT_SECRETARY', labelBn: 'যুগ্ম সম্পাদক', labelEn: 'Joint Secretary' },
    { value: 'ORGANIZING_SECRETARY', labelBn: 'সাংগঠনিক সম্পাদক', labelEn: 'Organizing Secretary' },
    { value: 'EXECUTIVE_MEMBER', labelBn: 'কার্যকরী সদস্য', labelEn: 'Executive Member' },
    { value: 'MEMBER', labelBn: 'সদস্য', labelEn: 'Member' },
  ];

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommittee) return;
    if (!mForm.memberId || !mForm.position) {
      showNotification(isBangla ? 'সদস্য ও পদবী নির্বাচন করুন' : 'Please select member and position', 'error');
      return;
    }

    const exists = (activeCommittee.members || []).find(m => m.memberId === mForm.memberId);
    if (exists) {
        showNotification(isBangla ? 'সদস্যটি ইতিমধ্যে কমিটিতে আছেন' : 'Member is already in the committee', 'error');
        return;
    }

    const singletons = ['PRESIDENT', 'GENERAL_SECRETARY', 'TREASURER', 'ORGANIZING_SECRETARY'];
    if (singletons.includes(mForm.position)) {
        const taken = (activeCommittee.members || []).find(m => m.position === mForm.position);
        if (taken) {
            showNotification(isBangla ? 'এই পদবীতে ইতিমধ্যে একজন সদস্য আছেন' : 'This position is already filled', 'error');
            return;
        }
    }

    const newMember = {
      committeeMemberId: "CM-" + Date.now(),
      committeeId: activeCommittee.committeeId,
      memberId: mForm.memberId,
      position: mForm.position as CommitteePosition,
      appointmentDate: mForm.appointmentDate,
      remarks: mForm.remarks,
      createdAt: new Date().toISOString()
    };

    setDb({
      ...db,
      committeeMembers: [...(db.committeeMembers || []), newMember]
    });

    showNotification(isBangla ? 'কমিটির সদস্য যুক্ত হয়েছে' : 'Committee member added', 'success');
    setIsAddingMember(false);
    setMForm({
      memberId: '',
      position: 'MEMBER',
      appointmentDate: new Date().toISOString().split('T')[0],
      remarks: ''
    });
  };

  const getPositionLabel = (posValue: string) => {
    const pos = POSITIONS.find(p => p.value === posValue);
    if (!pos) return posValue;
    return isBangla ? pos.labelBn : pos.labelEn;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            {isBangla ? 'কমিটি ব্যবস্থাপনা' : 'Committee Management'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isBangla ? 'কমিটি গঠন ও সদস্য পরিচালনা করুন' : 'Create and manage committees and their members'}
          </p>
        </div>
        <div className="flex gap-2">
          {!isCreating && (
            <button 
              onClick={() => setIsCreating(true)} 
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isBangla ? 'নতুন কমিটি' : 'New Committee'}
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('CURRENT')}
          className={\`px-6 py-3 font-medium text-sm transition-colors border-b-2 \${activeTab === 'CURRENT' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}\`}
        >
          {isBangla ? 'বর্তমান কমিটি' : 'Current Committee'}
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={\`px-6 py-3 font-medium text-sm transition-colors border-b-2 \${activeTab === 'HISTORY' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}\`}
        >
          {isBangla ? 'কমিটি ইতিহাস' : 'Committee History'}
        </button>
      </div>

      {activeTab === 'CURRENT' && (
        <div className="space-y-6">
          
          {isCreating ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  {isBangla ? 'নতুন কমিটি গঠন' : 'Create New Committee'}
                </h3>
                <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{isBangla ? 'কমিটির নাম' : 'Committee Name'} *</label>
                    <input 
                      required 
                      type="text" 
                      value={cForm.committeeName} 
                      onChange={e => setCForm({...cForm, committeeName: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                      placeholder={isBangla ? 'যেমন: কার্যকরী পর্ষদ (২০২৬-২৮)' : 'e.g. Executive Committee (2026-28)'} 
                    />
                  </div>
                  <div></div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{isBangla ? 'শুরুর তারিখ' : 'Start Date'} *</label>
                    <input 
                      required 
                      type="date" 
                      value={cForm.startDate} 
                      onChange={e => setCForm({...cForm, startDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{isBangla ? 'শেষের তারিখ' : 'End Date'} *</label>
                    <input 
                      required 
                      type="date" 
                      value={cForm.endDate} 
                      onChange={e => setCForm({...cForm, endDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{isBangla ? 'রেজোলিউশন নং' : 'Resolution No'}</label>
                    <input 
                      type="text" 
                      value={cForm.resolutionNo} 
                      onChange={e => setCForm({...cForm, resolutionNo: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{isBangla ? 'রেজোলিউশনের তারিখ' : 'Resolution Date'}</label>
                    <input 
                      type="date" 
                      value={cForm.resolutionDate} 
                      onChange={e => setCForm({...cForm, resolutionDate: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">{isBangla ? 'মন্তব্য' : 'Remarks'}</label>
                    <textarea 
                      value={cForm.remarks} 
                      onChange={e => setCForm({...cForm, remarks: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                      rows={2}
                    ></textarea>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
                    {isBangla ? 'সংরক্ষণ করুন' : 'Save Committee'}
                  </button>
                </div>
              </form>
            </div>
          ) : !activeCommittee ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center animate-in fade-in duration-300">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-amber-800 mb-2">
                {isBangla ? 'বর্তমানে কোনো Active Committee নেই' : 'No Active Committee Found'}
              </h3>
              <p className="text-amber-700 mb-4">
                {isBangla ? 'অনুগ্রহ করে নতুন একটি কমিটি গঠন করুন।' : 'Please create a new committee.'}
              </p>
              <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow font-medium transition-colors inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {isBangla ? 'নতুন কমিটি গঠন করুন' : 'Create New Committee'}
              </button>
            </div>
          ) : (
            <>
              {/* Active Committee Header */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="bg-gradient-to-r from-slate-50 to-white p-6 border-b border-slate-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800">{activeCommittee.committeeName}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-slate-700">{activeCommittee.startDate}</span> 
                          <span className="text-slate-400 mx-1">{isBangla ? 'থেকে' : 'to'}</span> 
                          <span className="font-medium text-slate-700">{activeCommittee.endDate}</span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700 font-bold tracking-wide">
                            {activeCommittee.status}
                          </span>
                        </span>
                      </div>
                    </div>
                    {!isAddingMember && (
                      <button 
                        onClick={() => setIsAddingMember(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        {isBangla ? 'কমিটির সদস্য যোগ করুন' : 'Add Committee Member'}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Add Member Form */}
                {isAddingMember && (
                  <div className="p-6 border-b border-slate-200 bg-emerald-50/30">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        {isBangla ? 'নতুন সদস্য যুক্ত করুন' : 'Add New Member'}
                      </h4>
                      <button onClick={() => setIsAddingMember(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <form onSubmit={handleAddMemberSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{isBangla ? 'সদস্য নির্বাচন করুন' : 'Select Member'} *</label>
                          <select 
                            required 
                            value={mForm.memberId} 
                            onChange={e => setMForm({...mForm, memberId: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                          >
                            <option value="">{isBangla ? 'নির্বাচন করুন...' : 'Select...'}</option>
                            {(db.members || []).filter(m => m.status === 'ACTIVE').map(m => (
                              <option key={m.memberId} value={m.memberId}>{m.fullName} ({m.membershipNo})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{isBangla ? 'পদবী' : 'Position'} *</label>
                          <select 
                            required 
                            value={mForm.position} 
                            onChange={e => setMForm({...mForm, position: e.target.value as CommitteePosition})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                          >
                            {POSITIONS.map(p => (
                              <option key={p.value} value={p.value}>{isBangla ? p.labelBn : p.labelEn}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{isBangla ? 'নিয়োগের তারিখ' : 'Appointment Date'}</label>
                          <input 
                            type="date" 
                            value={mForm.appointmentDate} 
                            onChange={e => setMForm({...mForm, appointmentDate: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{isBangla ? 'মন্তব্য' : 'Remarks'}</label>
                          <input 
                            type="text" 
                            value={mForm.remarks} 
                            onChange={e => setMForm({...mForm, remarks: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white" 
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors font-medium">
                          {isBangla ? 'যুক্ত করুন' : 'Add Member'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                                
                {/* Top Roles Highlight */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-5 border border-emerald-100 flex flex-col items-center text-center shadow-sm">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
                        <Shield className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-1">
                        {isBangla ? 'সভাপতি' : 'President'}
                      </h4>
                      <p className="font-black text-slate-800 text-lg">
                        {activeCommittee.president?.fullName || '-'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">{activeCommittee.president?.mobile}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-100 flex flex-col items-center text-center shadow-sm">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-1">
                        {isBangla ? 'সাধারণ সম্পাদক' : 'General Secretary'}
                      </h4>
                      <p className="font-black text-slate-800 text-lg">
                        {activeCommittee.generalSecretary?.fullName || '-'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">{activeCommittee.generalSecretary?.mobile}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-5 border border-purple-100 flex flex-col items-center text-center shadow-sm">
                      <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
                        <Clock className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-purple-800 uppercase tracking-wider mb-1">
                        {isBangla ? 'কোষাধ্যক্ষ' : 'Treasurer'}
                      </h4>
                      <p className="font-black text-slate-800 text-lg">
                        {activeCommittee.treasurer?.fullName || '-'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">{activeCommittee.treasurer?.mobile}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Members Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    {isBangla ? 'সকল সদস্য' : 'All Members'}
                  </h3>
                  <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                    {activeCommittee.members?.length || 0} {isBangla ? 'জন' : 'Total'}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {(activeCommittee.members || []).length > 0 ? (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 font-bold tracking-wide uppercase text-xs">{isBangla ? 'ক্রমিক' : 'SL'}</th>
                          <th className="px-6 py-4 font-bold tracking-wide uppercase text-xs">{isBangla ? 'সদস্যের নাম' : 'Member Name'}</th>
                          <th className="px-6 py-4 font-bold tracking-wide uppercase text-xs">{isBangla ? 'সদস্য নং' : 'Membership No'}</th>
                          <th className="px-6 py-4 font-bold tracking-wide uppercase text-xs">{isBangla ? 'পদবী' : 'Position'}</th>
                          <th className="px-6 py-4 font-bold tracking-wide uppercase text-xs">{isBangla ? 'মোবাইল' : 'Mobile'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(activeCommittee.members || []).map((member, idx) => (
                          <tr key={member.committeeMemberId} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-4 text-slate-500 font-medium">{idx + 1}</td>
                            <td className="px-6 py-4 font-bold text-slate-800">{member.fullName}</td>
                            <td className="px-6 py-4 text-slate-600 font-medium">{member.membershipNo}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {getPositionLabel(member.position)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{member.mobile}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-slate-500">
                      <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                      <p>{isBangla ? 'কমিটিতে এখনো কোনো সদস্য যোগ করা হয়নি।' : 'No members added to the committee yet.'}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {isBangla ? 'কমিটির ইতিহাস শিঘ্রই যুক্ত করা হবে।' : 'Committee history will be added soon.'}
          </p>
        </div>
      )}
    </div>
  );
};
`
fs.writeFileSync('src/components/committee/CommitteeManagementView.tsx', content);
console.log('CommitteeManagementView rewritten successfully.');

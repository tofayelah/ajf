import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AttachmentManager } from '../shared/AttachmentManager';
import { User, X, Phone, Mail, MapPin, Briefcase, Calendar, KeyRound, ShieldCheck, Lock, Unlock, UserX, UserCheck, Trash2, BookOpen } from 'lucide-react';
import { MemberActionModals } from './MemberActionModals';

interface Props {
  memberId: string;
  onClose: () => void;
}

export const MemberProfileModal: React.FC<Props> = ({ memberId, onClose }) => {
  const { db, setDb, language, getCurrentUser, navigateTo } = useApp();
  const isBangla = language === 'bn';
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  const member = (db.members || []).find(m => m.memberId === memberId);
  const userAccount = (db.users || []).find(u => u.linkedMemberId === memberId && u.role === 'MEMBER');

  const [isCreatingLogin, setIsCreatingLogin] = useState(false);
  const [actionModalMode, setActionModalMode] = useState<'DEACTIVATE' | 'REACTIVATE' | 'DELETE' | null>(null);
  const [loginForm, setLoginForm] = useState({
    username: member?.mobile || '',
    password: '',
    pin: ''
  });

  if (!member) return null;

  const handleCreateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) return;

    const newUser = {
      userId: `USR-${Date.now()}`,
      username: loginForm.username,
      fullName: member.fullName,
      role: 'MEMBER' as const,
      mobile: member.mobile,
      passwordHash: loginForm.password,
      pinHash: loginForm.pin,
      linkedMemberId: member.memberId,
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString()
    };

    setDb(prev => ({
      ...prev,
      users: [...prev.users, newUser as any],
      auditLogs: [
        {
          auditId: `AUD-${Date.now()}`,
          userId: prev.activeUserId || 'SYSTEM',
          userName: 'Admin',
          dateTime: new Date().toISOString(),
          module: 'AUTH',
          action: 'POST',
          recordId: newUser.userId,
          remarks: `MEMBER login created for ${member.memberId}`
        },
        ...prev.auditLogs
      ]
    }));
    setIsCreatingLogin(false);
  };

  const handleToggleStatus = () => {
    if (!userAccount) return;
    const newStatus = userAccount.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setDb(prev => ({
      ...prev,
      users: (prev.users || []).map(u => u.userId === userAccount.userId ? { ...u, status: newStatus as any } : u)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            <span>{isBangla ? 'সদস্য প্রোফাইল' : 'Member Profile'}</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-24 h-24 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 text-3xl font-black shrink-0 overflow-hidden shadow-sm border border-emerald-200">
              {member.photo || member.photoUrl || member.photoPath ? (
                <img src={member.photo || member.photoUrl || member.photoPath} alt={member.fullName} className="w-full h-full object-cover" />
              ) : (
                member.fullName.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-slate-900">{member.fullName}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  member.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : member.status === 'INACTIVE'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  {member.status === 'ACTIVE' ? (isBangla ? 'সক্রিয়' : 'ACTIVE') : member.status === 'INACTIVE' ? (isBangla ? 'নিষ্ক্রিয়' : 'INACTIVE') : member.status}
                </span>
              </div>
              <p className="text-sm font-semibold text-emerald-700 mb-2">ID: {member.memberId} | No: {member.membershipNo}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> {member.mobile}</div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {member.email || 'N/A'}</div>
                <div className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> {member.occupation || 'N/A'}</div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {member.joiningDate}</div>
                <div className="flex items-center gap-2 sm:col-span-2"><MapPin className="w-4 h-4" /> {member.presentAddress}</div>
              </div>
              
              {/* Loan Summary */}
              {(() => {
                const memberLoans = (db.loans || []).filter(l => l.memberId === memberId && (l.status === 'ACTIVE' || l.status === 'COMPLETED' || (l.status as string) === 'PAID'));
                const totalLoan = memberLoans.reduce((sum, l) => sum + (l.approvedAmount ?? l.appliedAmount ?? l.requestedAmount ?? 0), 0);
                const outstandingLoan = memberLoans.reduce((sum, l) => sum + (l.totalOutstanding || 0), 0);
                const paidLoan = memberLoans.reduce((sum, l) => sum + (l.repaidPrincipal || 0), 0);
                
                return (
                  <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{isBangla ? 'ঋণ সারাংশ' : 'Loan Summary'}</h4>
                    <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-200">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold mb-1">{isBangla ? 'মোট ঋণ' : 'Total Loan'}</p>
                        <p className="text-sm font-black text-indigo-700">৳{totalLoan.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold mb-1">{isBangla ? 'বকেয়া ঋণ' : 'Outstanding Loan'}</p>
                        <p className="text-sm font-black text-amber-600">৳{outstandingLoan.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold mb-1">{isBangla ? 'পরিশোধিত ঋণ' : 'Paid Loan'}</p>
                        <p className="text-sm font-black text-emerald-600">৳{paidLoan.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Member Ledger & Lifecycle Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigateTo('MEMBER_LEDGER', member.memberId);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isBangla ? 'সদস্য খতিয়ান দেখুন' : 'View Member Ledger'}</span>
                </button>

                {isAdmin && (
                  <>
                    {member.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => setActionModalMode('DEACTIVATE')}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>{isBangla ? 'সদস্য নিষ্ক্রিয় করুন' : 'Deactivate Member'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActionModalMode('REACTIVATE')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{isBangla ? 'সদস্য সক্রিয় করুন' : 'Reactivate Member'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActionModalMode('DELETE')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isBangla ? 'সদস্য মুছুন' : 'Delete Member'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>{isBangla ? 'অ্যাকাউন্টের অবস্থা (Login Account)' : 'Account Status'}</span>
            </h4>
            
            {userAccount ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {isBangla ? 'অ্যাকাউন্টের অবস্থা' : 'Status'}: 
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs text-white ${userAccount.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                      {userAccount.status}
                    </span>
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Username: <strong>{userAccount.username}</strong></p>
                  <p className="text-xs text-slate-500">Last Login: {userAccount.lastLoginAt ? new Date(userAccount.lastLoginAt).toLocaleString() : 'Never'}</p>
                </div>
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <button 
                    onClick={handleToggleStatus}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${
                      userAccount.status === 'ACTIVE' 
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    {userAccount.status === 'ACTIVE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    <span>{userAccount.status === 'ACTIVE' ? (isBangla ? 'নিষ্ক্রিয় করুন' : 'Disable Account') : (isBangla ? 'সক্রিয় করুন' : 'Enable Account')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm font-medium text-slate-600">
                  {isBangla ? 'এই সদস্যের জন্য কোনো লগইন অ্যাকাউন্ট নেই।' : 'No login account exists for this member.'}
                </p>
                <button 
                  onClick={() => setIsCreatingLogin(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isBangla ? 'লগইন অ্যাকাউন্ট তৈরি করুন' : 'Create Login Account'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Login Modal */}
      {isCreatingLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                {isBangla ? 'নতুন লগইন অ্যাকাউন্ট তৈরি করুন' : 'Create New Login Account'}
              </h3>
              <button onClick={() => setIsCreatingLogin(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateLogin} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'ইউজারনেম' : 'Username'}
                </label>
                <input 
                  type="text" 
                  required
                  value={loginForm.username} 
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g., 01700000000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'পাসওয়ার্ড' : 'Password'}
                </label>
                <input 
                  type="text" 
                  required
                  value={loginForm.password} 
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Enter secure password"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'নিরাপত্তা পিন (PIN)' : 'Security PIN'}
                </label>
                <input 
                  type="text" 
                  required
                  pattern="\d{4,6}"
                  maxLength={6}
                  value={loginForm.pin} 
                  onChange={e => setLoginForm({...loginForm, pin: e.target.value.replace(/\D/g, '')})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="4-6 digit numeric PIN"
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsCreatingLogin(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  {isBangla ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionModalMode && (
        <MemberActionModals
          member={member}
          mode={actionModalMode}
          onClose={() => setActionModalMode(null)}
          onSuccess={() => {
            if (actionModalMode === 'DELETE') {
              onClose();
            }
          }}
        />
      )}
    </div>
  );
};

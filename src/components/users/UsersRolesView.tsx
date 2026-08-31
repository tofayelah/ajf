import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserAccount, UserRole } from '../../types';
import { UserFormModal, ROLE_OPTIONS } from './UserFormModal';
import { ResetCredentialModal } from './ResetCredentialModal';
import { PermissionMatrixModal } from './PermissionMatrixModal';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Key,
  KeyRound,
  Shield,
  Users,
  AlertCircle,
  Link as LinkIcon,
  Filter,
  Check,
  Info,
} from 'lucide-react';

export const UsersRolesView: React.FC = () => {
  const { db, language, manageUserStatus, activeUser, showNotification } = useApp();
  const isBangla = language === 'bn';

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [permissionModalUser, setPermissionModalUser] = useState<UserAccount | null>(null);
  const [resetModalState, setResetModalState] = useState<{
    isOpen: boolean;
    user: UserAccount | null;
    mode: 'PASSWORD' | 'PIN';
  }>({
    isOpen: false,
    user: null,
    mode: 'PASSWORD',
  });

  const [confirmActionState, setConfirmActionState] = useState<{
    isOpen: boolean;
    user: UserAccount | null;
    action: 'LOCK' | 'UNLOCK' | 'DISABLE' | 'ENABLE';
  }>({
    isOpen: false,
    user: null,
    action: 'DISABLE',
  });

  const users: UserAccount[] = db.users || [];
  const members = db.members || [];

  // Metrics
  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const lockedCount = users.filter((u) => u.status === 'LOCKED').length;
  const disabledCount = users.filter((u) => u.status === 'DISABLED' || u.status === 'INACTIVE').length;

  // Filtered users
  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch =
      !term ||
      (user.fullName || '').toLowerCase().includes(term) ||
      (user.username || '').toLowerCase().includes(term) ||
      (user.mobile || '').toLowerCase().includes(term) ||
      (user.email || '').toLowerCase().includes(term) ||
      (user.role || '').toLowerCase().includes(term);

    const matchRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'DISABLED'
        ? user.status === 'DISABLED' || user.status === 'INACTIVE'
        : user.status === statusFilter);

    return matchSearch && matchRole && matchStatus;
  });

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setIsFormModalOpen(true);
  };

  const handleOpenResetPassword = (user: UserAccount) => {
    setResetModalState({
      isOpen: true,
      user,
      mode: 'PASSWORD',
    });
  };

  const handleOpenResetPin = (user: UserAccount) => {
    setResetModalState({
      isOpen: true,
      user,
      mode: 'PIN',
    });
  };

  const handleOpenConfirmAction = (user: UserAccount, action: 'LOCK' | 'UNLOCK' | 'DISABLE' | 'ENABLE') => {
    setConfirmActionState({
      isOpen: true,
      user,
      action,
    });
  };

  const executeConfirmedAction = async () => {
    if (!confirmActionState.user) return;
    
    try {
      const res = await manageUserStatus(confirmActionState.user.userId, confirmActionState.action);
      if (res && res.success) {
        showNotification(
          isBangla ? 'ইউজার স্ট্যাটাস সফলভাবে পরিবর্তন করা হয়েছে' : 'User status updated successfully',
          'success'
        );
      } else {
        showNotification(res?.message || 'Failed to update user status', 'error');
      }
    } catch (e: any) {
      showNotification(e.message || 'Failed to update user status', 'error');
    }
    
    setConfirmActionState({ isOpen: false, user: null, action: 'DISABLE' });
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: isBangla ? 'অ্যাডমিন' : 'Admin',
        };
      case 'ACCOUNTANT':
        return {
          bg: 'bg-teal-50 text-teal-700 border-teal-200',
          label: isBangla ? 'হিসাবরক্ষক' : 'Accountant',
        };
      case 'COLLECTION_OFFICER':
        return {
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
          label: isBangla ? 'আদায়কারী' : 'Collection Officer',
        };
      case 'MEMBER':
        return {
          bg: 'bg-emerald-100/60 text-emerald-800 border-emerald-300',
          label: isBangla ? 'সাধারণ সদস্য' : 'Member',
        };
      case 'AUDITOR':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: isBangla ? 'দর্শক' : 'Viewer',
        };
      default:
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          label: role,
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {isBangla ? 'সক্রিয়' : 'Active'}
          </span>
        );
      case 'LOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            {isBangla ? 'লক করা' : 'Locked'}
          </span>
        );
      case 'DISABLED':
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            {isBangla ? 'নিষ্ক্রিয়' : 'Disabled'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                {isBangla ? 'ইউজার রোল ও নিরাপত্তা ব্যবস্থাপনা' : 'Users & Roles Management'}
              </h1>
              <p className="text-xs md:text-sm text-slate-500">
                {isBangla
                  ? 'ব্যবহারকারী তৈরি, ভূমিকা (Role) বণ্টন, লগইন নিরাপত্তা ও পারমিশন কন্ট্রোল'
                  : 'Manage administrative accounts, role assignments, passwords & access control'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-200 transition-all shrink-0"
          id="add-user-btn"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isBangla ? 'নতুন ইউজার যোগ করুন' : 'Add New User'}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">{isBangla ? 'মোট ইউজার' : 'Total Users'}</div>
            <div className="text-lg md:text-xl font-bold text-slate-800">{totalUsers}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">{isBangla ? 'সক্রিয় অ্যাকাউন্ট' : 'Active'}</div>
            <div className="text-lg md:text-xl font-bold text-emerald-600">{activeCount}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">{isBangla ? 'লক করা' : 'Locked'}</div>
            <div className="text-lg md:text-xl font-bold text-amber-600">{lockedCount}</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">{isBangla ? 'নিষ্ক্রিয় / ডিজেবল' : 'Disabled'}</div>
            <div className="text-lg md:text-xl font-bold text-rose-600">{disabledCount}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isBangla
                  ? 'নাম, ইউজারনেম, রোল অথবা মোবাইল নম্বর দিয়ে খুঁজুন...'
                  : 'Search by name, username, role or phone...'
              }
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
              id="search-user-input"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                id="filter-role-select"
              >
                <option value="ALL">{isBangla ? 'সকল রোল (All Roles)' : 'All Roles'}</option>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.role} value={opt.role}>
                    {isBangla ? opt.bn : opt.en}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                id="filter-status-select"
              >
                <option value="ALL">{isBangla ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
                <option value="ACTIVE">{isBangla ? 'সক্রিয় (Active)' : 'Active'}</option>
                <option value="LOCKED">{isBangla ? 'লক করা (Locked)' : 'Locked'}</option>
                <option value="DISABLED">{isBangla ? 'নিষ্ক্রিয় (Disabled)' : 'Disabled'}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold">
                <th className="p-4">{isBangla ? 'ব্যবহারকারী' : 'User Account'}</th>
                <th className="p-4">{isBangla ? 'ইউজারনেম' : 'Username'}</th>
                <th className="p-4">{isBangla ? 'রোল ও পারমিশন' : 'Role & Level'}</th>
                <th className="p-4">{isBangla ? 'সংযুক্ত সদস্য' : 'Linked Member'}</th>
                <th className="p-4">{isBangla ? 'যোগাযোগ' : 'Contact'}</th>
                <th className="p-4">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="p-4 text-right">{isBangla ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, idx) => {
                  const roleBadge = getRoleBadge(user.role);
                  const linkedMember = user.linkedMemberId
                    ? members.find((m) => m.memberId === user.linkedMemberId)
                    : null;
                  const isCurrentActiveUser = activeUser?.userId === user.userId;
                  const rowKey = `user-row-${user.userId || user.username || 'user'}-${user.role}-${idx}`;

                  return (
                    <tr key={rowKey} className="hover:bg-slate-50/70 transition-colors">
                      {/* User Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm border border-emerald-200 shrink-0">
                            {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{user.fullName}</span>
                              {isCurrentActiveUser && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                                  {isBangla ? 'আপনি' : 'You'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {user.email || user.userId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="p-4 font-mono font-semibold text-slate-700 text-xs">
                        <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                          {user.username}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${roleBadge.bg}`}
                        >
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Linked Member */}
                      <td className="p-4 text-xs">
                        {user.role === 'MEMBER' && linkedMember ? (
                          <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                            <LinkIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {linkedMember.memberId} - {linkedMember.fullName || (linkedMember as any).nameBangla || (linkedMember as any).nameEnglish}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="p-4 text-xs font-medium text-slate-600">
                        {user.mobile || '-'}
                      </td>

                      {/* Status */}
                      <td className="p-4">{getStatusBadge(user.status)}</td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit User Button */}
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={isBangla ? 'সম্পাদনা করুন' : 'Edit User'}
                            id={`edit-user-btn-${user.userId}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => setPermissionModalUser(user)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title={isBangla ? 'পারমিশন ম্যাট্রিক্স' : 'Permission Matrix'}
                          >
                            <Shield className="w-4 h-4" />
                          </button>

                          {/* Reset Password Button */}
                          <button
                            onClick={() => handleOpenResetPassword(user)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title={isBangla ? 'পাসওয়ার্ড রিসেট' : 'Reset Password'}
                            id={`reset-pwd-btn-${user.userId}`}
                          >
                            <Lock className="w-4 h-4" />
                          </button>

                          {/* Reset PIN Button */}
                          <button
                            onClick={() => handleOpenResetPin(user)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title={isBangla ? 'পিন রিসেট' : 'Reset PIN'}
                            id={`reset-pin-btn-${user.userId}`}
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Lock / Unlock Toggle */}
                          {user.status === 'LOCKED' ? (
                            <button
                              onClick={() => handleOpenConfirmAction(user, 'UNLOCK')}
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title={isBangla ? 'আনলক করুন' : 'Unlock Account'}
                              id={`unlock-user-btn-${user.userId}`}
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenConfirmAction(user, 'LOCK')}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title={isBangla ? 'লক করুন' : 'Lock Account'}
                              id={`lock-user-btn-${user.userId}`}
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}

                          {/* Deactivate / Activate Button */}
                          {user.status === 'DISABLED' || user.status === 'INACTIVE' ? (
                            <button
                              onClick={() => handleOpenConfirmAction(user, 'ENABLE')}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title={isBangla ? 'সক্রিয় করুন' : 'Enable Account'}
                              id={`enable-user-btn-${user.userId}`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenConfirmAction(user, 'DISABLE')}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title={isBangla ? 'নিষ্ক্রিয় করুন (Soft Delete)' : 'Deactivate User'}
                              id={`disable-user-btn-${user.userId}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <div className="max-w-sm mx-auto text-slate-500 space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                      <div className="font-semibold text-slate-700">
                        {isBangla ? 'কোনো ব্যবহারকারী খুঁজে পাওয়া যায়নি' : 'No users found'}
                      </div>
                      <p className="text-xs text-slate-400">
                        {isBangla
                          ? 'অন্য কোনো নাম বা ফিল্টার দিয়ে আবার অনুসন্ধান করুন।'
                          : 'Try changing your search term or filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Definitions & Permissions Matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>{isBangla ? 'ভূমিকা ও পারমিশন গাইডলাইন' : 'Role Access Matrix & Security Hierarchy'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              ADMIN
            </div>
            <p className="text-blue-800 leading-relaxed">
              {isBangla ? 'সম্পূর্ণ নিয়ন্ত্রণ। ইউজার তৈরি, সিস্টেম সেটিংস ও নিরাপত্তা অডিট লগ।' : 'Full system control. User accounts, system configuration, audit logs.'}
            </p>
          </div>
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              ACCOUNTANT
            </div>
            <p className="text-emerald-800 leading-relaxed">
              {isBangla ? 'অ্যাকাউন্টিং, ক্যাশ বুক, ব্যাংক বুক, ভাউচার ও ট্রানজ্যাকশন এন্ট্রি, আর্থিক বিবরণী।' : 'Financial ledger, cash/bank books, voucher entries, financial reports.'}
            </p>
          </div>
          <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-xl space-y-1">
            <div className="font-bold text-orange-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-600" />
              COLLECTION_OFFICER
            </div>
            <p className="text-orange-800 leading-relaxed">
              {isBangla ? 'নতুন ভর্তি অনুমোদন, চাঁদা ও কিস্তি রসিদ, ঋণ আদায়।' : 'Admissions, collections, receipts, loan recovery.'}
            </p>
          </div>
          <div className="p-3 bg-slate-50/60 border border-slate-200 rounded-xl space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              AUDITOR
            </div>
            <p className="text-slate-800 leading-relaxed">
              {isBangla ? 'রিপোর্ট দেখা এবং নিরীক্ষণ।' : 'Read-only access for auditing and reports.'}
            </p>
          </div>
          <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl space-y-1">
            <div className="font-bold text-teal-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600" />
              MEMBER
            </div>
            <p className="text-teal-800 leading-relaxed">
              {isBangla ? 'নিজস্ব প্রোফাইল, মাসিক জমার ইতিহাস, ঋণের স্থিতি।' : 'Personal dashboard, own collections, loan statement.'}
            </p>
          </div>
        </div>
      </div>
      {/* Add / Edit User Modal */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingUser(null);
        }}
        userToEdit={editingUser}
      />

      {/* Reset Password / PIN Modal */}
      <ResetCredentialModal
        isOpen={resetModalState.isOpen}
        onClose={() => setResetModalState({ isOpen: false, user: null, mode: 'PASSWORD' })}
        user={resetModalState.user}
        mode={resetModalState.mode}
      />

      {/* Confirmation Modal for Lock / Disable Actions */}
      {confirmActionState.isOpen && confirmActionState.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  confirmActionState.action === 'DISABLE'
                    ? 'bg-rose-100 text-rose-600'
                    : confirmActionState.action === 'LOCK'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {confirmActionState.action === 'DISABLE' ? (
                  <Trash2 className="w-5 h-5" />
                ) : confirmActionState.action === 'LOCK' ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {confirmActionState.action === 'DISABLE'
                    ? isBangla
                      ? 'অ্যাকাউন্ট নিষ্ক্রিয়করণ (Soft Delete)'
                      : 'Deactivate User Account'
                    : confirmActionState.action === 'LOCK'
                    ? isBangla
                      ? 'অ্যাকাউন্ট লক করুন'
                      : 'Lock User Account'
                    : isBangla
                    ? 'অ্যাকাউন্ট সক্রিয় করুন'
                    : 'Activate User Account'}
                </h3>
                <p className="text-xs text-slate-500">
                  {confirmActionState.user.fullName} ({confirmActionState.user.username})
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {confirmActionState.action === 'DISABLE'
                ? isBangla
                  ? 'আপনি কি নিশ্চিত যে আপনি এই ব্যবহারকারী অ্যাকাউন্টটি নিষ্ক্রিয় করতে চান? নিষ্ক্রিয় অ্যাকাউন্ট লগইন করতে পারবে না।'
                  : 'Are you sure you want to deactivate this account? Deactivated accounts cannot log in to the system.'
                : confirmActionState.action === 'LOCK'
                ? isBangla
                  ? 'আপনি কি এই ব্যবহারকারী অ্যাকাউন্টটি সাময়িকভাবে লক করতে চান?'
                  : 'Are you sure you want to temporarily lock this user account?'
                : isBangla
                ? 'আপনি কি এই ব্যবহারকারী অ্যাকাউন্টটি পুনরায় সক্রিয় করতে চান?'
                : 'Are you sure you want to re-activate this user account?'}
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmActionState({ isOpen: false, user: null, action: 'DISABLE' })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                id="cancel-confirm-action-btn"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all ${
                  confirmActionState.action === 'DISABLE'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                    : confirmActionState.action === 'LOCK'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }`}
                id="proceed-confirm-action-btn"
              >
                {isBangla ? 'নিশ্চিত করুন' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

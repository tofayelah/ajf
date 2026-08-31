import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserAccount, UserRole } from '../../types';
import { X, ShieldCheck, User, Mail, Phone, Lock, Key, AlertTriangle, Check } from 'lucide-react';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: UserAccount | null;
}

export const ROLE_OPTIONS: { role: UserRole; bn: string; en: string; category: string }[] = [
  { role: 'ADMIN', bn: 'প্রশাসক (Admin)', en: 'Admin', category: 'Executive' },
  { role: 'ACCOUNTANT', bn: 'হিসাবরক্ষক (Accountant)', en: 'Accountant', category: 'Finance' },
  { role: 'COLLECTION_OFFICER', bn: 'আদায়কারী (Collection Officer)', en: 'Collection Officer', category: 'Field' },
  { role: 'AUDITOR', bn: 'নিরীক্ষক (Auditor / Viewer)', en: 'Auditor (Read-Only)', category: 'General' },
  { role: 'MEMBER', bn: 'সাধারণ সদস্য (Member)', en: 'Member', category: 'General' },
];

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
}) => {
  const { db, language, addUser, updateUser, activeUser, showNotification } = useApp();
  const isBangla = language === 'bn';

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<UserRole>('AUDITOR');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'DISABLED'>('ACTIVE');
  const [linkedMemberId, setLinkedMemberId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!userToEdit;

  useEffect(() => {
    if (userToEdit) {
      setFullName(userToEdit.fullName || '');
      setUsername(userToEdit.username || '');
      setEmail(userToEdit.email || '');
      setMobile(userToEdit.mobile || '');
      setRole(userToEdit.role);
      setStatus(userToEdit.status as any || 'ACTIVE');
      setLinkedMemberId(userToEdit.linkedMemberId || '');
      setPassword('');
      setConfirmPassword('');
      setPin('');
      setConfirmPin('');
      setError(null);
    } else {
      setFullName('');
      setUsername('');
      setEmail('');
      setMobile('');
      setRole('AUDITOR');
      setStatus('ACTIVE');
      setLinkedMemberId('');
      setPassword('');
      setConfirmPassword('');
      setPin('');
      setConfirmPin('');
      setError(null);
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const members = db.members || [];
  const activeSuperAdmins = (db.users || []).filter(
    (u) => u.role === 'ADMIN' && u.status === 'ACTIVE'
  );
  const isLastActiveAdmin =
    isEditMode &&
    userToEdit?.role === 'ADMIN' &&
    userToEdit?.status === 'ACTIVE' &&
    activeSuperAdmins.length <= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!fullName.trim()) {
      setError(isBangla ? 'পুরো নাম দেওয়া আবশ্যক।' : 'Full Name is required.');
      return;
    }

    if (!username.trim()) {
      setError(isBangla ? 'ইউজারনেম দেওয়া আবশ্যক।' : 'Username is required.');
      return;
    }

    // Username regex check (alphanumeric and underscores/dots/hyphens)
    const validUsernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!validUsernameRegex.test(username.trim())) {
      setError(
        isBangla
          ? 'ইউজারনেমে শুধুমাত্র ইংরেজি অক্ষর, সংখ্যা, ডট, হাইফেন বা আন্ডারস্কোর ব্যবহার করুন।'
          : 'Username can only contain alphanumeric characters, dots, hyphens, or underscores.'
      );
      return;
    }

    // Role check for MEMBER
    if (role === 'MEMBER' && !linkedMemberId) {
      setError(
        isBangla
          ? 'সাধারণ সদস্য রোলের জন্য সদস্য নির্বাচন করা বাধ্যতামূলক।'
          : 'Please select a linked member for MEMBER role.'
      );
      return;
    }

    // Passwords & PIN on Create
    if (!isEditMode) {
      if (!password) {
        setError(isBangla ? 'পাসওয়ার্ড দেওয়া আবশ্যক।' : 'Password is required.');
        return;
      }
      if (password.length < 4) {
        setError(isBangla ? 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' : 'Password must be at least 4 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError(isBangla ? 'পাসওয়ার্ড দুটি মিলছে না।' : 'Passwords do not match.');
        return;
      }
      if (pin && pin.length < 4) {
        setError(isBangla ? 'পিন কমপক্ষে ৪ সংখ্যার হতে হবে।' : 'PIN must be at least 4 digits.');
        return;
      }
      if (pin && pin !== confirmPin) {
        setError(isBangla ? 'পিন দুটি মিলছে না।' : 'PINs do not match.');
        return;
      }
    } else {
      // Optional password / PIN changes in edit mode
      if (password && password.length < 4) {
        setError(isBangla ? 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' : 'New password must be at least 4 characters.');
        return;
      }
      if (password && password !== confirmPassword) {
        setError(isBangla ? 'নতুন পাসওয়ার্ড দুটি মিলছে না।' : 'New passwords do not match.');
        return;
      }
      if (pin && pin.length < 4) {
        setError(isBangla ? 'নতুন পিন কমপক্ষে ৪ সংখ্যার হতে হবে।' : 'New PIN must be at least 4 digits.');
        return;
      }
      if (pin && pin !== confirmPin) {
        setError(isBangla ? 'নতুন পিন দুটি মিলছে না।' : 'New PINs do not match.');
        return;
      }

      // Last ADMIN safety check
      if (isLastActiveAdmin && (role !== 'ADMIN' || status !== 'ACTIVE')) {
        setError(
          isBangla
            ? 'সিস্টেমে কমপক্ষে একজন সক্রিয় সুপার অ্যাডমিন (ADMIN) থাকা আবশ্যক। এই অ্যাকাউন্টের রোল বা স্ট্যাটাস পরিবর্তন করা যাবে না।'
            : 'At least one active ADMIN must exist. Cannot modify role or status of the last active ADMIN.'
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && userToEdit) {
        const res = await updateUser(userToEdit.userId, {
          fullName: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          role,
          status,
          linkedMemberId: role === 'MEMBER' ? linkedMemberId : undefined,
          password: password || undefined,
          pin: pin || undefined,
        });

        if (res.success) {
          showNotification(
            isBangla ? 'ইউজার তথ্য সফলভাবে আপডেট করা হয়েছে' : 'User updated successfully',
            'success'
          );
          onClose();
        } else {
          setError(res.message);
        }
      } else {
        const res = await addUser({
          fullName: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          role,
          status,
          linkedMemberId: role === 'MEMBER' ? linkedMemberId : undefined,
          password: password || '123456',
          pin: pin || '1234',
        });

        if (res.success) {
          showNotification(
            isBangla ? 'নতুন ইউজার সফলভাবে তৈরি করা হয়েছে' : 'User created successfully',
            'success'
          );
          onClose();
        } else {
          setError(res.message);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during save.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEditMode
                  ? isBangla
                    ? 'ইউজার তথ্য সম্পাদনা'
                    : 'Edit User Account'
                  : isBangla
                  ? 'নতুন ইউজার তৈরি করুন'
                  : 'Add New User'}
              </h2>
              <p className="text-xs text-emerald-100">
                {isBangla
                  ? 'সিস্টেম অ্যাক্সেস রোল এবং লগইন তথ্য নির্ধারণ করুন'
                  : 'Configure user credentials, roles and system permissions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            id="close-user-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="font-medium text-xs sm:text-sm">{error}</div>
            </div>
          )}

          {isLastActiveAdmin && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>{isBangla ? 'সতর্কতা: ' : 'Notice: '}</strong>
                {isBangla
                  ? 'এই অ্যাকাউন্টটি একমাত্র সক্রিয় সুপার অ্যাডমিন। রোল বা স্ট্যাটাস পরিবর্তন সুরক্ষিত রাখা হয়েছে।'
                  : 'This account is the only active Super Admin. Role and status changes are locked for security.'}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'পুরো নাম *' : 'Full Name *'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                  placeholder={isBangla ? 'উদা: মো: রফিকুল ইসলাম' : 'e.g. John Doe'}
                  id="user-fullname-input"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'ইউজারনেম (লগইন আইডি) *' : 'Username (Login ID) *'}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                placeholder="e.g. rafiqul_admin"
                id="user-username-input"
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'মোবাইল নম্বর' : 'Mobile Number'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                  placeholder="017XXXXXXXX"
                  id="user-mobile-input"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all"
                  placeholder="user@example.com"
                  id="user-email-input"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'ইউজার রোল ও পারমিশন *' : 'User Role & Permissions *'}
              </label>
              <select
                value={role}
                disabled={isLastActiveAdmin}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all disabled:opacity-60"
                id="user-role-select"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.role} value={opt.role}>
                    {isBangla ? opt.bn : opt.en}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'অ্যাকাউন্ট স্ট্যাটাস *' : 'Account Status *'}
              </label>
              <select
                value={status}
                disabled={isLastActiveAdmin}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all disabled:opacity-60"
                id="user-status-select"
              >
                <option value="ACTIVE">{isBangla ? 'সক্রিয় (ACTIVE)' : 'Active'}</option>
                <option value="INACTIVE">{isBangla ? 'নিষ্ক্রিয় (INACTIVE)' : 'Inactive'}</option>
                <option value="LOCKED">{isBangla ? 'লক করা (LOCKED)' : 'Locked'}</option>
                <option value="DISABLED">{isBangla ? 'ডিজেবল / বরখাস্ত (DISABLED)' : 'Disabled'}</option>
              </select>
            </div>
          </div>

          {/* Linked Member (Only if role is MEMBER) */}
          {role === 'MEMBER' && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-emerald-900">
                {isBangla ? 'সংযুক্ত সদস্য প্রোফাইল নির্বাচন করুন *' : 'Select Linked Member Profile *'}
              </label>
              <p className="text-[11px] text-emerald-700">
                {isBangla
                  ? 'সদস্য রোলের ব্যবহারকারী শুধুমাত্র নির্বাচিত সদস্যের ড্যাশবোর্ড ও লেজার দেখতে পারবেন।'
                  : 'Member role users can only access the selected member account.'}
              </p>
              <select
                required
                value={linkedMemberId}
                onChange={(e) => setLinkedMemberId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                id="user-linked-member-select"
              >
                <option value="">
                  {isBangla ? '-- সদস্য নির্বাচন করুন --' : '-- Select Member --'}
                </option>
                {members.map((m, idx) => (
                  <option key={m.memberId || `member-${idx}`} value={m.memberId}>
                    {m.memberId} - {m.fullName || (m as any).nameBangla || (m as any).nameEnglish} ({m.mobile})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Security Credentials */}
          <div className="pt-3 border-t border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-600" />
              {isBangla
                ? isEditMode
                  ? 'নিরাপত্তা তথ্য পরিবর্তন (ঐচ্ছিক)'
                  : 'নিরাপত্তা ও লগইন তথ্য'
                : isEditMode
                ? 'Change Credentials (Optional)'
                : 'Security & Login Credentials'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEditMode
                    ? isBangla
                      ? 'নতুন পাসওয়ার্ড (পরিবর্তন করতে চাইলে)'
                      : 'New Password (Optional)'
                    : isBangla
                    ? 'পাসওয়ার্ড *'
                    : 'Password *'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-mono"
                  placeholder={isEditMode ? '••••••' : (isBangla ? 'কমপক্ষে ৪ অক্ষর' : 'Min 4 characters')}
                  id="user-password-input"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-mono"
                  placeholder={isEditMode ? '••••••' : (isBangla ? 'পুনরায় পাসওয়ার্ড লিখুন' : 'Re-enter password')}
                  id="user-confirmpassword-input"
                />
              </div>

              {/* PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEditMode
                    ? isBangla
                      ? 'নতুন পিন (পরিবর্তন করতে চাইলে)'
                      : 'New PIN (Optional)'
                    : isBangla
                    ? '৪-সংখ্যার পিন (ঐচ্ছিক)'
                    : 'PIN (Optional)'}
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-mono"
                    placeholder="1234"
                    id="user-pin-input"
                  />
                </div>
              </div>

              {/* Confirm PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'পিন নিশ্চিত করুন' : 'Confirm PIN'}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-mono"
                  placeholder="1234"
                  id="user-confirmpin-input"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              id="cancel-user-modal-btn"
            >
              {isBangla ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-200 flex items-center gap-2 transition-all"
              id="submit-user-modal-btn"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>
                {isEditMode
                  ? isBangla
                    ? 'সংরক্ষণ করুন'
                    : 'Save Changes'
                  : isBangla
                  ? 'ইউজার তৈরি করুন'
                  : 'Create User'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

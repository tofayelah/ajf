import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { fetchMemberProfileAPI } from '../../services/api';
import { Member } from '../../types';
import { MemberProfileEditForm } from './MemberProfileEditForm';
import { Edit2 } from 'lucide-react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  Lock,
  ShieldCheck,
  Heart,
  FileText,
  BadgeCheck,
  RefreshCw,
  AlertCircle,
  Users
} from 'lucide-react';

export const MemberProfileView: React.FC = () => {
  const { db, activeUser, language } = useApp();
  const isBangla = language === 'bn';

  // Server-authoritative linkedMemberId is the only permitted ID
  const linkedMemberId = activeUser?.linkedMemberId;
  const initialCachedMember = (db.members || []).find(m => m.memberId === linkedMemberId) || null;

  const [member, setMember] = useState<Member | null>(initialCachedMember);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCachedMember && !!linkedMemberId);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const loadProfile = async (isManual = false) => {
    if (!linkedMemberId) return;

    if (isManual) {
      setIsRefreshing(true);
    } else if (!member) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await fetchMemberProfileAPI(linkedMemberId);
      setMember(data);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      // If we don't already have cached member data, show error
      if (!member) {
        setError(
          isBangla
            ? 'সদস্য প্রোফাইল লোড করা সম্ভব হয়নি। আবার চেষ্টা করুন।'
            : 'Could not load your member profile. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (linkedMemberId) {
      loadProfile();
    }
  }, [linkedMemberId]);

  if (!linkedMemberId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
          <h2 className="text-lg font-bold text-amber-900">
            {isBangla ? 'কোন সদস্য প্রোফাইল সংযুক্ত নেই' : 'No Member Profile Linked'}
          </h2>
          <p className="text-sm text-amber-700">
            {isBangla
              ? 'আপনার অ্যাকাউন্টের সাথে কোন নির্দিষ্ট সদস্য আইডি যুক্ত নেই। অফিসের সাথে যোগাযোগ করুন।'
              : 'Your user account is not linked to any member profile. Please contact the society administration.'}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !member) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[300px] space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600 animate-pulse">
          {isBangla ? 'সদস্য প্রোফাইল লোড হচ্ছে...' : 'Loading member profile...'}
        </p>
      </div>
    );
  }

  if (error && !member) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm font-bold text-rose-900">{error}</p>
          <button
            onClick={() => loadProfile(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {isBangla ? 'পুনরায় চেষ্টা করুন' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="bg-slate-100 border border-slate-200 p-6 rounded-2xl text-center">
          <p className="text-slate-600 font-medium">
            {isBangla ? 'সদস্য প্রোফাইল পাওয়া যায়নি' : 'Member profile not found'}
          </p>
        </div>
      </div>
    );
  }

  const memberPhoto = member.photo || member.photoUrl || member.photoPath;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isBangla ? 'আমার সদস্য প্রোফাইল' : 'My Member Profile'}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              {isBangla ? 'সদস্য বিবরণ ও ব্যক্তিগত পরিচিতি' : 'Member Information & Identification'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Read-Only Badge */}
          

          <button
            id="edit-profile-btn"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-300 shadow-xs transition-all active:scale-95 cursor-pointer"
            title={isBangla ? 'প্রোফাইল সম্পাদন করুন' : 'Edit Profile'}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isBangla ? 'প্রোফাইল সম্পাদন' : 'Edit Profile'}</span>
          </button>
          <button
            id="refresh-profile-btn"
            onClick={() => loadProfile(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            title={isBangla ? 'রিফ্রেশ করুন' : 'Refresh'}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isBangla ? 'রিফ্রেশ' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Informational Notice */}
      <div className="flex items-start gap-3 bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl text-emerald-950 text-xs sm:text-sm shadow-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-emerald-900 mb-0.5">
            {isBangla ? '✓ সদস্য স্ব-হালনাগাদ সুরক্ষা' : '✓ Member Self-Update Protection'}
          </p>
          <p className="text-emerald-800/90 leading-relaxed">
            {isBangla
              ? 'আপনি নিজের প্রোফাইল ছবি এবং বৈবাহিক অবস্থা হালনাগাদ করতে পারবেন। সদস্য আইডি, নাম, সঞ্চয়, চাদা এবং হিসাব সংক্রান্ত সকল তথ্য সুরক্ষিত ও অপরিবর্তনযোগ্য।'
              : 'You can securely update your Profile Picture and Marital Status. All financial, identity, and membership records are strictly read-only and server-protected.'}
          </p>
        </div>
      </div>

      {isEditing ? (
        <MemberProfileEditForm 
          member={member} 
          onSave={(updatedMember) => {
             setMember(updatedMember);
             setIsEditing(false);
          }} 
          onCancel={() => setIsEditing(false)} 
        />
      ) : (
        <>
      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Photo Container */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
          {memberPhoto ? (
            <img
              src={memberPhoto}
              alt={member.fullName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-4xl sm:text-5xl font-black text-emerald-700">
              {member.fullName?.charAt(0)?.toUpperCase() || 'M'}
            </span>
          )}
        </div>

        {/* Name & Primary Info */}
        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {member.fullName}
            </h2>
            <span
              className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                member.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
              {isBangla
                ? member.status === 'ACTIVE'
                  ? 'সক্রিয় সদস্য'
                  : 'নিষ্ক্রিয়'
                : member.status || 'ACTIVE'}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs sm:text-sm text-slate-600 pt-1">
            <div className="bg-slate-100 px-3 py-1 rounded-lg font-semibold text-slate-800 border border-slate-200">
              {isBangla ? 'সদস্য আইডি:' : 'Member ID:'} <span className="text-emerald-700 font-black">{member.memberId}</span>
            </div>
            <div className="bg-slate-100 px-3 py-1 rounded-lg font-semibold text-slate-800 border border-slate-200">
              {isBangla ? 'সদস্য নং:' : 'Membership No:'} <span className="text-slate-900 font-black">{member.membershipNo || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Personal Information */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            <span>{isBangla ? 'ব্যক্তিগত তথ্য' : 'Personal Information'}</span>
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-start py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs font-medium">{isBangla ? 'পিতার নাম' : "Father's Name"}</span>
              <span className="text-slate-900 font-semibold text-right">{member.fatherName || '—'}</span>
            </div>
            <div className="flex justify-between items-start py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs font-medium">{isBangla ? 'মাতার নাম' : "Mother's Name"}</span>
              <span className="text-slate-900 font-semibold text-right">{member.motherName || '—'}</span>
            </div>
            <div className="flex justify-between items-start py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs font-medium">{isBangla ? 'জন্ম তারিখ' : 'Date of Birth'}</span>
              <span className="text-slate-900 font-semibold text-right">{member.dateOfBirth || '—'}</span>
            </div>
            {member.gender && (
              <div className="flex justify-between items-start py-1 border-b border-slate-50">
                <span className="text-slate-500 text-xs font-medium">{isBangla ? 'লিঙ্গ' : 'Gender'}</span>
                <span className="text-slate-900 font-semibold text-right">
                  {isBangla
                    ? member.gender === 'Male' ? 'পুরুষ' : member.gender === 'Female' ? 'মহিলা' : member.gender
                    : member.gender}
                </span>
              </div>
            )}
            <div className="flex justify-between items-start py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs font-medium">{isBangla ? 'জাতীয় পরিচয়পত্র (NID)' : 'National ID (NID)'}</span>
              <span className="text-slate-900 font-semibold text-right font-mono">{member.nid || '—'}</span>
            </div>
            <div className="flex justify-between items-start py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs font-medium">{isBangla ? 'পেশা' : 'Occupation'}</span>
              <span className="text-slate-900 font-semibold text-right">{member.occupation || '—'}</span>
            </div>
            {(member.education || member.educationalQualification) && (
              <div className="flex justify-between items-start py-1 border-b border-slate-50">
                <span className="text-slate-500 text-xs font-medium">{isBangla ? 'শিক্ষাগত যোগ্যতা' : 'Education'}</span>
                <span className="text-slate-900 font-semibold text-right">{member.education || member.educationalQualification}</span>
              </div>
            )}
            {member.nationality && (
              <div className="flex justify-between items-start py-1 border-b border-slate-50">
                <span className="text-slate-500 text-xs font-medium">{isBangla ? 'জাতীয়তা' : 'Nationality'}</span>
                <span className="text-slate-900 font-semibold text-right">{member.nationality}</span>
              </div>
            )}
            <div className="flex justify-between items-start py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs font-medium">{isBangla ? 'রক্তের গ্রুপ' : 'Blood Group'}</span>
              <span className="text-emerald-700 font-bold text-right">{member.bloodGroup || '—'}</span>
            </div>
            <div className="flex justify-between items-start py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs font-medium">{isBangla ? 'বৈবাহিক অবস্থা' : 'Marital Status'}</span>
              <span className="text-slate-900 font-semibold text-right">{member.maritalStatus || '—'}</span>
            </div>
            {member.spouseName && (
              <div className="flex justify-between items-start py-1">
                <span className="text-slate-500 text-xs font-medium">{isBangla ? 'স্বামী / স্ত্রীর নাম' : 'Spouse Name'}</span>
                <span className="text-slate-900 font-semibold text-right">{member.spouseName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Contact & Address */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>{isBangla ? 'যোগাযোগ ও ঠিকানা' : 'Contact & Address'}</span>
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-start py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {isBangla ? 'মোবাইল নম্বর' : 'Mobile Number'}
              </span>
              <span className="text-slate-900 font-bold text-right">{member.mobile || '—'}</span>
            </div>
            {member.alternateMobile && (
              <div className="flex justify-between items-start py-1 border-b border-slate-50">
                <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {isBangla ? 'বিকল্প মোবাইল' : 'Alternate Mobile'}
                </span>
                <span className="text-slate-900 font-medium text-right">{member.alternateMobile}</span>
              </div>
            )}
            <div className="flex justify-between items-start py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {isBangla ? 'ইমেইল' : 'Email Address'}
              </span>
              <span className="text-slate-900 font-semibold text-right">{member.email || '—'}</span>
            </div>
            <div className="flex flex-col py-1 border-b border-slate-50 gap-1">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {isBangla ? 'বর্তমান ঠিকানা' : 'Present Address'}
              </span>
              <span className="text-slate-800 font-medium text-xs sm:text-sm pl-5 leading-relaxed">
                {member.presentAddress || '—'}
              </span>
            </div>
            <div className="flex flex-col py-1 border-b border-slate-50 gap-1">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {isBangla ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}
              </span>
              <span className="text-slate-800 font-medium text-xs sm:text-sm pl-5 leading-relaxed">
                {member.permanentAddress || '—'}
              </span>
            </div>
            {(member.emergencyContactName || member.emergencyContactMobile) && (
              <div className="flex justify-between items-start py-1">
                <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {isBangla ? 'জরুরী যোগাযোগ' : 'Emergency Contact'}
                </span>
                <span className="text-slate-900 font-medium text-right text-xs">
                  {member.emergencyContactName || ''} {member.emergencyContactMobile ? `(${member.emergencyContactMobile})` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Membership Details */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>{isBangla ? 'সদস্যপদ সংক্রান্ত তথ্য' : 'Membership Record'}</span>
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-start py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs font-medium">{isBangla ? 'যোগদানের তারিখ' : 'Joining Date'}</span>
              <span className="text-slate-900 font-semibold text-right">{member.joiningDate || '—'}</span>
            </div>
            {member.admissionDate && (
              <div className="flex justify-between items-start py-1 border-b border-slate-50">
                <span className="text-slate-500 text-xs font-medium">{isBangla ? 'ভর্তি তারিখ' : 'Admission Date'}</span>
                <span className="text-slate-900 font-semibold text-right">{member.admissionDate}</span>
              </div>
            )}
            <div className="flex justify-between items-start py-1 border-b border-slate-50">
              <span className="text-slate-500 text-xs font-medium">{isBangla ? 'সদস্যপদ স্থিতি' : 'Membership Status'}</span>
              <span className="text-emerald-700 font-bold text-right">
                {isBangla
                  ? member.status === 'ACTIVE'
                    ? 'সক্রিয়'
                    : 'নিষ্ক্রিয়'
                  : member.status || 'ACTIVE'}
              </span>
            </div>
            {member.remarks && (
              <div className="flex flex-col py-1 gap-1">
                <span className="text-slate-500 text-xs font-medium">{isBangla ? 'মন্তব্য' : 'Remarks'}</span>
                <span className="text-slate-700 font-medium text-xs leading-relaxed">{member.remarks}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Nominee Information */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <Heart className="w-4 h-4 text-rose-500" />
            <span>{isBangla ? 'মনোনীত ব্যক্তি / নমিনী' : 'Nominee Information'}</span>
          </h3>

          {member.nominees && member.nominees.length > 0 ? (
            <div className="space-y-3">
              {member.nominees.map((nominee, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{nominee.name}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[11px]">
                      {nominee.percentage}% {isBangla ? 'অংশ' : 'share'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400">{isBangla ? 'সম্পর্ক:' : 'Relation:'}</span>{' '}
                      <strong className="text-slate-700">{nominee.relation}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">{isBangla ? 'মোবাইল:' : 'Mobile:'}</span>{' '}
                      <strong className="text-slate-700">{nominee.mobile || '—'}</strong>
                    </div>
                    {nominee.nid && (
                      <div className="col-span-2">
                        <span className="text-slate-400">{isBangla ? 'এনআইডি:' : 'NID:'}</span>{' '}
                        <strong className="text-slate-700">{nominee.nid}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs font-medium">
              {isBangla ? 'কোন নমিনীর তথ্য অন্তর্ভুক্ত নেই' : 'No nominee information on record'}
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { Member } from '../../types';
import { useApp } from '../../context/AppContext';
import { updateMemberProfileAPI, uploadMemberProfilePhotoAPI, MemberPersonalProfileUpdates } from '../../services/api';
import { Save, X, Camera, Trash2, AlertCircle, Loader2, ShieldCheck, User, Phone, MapPin, HeartHandshake, Image as ImageIcon } from 'lucide-react';

interface Props {
  member: Member;
  onSave: (updatedMember: Member) => void;
  onCancel: () => void;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const MemberProfileEditForm: React.FC<Props> = ({ member, onSave, onCancel }) => {
  const { language, showNotification, setDb } = useApp();
  const isBangla = language === 'bn';

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize initial marital status
  const getInitialMaritalStatus = (rawStatus?: string): string => {
    if (!rawStatus) return 'Married';
    const trimmed = rawStatus.trim().toLowerCase();
    if (trimmed.includes('single') || trimmed.includes('অবিবাহিত')) return 'Single';
    if (trimmed.includes('divorced') || trimmed.includes('তালাক')) return 'Divorced';
    if (trimmed.includes('widow') || trimmed.includes('বিধবা') || trimmed.includes('বিপত্নীক')) return 'Widowed';
    return 'Married';
  };

  // State: Personal Information
  const [fullName, setFullName] = useState<string>(member.fullName || '');
  const [fatherName, setFatherName] = useState<string>(member.fatherName || '');
  const [motherName, setMotherName] = useState<string>(member.motherName || '');
  const [dateOfBirth, setDateOfBirth] = useState<string>(member.dateOfBirth || '');
  const [gender, setGender] = useState<string>(member.gender || 'Male');
  const [maritalStatus, setMaritalStatus] = useState<string>(getInitialMaritalStatus(member.maritalStatus));
  const [spouseName, setSpouseName] = useState<string>(member.spouseName || '');
  const [occupation, setOccupation] = useState<string>(member.occupation || '');
  const [education, setEducation] = useState<string>(member.education || member.educationalQualification || '');
  const [nationality, setNationality] = useState<string>(member.nationality || (isBangla ? 'বাংলাদেশী' : 'Bangladeshi'));
  const [bloodGroup, setBloodGroup] = useState<string>(member.bloodGroup || 'B+');

  // State: Contact Information
  const [mobile, setMobile] = useState<string>(member.mobile || '');
  const [alternateMobile, setAlternateMobile] = useState<string>(member.alternateMobile || '');
  const [email, setEmail] = useState<string>(member.email || '');

  // State: Address
  const [presentAddress, setPresentAddress] = useState<string>(member.presentAddress || '');
  const [permanentAddress, setPermanentAddress] = useState<string>(member.permanentAddress || '');

  // State: Emergency Contact
  const [emergencyContactName, setEmergencyContactName] = useState<string>(member.emergencyContactName || '');
  const [emergencyContactMobile, setEmergencyContactMobile] = useState<string>(member.emergencyContactMobile || '');

  // State: Profile Picture
  const currentPhoto = member.photo || member.photoUrl || member.photoPath || '';
  const [photoPreview, setPhotoPreview] = useState<string>(currentPhoto);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPhotoRemoved, setIsPhotoRemoved] = useState<boolean>(false);

  // Form State
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Is Single status?
  const isSingle = maritalStatus.toLowerCase() === 'single' || maritalStatus === 'অবিবাহিত';

  // Handle file selection and validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPhotoError(
        isBangla
          ? 'শুধুমাত্র JPG, PNG এবং WEBP ছবি গ্রহণযোগ্য।'
          : 'Invalid file format. Only JPG, PNG, and WEBP images are supported.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setPhotoError(
        isBangla
          ? 'ছবির আকার সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারে।'
          : 'Image file size exceeds the 5MB limit.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
      setSelectedFile(file);
      setIsPhotoRemoved(false);
    };
    reader.onerror = () => {
      setPhotoError(isBangla ? 'ছবি লোড করতে ব্যর্থ হয়েছে।' : 'Failed to read the selected image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview('');
    setSelectedFile(null);
    setIsPhotoRemoved(true);
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Client-side phone validation
  const validatePhone = (p: string): boolean => {
    const cleaned = p.replace(/[\s\-\(\)]/g, '');
    return /^\+?\d{7,15}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhotoError(null);

    // Validate Required Fields
    const trimmedFullName = fullName.trim();
    if (!trimmedFullName || trimmedFullName.length < 2 || trimmedFullName.length > 100) {
      setError(
        isBangla
          ? 'পুরো নাম অবশ্যই ২ থেকে ১০০ অক্ষরের মধ্যে হতে হবে।'
          : 'Full Name is required and must be between 2 and 100 characters.'
      );
      return;
    }

    const trimmedMobile = mobile.trim();
    if (!trimmedMobile || !validatePhone(trimmedMobile)) {
      setError(
        isBangla
          ? 'মোবাইল নম্বর সঠিক নয়। অনুগ্রহ করে ৭ থেকে ১৫ ডিজিটের সঠিক নম্বর দিন।'
          : 'Invalid mobile number. Please provide a valid 7 to 15 digit phone number.'
      );
      return;
    }

    if (alternateMobile.trim() && !validatePhone(alternateMobile.trim())) {
      setError(
        isBangla
          ? 'বিকল্প মোবাইল নম্বরটি সঠিক নয়।'
          : 'Invalid alternate mobile number format.'
      );
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(
        isBangla
          ? 'ইমেইল অ্যাড্রেস সঠিক নয়।'
          : 'Invalid email address format.'
      );
      return;
    }

    if (emergencyContactMobile.trim() && !validatePhone(emergencyContactMobile.trim())) {
      setError(
        isBangla
          ? 'জরুরী যোগাযোগ মোবাইল নম্বরটি সঠিক নয়।'
          : 'Invalid emergency contact mobile format.'
      );
      return;
    }

    setIsSaving(true);

    try {
      let finalPhotoUrl: string | null | undefined = undefined;

      if (isPhotoRemoved) {
        finalPhotoUrl = null;
      } else if (selectedFile) {
        const uploadRes = await uploadMemberProfilePhotoAPI(selectedFile);
        if (uploadRes && uploadRes.photoUrl) {
          finalPhotoUrl = uploadRes.photoUrl;
        } else {
          throw new Error(isBangla ? 'ছবি আপলোড ব্যর্থ হয়েছে' : 'Failed to upload photo');
        }
      }

      // Construct clean payload strictly with personal profile fields
      const updatePayload: MemberPersonalProfileUpdates = {
        fullName: trimmedFullName,
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        dateOfBirth: dateOfBirth.trim() || undefined,
        gender: gender.trim(),
        maritalStatus: maritalStatus.trim(),
        spouseName: isSingle ? '' : spouseName.trim(),
        occupation: occupation.trim(),
        education: education.trim(),
        nationality: nationality.trim(),
        bloodGroup: bloodGroup.trim().toUpperCase(),
        mobile: trimmedMobile,
        alternateMobile: alternateMobile.trim() || undefined,
        email: email.trim() || undefined,
        presentAddress: presentAddress.trim(),
        permanentAddress: permanentAddress.trim(),
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactMobile: emergencyContactMobile.trim() || undefined
      };

      if (finalPhotoUrl !== undefined) {
        updatePayload.profilePicture = finalPhotoUrl;
      }

      const res = await updateMemberProfileAPI(updatePayload);

      if (res && res.success && res.member) {
        const updatedMember: Member = res.member;

        // Synchronize AppContext state
        setDb(prev => ({
          ...prev,
          members: (prev.members || []).map(m => m.memberId === updatedMember.memberId ? updatedMember : m)
        }));

        showNotification(
          isBangla ? 'ব্যক্তিগত প্রোফাইল সফলভাবে আপডেট হয়েছে' : 'Personal profile updated successfully',
          'success'
        );

        onSave(updatedMember);
      } else {
        throw new Error(res?.error || (isBangla ? 'আপডেট ব্যর্থ হয়েছে' : 'Failed to update profile'));
      }
    } catch (err: any) {
      console.error('Member profile update error:', err);
      setError(err.message || (isBangla ? 'আপডেট ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।' : 'Update failed. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Form Header */}
      <div className="bg-emerald-50/80 border-b border-emerald-100 p-5 sm:p-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
            <span>{isBangla ? 'আমার প্রোফাইল সম্পাদন' : 'Edit My Profile'}</span>
          </h2>
          <p className="text-xs text-emerald-800/80 mt-0.5 font-medium">
            {isBangla
              ? 'আপনার অনুমোদিত ব্যক্তিগত ও যোগাযোগের তথ্য হালনাগাদ করুন।'
              : 'Update your approved personal and contact details.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-full transition-colors cursor-pointer"
          title={isBangla ? 'বাতিল' : 'Cancel'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="text-xs sm:text-sm font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {/* Read-Only Member Identity Reference */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm">
          <div>
            <span className="text-slate-500 font-semibold">{isBangla ? 'সদস্য আইডি (অপরিবর্তনযোগ্য):' : 'Member ID (Read-Only):'}</span>{' '}
            <span className="font-mono font-black text-emerald-700">{member.memberId}</span>
          </div>
          <div className="text-slate-300">|</div>
          <div>
            <span className="text-slate-500 font-semibold">{isBangla ? 'সদস্য নং:' : 'Membership No:'}</span>{' '}
            <span className="font-bold text-slate-800">{member.membershipNo || 'N/A'}</span>
          </div>
          <div className="text-slate-300">|</div>
          <div>
            <span className="text-slate-500 font-semibold">{isBangla ? 'এনআইডি (NID):' : 'National ID:'}</span>{' '}
            <span className="font-mono font-bold text-slate-700">{member.nid || 'N/A'}</span>
          </div>
        </div>

        {/* SECTION: PERSONAL INFORMATION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wider uppercase">
              {isBangla ? 'ব্যক্তিগত তথ্য (Personal Information)' : 'Personal Information'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'পূর্ণ নাম' : 'Full Name'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={100}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder={isBangla ? 'পূর্ণ নাম লিখুন' : 'Enter full name'}
              />
            </div>

            {/* Father's Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'পিতার নাম' : "Father's Name"}
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                maxLength={100}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder={isBangla ? 'পিতার নাম' : "Father's name"}
              />
            </div>

            {/* Mother's Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'মাতার নাম' : "Mother's Name"}
              </label>
              <input
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                maxLength={100}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder={isBangla ? 'মাতার নাম' : "Mother's name"}
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'জন্ম তারিখ' : 'Date of Birth'}
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'লিঙ্গ' : 'Gender'}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer"
              >
                <option value="Male">{isBangla ? 'পুরুষ (Male)' : 'Male'}</option>
                <option value="Female">{isBangla ? 'মহিলা (Female)' : 'Female'}</option>
                <option value="Other">{isBangla ? 'অন্যান্য (Other)' : 'Other'}</option>
              </select>
            </div>

            {/* Marital Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'বৈবাহিক অবস্থা' : 'Marital Status'}
              </label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer"
              >
                <option value="Married">{isBangla ? 'বিবাহিত (Married)' : 'Married'}</option>
                <option value="Single">{isBangla ? 'অবিবাহিত (Single)' : 'Single'}</option>
                <option value="Divorced">{isBangla ? 'তালাকপ্রাপ্ত (Divorced)' : 'Divorced'}</option>
                <option value="Widowed">{isBangla ? 'বিধবা / বিপত্নীক (Widowed)' : 'Widowed'}</option>
              </select>
            </div>

            {/* Spouse Name (Conditional: Disabled if Single) */}
            <div className={isSingle ? 'opacity-60' : ''}>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>{isBangla ? 'স্বামী / স্ত্রীর নাম' : 'Spouse Name'}</span>
                {isSingle && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    {isBangla ? '(অবিবাহিতদের জন্য প্রযোজ্য নয়)' : '(Not applicable for single)'}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={spouseName}
                onChange={(e) => setSpouseName(e.target.value)}
                disabled={isSingle}
                maxLength={100}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder={isSingle ? '—' : (isBangla ? 'স্বামী বা স্ত্রীর নাম' : 'Spouse name')}
              />
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'পেশা' : 'Occupation'}
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                maxLength={100}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder={isBangla ? 'যেমন: ব্যবসা, চাকরি' : 'e.g. Business, Service'}
              />
            </div>

            {/* Educational Qualification */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'শিক্ষাগত যোগ্যতা' : 'Educational Qualification'}
              </label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                maxLength={100}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder={isBangla ? 'যেমন: এইচএসসি, বিএসসি' : 'e.g. HSC, Graduate'}
              />
            </div>

            {/* Nationality */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'জাতীয়তা' : 'Nationality'}
              </label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                maxLength={50}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder={isBangla ? 'বাংলাদেশী' : 'Bangladeshi'}
              />
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'রক্তের গ্রুপ' : 'Blood Group'}
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION: CONTACT INFORMATION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Phone className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wider uppercase">
              {isBangla ? 'যোগাযোগের তথ্য (Contact Information)' : 'Contact Information'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'মোবাইল নম্বর' : 'Mobile Number'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                maxLength={20}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono"
                placeholder="01XXXXXXXXX"
              />
            </div>

            {/* Alternate Mobile */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'বিকল্প মোবাইল নম্বর' : 'Alternate Mobile'}
              </label>
              <input
                type="tel"
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value)}
                maxLength={20}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono"
                placeholder="01XXXXXXXXX"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={100}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder="example@domain.com"
              />
            </div>
          </div>
        </div>

        {/* SECTION: ADDRESS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wider uppercase">
              {isBangla ? 'ঠিকানা (Address)' : 'Address'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Present Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'বর্তমান ঠিকানা' : 'Present Address'}
              </label>
              <textarea
                value={presentAddress}
                onChange={(e) => setPresentAddress(e.target.value)}
                rows={3}
                maxLength={300}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all leading-relaxed"
                placeholder={isBangla ? 'গ্রাম, ডাকঘর, থানা, জেলা...' : 'Village, Post, Thana, District...'}
              />
            </div>

            {/* Permanent Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}
              </label>
              <textarea
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
                rows={3}
                maxLength={300}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all leading-relaxed"
                placeholder={isBangla ? 'গ্রাম, ডাকঘর, থানা, জেলা...' : 'Village, Post, Thana, District...'}
              />
            </div>
          </div>
        </div>

        {/* SECTION: EMERGENCY CONTACT */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wider uppercase">
              {isBangla ? 'জরুরী যোগাযোগ (Emergency Contact)' : 'Emergency Contact'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'জরুরী যোগাযোগের ব্যক্তির নাম' : 'Emergency Contact Name'}
              </label>
              <input
                type="text"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                maxLength={100}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder={isBangla ? 'নাম লিখুন' : 'Contact person name'}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'জরুরী যোগাযোগ মোবাইল' : 'Emergency Contact Mobile'}
              </label>
              <input
                type="tel"
                value={emergencyContactMobile}
                onChange={(e) => setEmergencyContactMobile(e.target.value)}
                maxLength={20}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono"
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>
        </div>

        {/* SECTION: PROFILE PICTURE */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wider uppercase">
              {isBangla ? 'প্রোফাইল ছবি (Profile Picture)' : 'Profile Picture'}
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Picture Container / Preview */}
            <div className="relative w-28 h-28 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt={fullName || member.fullName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-4xl font-black text-emerald-700">
                  {fullName?.charAt(0)?.toUpperCase() || member.fullName?.charAt(0)?.toUpperCase() || 'M'}
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-2.5 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="profile-picture-upload-input"
                />

                {/* Upload / Change Picture Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {photoPreview
                      ? (isBangla ? 'ছবি পরিবর্তন করুন' : 'Change Picture')
                      : (isBangla ? 'ছবি আপলোড করুন' : 'Upload Picture')}
                  </span>
                </button>

                {/* Remove Picture Button */}
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-bold rounded-xl border border-rose-200 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isBangla ? 'মুছুন' : 'Remove'}</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] sm:text-xs text-slate-500">
                {isBangla
                  ? 'সমর্থিত ফরম্যাট: JPG, PNG, WEBP (সর্বোচ্চ ৫ মেগাবাইট)।'
                  : 'Supported formats: JPG, PNG, WEBP (Max 5MB).'}
              </p>

              {photoError && (
                <div className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Assurance Notice */}
        <div className="flex items-start gap-2.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-slate-800">
              {isBangla ? 'আর্থিক ও নিরাপত্তা নীতিমালা:' : 'Financial & Security Policy:'}
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isBangla
                ? 'সদস্য আইডি, সদস্য নং, ভর্তি ফি, সঞ্চয়, মাসিক চাঁদা, ঋণ বা হিসাব ব্যবস্থার কোনো ডেটা প্রোফাইল আপডেটের মাধ্যমে পরিবর্তন করা যায় না। প্রোফাইল আপডেটের ফলে কোনো আর্থিক লেনদেন তৈরি হয় না।'
                : 'Member ID, Membership No, Admission Fee, Capital, Monthly Chanda, Loan Balances, and Accounting Journals cannot be altered via profile updates. No financial transactions are generated.'}
            </p>
          </div>
        </div>

        {/* Form Actions: [Save Changes] [Cancel] */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isBangla ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving Changes...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isBangla ? 'সংরক্ষণ করুন' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { Member, Nominee } from '../../types';
import { X, UserPlus, AlertCircle, Plus, Trash2, Camera, Trash, Upload } from 'lucide-react';
import { processImageFile } from '../../utils/imageUtils';
import { SOCIETY_OPENING_DATE } from '../../utils/constants';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMember?: Member | null;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  initialMember
}) => {
  const { db, addMember, updateMember, language } = useApp();
  const isBangla = language === 'bn';

  const isEdit = !!initialMember;

  const [memberId, setMemberId] = useState<string>(() =>
    initialMember ? initialMember.memberId : AccountingService.generateMemberId(db)
  );
  const [membershipNo, setMembershipNo] = useState<string>(() =>
    initialMember ? initialMember.membershipNo : `M-${String((db.members || []).length + 1).padStart(3, '0')}`
  );
  const [fullName, setFullName] = useState<string>(initialMember?.fullName || '');
  const [fatherName, setFatherName] = useState<string>(initialMember?.fatherName || '');
  const [motherName, setMotherName] = useState<string>(initialMember?.motherName || '');
  const [dateOfBirth, setDateOfBirth] = useState<string>(initialMember?.dateOfBirth || '1990-01-01');
  const [nid, setNid] = useState<string>(initialMember?.nid || '');
  const [occupation, setOccupation] = useState<string>(initialMember?.occupation || 'ব্যবসা');
  const [maritalStatus, setMaritalStatus] = useState<string>(initialMember?.maritalStatus || 'বিবাহিত');
  const [mobile, setMobile] = useState<string>(initialMember?.mobile || '');
  const [email, setEmail] = useState<string>(initialMember?.email || '');
  const [presentAddress, setPresentAddress] = useState<string>(
    initialMember?.presentAddress || 'গ্রাম: আতরগাঁও, পো: সরারচর, থানা: বাজিতপুর, জেলা: কিশোরগঞ্জ'
  );
  const [permanentAddress, setPermanentAddress] = useState<string>(
    initialMember?.permanentAddress || 'গ্রাম: আতরগাঁও, পো: সরারচর, থানা: বাজিতপুর, জেলা: কিশোরগঞ্জ'
  );
  const [bloodGroup, setBloodGroup] = useState<string>(initialMember?.bloodGroup || 'B+');
  const [joiningDate, setJoiningDate] = useState<string>(
    initialMember?.joiningDate || SOCIETY_OPENING_DATE
  );
  const [status, setStatus] = useState<Member['status']>(initialMember?.status || 'ACTIVE');
  const [remarks, setRemarks] = useState<string>(initialMember?.remarks || '');
  const [photo, setPhoto] = useState<string | undefined>(initialMember?.photo || initialMember?.photoUrl || initialMember?.photoPath);
  const [photoError, setPhotoError] = useState<string>('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Nominees
  const [nominees, setNominees] = useState<Nominee[]>(
    initialMember?.nominees || [
      {
        nomineeId: `NOM-${Date.now()}`,
        memberId: memberId,
        name: '',
        relation: 'স্ত্রী',
        mobile: '',
        nid: '',
        address: 'আতরগাঁও, বাজিতপুর',
        percentage: 100
      }
    ]
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddNominee = () => {
    setNominees([
      ...nominees,
      {
        nomineeId: `NOM-${Date.now()}`,
        memberId: memberId,
        name: '',
        relation: 'সন্তান',
        mobile: '',
        nid: '',
        address: presentAddress,
        percentage: 50
      }
    ]);
  };

  const handleRemoveNominee = (index: number) => {
    setNominees(nominees.filter((_, i) => i !== index));
  };

  const handleNomineeChange = (index: number, field: keyof Nominee, value: any) => {
    const updated = [...nominees];
    updated[index] = { ...updated[index], [field]: value };
    setNominees(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!fullName.trim() || !nid.trim() || !mobile.trim()) {
      setErrorMessage(
        isBangla
          ? 'অনুগ্রহ করে নাম, জাতীয় পরিচয়পত্র নম্বর (NID) এবং মোবাইল নম্বর সঠিকভাবে পূরণ করুন।'
          : 'Please enter Name, NID and Mobile number.'
      );
      return;
    }

    const memberData: Member = {
      memberId,
      membershipNo,
      fullName: fullName.trim(),
      fatherName: fatherName.trim(),
      motherName: motherName.trim(),
      dateOfBirth,
      nid: nid.trim(),
      occupation: occupation.trim(),
      maritalStatus,
      mobile: mobile.trim(),
      email: email.trim() || undefined,
      presentAddress: presentAddress.trim(),
      permanentAddress: permanentAddress.trim(),
            bloodGroup,
      joiningDate,
      photo,
      status,
      remarks: remarks.trim() || undefined,
      nominees,
      createdAt: initialMember?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'LOCAL'
    };

    if (isEdit) {
      const res = await updateMember(memberData);
      if (res.success) onClose();
      else setErrorMessage(res.message);
    } else {
      const res = await addMember(memberData);
      if (res.success) onClose();
      else setErrorMessage(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-emerald-800 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-base">
                {isEdit
                  ? isBangla ? 'সদস্য তথ্য সংশোধন / হালনাগাদ' : 'Edit Member Details'
                  : isBangla ? 'নতুন সদস্য অন্তর্ভুক্তি ফরম (Member Registration)' : 'New Member Registration'}
              </h3>
              <p className="text-xs text-emerald-200">{db.settings.orgShortName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-emerald-700 transition-colors text-emerald-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 p-3 px-5 flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                    {/* Photo Upload Row */}
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full border-2 border-emerald-100 overflow-hidden bg-white flex items-center justify-center text-emerald-600 font-black text-2xl shadow-sm">
                {photo ? (
                  <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  fullName ? fullName.charAt(0) : <Camera className="w-8 h-8 opacity-40" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-emerald-600 text-white p-1.5 rounded-full shadow-lg hover:bg-emerald-700 transition-colors border-2 border-white"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="font-semibold text-slate-700 text-sm mb-1">{isBangla ? 'সদস্যের ছবি' : 'Profile Photo'}</h4>
              <p className="text-slate-500 text-xs mb-3">{isBangla ? 'সর্বোচ্চ ৫ মেগাবাইট (JPG, PNG, WEBP)' : 'Max 5MB (JPG, PNG, WEBP)'}</p>
              {photoError && <p className="text-rose-600 text-xs font-semibold mb-2">{photoError}</p>}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const allowedTypes = ['image/jpeg','image/png','image/webp'];
                  if (!allowedTypes.includes(file.type)) {
                    setPhotoError(isBangla ? 'শুধুমাত্র JPG, PNG এবং WEBP ছবি সাপোর্ট করে' : 'Only JPG, PNG, and WEBP formats are supported');
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setPhotoError(isBangla ? 'ছবি ৫ মেগাবাইটের বড় হওয়া যাবে না' : 'Image size cannot exceed 5MB');
                    return;
                  }
                  setPhotoError('');
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setPhoto(event.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-xs"
              >
                {photo ? (isBangla ? 'ছবি পরিবর্তন করুন' : 'Change Photo') : (isBangla ? 'ছবি আপলোড করুন' : 'Upload Photo')}
              </button>
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto(undefined)}
                  className="px-3 py-1.5 ml-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium text-xs"
                >
                  {isBangla ? 'মুছে ফেলুন' : 'Remove'}
                </button>
              )}
            </div>
          </div>

          {/* Top Identifier Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'সদস্য আইডি (Auto)' : 'Member ID'}
              </label>
              <input
                type="text"
                value={memberId}
                readOnly
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-emerald-800 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'মেম্বারশিপ নং' : 'Membership No'}
              </label>
              <input
                type="text"
                required
                value={membershipNo}
                onChange={e => setMembershipNo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'যোগদানের তারিখ' : 'Joining Date'}
              </label>
              <input
                type="date"
                required
                value={joiningDate}
                onChange={e => setJoiningDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isBangla ? 'সদস্য পদমর্যাদা' : 'Status'}
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Member['status'])}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="ACTIVE">সক্রিয় (ACTIVE)</option>
                <option value="PENDING">অপেক্ষমাণ (PENDING)</option>
                <option value="INACTIVE">নিষ্ক্রিয় (INACTIVE)</option>
                <option value="SUSPENDED">স্থগিত (SUSPENDED)</option>
                <option value="RESIGNED">অব্যাহতিপ্রাপ্ত (RESIGNED)</option>
                <option value="DECEASED">মৃত (DECEASED)</option>
                <option value="TERMINATED">বহিষ্কৃত (TERMINATED)</option>
              </select>
            </div>
          </div>

          {/* Personal Info */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 pb-1 border-b border-slate-200">
              {isBangla ? '১. ব্যক্তিগত ও পারিবারিক তথ্য' : '1. Personal Details'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'সদস্যের পূর্ণ নাম *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: তোফায়েল আহমেদ"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'পিতার নাম' : "Father's Name"}
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={e => setFatherName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'মাতার নাম' : "Mother's Name"}
                </label>
                <input
                  type="text"
                  value={motherName}
                  onChange={e => setMotherName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'জাতীয় পরিচয়পত্র (NID) *' : 'NID No *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="10 / 17 সংখ্যার NID"
                  value={nid}
                  onChange={e => setNid(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'মোবাইল নম্বর *' : 'Mobile No *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="017XXXXXXXX"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'রক্তের গ্রুপ' : 'Blood Group'}
                </label>
                <select
                  value={bloodGroup}
                  onChange={e => setBloodGroup(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="Unknown">অজানা</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'পেশা' : 'Occupation'}
                </label>
                <input
                  type="text"
                  value={occupation}
                  onChange={e => setOccupation(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'বৈবাহিক অবস্থা' : 'Marital Status'}
                </label>
                <select
                  value={maritalStatus}
                  onChange={e => setMaritalStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                >
                  <option value="বিবাহিত">বিবাহিত (Married)</option>
                  <option value="অবিবাহিত">অবিবাহিত (Single)</option>
                  <option value="অন্যান্য">অন্যান্য</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'জন্ম তারিখ' : 'Date of Birth'}
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'বর্তমান ঠিকানা' : 'Present Address'}
                </label>
                <textarea
                  rows={2}
                  value={presentAddress}
                  onChange={e => setPresentAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}
                </label>
                <textarea
                  rows={2}
                  value={permanentAddress}
                  onChange={e => setPermanentAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Nominee Info */}
          <div>
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                {isBangla ? '২. নমিনি সংক্রান্ত তথ্য (Nominee Details)' : '2. Nominee Details'}
              </h4>
              <button
                type="button"
                onClick={handleAddNominee}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isBangla ? '+ আরও নমিনি যোগ করুন' : '+ Add Nominee'}</span>
              </button>
            </div>

            <div className="space-y-3">
              {(nominees || []).map((nom, idx) => (
                <div
                  key={nom.nomineeId || idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative"
                >
                  {nominees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveNominee(idx)}
                      className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-600 text-[11px] mb-0.5">
                        {isBangla ? 'নমিনির নাম' : 'Nominee Name'}
                      </label>
                      <input
                        type="text"
                        placeholder="নমিনির পূর্ণ নাম"
                        value={nom.name}
                        onChange={e => handleNomineeChange(idx, 'name', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 text-[11px] mb-0.5">
                        {isBangla ? 'সম্পর্ক' : 'Relationship'}
                      </label>
                      <input
                        type="text"
                        placeholder="যেমন: স্ত্রী / পুত্র"
                        value={nom.relation}
                        onChange={e => handleNomineeChange(idx, 'relation', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 text-[11px] mb-0.5">
                        {isBangla ? 'নমিনির মোবাইল' : 'Mobile'}
                      </label>
                      <input
                        type="text"
                        placeholder="মোবাইল নম্বর"
                        value={nom.mobile}
                        onChange={e => handleNomineeChange(idx, 'mobile', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 text-[11px] mb-0.5">
                        {isBangla ? 'অংশীদারিত্ব (%)' : 'Share (%)'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={nom.percentage}
                        onChange={e => handleNomineeChange(idx, 'percentage', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isBangla ? 'বিশেষ মন্তব্য / রেফারেন্স' : 'Remarks / Reference'}
            </label>
            <input
              type="text"
              placeholder="প্রয়োজনে বিশেষ তথ্য বা অনুমোদন রেফারেন্স লিখুন"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors text-xs"
            >
              {isBangla ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2 rounded-xl shadow-md transition-all active:scale-95 text-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {isEdit
                  ? isBangla ? 'তথ্য হালনাগাদ করুন' : 'Update Details'
                  : isBangla ? 'সদস্য সংরক্ষণ করুন' : 'Register Member'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

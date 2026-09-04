import React, { useState } from 'react';
import { Member } from '../../types';
import { useApp } from '../../context/AppContext';
import { updateMemberProfileAPI } from '../../services/api';
import { Save, X, User, Phone, MapPin, Heart, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  member: Member;
  onSave: (updatedMember: Member) => void;
  onCancel: () => void;
}

export const MemberProfileEditForm: React.FC<Props> = ({ member, onSave, onCancel }) => {
  const { language, showNotification } = useApp();
  const isBangla = language === 'bn';

  const [formData, setFormData] = useState({
    fullName: member.fullName || '',
    fatherName: member.fatherName || '',
    motherName: member.motherName || '',
    dateOfBirth: member.dateOfBirth || '',
    mobile: member.mobile || '',
    email: member.email || '',
    nid: member.nid || '',
    
    
    bloodGroup: member.bloodGroup || '',
    presentAddress: member.presentAddress || '',
    permanentAddress: member.permanentAddress || '',
    occupation: member.occupation || '',
    nominees: member.nominees || []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNomineeChange = (index: number, field: string, value: string) => {
    const newNominees = [...formData.nominees];
    newNominees[index] = { ...newNominees[index], [field]: value };
    setFormData(prev => ({ ...prev, nominees: newNominees }));
  };

  const addNominee = () => {
    setFormData(prev => ({
      ...prev,
      nominees: [...prev.nominees, { nomineeId: `NOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`, memberId: member.memberId, name: '', relation: '', percentage: 100, mobile: '', nid: '', address: '' }]
    }));
  };

  const removeNominee = (index: number) => {
    const newNominees = formData.nominees.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, nominees: newNominees }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    
    if (!formData.fullName.trim()) {
      setError(isBangla ? 'পুরো নাম আবশ্যক' : 'Full Name is required');
      setIsSaving(false);
      return;
    }

    try {
      const res = await updateMemberProfileAPI(formData);
      if (res.success && res.member) {
        showNotification(isBangla ? 'প্রোফাইল সফলভাবে আপডেট হয়েছে' : 'Profile updated successfully', 'success');
        onSave(res.member);
      } else {
        throw new Error('Failed to update');
      }
    } catch (err: any) {
      setError(err.message || (isBangla ? 'আপডেট ব্যর্থ হয়েছে' : 'Update failed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-emerald-50 border-b border-emerald-100 p-4 sm:p-6 flex justify-between items-center">
        <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" />
          {isBangla ? 'প্রোফাইল সম্পাদন করুন' : 'Edit Profile'}
        </h2>
        <button onClick={onCancel} className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-8 text-sm">
        {error && (
          <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Read-only IDs */}
        <div className="flex flex-wrap gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{isBangla ? 'সদস্য আইডি' : 'Member ID'}</label>
            <div className="font-bold text-slate-800">{member.memberId}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{isBangla ? 'সদস্য নং' : 'Membership No'}</label>
            <div className="font-bold text-slate-800">{member.membershipNo || 'N/A'}</div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-emerald-600" />
            {isBangla ? 'ব্যক্তিগত তথ্য' : 'Personal Information'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'পুরো নাম *' : 'Full Name *'}</label>
              <input 
                type="text" 
                name="fullName" 
                value={formData.fullName} 
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'জন্ম তারিখ' : 'Date of Birth'}</label>
              <input 
                type="date" 
                name="dateOfBirth" 
                value={formData.dateOfBirth} 
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'পিতার নাম' : "Father's Name"}</label>
              <input 
                type="text" 
                name="fatherName" 
                value={formData.fatherName} 
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'মাতার নাম' : "Mother's Name"}</label>
              <input 
                type="text" 
                name="motherName" 
                value={formData.motherName} 
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'পেশা' : 'Occupation'}</label>
              <input 
                type="text" 
                name="occupation" 
                value={formData.occupation} 
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'রক্তের গ্রুপ' : 'Blood Group'}</label>
              <select 
                name="bloodGroup" 
                value={formData.bloodGroup} 
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="">{isBangla ? 'নির্বাচন করুন' : 'Select'}</option>
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
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'জাতীয় পরিচয়পত্র' : 'NID'}</label>
              <input 
                type="text" 
                name="nid" 
                value={formData.nid} 
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            {isBangla ? 'যোগাযোগ ও ঠিকানা' : 'Contact & Address'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'মোবাইল নম্বর' : 'Mobile Number'}</label>
              <input 
                type="tel" 
                name="mobile" 
                value={formData.mobile} 
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'ইমেইল' : 'Email Address'}</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'বর্তমান ঠিকানা' : 'Present Address'}</label>
              <textarea 
                name="presentAddress" 
                value={formData.presentAddress} 
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}</label>
              <textarea 
                name="permanentAddress" 
                value={formData.permanentAddress} 
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Heart className="w-4 h-4 text-emerald-600" />
              {isBangla ? 'মনোনীত ব্যক্তি / নমিনী' : 'Nominee Information'}
            </h3>
            <button 
              type="button" 
              onClick={addNominee}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              {isBangla ? '+ নতুন নমিনী যোগ করুন' : '+ Add Nominee'}
            </button>
          </div>
          
          <div className="space-y-4">
            {formData.nominees.map((nominee, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative">
                <button 
                  type="button" 
                  onClick={() => removeNominee(idx)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'নাম' : 'Name'}</label>
                    <input 
                      type="text" 
                      value={nominee.name || ''} 
                      onChange={(e) => handleNomineeChange(idx, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'সম্পর্ক' : 'Relation'}</label>
                    <input 
                      type="text" 
                      value={nominee.relation || ''} 
                      onChange={(e) => handleNomineeChange(idx, 'relation', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'মোবাইল' : 'Mobile'}</label>
                    <input 
                      type="text" 
                      value={nominee.mobile || ''} 
                      onChange={(e) => handleNomineeChange(idx, 'mobile', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{isBangla ? 'অংশ (%)' : 'Share (%)'}</label>
                    <input 
                      type="number" 
                      value={nominee.percentage || 100} 
                      onChange={(e) => handleNomineeChange(idx, 'percentage', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
            {formData.nominees.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-4">{isBangla ? 'কোন নমিনী নেই' : 'No nominees added'}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button 
            type="button" 
            onClick={onCancel}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            {isBangla ? 'বাতিল' : 'Cancel'}
          </button>
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isBangla ? 'সংরক্ষণ করুন' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

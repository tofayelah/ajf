import React from 'react';
import { useApp } from '../../context/AppContext';
import { User, Phone, Mail, MapPin, Briefcase, Calendar, Camera } from 'lucide-react';
import { useRef } from 'react';

export const MemberProfileView: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { db, setDb, activeUser, language, showNotification } = useApp();
  const isBangla = language === 'bn';
  const member = (db.members || []).find(m => m.memberId === activeUser?.linkedMemberId);

  if (!member) return <div className="p-6">Member not found</div>;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-6">
        <User className="w-6 h-6 text-emerald-600" />
        <span>{isBangla ? 'আমার প্রোফাইল' : 'My Profile'}</span>
      </h1>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row gap-6">
        <div className="relative shrink-0">
          <div className="w-24 h-24 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 text-3xl font-black overflow-hidden shadow-sm border border-emerald-200">
            {member.photo || member.photoUrl || member.photoPath ? (
               <img src={member.photo || member.photoUrl || member.photoPath} alt={member.fullName} className="w-full h-full object-cover" />
            ) : (
               member.fullName.charAt(0)
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 bg-white text-emerald-600 p-1.5 rounded-full shadow-md border border-slate-200 hover:bg-emerald-50 transition-colors z-10"
            title={isBangla ? "ছবি পরিবর্তন করুন" : "Change Photo"}
          >
            <Camera className="w-4 h-4" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
              if (!allowedTypes.includes(file.type)) {
                showNotification(isBangla ? 'শুধুমাত্র JPG, PNG এবং WEBP ছবি সাপোর্ট করে' : 'Only JPG, PNG, and WEBP formats are supported', 'error');
                return;
              }
              if (file.size > 5 * 1024 * 1024) {
                showNotification(isBangla ? 'ছবি ৫ মেগাবাইটের বড় হওয়া যাবে না' : 'Image size cannot exceed 5MB', 'error');
                return;
              }
              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setDb(prev => ({
                  ...prev,
                  members: (prev.members || []).map(m => m.memberId === member.memberId ? { ...m, photo: dataUrl, photoUrl: dataUrl } : m)
                }));
                showNotification(isBangla ? 'ছবি সফলভাবে আপডেট হয়েছে' : 'Photo updated successfully', 'success');
              };
              reader.readAsDataURL(file);
            }} 
          />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">{member.fullName}</h3>
          <p className="text-sm font-semibold text-emerald-700 mb-4">ID: {member.memberId} | No: {member.membershipNo}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {member.mobile}</div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> {member.email || 'N/A'}</div>
            <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400" /> {member.occupation || 'N/A'}</div>
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> {member.joiningDate}</div>
            <div className="flex items-center gap-2 sm:col-span-2"><MapPin className="w-4 h-4 text-slate-400" /> {member.presentAddress}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

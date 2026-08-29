import React, { useState, useEffect } from 'react';
import { X, UserMinus, Clock, HeartPulse, UserX } from 'lucide-react';
import { Member } from '../../types';
import { useApp } from '../../context/AppContext';
import { NormalExitModal } from './NormalExitModal';
import { EarlyExitModal } from './EarlyExitModal';
import { DeathSettlementModal } from './DeathSettlementModal';

export const SettlementManagerModal: React.FC<{ member: Member; onClose: () => void }> = ({ member, onClose }) => {
  const { db } = useApp();
  
  // Find any existing active request
  const existingRequest = db.memberExits?.find(e => 
    e.memberId === member.memberId && 
    (e.status as string) !== "REJECTED" && 
    (e.status as string) !== "EXITED" && 
    (e.status as string) !== "REFUNDED" && 
    (e.status as string) !== "SETTLED" && 
    (e.status as string) !== "DECEASED"
  );

  const [selectedType, setSelectedType] = useState<'NORMAL' | 'EARLY' | 'DEATH_SETTLEMENT' | null>(
    (existingRequest?.exitType as 'NORMAL' | 'EARLY' | 'DEATH_SETTLEMENT') || null
  );

  if (selectedType === 'NORMAL') {
    return <NormalExitModal member={member} onClose={onClose} />;
  }

  if (selectedType === 'EARLY') {
    return <EarlyExitModal member={member} onClose={onClose} />;
  }

  if (selectedType === 'DEATH_SETTLEMENT') {
    return <DeathSettlementModal member={member} onClose={onClose} />;
  }
  
  if (member.status === 'EXITED' || member.status === 'DECEASED') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col p-8 text-center">
             <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4"><UserX className="w-8 h-8" /></div>
             <h2 className="text-xl font-bold text-slate-800 mb-2">Member Already Settled</h2>
             <p className="text-slate-600 mb-6">This member's account has already been closed and settled.</p>
             <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-medium">Close</button>
          </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Select Settlement Type</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 space-y-4">
          <button onClick={() => setSelectedType('NORMAL')} className="w-full flex items-start gap-4 p-4 rounded-xl border border-blue-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left">
             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0"><UserMinus className="w-5 h-5" /></div>
             <div>
               <h3 className="font-bold text-slate-800 text-base">Normal Exit (সদস্য পদত্যাগ)</h3>
               <p className="text-sm text-slate-500 mt-1">For members who have completed the mandatory 3-year tenure. Subject to 15% service charge.</p>
             </div>
          </button>
          
          <button onClick={() => setSelectedType('EARLY')} className="w-full flex items-start gap-4 p-4 rounded-xl border border-amber-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-left">
             <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0"><Clock className="w-5 h-5" /></div>
             <div>
               <h3 className="font-bold text-slate-800 text-base">Early Exit (আগাম সদস্যপদ প্রত্যাহার)</h3>
               <p className="text-sm text-slate-500 mt-1">For members exiting before 3 years. Requires special management approval. Subject to 15% service charge.</p>
             </div>
          </button>
          
          <button onClick={() => setSelectedType('DEATH_SETTLEMENT')} className="w-full flex items-start gap-4 p-4 rounded-xl border border-purple-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all text-left">
             <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center shrink-0"><HeartPulse className="w-5 h-5" /></div>
             <div>
               <h3 className="font-bold text-slate-800 text-base">Death Settlement (মৃত্যুজনিত হিসাব নিষ্পত্তি)</h3>
               <p className="text-sm text-slate-500 mt-1">Settle account with nominee/legal heir. Full settlement with 0% service charge and applicable profit.</p>
             </div>
          </button>
        </div>
      </div>
    </div>
  );
};

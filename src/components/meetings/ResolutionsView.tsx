import { AttachmentModal } from '../shared/AttachmentModal';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Resolution, ResolutionStatus } from '../../types';
import { PdfService } from '../../services/pdfService';
import {
  FileText,
  Search,
  PlusCircle,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  UserCheck
} from 'lucide-react';

export const ResolutionsView: React.FC = () => {
  const { db, postResolution, updateResolutionStatus, language } = useApp();
  const isBangla = language === 'bn';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedResForAttachments, setSelectedResForAttachments] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [meetingNo, setMeetingNo] = useState('AJ-M-2024-07');
  const [title, setTitle] = useState('');
  const [decision, setDecision] = useState('');
  const [proposer, setProposer] = useState('মো: সাজ্জাদ হোসেন');
  const [seconder, setSeconder] = useState('মো: তানভীর আহমেদ');
  const [assignedTo, setAssignedTo] = useState('অর্থ সম্পাদক');
  const [targetDate, setTargetDate] = useState('2024-08-31');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !decision.trim()) return;

    postResolution({
      meetingNo,
      title: title.trim(),
      decision: decision.trim(),
      proposer,
      seconder,
      assignedTo,
      targetDate
    });

    setIsAddModalOpen(false);
    setTitle('');
    setDecision('');
  };

  const filteredResolutions = (db.resolutions || []).filter(r => {
    return (
      (r.resolutionNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.decision || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.assignedTo || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handlePrint = () => {
    PdfService.printElement('printable-resolutions', 'Resolutions_Register');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'সিদ্ধান্ত ও রেজুলেশন ট্র্যাকার (Resolutions)' : 'Resolutions Register'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'সভার সর্বসম্মত সিদ্ধান্ত, প্রস্তাবক ও সমর্থক এবং বাস্তবায়ন অগ্রগতি মনিটরিং'
              : 'Governance resolution registry & action tracker'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{isBangla ? 'প্রিন্ট' : 'Print'}</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isBangla ? '+ নতুন রেজুলেশন' : '+ Add Resolution'}</span>
          </button>
        </div>
      </div>

      {/* Resolutions Grid */}
      <div id="printable-resolutions" className="space-y-4">
        {filteredResolutions.map(res => (
          <div
            key={res.resolutionId}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    {res.resolutionNo}
                  </span>
                  <span className="text-[11px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                    সভা: {res.meetingNo}
                  </span>
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-1">{res.title}</h3>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={res.status}
                  onChange={e =>
                    updateResolutionStatus(res.resolutionId, e.target.value as ResolutionStatus)
                  }
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    res.status === 'IMPLEMENTED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : res.status === 'IN_PROGRESS'
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  <option value="PENDING">অপেক্ষমাণ (Pending)</option>
                  <option value="IN_PROGRESS">চলমান (In Progress)</option>
                  <option value="IMPLEMENTED">বাস্তবায়িত ✓ (Implemented)</option>
                </select>
              </div>
            </div>

            {/* Decision Body */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-2">
              <p className="font-medium leading-relaxed">{res.decision}</p>
            </div>

            {/* Signatures & Execution details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-1">
              <div>
                <span className="text-slate-400 block">প্রস্তাবক:</span>
                <span className="font-semibold text-slate-800">{res.proposer}</span>
              </div>
              <div>
                <span className="text-slate-400 block">সমর্থক:</span>
                <span className="font-semibold text-slate-800">{res.seconder}</span>
              </div>
              <div>
                <span className="text-slate-400 block">দায়িত্বপ্রাপ্ত:</span>
                <span className="font-semibold text-indigo-900">{res.assignedTo}</span>
              </div>
              <div>
                <span className="text-slate-400 block">বাস্তবায়ন সময়সীমা:</span>
                <span className="font-mono font-semibold text-slate-800">{res.targetDate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Resolution Modal */}
      
      {selectedResForAttachments && (
        <AttachmentModal 
          entityType="RESOLUTION" 
          entityId={selectedResForAttachments} 
          title={`Resolution #${selectedResForAttachments}`} 
          onClose={() => setSelectedResForAttachments(null)} 
        />
      )}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">নতুন রেজুলেশন লিপিবদ্ধকরণ</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">সভা নির্বাচন</label>
                <select
                  value={meetingNo}
                  onChange={e => setMeetingNo(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  {(db.meetings || []).map(m => (
                    <option key={m.meetingNo} value={m.meetingNo}>
                      {m.meetingNo} - {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">রেজুলেশনের শিরোনাম *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: সমিতিতে ব্যাংক ডিপোজিট অটোমেশন চালু প্রসঙ্গে"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">গৃহীত সিদ্ধান্তের বিস্তারিত বিবরণ *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="বিস্তারিত সিদ্ধান্ত লিখুন..."
                  value={decision}
                  onChange={e => setDecision(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">প্রস্তাবক</label>
                  <input
                    type="text"
                    value={proposer}
                    onChange={e => setProposer(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">সমর্থক</label>
                  <input
                    type="text"
                    value={seconder}
                    onChange={e => setSeconder(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">বাস্তবায়ন দায়িত্ব</label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">টার্গেট তারিখ</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
                >
                  রেজুলেশন সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

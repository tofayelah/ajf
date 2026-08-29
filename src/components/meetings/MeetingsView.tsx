import React, { useState } from 'react';
import { CommitteeService } from '../../services/committeeService';
import { useApp } from '../../context/AppContext';
import { Meeting, MeetingAttendance, MeetingType } from '../../types';
import { PdfService } from '../../services/pdfService';
import {
  CalendarCheck,
  Search,
  PlusCircle,
  Users,
  MapPin,
  Clock,
  Printer,
  CheckCircle2,
  XCircle,
  FileText,
  Eye
} from 'lucide-react';

export const MeetingsView: React.FC = () => {
  const { db, addMeeting, updateMeeting, language, activeUser } = useApp();
  const isBangla = language === 'bn';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMeetingForAttendance, setSelectedMeetingForAttendance] = useState<Meeting | null>(null);

  // Form State
  const [meetingType, setMeetingType] = useState<MeetingType>('EXECUTIVE_MONTHLY');
  const [title, setTitle] = useState('নিয়মিত মাসিক কার্যনির্বাহী সভা');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('সন্ধ্যা ০৭:৩০');
  const [venue, setVenue] = useState('সমিতির অস্থায়ী কার্যালয়, আতরগাঁও');
  const activeCommittee = CommitteeService.getActiveCommittee(db);
  const defaultPresident = activeCommittee?.president ? `${activeCommittee.president.fullName} (সভাপতি)` : '';
  const [presidedBy, setPresidedBy] = useState(defaultPresident);
  const [agendasText, setAgendasText] = useState('১. বিগত সভার কার্যবিবরণী পাঠ ও অনুমোদন\n২. জুলাই মাসের চাঁদা আদায়ের হিসাব পর্যালোচনা\n৩. নতুন ঋণ আবেদন ও বিনিয়োগ প্রস্তাবনা\n৪. বিবিধ');

  
  const handleAttendanceChange = (meetingId: string, memberId: string, newStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    if (!selectedMeetingForAttendance || selectedMeetingForAttendance.meetingId !== meetingId) return;
    
    const updatedAttendances = (selectedMeetingForAttendance.attendances || []).map(a => 
      a.memberId === memberId ? { ...a, status: newStatus as any } : a
    );
    
    const updatedMeeting = { ...selectedMeetingForAttendance, attendances: updatedAttendances };
    setSelectedMeetingForAttendance(updatedMeeting);
    updateMeeting(updatedMeeting);
  };

  const handleMarkAllPresent = (meetingId: string) => {
    if (!selectedMeetingForAttendance || selectedMeetingForAttendance.meetingId !== meetingId) return;
    
    const updatedAttendances = (selectedMeetingForAttendance.attendances || []).map(a => 
      ({ ...a, status: 'PRESENT' as any })
    );
    
    const updatedMeeting = { ...selectedMeetingForAttendance, attendances: updatedAttendances };
    setSelectedMeetingForAttendance(updatedMeeting);
    updateMeeting(updatedMeeting);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const agendas = agendasText
      .split('\n')
      .map(a => a.trim())
      .filter(a => a.length > 0);

    const attendances: MeetingAttendance[] = (db.members || []).map(m => ({
      memberId: m.memberId,
      memberName: m.fullName,
      status: 'ABSENT',
      remarks: ''
    }));

    const meetingId = `MTG-${new Date().getFullYear()}-${String((db.meetings || []).length + 1).padStart(4, '0')}`;
    addMeeting({ meetingId, meetingNo: meetingId, status: 'PLANNED', createdAt: new Date().toISOString(),
      meetingType,
      title: title.trim(),
      date,
      time,
      venue,
      presidedBy,
      agendas,
      attendances
    });

    setIsAddModalOpen(false);
  };

  const handlePrint = () => {
    PdfService.printElement('printable-meetings', 'Meetings_Register');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'সভা ও উপস্থিতি রেজিস্টার (Meetings & Attendance)' : 'Meetings & Attendance'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'সাধারণ সভা (AGM), মাসিক কার্যনির্বাহী সভা এবং সদস্যদের উপস্থিতি রেজিস্টার'
              : 'Governance meetings, agendas & member attendance'}
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
            <span>{isBangla ? '+ নতুন সভা আহ্বান' : '+ Schedule Meeting'}</span>
          </button>
        </div>
      </div>

      {/* Meetings List */}
      <div id="printable-meetings" className="space-y-4">
        {(db.meetings || []).map(meeting => {
          const presentCount = (meeting.attendances || []).filter(a => a.status === 'PRESENT').length;
          const lateCount = (meeting.attendances || []).filter(a => a.status === 'LATE').length;
          const absentCount = (meeting.attendances || []).filter(a => a.status === 'ABSENT').length;
          const excusedCount = (meeting.attendances || []).filter(a => a.status === 'EXCUSED').length;
          const totalMembers = (meeting.attendances || []).length;
          const attendancePercent = totalMembers > 0 ? Math.round(((presentCount + lateCount) / totalMembers) * 100) : 0;

          return (
            <div
              key={meeting.meetingId}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      {meeting.meetingNo}
                    </span>
                    <span className="text-[11px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                      {meeting.meetingType}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-1">
                    {meeting.title}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{meeting.date} ({meeting.time})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{meeting.venue}</span>
                  </div>
                </div>
              </div>

              {/* Agendas & Attendance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Agendas */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-1.5 uppercase text-[10px] tracking-wider">
                    সভার আলোচ্যসূচি (Agendas)
                  </h4>
                  <ul className="space-y-1 text-slate-700">
                    {(Array.isArray(meeting.agendas) ? meeting.agendas : (meeting.agendas || meeting.agenda || '').split('\n').filter(Boolean)).map((ag: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-700 font-bold">•</span>
                        <span>{ag}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Attendance */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1.5 uppercase text-[10px] tracking-wider flex justify-between">
                      <span>উপস্থিতি ও কোরাম (Quorum)</span>
                      <span className="text-emerald-800 font-bold">{attendancePercent}% উপস্থিতি</span>
                    </h4>
                    <div className="text-slate-600 grid grid-cols-4 gap-1 text-[10px] mt-1">
                      <div className="bg-emerald-100 text-emerald-800 p-1 rounded text-center"><strong>{presentCount}</strong><br/>Present</div>
                      <div className="bg-amber-100 text-amber-800 p-1 rounded text-center"><strong>{lateCount}</strong><br/>Late</div>
                      <div className="bg-blue-100 text-blue-800 p-1 rounded text-center"><strong>{excusedCount}</strong><br/>Excused</div>
                      <div className="bg-rose-100 text-rose-800 p-1 rounded text-center"><strong>{absentCount}</strong><br/>Absent</div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      সভাপতি: <strong>{meeting.presidedBy}</strong>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => setSelectedMeetingForAttendance(meeting)}
                      className="text-xs text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>উপস্থিতি রেজিস্টার শিট দেখুন →</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      
      {/* Attendance Detail Sheet Modal */}
      {selectedMeetingForAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  উপস্থিতি রেজিস্টার: {selectedMeetingForAttendance.meetingNo}
                </h3>
                <p className="text-[11px] text-slate-500">{selectedMeetingForAttendance.title}</p>
              </div>
              <button
                onClick={() => setSelectedMeetingForAttendance(null)}
                className="text-slate-400"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              <div className="flex justify-between items-center py-2 px-1">
                <span className="text-xs font-semibold">Total Members: {(selectedMeetingForAttendance.attendances || []).length}</span>
                <button 
                  onClick={() => handleMarkAllPresent(selectedMeetingForAttendance.meetingId)}
                  className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-[10px] font-bold"
                >
                  Mark All Present
                </button>
              </div>
              {(selectedMeetingForAttendance.attendances || []).map((att, idx) => (
                <div key={idx} className="py-3 flex flex-col gap-2 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">{att.memberName}</span>
                      <span className="font-mono text-[10px] text-slate-500">{att.memberId}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAttendanceChange(selectedMeetingForAttendance.meetingId, att.memberId, 'PRESENT')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${att.status === 'PRESENT' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Present
                    </button>
                    <button 
                      onClick={() => handleAttendanceChange(selectedMeetingForAttendance.meetingId, att.memberId, 'ABSENT')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${att.status === 'ABSENT' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Absent
                    </button>
                    <button 
                      onClick={() => handleAttendanceChange(selectedMeetingForAttendance.meetingId, att.memberId, 'LATE')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${att.status === 'LATE' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Late
                    </button>
                    <button 
                      onClick={() => handleAttendanceChange(selectedMeetingForAttendance.meetingId, att.memberId, 'EXCUSED')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-colors ${att.status === 'EXCUSED' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Excused
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setSelectedMeetingForAttendance(null)}
                className="bg-slate-800 text-white px-4 py-1.5 rounded-lg font-bold"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Meeting Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">নতুন সভা আহ্বান ফরম</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">সভার ধরন</label>
                <select
                  value={meetingType}
                  onChange={e => setMeetingType(e.target.value as MeetingType)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="EXECUTIVE_MONTHLY">নিয়মিত মাসিক কার্যনির্বাহী সভা</option>
                  <option value="AGM">বার্ষিক সাধারণ সভা (AGM)</option>
                  <option value="EGM">জরুরী সাধারণ সভা (EGM)</option>
                  <option value="EMERGENCY">জরুরি সভা (Emergency Meeting)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">সভার শিরোনাম *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">তারিখ</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">সময়</label>
                  <input
                    type="text"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">স্থান (Venue)</label>
                <input
                  type="text"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">সভাপতি</label>
                <input
                  type="text"
                  value={presidedBy}
                  onChange={e => setPresidedBy(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  আলোচ্যসূচি (প্রতি লাইনে একটি করে এজেন্ডা লিখুন)
                </label>
                <textarea
                  rows={4}
                  value={agendasText}
                  onChange={e => setAgendasText(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
                />
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
                  সভা সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

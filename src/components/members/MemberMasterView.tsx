import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { Member } from '../../types';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  CreditCard,
  Droplet,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  Edit,
  ArrowRight,
  Eye,
  Filter,
  Camera,
  UserX,
  UserCheck,
  Trash2,
  LogOut,
  BookOpen,
  LayoutList,
  LayoutGrid,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AddMemberModal } from './AddMemberModal';
import { MemberProfileModal } from './MemberProfileModal';
import { MemberActionModals } from './MemberActionModals';
import { SettlementManagerModal } from './SettlementManagerModal';

interface MemberMasterViewProps {
  onOpenCollection: (memberId: string) => void;
}

export const MemberMasterView: React.FC<MemberMasterViewProps> = ({
  onOpenCollection
}) => {
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
  const { db, setDb, language, showNotification, navigateTo, getCurrentUser } = useApp();
  const isBangla = language === 'bn';
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [pageSize, setPageSize] = useState<number | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [actionModal, setActionModal] = useState<{ member: Member; mode: 'DEACTIVATE' | 'REACTIVATE' | 'DELETE' } | null>(null);
  const [exitRequestMember, setExitRequestMember] = useState<Member | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMemberId, setUploadingMemberId] = useState<string | null>(null);

  // Active exit requests
  const activeExits = useMemo(() => {
    return (db.memberExits || []).filter(e => 
      !['EXITED', 'REFUNDED', 'REJECTED', 'SETTLED'].includes(e.status)
    );
  }, [db.memberExits]);

  const getMemberCategory = (m: Member): string => {
    if (m.status === 'DECEASED') return 'DECEASED';
    const pendingExit = activeExits.find(e => e.memberId === m.memberId);
    if (pendingExit) {
      if (pendingExit.exitType === 'NORMAL') return 'NORMAL_EXIT';
      if (pendingExit.exitType === 'EARLY') return 'EARLY_EXIT';
      if (pendingExit.exitType === 'DEATH_SETTLEMENT') return 'DEATH_SETTLEMENT';
    }
    return m.status;
  };

  const memberCategories = (db.members || []).map(m => getMemberCategory(m));
  
  const statusCounts = {
    ACTIVE: memberCategories.filter(c => c === 'ACTIVE').length,
    PENDING: memberCategories.filter(c => c === 'PENDING').length,
    NORMAL_EXIT: memberCategories.filter(c => c === 'NORMAL_EXIT').length,
    EARLY_EXIT: memberCategories.filter(c => c === 'EARLY_EXIT').length,
    DEATH_SETTLEMENT: memberCategories.filter(c => c === 'DEATH_SETTLEMENT').length,
    DECEASED: memberCategories.filter(c => c === 'DECEASED').length,
  };

  // Natural sort by Member ID / Membership No ascending (AJM-000001 -> AJM-000050)
  const sortedMembers = useMemo(() => {
    return [...(db.members || [])].sort((a, b) => 
      (a.memberId || '').localeCompare(b.memberId || '', undefined, { numeric: true })
    );
  }, [db.members]);

  // Filter Members based on search term and category filters
  const filteredMembers = useMemo(() => {
    return sortedMembers.filter(m => {
      const matchesSearch =
        (m.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.memberId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.membershipNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.mobile || "").includes(searchTerm) ||
        (m.nid || "").includes(searchTerm);

      const mCategory = getMemberCategory(m);
      const matchesStatus = statusFilter === 'ALL' || mCategory === statusFilter;
      const matchesBlood = bloodGroupFilter === 'ALL' || m.bloodGroup === bloodGroupFilter;

      return matchesSearch && matchesStatus && matchesBlood;
    });
  }, [sortedMembers, searchTerm, statusFilter, bloodGroupFilter, activeExits]);

  // Pagination & Dynamic Continuous Serial Computation
  const totalItems = filteredMembers.length;
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const displayedMembers = useMemo(() => {
    if (pageSize === 'ALL') {
      return filteredMembers.map((member, index) => ({
        serial: index + 1,
        member
      }));
    }
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredMembers.slice(startIndex, startIndex + pageSize).map((member, index) => ({
      serial: startIndex + index + 1,
      member
    }));
  }, [filteredMembers, pageSize, safeCurrentPage]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleBloodGroupFilterChange = (val: string) => {
    setBloodGroupFilter(val);
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">সক্রিয়</span>;
      case 'PENDING':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">অপেক্ষমাণ</span>;
      case 'NORMAL_EXIT':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">সাধারণ প্রস্থান</span>;
      case 'EARLY_EXIT':
        return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">আগাম প্রস্থান</span>;
      case 'DEATH_SETTLEMENT':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">মৃত্যু নিষ্পত্তি</span>;
      case 'INACTIVE':
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">নিষ্ক্রিয়</span>;
      case 'SUSPENDED':
        return <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">স্থগিত</span>;
      case 'DECEASED':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">মরহুম</span>;
      default:
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{status}</span>;
    }
  };

  return (
    <div className="space-y-4 pb-12 w-full max-w-full overflow-x-hidden">
      {/* Header & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'সদস্য তালিকা ও রেজিস্টার (Member Master)' : 'Member Master & Register'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? `মোট ${(db.members || []).length} জন সদস্যের মধ্যে ${filteredMembers.length} জন প্রদর্শিত (ক্রমিক ১ → ${filteredMembers.length})`
              : `Showing ${filteredMembers.length} of ${(db.members || []).length} members (Serial 1 → ${filteredMembers.length})`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher (Table / Cards) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'TABLE' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={isBangla ? 'রেজিস্টার টেবিল ভিউ' : 'Register Table View'}
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline">{isBangla ? 'টেবিল' : 'Table'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'GRID' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={isBangla ? 'কার্ড গ্রিড ভিউ' : 'Cards Grid View'}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">{isBangla ? 'কার্ড' : 'Cards'}</span>
            </button>
          </div>

          <button
            onClick={() => {
              navigateTo('ADMISSION');
            }}
            id="add-new-member-btn"
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isBangla ? '+ নতুন সদস্য ভর্তি' : '+ Add New Member'}</span>
          </button>
        </div>
      </div>

      {/* Status Summary Cards (Scrollable Row) */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 w-full overflow-hidden">
        <div className="flex overflow-x-auto gap-3 pb-4 pt-1 snap-x no-scrollbar overscroll-x-contain w-full">
        {[
          { id: 'ACTIVE', label: isBangla ? 'সক্রিয়' : 'Active', count: statusCounts.ACTIVE, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300', activeRing: 'ring-emerald-500' },
          { id: 'PENDING', label: isBangla ? 'অপেক্ষমাণ' : 'Pending', count: statusCounts.PENDING, color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300', activeRing: 'ring-amber-500' },
          { id: 'NORMAL_EXIT', label: isBangla ? 'সাধারণ প্রস্থান' : 'Normal Exit', count: statusCounts.NORMAL_EXIT, color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300', activeRing: 'ring-blue-500' },
          { id: 'EARLY_EXIT', label: isBangla ? 'আগাম প্রস্থান' : 'Early Exit', count: statusCounts.EARLY_EXIT, color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300', activeRing: 'ring-indigo-500' },
          { id: 'DEATH_SETTLEMENT', label: isBangla ? 'মৃত্যু নিষ্পত্তি' : 'Death Settlement', count: statusCounts.DEATH_SETTLEMENT, color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300', activeRing: 'ring-rose-500' },
          { id: 'DECEASED', label: isBangla ? 'মরহুম' : 'Deceased', count: statusCounts.DECEASED, color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300', activeRing: 'ring-purple-500' }
        ].map(status => (
          <button
            key={status.id}
            onClick={() => handleStatusFilterChange(statusFilter === status.id ? 'ALL' : status.id)}
            className={`shrink-0 snap-start flex-1 min-w-[140px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === status.id ? 'ring-2 ring-offset-1 ' + status.activeRing : ''
            } ${status.color}`}
          >
            <div className="text-xs font-semibold mb-1 opacity-80">{status.label}</div>
            <div className="text-2xl font-bold">{status.count}</div>
          </button>
        ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {/* Search input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={
                isBangla
                  ? 'সদস্য নাম, আইডি (AJM-000001), মোবাইল, বা এনআইডি...'
                  : 'Search by Name, Member ID, Mobile, NID...'
              }
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => handleStatusFilterChange(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium cursor-pointer"
            >
              <option value="ALL">সকল স্ট্যাটাস (All Status)</option>
              <option value="ACTIVE">সক্রিয় (Active)</option>
              <option value="PENDING">অপেক্ষমাণ (Pending)</option>
              <option value="NORMAL_EXIT">সাধারণ প্রস্থান (Normal Exit)</option>
              <option value="EARLY_EXIT">আগাম প্রস্থান (Early Exit)</option>
              <option value="DEATH_SETTLEMENT">মৃত্যু নিষ্পত্তি (Death Settlement)</option>
              <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
              <option value="SUSPENDED">স্থগিত (Suspended)</option>
              <option value="DECEASED">মরহুম (Deceased)</option>
            </select>
          </div>

          {/* Blood Group Filter */}
          <div>
            <select
              value={bloodGroupFilter}
              onChange={e => handleBloodGroupFilterChange(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium cursor-pointer"
            >
              <option value="ALL">রক্তের গ্রুপ (সকল)</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>

          {/* Page Size Selector */}
          <div>
            <select
              value={pageSize}
              onChange={e => {
                const val = e.target.value;
                setPageSize(val === 'ALL' ? 'ALL' : Number(val));
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium cursor-pointer"
            >
              <option value="ALL">{isBangla ? 'সকল সদস্য (১–৫০)' : 'All Members (1–50)'}</option>
              <option value="25">{isBangla ? '২৫ জন প্রতি পেজ' : '25 per page'}</option>
              <option value="10">{isBangla ? '১০ জন প্রতি পেজ' : '10 per page'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Member Display (Table or Grid) */}
      {displayedMembers.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            {isBangla ? 'কোনো সদস্য খুঁজে পাওয়া যায়নি' : 'No members found'}
          </p>
          <p className="text-xs text-slate-500">
            {isBangla ? 'আপনার অনুসন্ধানের মান বা ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।' : 'Try changing search terms or clearing filters.'}
          </p>
        </div>
      ) : viewMode === 'TABLE' ? (
        /* TABLE VIEW (Register Table) */
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-16 text-center">{isBangla ? 'ক্রমিক' : 'Serial'}</th>
                  <th className="p-3 w-28">{isBangla ? 'সদস্য আইডি' : 'Member ID'}</th>
                  <th className="p-3 min-w-[180px]">{isBangla ? 'সদস্যের নাম' : 'Member Name'}</th>
                  <th className="p-3 min-w-[140px]">{isBangla ? 'মোবাইল ও এনআইডি' : 'Mobile & NID'}</th>
                  <th className="p-3 w-20 text-center">{isBangla ? 'রক্ত' : 'Blood'}</th>
                  <th className="p-3 w-24 text-center">{isBangla ? 'অবস্থা' : 'Status'}</th>
                  <th className="p-3 text-right min-w-[100px]">{isBangla ? 'মোট জমা' : 'Balance'}</th>
                  <th className="p-3 text-right min-w-[110px]">{isBangla ? 'বকেয়া' : 'Due'}</th>
                  <th className="p-3 w-40 text-center">{isBangla ? 'পদক্ষেপ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedMembers.map(({ serial, member }) => {
                  const dueInfo = AccountingService.calculateMemberDue(
                    member,
                    db.collections,
                    db.settings.monthlyContribution,
                    db.settings.lateFine,
                    db.settings.latePaymentDay
                  );
                  const memberBalance = AccountingService.getMemberRunningBalance(
                    db.memberLedgers,
                    member.memberId
                  );

                  return (
                    <tr key={member.memberId} className="hover:bg-slate-50/90 transition-colors">
                      {/* 1. Serial (ক্রমিক) */}
                      <td className="p-3 text-center font-mono font-bold text-slate-700 bg-slate-50/40">
                        {serial}
                      </td>

                      {/* 2. Member ID (AJM-000001) */}
                      <td className="p-3 font-mono">
                        <span className="font-bold text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-100">
                          {member.memberId}
                        </span>
                        {member.membershipNo && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                            {member.membershipNo}
                          </div>
                        )}
                      </td>

                      {/* 3. Member Name & Photo */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <div className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-xs shadow-xs">
                              {member.photo || member.photoUrl || member.photoPath ? (
                                <img
                                  src={member.photo || member.photoUrl || member.photoPath}
                                  alt="Photo"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                member.fullName?.charAt(0)?.toUpperCase() || 'M'
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadingMemberId(member.memberId);
                                setTimeout(() => fileInputRef.current?.click(), 0);
                              }}
                              className="absolute -bottom-1 -right-1 bg-white text-emerald-700 p-0.5 rounded-full shadow-xs border border-slate-200 hover:bg-emerald-50 transition-colors z-10 cursor-pointer"
                              title={isBangla ? "ছবি পরিবর্তন করুন" : "Change Photo"}
                            >
                              <Camera className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{member.fullName}</div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {member.fatherName ? `পিতা: ${member.fatherName}` : (member.occupation || '—')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 4. Mobile & NID */}
                      <td className="p-3 text-xs">
                        <div className="font-mono font-semibold text-slate-800 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{member.mobile || '—'}</span>
                        </div>
                        {member.nid && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            NID: {member.nid}
                          </div>
                        )}
                      </td>

                      {/* 5. Blood Group */}
                      <td className="p-3 text-center">
                        {member.bloodGroup ? (
                          <span className="inline-flex items-center gap-0.5 font-bold text-rose-700 text-xs bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            <Droplet className="w-3 h-3 text-rose-500 shrink-0" />
                            {member.bloodGroup}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 6. Status */}
                      <td className="p-3 text-center">
                        {getStatusBadge(getMemberCategory(member))}
                      </td>

                      {/* 7. Total Balance */}
                      <td className="p-3 text-right font-mono font-bold text-emerald-800">
                        ৳{memberBalance?.toLocaleString()}
                      </td>

                      {/* 8. Due */}
                      <td className="p-3 text-right">
                        {dueInfo.totalDueAmount > 0 ? (
                          <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[11px] whitespace-nowrap border border-rose-100">
                            ৳{dueInfo.totalDueAmount.toLocaleString()} ({dueInfo.monthsDueCount}ম)
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-700 text-[11px] whitespace-nowrap">
                            {isBangla ? 'পরিশোধিত ✓' : 'Paid ✓'}
                          </span>
                        )}
                      </td>

                      {/* 9. Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingMemberId(member.memberId)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                            title={isBangla ? "প্রোফাইল বিবরণ" : "View Profile"}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => navigateTo('MEMBER_LEDGER', member.memberId)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-100/70 rounded-lg transition-colors cursor-pointer"
                            title={isBangla ? "সদস্য খতিয়ান (Member Ledger)" : "Member Ledger"}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => setExitRequestMember(member)}
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-100/70 rounded-lg transition-colors cursor-pointer"
                            title={isBangla ? "হিসাব নিষ্পত্তি / Settlement" : "Settlement"}
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingMember(member);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                            title={isBangla ? "তথ্য সংশোধন" : "Edit Info"}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {isAdmin && (
                            <>
                              {member.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => setActionModal({ member, mode: 'DEACTIVATE' })}
                                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-100/70 rounded-lg transition-colors cursor-pointer"
                                  title={isBangla ? "সদস্য নিষ্ক্রিয় করুন" : "Deactivate Member"}
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setActionModal({ member, mode: 'REACTIVATE' })}
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/70 rounded-lg transition-colors cursor-pointer"
                                  title={isBangla ? "সদস্য পুনরায় সক্রিয় করুন" : "Reactivate Member"}
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => setActionModal({ member, mode: 'DELETE' })}
                                className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-100/70 rounded-lg transition-colors cursor-pointer"
                                title={isBangla ? "সদস্য মুছুন" : "Delete Member"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => onOpenCollection(member.memberId)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer ml-1"
                            title={isBangla ? 'চাঁদা আদায়' : 'Collect'}
                          >
                            <span>{isBangla ? 'আদায়' : 'Collect'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pageSize !== 'ALL' && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
              <div className="text-slate-500">
                {isBangla
                  ? `${totalItems} জন সদস্যের মধ্যে ${(safeCurrentPage - 1) * (pageSize as number) + 1}–${Math.min(safeCurrentPage * (pageSize as number), totalItems)} জন প্রদর্শিত`
                  : `Showing ${(safeCurrentPage - 1) * (pageSize as number) + 1}–${Math.min(safeCurrentPage * (pageSize as number), totalItems)} of ${totalItems} members`}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={safeCurrentPage <= 1}
                  className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700 px-2">
                  {safeCurrentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {displayedMembers.map(({ serial, member }) => {
              const dueInfo = AccountingService.calculateMemberDue(
                member,
                db.collections,
                db.settings.monthlyContribution,
                db.settings.lateFine,
                db.settings.latePaymentDay
              );
              const memberBalance = AccountingService.getMemberRunningBalance(
                db.memberLedgers,
                member.memberId
              );

              return (
                <div
                  key={member.memberId}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    {/* Top Row: Serial, ID, Membership & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full border border-slate-200 overflow-hidden bg-emerald-50 flex items-center justify-center text-emerald-600 font-black shadow-sm">
                            {member.photo || member.photoUrl || member.photoPath ? (
                              <img
                                src={member.photo || member.photoUrl || member.photoPath}
                                alt="Photo"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              member.fullName?.charAt(0)?.toUpperCase() || 'M'
                            )}
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadingMemberId(member.memberId);
                              setTimeout(() => fileInputRef.current?.click(), 0);
                            }}
                            className="absolute -bottom-1 -right-1 bg-white text-emerald-600 p-1 rounded-full shadow border border-slate-200 hover:bg-emerald-50 transition-colors z-10 cursor-pointer"
                            title={isBangla ? "ছবি পরিবর্তন করুন" : "Change Photo"}
                          >
                            <Camera className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Serial Badge */}
                            <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                              {isBangla ? 'ক্রমিক' : 'Serial'} #{serial}
                            </span>
                            {/* Member ID */}
                            <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded shrink-0">
                              {member.memberId}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono shrink-0">
                              {member.membershipNo}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-slate-900 mt-1 truncate">{member.fullName}</h3>
                          <p className="text-[11px] text-slate-500 truncate">{member.fatherName ? `পিতা: ${member.fatherName}` : member.occupation}</p>
                        </div>
                      </div>
                      <div className="shrink-0">{getStatusBadge(getMemberCategory(member))}</div>
                    </div>

                    {/* Contact & Bio Info */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg text-slate-600">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono truncate">{member.mobile}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Droplet className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>রক্ত: {member.bloodGroup || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate col-span-2">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[10px] truncate">NID: {member.nid}</span>
                      </div>
                    </div>

                    {/* Financial Due / Balance Status Box */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-500 block">মোট জমা ব্যালেন্স:</span>
                        <span className="font-bold text-emerald-800">
                          ৳{memberBalance?.toLocaleString()}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">বকেয়া চাঁদা:</span>
                        {dueInfo.totalDueAmount > 0 ? (
                          <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">
                            {dueInfo.monthsDueCount} মাস (৳{dueInfo.totalDueAmount.toLocaleString()})
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-700 text-[11px]">
                            পরিশোধিত ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="bg-slate-50 px-3 py-2 border-t border-slate-200 flex items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingMemberId(member.memberId)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                        title={isBangla ? "প্রোফাইল বিবরণ" : "View Profile"}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => navigateTo('MEMBER_LEDGER', member.memberId)}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-100/70 rounded-lg transition-colors cursor-pointer"
                        title={isBangla ? "সদস্য খতিয়ান (Member Ledger)" : "Member Ledger"}
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => setExitRequestMember(member)}
                        className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-100/70 rounded-lg transition-colors cursor-pointer"
                        title={isBangla ? "হিসাব নিষ্পত্তি / Settlement" : "Settlement"}
                      >
                        <LogOut className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setIsAddModalOpen(true);
                        }}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                        title={isBangla ? "তথ্য সংশোধন" : "Edit Info"}
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <>
                          {member.status === 'ACTIVE' ? (
                            <button
                              onClick={() => setActionModal({ member, mode: 'DEACTIVATE' })}
                              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-100/70 rounded-lg transition-colors cursor-pointer"
                              title={isBangla ? "সদস্য নিষ্ক্রিয় করুন" : "Deactivate Member"}
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setActionModal({ member, mode: 'REACTIVATE' })}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100/70 rounded-lg transition-colors cursor-pointer"
                              title={isBangla ? "সদস্য পুনরায় সক্রিয় করুন" : "Reactivate Member"}
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setActionModal({ member, mode: 'DELETE' })}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-100/70 rounded-lg transition-colors cursor-pointer"
                            title={isBangla ? "সদস্য মুছুন" : "Delete Member"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => onOpenCollection(member.memberId)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                      <span>{isBangla ? 'চাঁদা আদায়' : 'Collect'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls for Grid */}
          {pageSize !== 'ALL' && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-200 text-xs">
              <div className="text-slate-500">
                {isBangla
                  ? `${totalItems} জন সদস্যের মধ্যে ${(safeCurrentPage - 1) * (pageSize as number) + 1}–${Math.min(safeCurrentPage * (pageSize as number), totalItems)} জন প্রদর্শিত`
                  : `Showing ${(safeCurrentPage - 1) * (pageSize as number) + 1}–${Math.min(safeCurrentPage * (pageSize as number), totalItems)} of ${totalItems} members`}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={safeCurrentPage <= 1}
                  className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700 px-2">
                  {safeCurrentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={safeCurrentPage >= totalPages}
                  className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Member Action Modals (Deactivate / Reactivate / Delete) */}
      {exitRequestMember && (
        <SettlementManagerModal member={exitRequestMember} onClose={() => setExitRequestMember(null)} />
      )}
      {actionModal && (
        <MemberActionModals
          member={actionModal.member}
          mode={actionModal.mode}
          onClose={() => setActionModal(null)}
          onSuccess={() => {
            setActionModal(null);
          }}
        />
      )}

      {/* Add / Edit Member Modal */}
      {viewingMemberId && (
        <MemberProfileModal 
          memberId={viewingMemberId}
          onClose={() => setViewingMemberId(null)}
        />
      )}
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file || !uploadingMemberId) return;
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (!allowedTypes.includes(file.type)) {
            showNotification(isBangla ? 'শুধুমাত্র JPG, PNG এবং WEBP ছবি সাপোর্ট করে' : 'Only JPG, PNG, and WEBP formats are supported', 'error');
            setUploadingMemberId(null);
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            showNotification(isBangla ? 'ছবি ৫ মেগাবাইটের বড় হওয়া যাবে না' : 'Image size cannot exceed 5MB', 'error');
            setUploadingMemberId(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setDb(prev => ({
              ...prev,
              members: (prev.members || []).map(m => m.memberId === uploadingMemberId ? { ...m, photo: dataUrl, photoUrl: dataUrl } : m)
            }));
            showNotification(isBangla ? 'ছবি সফলভাবে আপডেট হয়েছে' : 'Photo updated successfully', 'success');
            setUploadingMemberId(null);
          };
          reader.readAsDataURL(file);
        }} 
      />
      
      {isAddModalOpen && (
        <AddMemberModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingMember(null);
          }}
          initialMember={editingMember}
        />
      )}
    </div>
  );
};

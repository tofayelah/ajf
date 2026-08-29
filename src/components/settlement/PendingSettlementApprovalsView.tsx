import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  AlertCircle, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  ClipboardCheck, 
  X, 
  UserCheck, 
  AlertTriangle,
  Info,
  Calendar,
  DollarSign,
  User,
  Shield,
  FileText
} from 'lucide-react';
import { MemberExitRequest, Member } from '../../types';

export const PendingSettlementApprovalsView = () => {
  const { 
    db, 
    language, 
    activeUser, 
    showNotification,
    reviewMemberExit, 
    approveMemberExit, 
    rejectMemberExit 
  } = useApp();
  
  const isBangla = language === 'bn';
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal States
  const [viewingExitId, setViewingExitId] = useState<string | null>(null);
  const [reviewingExitId, setReviewingExitId] = useState<string | null>(null);
  const [approvingExitId, setApprovingExitId] = useState<string | null>(null);
  const [rejectingExitId, setRejectingExitId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [auditNote, setAuditNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter only pending / under review requests
  const pendingStatuses = [
    'PENDING', 
    'NORMAL_EXIT_REQUESTED', 
    'EARLY_EXIT_REQUESTED', 
    'DEATH_REPORTED', 
    'EXIT_REQUESTED', 
    'UNDER_REVIEW'
  ];

  const pendingExits = (db.memberExits || []).filter(e => pendingStatuses.includes(e.status));

  const filteredExits = pendingExits.filter(exit => {
    const member = db.members?.find(m => m.memberId === exit.memberId);
    const matchesSearch = 
      exit.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exit.exitRequestId || (exit as any).id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const exitTypeNormalized = exit.exitType === 'DEATH_SETTLEMENT' ? 'DEATH' : exit.exitType;
    const matchesType = typeFilter === 'ALL' || exitTypeNormalized === typeFilter || exit.exitType === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Current user permissions
  const userRole = activeUser?.role || 'ADMIN';
  const isAuthorizedApprover = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'TREASURER', 'PRESIDENT', 'GENERAL_SECRETARY', 'ACCOUNTANT'].includes(userRole);
  const isSuperOrAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

  // Helper to find exit record by ID
  const getExitById = (id: string | null): MemberExitRequest | null => {
    if (!id) return null;
    return (db.memberExits || []).find(e => (e.exitRequestId === id || (e as any).id === id)) || null;
  };

  const getMemberById = (memberId?: string): Member | null => {
    if (!memberId) return null;
    return db.members?.find(m => m.memberId === memberId) || null;
  };

  const selectedViewExit = getExitById(viewingExitId);
  const selectedViewMember = selectedViewExit ? getMemberById(selectedViewExit.memberId) : null;

  const selectedReviewExit = getExitById(reviewingExitId);
  const selectedReviewMember = selectedReviewExit ? getMemberById(selectedReviewExit.memberId) : null;

  const selectedApproveExit = getExitById(approvingExitId);
  const selectedApproveMember = selectedApproveExit ? getMemberById(selectedApproveExit.memberId) : null;

  const selectedRejectExit = getExitById(rejectingExitId);
  const selectedRejectMember = selectedRejectExit ? getMemberById(selectedRejectExit.memberId) : null;

  // Active Financial Year
  const activeFY = db.financialYears?.find(fy => fy.status === 'ACTIVE' || fy.status === 'OPEN');

  // Handlers
  const handleOpenView = (exitId: string) => {
    setViewingExitId(exitId);
  };

  const handleOpenReview = (exitId: string) => {
    const exit = getExitById(exitId);
    if (!exit) return;

    if (exit.status === 'UNDER_REVIEW') {
      // If already UNDER_REVIEW, prevent redundant transitions and display the approval UI directly
      handleOpenApprove(exitId);
      return;
    }

    setReviewingExitId(exitId);
  };

  const handleOpenApprove = (exitId: string) => {
    const exit = getExitById(exitId);
    if (!exit) return;

    if (!isAuthorizedApprover) {
      alert(isBangla ? 'আপনার এই নিষ্পত্তি অনুমোদনের অনুমতি নেই।' : 'You do not have permission to approve settlements.');
      return;
    }

    const requestedBy = exit.userId || exit.requestedBy;
    if (!isSuperOrAdmin && requestedBy && activeUser?.userId && requestedBy === activeUser.userId) {
      alert(isBangla ? 'নিজের তৈরি Settlement Request নিজে অনুমোদন করা যাবে না।' : 'You cannot approve your own settlement request.');
      return;
    }

    setApprovingExitId(exitId);
  };

  const handleOpenReject = (exitId: string) => {
    if (!isAuthorizedApprover) {
      alert(isBangla ? 'আপনার এই নিষ্পত্তি প্রত্যাখ্যানের অনুমতি নেই।' : 'You do not have permission to reject settlements.');
      return;
    }
    setRejectionReason('');
    setRejectingExitId(exitId);
  };

  // Confirm Review Action
  const handleConfirmReview = async () => {
    if (!selectedReviewExit || !activeUser) return;
    const realId = selectedReviewExit.exitRequestId || (selectedReviewExit as any).id;
    setIsSubmitting(true);

    try {
      const res = await reviewMemberExit({
        exitRequestId: realId,
        userId: activeUser.userId,
        userName: activeUser.fullName || activeUser.username,
        role: activeUser.role,
        auditNote
      });

      if (res.success) {
        showNotification(isBangla ? 'Settlement আবেদনটি পর্যালোচনার জন্য নেওয়া হয়েছে।' : 'Settlement marked under review.', 'success');
        setReviewingExitId(null);
      } else {
        alert(res.message || 'Failed to review request');
      }
    } catch (err: any) {
      alert(err?.message || 'Error reviewing settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Approve Action
  const handleConfirmApprove = async () => {
    if (!selectedApproveExit || !activeUser) return;
    const realId = selectedApproveExit.exitRequestId || (selectedApproveExit as any).id;
    setIsSubmitting(true);

    try {
      const res = await approveMemberExit({
        exitRequestId: realId,
        userId: activeUser.userId,
        userName: activeUser.fullName || activeUser.username,
        role: activeUser.role,
        auditNote
      });

      if (res.success) {
        showNotification(isBangla ? 'Settlement সফলভাবে অনুমোদিত হয়েছে।' : 'Settlement successfully approved.', 'success');
        setApprovingExitId(null);
      } else {
        alert(res.message || 'Failed to approve request');
      }
    } catch (err: any) {
      alert(err?.message || 'Error approving settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Reject Action
  const handleConfirmReject = async () => {
    if (!selectedRejectExit || !activeUser) return;
    if (!rejectionReason.trim()) {
      alert(isBangla ? 'প্রত্যাখ্যানের কারণ উল্লেখ করা আবশ্যক।' : 'Rejection reason is mandatory.');
      return;
    }

    const realId = selectedRejectExit.exitRequestId || (selectedRejectExit as any).id;
    setIsSubmitting(true);

    try {
      const res = await rejectMemberExit({
        exitRequestId: realId,
        reason: rejectionReason.trim(),
        userId: activeUser.userId,
        userName: activeUser.fullName || activeUser.username,
        role: activeUser.role
      });

      if (res.success) {
        showNotification(isBangla ? 'Settlement আবেদন প্রত্যাখ্যান করা হয়েছে।' : 'Settlement request rejected.', 'success');
        setRejectingExitId(null);
        setRejectionReason('');
      } else {
        alert(res.message || 'Failed to reject request');
      }
    } catch (err: any) {
      alert(err?.message || 'Error rejecting settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span>{isBangla ? 'অপেক্ষমাণ নিষ্পত্তি অনুমোদন' : 'Pending Settlement Approvals'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBangla 
              ? 'সদস্যদের সাধারণ, আগাম বা মৃত্যু নিষ্পত্তির আবেদন অনুমোদন ও পর্যালোচনা করুন' 
              : 'Review and approve member normal exit, early exit, or death settlement applications'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
            {isBangla ? `${filteredExits.length} টি আবেদন অপেক্ষমাণ` : `${filteredExits.length} pending requests`}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isBangla ? 'সদস্য আইডি, আবেদন নম্বর বা নাম খুঁজুন...' : 'Search by Member ID, Request No, or Name...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="ALL">{isBangla ? 'সকল ধরন' : 'All Types'}</option>
            <option value="NORMAL">{isBangla ? 'সাধারণ প্রস্থান (Normal Exit)' : 'Normal Exit'}</option>
            <option value="EARLY">{isBangla ? 'আগাম প্রস্থান (Early Exit)' : 'Early Exit'}</option>
            <option value="DEATH">{isBangla ? 'মৃত্যু নিষ্পত্তি (Death Settlement)' : 'Death Settlement'}</option>
          </select>
        </div>

        {/* Approvals Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'আবেদন নং' : 'Request No'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'সদস্য' : 'Member'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'ধরন' : 'Settlement Type'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'আবেদনের তারিখ' : 'Request Date'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'মূলধন' : 'Capital'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'সার্ভিস চার্জ' : 'Service Charge'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'নিট নিষ্পত্তি' : 'Net Settlement'}</th>
                <th className="px-4 py-3 whitespace-nowrap">{isBangla ? 'অবস্থা' : 'Status'}</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">{isBangla ? 'পদক্ষেপ (Actions)' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExits.map(exit => {
                const realId = exit.exitRequestId || (exit as any).id;
                const member = db.members?.find(m => m.memberId === exit.memberId);
                const isUnderReview = exit.status === 'UNDER_REVIEW';
                const requestedBy = exit.requestedBy || exit.userId;
                const isSelfRequest = !isSuperOrAdmin && Boolean(requestedBy && activeUser?.userId && requestedBy === activeUser.userId);
                const canApprove = Boolean(isAuthorizedApprover && isUnderReview && !isSelfRequest);
                const isDeath = exit.exitType === 'DEATH_SETTLEMENT' || exit.exitType === ('DEATH' as any);
                const capital = exit.memberCapital || (exit as any).eligibleCapital || exit.eligibleRefundAmount || 0;
                const serviceCharge = exit.serviceChargeAmount || 0;
                const netAmount = exit.netRefundAmount || exit.netSettlementAmount || (capital - serviceCharge);

                // Development debug logging
                console.log("SETTLEMENT APPROVAL DEBUG", {
                  settlementId: realId,
                  status: exit.status,
                  currentUserId: activeUser?.userId,
                  currentUserRole: userRole,
                  requestedBy: requestedBy,
                  canApprove
                });

                return (
                  <tr key={realId} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {realId}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{member?.fullName || 'Unknown'}</div>
                      <div className="text-xs text-slate-500 font-mono">{exit.memberId}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        exit.exitType === 'NORMAL' ? 'bg-emerald-100 text-emerald-800' :
                        exit.exitType === 'EARLY' ? 'bg-amber-100 text-amber-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {exit.exitType === 'NORMAL' ? (isBangla ? 'সাধারণ প্রস্থান' : 'Normal Exit') :
                         exit.exitType === 'EARLY' ? (isBangla ? 'আগাম প্রস্থান' : 'Early Exit') :
                         (isBangla ? 'মৃত্যু নিষ্পত্তি' : 'Death Settlement')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {exit.requestDate || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                      ৳{capital.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-rose-600 whitespace-nowrap">
                      ৳{serviceCharge.toLocaleString()} {exit.serviceChargePercentage ? `(${exit.serviceChargePercentage}%)` : ''}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      ৳{netAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium ${
                        isUnderReview ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {isUnderReview ? (isBangla ? 'পর্যালোচনাধীন' : 'Under Review') : (isBangla ? 'অপেক্ষমাণ' : 'Pending')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* VIEW BUTTON */}
                        <button
                          type="button"
                          id={`action-view-${realId}`}
                          onClick={() => handleOpenView(realId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300 transition-colors shadow-xs"
                          title={isBangla ? 'বিস্তারিত দেখুন' : 'View Details'}
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>{isBangla ? 'ভিউ' : 'View'}</span>
                        </button>

                        {/* REVIEW BUTTON (Shown when status is pending, to transition to UNDER_REVIEW) */}
                        {!isUnderReview && (
                          <button
                            type="button"
                            id={`action-review-${realId}`}
                            onClick={() => handleOpenReview(realId)}
                            disabled={!isAuthorizedApprover}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors shadow-xs ${
                              !isAuthorizedApprover
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'
                            }`}
                            title={
                              !isAuthorizedApprover
                                ? (isBangla ? 'আপনার এই আবেদন পর্যালোচনার অনুমতি নেই।' : 'No review permission')
                                : (isBangla ? 'পর্যালোচনা করুন' : 'Review Request')
                            }
                          >
                            <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>{isBangla ? 'রিভিউ' : 'Review'}</span>
                          </button>
                        )}

                        {/* APPROVE BUTTON (Shown when status is UNDER_REVIEW) */}
                        {isUnderReview && (
                          <button
                            type="button"
                            id={`action-approve-${realId}`}
                            onClick={() => handleOpenApprove(realId)}
                            disabled={!canApprove}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors shadow-xs ${
                              !canApprove
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 font-semibold cursor-pointer'
                            }`}
                            title={
                              isSelfRequest 
                                ? (isBangla ? 'নিজের তৈরি Settlement Request নিজে অনুমোদন করা যাবে না।' : 'You cannot approve your own settlement request.') 
                                : !isAuthorizedApprover
                                ? (isBangla ? 'আপনার এই নিষ্পত্তি অনুমোদনের অনুমতি নেই।' : 'No approval permission')
                                : (isBangla ? 'অনুমোদন করুন' : 'Approve Settlement')
                            }
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{isBangla ? 'অনুমোদন' : 'Approve'}</span>
                          </button>
                        )}

                        {/* REJECT BUTTON */}
                        <button
                          type="button"
                          id={`action-reject-${realId}`}
                          onClick={() => handleOpenReject(realId)}
                          disabled={!isAuthorizedApprover}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors shadow-xs ${
                            !isAuthorizedApprover
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                          }`}
                          title={isBangla ? 'প্রত্যাখ্যান করুন' : 'Reject Settlement'}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{isBangla ? 'বাতিল' : 'Reject'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredExits.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Shield className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-600">
                        {isBangla ? 'কোন অপেক্ষমাণ নিষ্পত্তির আবেদন পাওয়া যায়নি।' : 'No pending settlement requests found.'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isBangla ? 'নতুন আবেদন জমা হলে তা এখানে প্রদর্শিত হবে।' : 'New settlement applications will appear here for approval.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VIEW MODAL (Read-Only Settlement Details)                              */}
      {/* ========================================================================= */}
      {selectedViewExit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150 my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base sm:text-lg">
                  {isBangla ? 'সদস্য নিষ্পত্তির বিস্তারিত বিবরণ' : 'Member Settlement Details'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setViewingExitId(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Member Profile Banner */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">{isBangla ? 'সদস্য আইডি' : 'Member ID'}</span>
                  <span className="font-mono font-bold text-slate-900">{selectedViewExit.memberId}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">{isBangla ? 'সদস্যের নাম' : 'Member Name'}</span>
                  <span className="font-bold text-slate-900">{selectedViewMember?.fullName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">{isBangla ? 'মোবাইল নম্বর' : 'Mobile Number'}</span>
                  <span className="font-mono text-slate-800">{selectedViewMember?.mobile || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">{isBangla ? 'যোগদানের তারিখ' : 'Joining Date'}</span>
                  <span className="text-slate-800">{selectedViewMember?.joiningDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">{isBangla ? 'সদস্যতার মেয়াদ' : 'Tenure'}</span>
                  <span className="font-semibold text-slate-800">
                    {selectedViewExit.membershipTenureYears || 0} {isBangla ? 'বছর' : 'Years'} {selectedViewExit.membershipTenureMonths || 0} {isBangla ? 'মাস' : 'Months'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">{isBangla ? 'আবেদনের অবস্থা' : 'Status'}</span>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                    {selectedViewExit.status}
                  </span>
                </div>
              </div>

              {/* Settlement Type & Reasons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">{isBangla ? 'নিষ্পত্তির ধরন' : 'Settlement Type'}</span>
                  <span className="font-bold text-slate-800">
                    {selectedViewExit.exitType === 'NORMAL' ? (isBangla ? 'সাধারণ প্রস্থান (Normal Exit - 15% Service Charge)' : 'Normal Exit (15% Service Charge)') :
                     selectedViewExit.exitType === 'EARLY' ? (isBangla ? 'আগাম প্রস্থান (Early Exit - 15% Service Charge)' : 'Early Exit (15% Service Charge)') :
                     (isBangla ? 'মৃত্যুজনিত নিষ্পত্তি (Death Settlement - 0% Service Charge)' : 'Death Settlement (0% Service Charge)')}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">{isBangla ? 'আবেদনের তারিখ ও জমাকারী' : 'Request Date & Submitter'}</span>
                  <span className="text-slate-800 font-medium">{selectedViewExit.requestDate || 'N/A'}</span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    {isBangla ? 'আবেদনকারী: ' : 'Requested by: '} {selectedViewExit.userName || selectedViewExit.userId || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  <span>{isBangla ? 'আর্থিক নিষ্পত্তির হিসাব' : 'Financial Settlement Calculation'}</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">{isBangla ? 'জমা মূলধন' : 'Eligible Capital'}</span>
                    <span className="font-mono font-bold text-slate-900 text-base">
                      ৳{(selectedViewExit.memberCapital || (selectedViewExit as any).eligibleCapital || selectedViewExit.eligibleRefundAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">
                      {isBangla ? 'সার্ভিস চার্জ' : 'Service Charge'} ({selectedViewExit.serviceChargePercentage || 0}%)
                    </span>
                    <span className="font-mono font-bold text-rose-600 text-base">
                      - ৳{(selectedViewExit.serviceChargeAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{isBangla ? 'মৃত্যু অনুদান/সুবিধা' : 'Eligible Benefit'}</span>
                    <span className="font-mono font-bold text-blue-600 text-base">
                      + ৳{(selectedViewExit.eligibleBenefitAmount || (selectedViewExit as any).eligibleBenefit || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{isBangla ? 'প্রদেয় নিট নিষ্পত্তি' : 'Net Settlement'}</span>
                    <span className="font-mono font-black text-emerald-700 text-lg">
                      ৳{(selectedViewExit.netRefundAmount || selectedViewExit.netSettlementAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason / Remarks */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  {isBangla ? 'প্রস্থানের কারণ ও মন্তব্য' : 'Reason for Exit / Remarks'}
                </span>
                <p className="text-slate-800 whitespace-pre-wrap">{selectedViewExit.exitReason || 'N/A'}</p>
              </div>

              {/* Death Settlement Specific Information */}
              {(selectedViewExit.exitType === 'DEATH_SETTLEMENT' || (selectedViewExit.exitType as any) === 'DEATH') && (
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
                  <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-purple-700" />
                    <span>{isBangla ? 'মৃত্যু ও নমিনির তথ্য (Nominee & Legal Heir Details)' : 'Death & Nominee Details'}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-purple-700 block">{isBangla ? 'মৃত্যুর তারিখ' : 'Date of Death'}</span>
                      <span className="font-semibold text-slate-900">{selectedViewExit.dateOfDeath || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-purple-700 block">{isBangla ? 'মনোনীত ব্যক্তি (নমিনি)' : 'Nominee Name'}</span>
                      <span className="font-semibold text-slate-900">{selectedViewExit.nomineeName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-purple-700 block">{isBangla ? 'সম্পর্ক' : 'Relation'}</span>
                      <span className="text-slate-800">{selectedViewExit.nomineeRelation || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-purple-700 block">{isBangla ? 'নমিনির মোবাইল' : 'Nominee Mobile'}</span>
                      <span className="font-mono text-slate-800">{selectedViewExit.nomineeMobile || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-purple-700 block">{isBangla ? 'নমিনির জাতীয় পরিচয়পত্র' : 'Nominee NID'}</span>
                      <span className="font-mono text-slate-800">{selectedViewExit.nomineeNid || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-purple-700 block">{isBangla ? 'নমিনির ঠিকানা' : 'Nominee Address'}</span>
                      <span className="text-slate-800">{selectedViewExit.nomineeAddress || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment & Audit Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="font-semibold">{isBangla ? 'পেমেন্ট পদ্ধতি:' : 'Payment Method:'}</span> {selectedViewExit.paymentMethod || selectedViewExit.refundPaymentMethod || 'Cash / Bank (Pending disbursement)'}
                </div>
                <div>
                  <span className="font-semibold">{isBangla ? 'আবেদনের আইডি:' : 'Request Record ID:'}</span> <span className="font-mono">{selectedViewExit.exitRequestId || (selectedViewExit as any).id}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewingExitId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
              >
                {isBangla ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. REVIEW MODAL                                                           */}
      {/* ========================================================================= */}
      {selectedReviewExit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-base sm:text-lg">
                  {isBangla ? 'সদস্য নিষ্পত্তি পর্যালোচনা (Review Settlement)' : 'Review Member Settlement'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setReviewingExitId(null)}
                className="text-blue-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="bg-blue-50 p-3.5 rounded-lg border border-blue-200 text-blue-900 flex items-start gap-2.5">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{isBangla ? 'আবেদনটি যাচাইকরণ' : 'Review Settlement Request'}</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {isBangla 
                      ? 'যাচাই শেষে আবেদনটি "UNDER_REVIEW" অবস্থায় চলে যাবে এবং চূড়ান্ত অনুমোদনের জন্য প্রস্তুত হবে।' 
                      : 'Marking this under review will update status to UNDER_REVIEW for final approval.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isBangla ? 'সদস্য:' : 'Member:'}</span>
                  <span className="font-bold text-slate-900">{selectedReviewMember?.fullName || 'N/A'} ({selectedReviewExit.memberId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isBangla ? 'নিষ্পত্তির ধরন:' : 'Settlement Type:'}</span>
                  <span className="font-semibold text-slate-800">{selectedReviewExit.exitType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isBangla ? 'আর্থিক বছর:' : 'Financial Year:'}</span>
                  <span className="font-medium text-slate-800">{activeFY?.yearCode || 'Current Financial Year'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isBangla ? 'মোট মূলধন:' : 'Member Capital:'}</span>
                  <span className="font-mono text-slate-800">
                    ৳{(selectedReviewExit.memberCapital || (selectedReviewExit as any).eligibleCapital || selectedReviewExit.eligibleRefundAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>{isBangla ? 'সার্ভিস চার্জ:' : 'Service Charge:'}</span>
                  <span className="font-mono font-semibold">
                    - ৳{(selectedReviewExit.serviceChargeAmount || 0).toLocaleString()}
                  </span>
                </div>
                {(selectedReviewExit.eligibleBenefitAmount || (selectedReviewExit as any).eligibleBenefit) ? (
                  <div className="flex justify-between text-blue-600">
                    <span>{isBangla ? 'মৃত্যু সুবিধা:' : 'Eligible Benefit:'}</span>
                    <span className="font-mono font-semibold">
                      + ৳{(selectedReviewExit.eligibleBenefitAmount || (selectedReviewExit as any).eligibleBenefit || 0).toLocaleString()}
                    </span>
                  </div>
                ) : null}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-emerald-800">
                  <span>{isBangla ? 'প্রদেয় নিট নিষ্পত্তি:' : 'Net Settlement Amount:'}</span>
                  <span className="font-mono text-base">
                    ৳{(selectedReviewExit.netRefundAmount || selectedReviewExit.netSettlementAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {isBangla ? 'পর্যালোচনা নোট / অডিট ট্রেইল (বাধ্যতামূলক) *' : 'Review Note / Audit Trail (Required) *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={auditNote}
                  onChange={e => setAuditNote(e.target.value)}
                  placeholder={isBangla ? 'যাচাইকরণের বিস্তারিত বিবরণ লিখুন...' : 'Enter review verification details...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewingExitId(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                disabled={isSubmitting || !auditNote.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm flex items-center gap-1.5 ${!auditNote.trim() || isSubmitting ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>{isSubmitting ? (isBangla ? 'প্রক্রিয়াকরণ হচ্ছে...' : 'Processing...') : (isBangla ? 'পর্যালোচনা নিশ্চিত করুন' : 'Confirm Review')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. APPROVE CONFIRMATION MODAL                                             */}
      {/* ========================================================================= */}
      {selectedApproveExit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base sm:text-lg">
                  {isBangla ? 'নিষ্পত্তি অনুমোদন নিশ্চিতকরণ' : 'Confirm Settlement Approval'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setApprovingExitId(null)}
                className="text-emerald-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <p className="text-base font-bold text-slate-900">
                  {isBangla ? 'আপনি কি এই সদস্য নিষ্পত্তির আবেদন অনুমোদন করতে চান?' : 'Are you sure you want to approve this member settlement request?'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {isBangla 
                    ? 'অনুমোদনের পর আবেদনটির স্ট্যাটাস APPROVED হবে এবং রিফান্ড প্রদানের জন্য প্রস্তুত হবে।' 
                    : 'Once approved, the status will change to APPROVED and be ready for refund processing.'}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isBangla ? 'সদস্য:' : 'Member:'}</span>
                  <span className="font-bold text-slate-900">{selectedApproveMember?.fullName || 'N/A'} ({selectedApproveExit.memberId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isBangla ? 'নিষ্পত্তির ধরন:' : 'Settlement Type:'}</span>
                  <span className="font-semibold text-slate-800">{selectedApproveExit.exitType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isBangla ? 'মূলধন:' : 'Capital:'}</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ৳{(selectedApproveExit.memberCapital || (selectedApproveExit as any).eligibleCapital || selectedApproveExit.eligibleRefundAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>{isBangla ? 'সার্ভিস চার্জ:' : 'Service Charge:'}</span>
                  <span className="font-mono font-semibold">
                    ৳{(selectedApproveExit.serviceChargeAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-emerald-800 text-sm">
                  <span>{isBangla ? 'প্রদেয় নিট নিষ্পত্তি:' : 'Net Settlement:'}</span>
                  <span className="font-mono text-base font-black">
                    ৳{(selectedApproveExit.netRefundAmount || selectedApproveExit.netSettlementAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {isBangla ? 'অনুমোদন নোট / অডিট ট্রেইল (বাধ্যতামূলক) *' : 'Approval Note / Audit Trail (Required) *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={auditNote}
                  onChange={e => setAuditNote(e.target.value)}
                  placeholder={isBangla ? 'চূড়ান্ত অনুমোদনের বিবরণ বা শর্ত লিখুন...' : 'Enter final approval details or conditions...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setApprovingExitId(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={isSubmitting || !auditNote.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm flex items-center gap-1.5 ${!auditNote.trim() || isSubmitting ? 'bg-emerald-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSubmitting ? (isBangla ? 'অনুমোদন হচ্ছে...' : 'Approving...') : (isBangla ? 'হ্যাঁ, অনুমোদন করুন' : 'Yes, Approve')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REJECT CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      {selectedRejectExit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-rose-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-300" />
                <h3 className="font-bold text-base sm:text-lg">
                  {isBangla ? 'নিষ্পত্তি আবেদন প্রত্যাখ্যান' : 'Reject Settlement Request'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setRejectingExitId(null)}
                className="text-rose-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-200 text-rose-900 text-xs">
                <p className="font-semibold mb-0.5">{isBangla ? 'সতর্কতা:' : 'Warning:'}</p>
                <p>
                  {isBangla 
                    ? 'আবেদনটি প্রত্যাখ্যান করলে সদস্যের স্ট্যাটাস পুনরায় সক্রিয় (ACTIVE) করা হবে এবং অডিট ট্রেইলে সংরক্ষিত থাকবে।' 
                    : 'Rejecting this request will restore the member status to ACTIVE and log the reason in the audit trail.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {isBangla ? 'প্রত্যাখ্যানের কারণ *' : 'Rejection Reason *'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder={isBangla ? 'প্রত্যাখ্যানের কারণ বিস্তারিত লিখুন (বাধ্যতামূলক)...' : 'Enter mandatory rejection reason...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectingExitId(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm flex items-center gap-1.5 ${
                  !rejectionReason.trim() || isSubmitting
                    ? 'bg-rose-300 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>{isSubmitting ? (isBangla ? 'প্রত্যাখ্যান হচ্ছে...' : 'Rejecting...') : (isBangla ? 'প্রত্যাখ্যান নিশ্চিত করুন' : 'Confirm Rejection')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

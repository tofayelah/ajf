import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Investment, PaymentMethod, InvestmentStatus } from '../../types';
import { calculateInvestmentOutstanding, getInvestmentStatus } from '../../services/InvestmentService';
import { AttachmentModal } from '../shared/AttachmentModal';
import {
  TrendingUp,
  Search,
  PlusCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  ArrowUpRight,
  Filter,
  Eye,
  Edit,
  Trash2,
  Ban,
  Paperclip,
  Clock,
  ShieldCheck,
  Building2,
  FileText,
  UserCheck,
  Layers,
  ArrowDownLeft,
  Info
} from 'lucide-react';

export const InvestmentsView: React.FC = () => {
  const {
    db,
    activeUser,
    postInvestmentProject,
    approveInvestment,
    rejectInvestment,
    updateInvestment,
    deleteInvestment,
    cancelInvestment,
    executeInvestment,
    postInvestmentReturn,
    language
  } = useApp();

  const isBangla = language === 'bn';
  const isMember = activeUser?.role === 'MEMBER';
  const userRole = activeUser?.role || 'MEMBER';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvestmentStatus>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Authoritative Selected Investment ID
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
  const [selectedInvestmentForAttachments, setSelectedInvestmentForAttachments] = useState<string | null>(null);

  // Form States: Add
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('কৃষি ও বাণিজ্য');
  const [partner, setPartner] = useState('');
  const [amount, setAmount] = useState<number>(30000);
  const [expectedReturnRate, setExpectedReturnRate] = useState<number>(15);
  const [manager, setManager] = useState('কমিটি বিনিয়োগ উপকমিটি');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank');
  const [description, setDescription] = useState('সমিতির উদ্বৃত্ত তহবিলের নিরাপদ লাভজনক যৌথ বিনিয়োগ');

  // Form States: Edit
  const [editProjectType, setEditProjectType] = useState('');
  const [editPartner, setEditPartner] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editExpectedReturnRate, setEditExpectedReturnRate] = useState<number>(0);
  const [editMaturityDate, setEditMaturityDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Form States: Approve
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [approvalRemarks, setApprovalRemarks] = useState('');

  // Form States: Reject
  const [rejectionReason, setRejectionReason] = useState('');

  // Form States: Execute
  const [executePaymentMethod, setExecutePaymentMethod] = useState<PaymentMethod>('Bank');
  const [executeDate, setExecuteDate] = useState(new Date().toISOString().split('T')[0]);

  // Form States: Return
  const [returnPrincipal, setReturnPrincipal] = useState<number>(0);
  const [returnProfit, setReturnProfit] = useState<number>(0);
  const [returnPaymentMethod, setReturnPaymentMethod] = useState<PaymentMethod>('Bank');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnRemarks, setReturnRemarks] = useState('বিনিয়োগ থেকে প্রাপ্ত রিটার্ন/মুনাফা');

  // Form States: Cancel
  const [cancellationReason, setCancellationReason] = useState('');

  // Selected Investment Object (Resolved strictly by authoritative ID)
  const selectedInvestment = useMemo(() => {
    if (!selectedInvestmentId) return null;
    return (db.investments || []).find(
      i => (i.investmentId && String(i.investmentId).trim() === String(selectedInvestmentId).trim()) ||
           (i.id && String(i.id).trim() === String(selectedInvestmentId).trim())
    ) || null;
  }, [db.investments, selectedInvestmentId]);

  // Calculations
  const allInvestments = db.investments || [];

  const totalActiveOutstanding = useMemo(() => {
    return allInvestments
      .filter(i => {
        const s = getInvestmentStatus(i);
        return s === 'ACTIVE' || s === 'PARTIAL_RETURN';
      })
      .reduce((sum, i) => sum + calculateInvestmentOutstanding(i), 0);
  }, [allInvestments]);

  const totalProfitReceived = useMemo(() => {
    return allInvestments.reduce((sum, i) => sum + (i.profit || 0), 0);
  }, [allInvestments]);

  const totalPendingProposals = useMemo(() => {
    return allInvestments.filter(i => {
      const s = getInvestmentStatus(i);
      return s === 'PENDING_APPROVAL' || s === 'PROPOSED';
    }).length;
  }, [allInvestments]);

  // Filtered List
  const filteredInvestments = useMemo(() => {
    return allInvestments.filter(inv => {
      const currentStatus = getInvestmentStatus(inv);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING_APPROVAL' && (currentStatus === 'PENDING_APPROVAL' || currentStatus === 'PROPOSED')) ||
        (statusFilter === 'ACTIVE' && (currentStatus === 'ACTIVE' || currentStatus === 'PARTIAL_RETURN')) ||
        currentStatus === statusFilter;

      if (!matchesStatus) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const idMatch = (inv.investmentId || '').toLowerCase().includes(q);
      const descMatch = (inv.description || '').toLowerCase().includes(q);
      const partnerMatch = (inv.partner || '').toLowerCase().includes(q);
      const typeMatch = (inv.investmentType || '').toLowerCase().includes(q);
      const nameMatch = (inv.projectName || '').toLowerCase().includes(q);

      return idMatch || descMatch || partnerMatch || typeMatch || nameMatch;
    });
  }, [allInvestments, statusFilter, searchQuery]);

  // Action Helpers with strict authoritative ID
  const openViewModal = (inv: Investment) => {
    setSelectedInvestmentId(inv.investmentId);
    setIsViewModalOpen(true);
  };

  const openEditModal = (inv: Investment) => {
    setSelectedInvestmentId(inv.investmentId);
    setEditProjectType(inv.investmentType || 'কৃষি ও বাণিজ্য');
    setEditPartner(inv.partner || '');
    setEditDescription(inv.description || '');
    setEditAmount(inv.originalPrincipal ?? inv.investmentAmount ?? 0);
    setEditExpectedReturnRate(inv.roiPercentage ?? 0);
    setEditMaturityDate(inv.maturityDate || '');
    setEditRemarks(inv.remarks || '');
    setIsEditModalOpen(true);
  };

  const openApproveModal = (inv: Investment) => {
    setSelectedInvestmentId(inv.investmentId);
    const orig = inv.originalPrincipal ?? inv.investmentAmount ?? 0;
    setApprovedAmount(orig);
    setApprovalRemarks('');
    setIsApproveModalOpen(true);
  };

  const openRejectModal = (inv: Investment) => {
    setSelectedInvestmentId(inv.investmentId);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const openExecuteModal = (inv: Investment) => {
    setSelectedInvestmentId(inv.investmentId);
    setExecutePaymentMethod('Bank');
    setExecuteDate(new Date().toISOString().split('T')[0]);
    setIsExecuteModalOpen(true);
  };

  const openReturnModal = (inv: Investment) => {
    setSelectedInvestmentId(inv.investmentId);
    setReturnPrincipal(0);
    setReturnProfit(0);
    setReturnPaymentMethod('Bank');
    setReturnDate(new Date().toISOString().split('T')[0]);
    setReturnRemarks('নিয়মিত বিনিয়োগ মুনাফা/রিটার্ন');
    setIsReturnModalOpen(true);
  };

  const openCancelModal = (inv: Investment) => {
    setSelectedInvestmentId(inv.investmentId);
    setCancellationReason('');
    setIsCancelModalOpen(true);
  };

  const openDeleteModal = (inv: Investment) => {
    setSelectedInvestmentId(inv.investmentId);
    setIsDeleteModalOpen(true);
  };

  // Form Submit Handlers
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || amount <= 0) return;

    postInvestmentProject({
      projectName: projectName.trim(),
      projectType,
      partner: partner.trim() || undefined,
      amount,
      expectedReturnRate,
      manager,
      paymentMethod,
      description: `${projectName.trim()} - ${description}`
    });

    setIsAddModalOpen(false);
    setProjectName('');
    setPartner('');
    setAmount(30000);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentId) return;

    updateInvestment({
      projectId: selectedInvestmentId,
      updatedBy: activeUser?.fullName || 'Admin',
      data: {
        projectType: editProjectType,
        partner: editPartner,
        description: editDescription,
        amount: editAmount,
        expectedReturnRate: editExpectedReturnRate,
        maturityDate: editMaturityDate,
        remarks: editRemarks
      }
    });

    setIsEditModalOpen(false);
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentId || approvedAmount <= 0) return;

    approveInvestment({
      projectId: selectedInvestmentId,
      approvedAmount: Number(approvedAmount),
      approvedBy: activeUser?.fullName || 'Admin',
      remarks: approvalRemarks.trim()
    });

    setIsApproveModalOpen(false);
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentId || !rejectionReason.trim()) return;

    rejectInvestment({
      projectId: selectedInvestmentId,
      rejectedBy: activeUser?.fullName || 'Admin',
      reason: rejectionReason.trim()
    });

    setIsRejectModalOpen(false);
  };

  const handleExecuteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentId) return;

    executeInvestment({
      projectId: selectedInvestmentId,
      paymentMethod: executePaymentMethod,
      transactionDate: executeDate,
      executedBy: activeUser?.fullName || 'Admin'
    });

    setIsExecuteModalOpen(false);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentId) return;

    postInvestmentReturn({
      projectId: selectedInvestmentId,
      returnPrincipal: Number(returnPrincipal),
      returnProfit: Number(returnProfit),
      returnPaymentMethod,
      transactionDate: returnDate,
      remarks: returnRemarks,
      receivedBy: activeUser?.fullName || 'Admin'
    });

    setIsReturnModalOpen(false);
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentId) return;

    cancelInvestment({
      projectId: selectedInvestmentId,
      cancelledBy: activeUser?.fullName || 'Admin',
      reason: cancellationReason.trim()
    });

    setIsCancelModalOpen(false);
  };

  const handleDeleteSubmit = () => {
    if (!selectedInvestmentId) return;

    deleteInvestment({
      projectId: selectedInvestmentId,
      deletedBy: activeUser?.fullName || 'Admin'
    });

    setIsDeleteModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-700" />
            <span>{isBangla ? 'বিনিয়োগ পোর্টফোলিও ও রিটার্ন ব্যবস্থাপনা' : 'Investment Portfolio Management'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isBangla
              ? 'সমিতির নিরাপদ লাভজনক যৌথ বিনিয়োগ, অনুমোদন, তহবিল বিতরণ ও মুনাফা আদায়'
              : 'Society capital investment projects, approvals, disbursements & returns'}
          </p>
        </div>

        {!isMember && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isBangla ? '+ নতুন বিনিয়োগ প্রস্তাব' : '+ New Investment Proposal'}</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            {isBangla ? 'চলমান বকেয়া বিনিয়োগ মূলধন' : 'Active Outstanding Principal'}
          </span>
          <span className="text-2xl font-black text-indigo-900 font-mono">
            ৳{totalActiveOutstanding.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            {isBangla ? `মোট ${allInvestments.length} টি প্রকল্পের মধ্যে সক্রিয় মূলধন` : `Active across ${allInvestments.length} projects`}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            {isBangla ? 'অর্জিত মোট নিট মুনাফা' : 'Total Profit Received'}
          </span>
          <span className="text-2xl font-black text-emerald-700 font-mono">
            ৳{totalProfitReceived.toLocaleString()}
          </span>
          <span className="text-[11px] text-emerald-600 block mt-1 font-medium">
            ✓ {isBangla ? 'সমিতির সাধারণ আয়ে সরাসরি জমা' : 'Directly credited to Society Revenue'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            {isBangla ? 'অনুমোদনের অপেক্ষমান প্রস্তাব' : 'Pending Approvals'}
          </span>
          <span className="text-2xl font-black text-amber-700 font-mono">
            {totalPendingProposals}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">
            {isBangla ? 'কমিটি অনুমোদনের পর তহবিল বিতরণ যোগ্য' : 'Requires Committee Approval before disbursement'}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isBangla ? 'সকল' : 'All'} ({allInvestments.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING_APPROVAL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'PENDING_APPROVAL' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {isBangla ? 'অপেক্ষমান' : 'Pending'} ({totalPendingProposals})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'APPROVED' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            {isBangla ? 'অনুমোদিত' : 'Approved'}
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {isBangla ? 'চলমান' : 'Active'}
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === 'COMPLETED' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isBangla ? 'সমাপ্ত' : 'Completed'}
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isBangla ? 'আইডি, নাম বা অংশীদার খুঁজুন...' : 'Search ID, partner, description...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Investment Records Grid */}
      {filteredInvestments.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
          <Briefcase className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-600">
            {isBangla ? 'কোন বিনিয়োগ রেকর্ড পাওয়া যায়নি' : 'No investment records found'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {isBangla ? 'অনুসন্ধান শর্ত পরিবর্তন করুন অথবা নতুন বিনিয়োগ যুক্ত করুন' : 'Change filter criteria or add a new investment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInvestments.map(project => {
            const status = getInvestmentStatus(project);
            const outstanding = calculateInvestmentOutstanding(project);
            const original = project.originalPrincipal ?? project.investmentAmount ?? 0;
            const returned = project.returnedPrincipal || 0;
            const profit = project.profit || 0;

            const isPending = status === 'PENDING_APPROVAL' || status === 'PROPOSED';
            const isApproved = status === 'APPROVED';
            const isActive = status === 'ACTIVE' || status === 'PARTIAL_RETURN';
            const isCompleted = status === 'COMPLETED';
            const isRejected = status === 'REJECTED';
            const isCancelled = status === 'CANCELLED';

            return (
              <div
                key={project.investmentId}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Header with Single Authoritative ID */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs bg-slate-900 text-white px-2 py-0.5 rounded font-bold tracking-wide">
                          {project.investmentId}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {project.investmentType}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">
                        {project.projectName || (project.description || '').split(' - ')[0] || project.partner || 'বিনিয়োগ প্রকল্প'}
                      </h3>
                      {project.partner && (
                        <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{project.partner}</span>
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        isPending
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : isApproved
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          : status === 'PARTIAL_RETURN'
                          ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                          : isCompleted
                          ? 'bg-slate-100 text-slate-800 border border-slate-200'
                          : 'bg-rose-100 text-rose-900 border border-rose-200'
                      }`}
                    >
                      {isPending
                        ? (isBangla ? 'অনুমোদনের অপেক্ষায়' : 'Pending Approval')
                        : isApproved
                        ? (isBangla ? 'অনুমোদিত (তহবিল বিতরণ বাকি)' : 'Approved (Pending Disbursement)')
                        : status === 'ACTIVE'
                        ? (isBangla ? 'চলমান' : 'Active')
                        : status === 'PARTIAL_RETURN'
                        ? (isBangla ? 'আংশিক ফেরত' : 'Partial Return')
                        : isCompleted
                        ? (isBangla ? 'সমাপ্ত' : 'Completed')
                        : isRejected
                        ? (isBangla ? 'প্রত্যাখ্যাত' : 'Rejected')
                        : (isBangla ? 'বাতিল' : 'Cancelled')}
                    </span>
                  </div>

                  {/* Description Box */}
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-2">
                    {project.description}
                  </p>

                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">
                        {isBangla ? 'মূল বিনিয়োগ:' : 'Original Principal:'}
                      </span>
                      <span className="font-mono font-bold text-indigo-950 text-sm">
                        ৳{original.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 block">
                        {isBangla ? 'ফেরত আসল:' : 'Returned Principal:'}
                      </span>
                      <span className="font-mono font-bold text-blue-700 text-sm">
                        ৳{returned.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-rose-50/70 p-2 rounded-lg border border-rose-100">
                      <span className="text-[10px] text-rose-700 font-semibold block">
                        {isBangla ? 'বকেয়া আসল (বাকি মূলধন):' : 'Outstanding Principal:'}
                      </span>
                      <span className="font-mono font-bold text-rose-700 text-sm">
                        ৳{outstanding.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-slate-500 block font-mono">
                        ৳{original.toLocaleString()} - ৳{returned.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 font-semibold block">
                        {isBangla ? 'অর্জিত নিট মুনাফা:' : 'Profit Earned:'}
                      </span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        +৳{profit.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-emerald-600 block font-mono">
                        ROI: {project.roiPercentage || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Rejection / Cancellation Notes */}
                  {isRejected && project.rejectionReason && (
                    <div className="bg-rose-50 p-2 rounded-lg border border-rose-200 text-xs text-rose-800">
                      <span className="font-bold block">{isBangla ? 'প্রত্যাখ্যানের কারণ:' : 'Rejection Reason:'}</span>
                      <span>{project.rejectionReason}</span>
                    </div>
                  )}

                  {isCancelled && project.cancellationReason && (
                    <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 text-xs text-slate-700">
                      <span className="font-bold block">{isBangla ? 'বাতিলের কারণ:' : 'Cancellation Reason:'}</span>
                      <span>{project.cancellationReason}</span>
                    </div>
                  )}
                </div>

                {/* State-Aware Action Buttons Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{project.investmentDate || project.createdAt?.split('T')[0] || '-'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* View Details Button (Always Available) */}
                    <button
                      onClick={() => openViewModal(project)}
                      title={isBangla ? 'বিস্তারিত দেখুন' : 'View Details'}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-all border border-slate-200 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{isBangla ? 'বিস্তারিত' : 'View'}</span>
                    </button>

                    {/* Attachments Button */}
                    <button
                      onClick={() => setSelectedInvestmentForAttachments(project.investmentId)}
                      title={isBangla ? 'সংযুক্তি ও দলিল' : 'Attachments'}
                      className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition-all border border-slate-200"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>

                    {/* Non-member management actions */}
                    {!isMember && (
                      <>
                        {/* PENDING_APPROVAL State Actions */}
                        {isPending && (
                          <>
                            <button
                              onClick={() => openApproveModal(project)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isBangla ? 'অনুমোদন করুন' : 'Approve'}</span>
                            </button>

                            <button
                              onClick={() => openRejectModal(project)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                            >
                              {isBangla ? 'প্রত্যাখ্যান' : 'Reject'}
                            </button>

                            <button
                              onClick={() => openEditModal(project)}
                              title={isBangla ? 'সম্পাদনা' : 'Edit'}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs border border-slate-200"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openDeleteModal(project)}
                              title={isBangla ? 'মুছে ফেলুন' : 'Delete'}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs border border-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* APPROVED State Actions */}
                        {isApproved && (
                          <>
                            <button
                              onClick={() => openExecuteModal(project)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>{isBangla ? 'বিতরণ / চালু করুন' : 'Disburse / Activate'}</span>
                            </button>

                            <button
                              onClick={() => openCancelModal(project)}
                              className="text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 px-2 py-1 rounded-lg text-xs font-medium"
                            >
                              {isBangla ? 'বাতিল' : 'Cancel'}
                            </button>

                            <button
                              onClick={() => openEditModal(project)}
                              title={isBangla ? 'সম্পাদনা' : 'Edit'}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs border border-slate-200"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* ACTIVE / PARTIAL_RETURN State Actions */}
                        {isActive && (
                          <>
                            <button
                              onClick={() => openReturnModal(project)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>{isBangla ? '+ রিটার্ন / লাভ জমা' : '+ Deposit Return'}</span>
                            </button>

                            <button
                              onClick={() => openEditModal(project)}
                              title={isBangla ? 'সম্পাদনা' : 'Edit Metadata'}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs border border-slate-200"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* COMPLETED State Actions */}
                        {isCompleted && (
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                            ✓ {isBangla ? 'সম্পূর্ণ পরিশোধিত' : 'Settled & Completed'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS SECTION */}
      {/* ========================================================================= */}

      {/* Attachments Modal */}
      {selectedInvestmentForAttachments && (
        <AttachmentModal
          entityType="INVESTMENT"
          entityId={selectedInvestmentForAttachments}
          title={`Investment #${selectedInvestmentForAttachments}`}
          onClose={() => setSelectedInvestmentForAttachments(null)}
        />
      )}

      {/* 1. Add Investment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  {isBangla ? 'নতুন বিনিয়োগ প্রস্তাব এন্ট্রি' : 'New Investment Proposal Entry'}
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-base">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isBangla ? 'প্রকল্পের নাম *' : 'Project Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isBangla ? 'যেমন: ধান-চাল মৌসুমি বাণিজ্য' : 'e.g. Grain trading venture'}
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isBangla ? 'বিনিয়োগের ধরণ' : 'Investment Type'}
                  </label>
                  <select
                    value={projectType}
                    onChange={e => setProjectType(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                  >
                    <option value="কৃষি ও বাণিজ্য">কৃষি ও বাণিজ্য (Agriculture & Trading)</option>
                    <option value="মৎস্য ও পশুসম্পদ">মৎস্য ও পশুসম্পদ (Fisheries & Livestock)</option>
                    <option value="মুদারাবা / অংশীদারি বাণিজ্য">মুদারাবা / অংশীদারি বাণিজ্য (Mudaraba / Partnership)</option>
                    <option value="স্থাবর সম্পত্তি / জমি উন্নয়ন">স্থাবর সম্পত্তি / জমি উন্নয়ন (Real Estate)</option>
                    <option value="মেয়াদী ব্যাংক আমানত / সুকুক">মেয়াদী ব্যাংক আমানত / সুকুক (Bank Deposit / Sukuk)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isBangla ? 'অংশীদার / প্রতিষ্ঠান (Partner)' : 'Partner / Institution'}
                  </label>
                  <input
                    type="text"
                    placeholder={isBangla ? 'যেমন: মেসার্স রহিম ট্রেডার্স' : 'Partner name'}
                    value={partner}
                    onChange={e => setPartner(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isBangla ? 'বিনিয়োগের পরিমাণ (৳) *' : 'Investment Amount (৳) *'}
                  </label>
                  <input
                    type="number"
                    min={1000}
                    required
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-indigo-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isBangla ? 'প্রত্যাশিত বার্ষিক মুনাফা (%)' : 'Expected ROI (%)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={expectedReturnRate}
                    onChange={e => setExpectedReturnRate(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isBangla ? 'পরিশোধ মাধ্যম (বিতরণের সময়)' : 'Disbursement Method'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="Bank">{isBangla ? 'ব্যাংক হিসাব (Bank Account)' : 'Bank Account'}</option>
                    <option value="Cash">{isBangla ? 'নগদ ক্যাশ (Cash in Hand)' : 'Cash in Hand'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'বিবরণ ও শর্তাবলি' : 'Description & Terms'}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  {isBangla
                    ? 'প্রস্তাব সাবমিটের পর এটি "অনুমোদনের অপেক্ষায়" থাকবে। পরিচালনা কমিটির অনুমোদনের পর তহবিল বিতরণ করা যাবে।'
                    : 'The proposal will start in PENDING_APPROVAL status. Disbursement occurs after approval.'}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
                >
                  {isBangla ? 'প্রস্তাব জমা দিন' : 'Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. View Investment Details Modal */}
      {isViewModalOpen && selectedInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <span className="font-mono text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-bold">
                  {selectedInvestment.investmentId}
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">
                  {selectedInvestment.projectName || selectedInvestment.description}
                </h3>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-base">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Status Header */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-600">{isBangla ? 'বর্তমান স্ট্যাটাস:' : 'Current Status:'}</span>
                <span className="font-bold px-3 py-0.5 rounded-full text-xs bg-slate-900 text-white font-mono">
                  {getInvestmentStatus(selectedInvestment)}
                </span>
              </div>

              {/* Financial Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">{isBangla ? 'মূল বিনিয়োগ:' : 'Original Principal:'}</span>
                  <span className="font-mono font-bold text-indigo-900 text-base">
                    ৳{(selectedInvestment.originalPrincipal ?? selectedInvestment.investmentAmount ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">{isBangla ? 'ফেরত আসল:' : 'Returned Principal:'}</span>
                  <span className="font-mono font-bold text-blue-700 text-base">
                    ৳{(selectedInvestment.returnedPrincipal || 0).toLocaleString()}
                  </span>
                </div>

                <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-700 font-semibold block">
                    {isBangla ? 'বকেয়া মূলধন:' : 'Outstanding Principal:'}
                  </span>
                  <span className="font-mono font-bold text-rose-700 text-base">
                    ৳{calculateInvestmentOutstanding(selectedInvestment).toLocaleString()}
                  </span>
                </div>

                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    {isBangla ? 'মোট অর্জিত নিট মুনাফা:' : 'Total Profit Received:'}
                  </span>
                  <span className="font-mono font-bold text-emerald-700 text-base">
                    ৳{(selectedInvestment.profit || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Metadata Details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-[11px]">
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">{isBangla ? 'বিনিয়োগের ধরণ:' : 'Investment Type:'}</span>
                  <span className="font-semibold text-slate-800">{selectedInvestment.investmentType}</span>
                </div>

                {selectedInvestment.partner && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">{isBangla ? 'অংশীদার:' : 'Partner:'}</span>
                    <span className="font-semibold text-slate-800">{selectedInvestment.partner}</span>
                  </div>
                )}

                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">{isBangla ? 'বিনিয়োগ শুরুর তারিখ:' : 'Start Date:'}</span>
                  <span className="font-semibold text-slate-800">{selectedInvestment.investmentDate || '-'}</span>
                </div>

                {selectedInvestment.approvedBy && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">{isBangla ? 'অনুমোদনকারী:' : 'Approved By:'}</span>
                    <span className="font-semibold text-blue-800">{selectedInvestment.approvedBy} ({selectedInvestment.approvalDate})</span>
                  </div>
                )}

                {selectedInvestment.approvalRemarks && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">{isBangla ? 'অনুমোদনের মন্তব্য:' : 'Approval Remarks:'}</span>
                    <span className="text-slate-700">{selectedInvestment.approvalRemarks}</span>
                  </div>
                )}

                {selectedInvestment.rejectedBy && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">{isBangla ? 'প্রত্যাখ্যানকারী:' : 'Rejected By:'}</span>
                    <span className="font-semibold text-rose-800">{selectedInvestment.rejectedBy}</span>
                  </div>
                )}

                {selectedInvestment.rejectionReason && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">{isBangla ? 'প্রত্যাখ্যানের কারণ:' : 'Rejection Reason:'}</span>
                    <span className="text-rose-700">{selectedInvestment.rejectionReason}</span>
                  </div>
                )}

                {selectedInvestment.cancelledBy && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-500">{isBangla ? 'বাতিলকারী:' : 'Cancelled By:'}</span>
                    <span className="font-semibold text-slate-800">{selectedInvestment.cancelledBy}</span>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 block mb-0.5">{isBangla ? 'সম্পূর্ণ বিবরণ:' : 'Full Description:'}</span>
                  <p className="text-slate-700 bg-white p-2 rounded border border-slate-200">
                    {selectedInvestment.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="bg-slate-900 text-white font-bold px-4 py-1.5 rounded-lg"
              >
                {isBangla ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Approve Investment Modal */}
      {isApproveModalOpen && selectedInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {isBangla ? 'বিনিয়োগ প্রস্তাব অনুমোদন' : 'Approve Investment Proposal'}
                </h3>
              </div>
              <button onClick={() => setIsApproveModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-base">
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">{isBangla ? 'বিনিয়োগ আইডি:' : 'Investment ID:'}</span>
                <span className="font-mono font-bold text-slate-900">{selectedInvestment.investmentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isBangla ? 'প্রস্তাবিত নাম:' : 'Project Name:'}</span>
                <span className="font-semibold text-slate-800">{selectedInvestment.projectName || selectedInvestment.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isBangla ? 'আবেদনের পরিমাণ:' : 'Requested Amount:'}</span>
                <span className="font-mono font-bold text-indigo-900">
                  ৳{(selectedInvestment.originalPrincipal ?? selectedInvestment.investmentAmount ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'অনুমোদিত মূলধন (৳) *' : 'Approved Principal (৳) *'}
                </label>
                <input
                  type="number"
                  min={1000}
                  required
                  value={approvedAmount}
                  onChange={e => setApprovedAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-indigo-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'অনুমোদনের মন্তব্য / শর্তাবলি' : 'Approval Remarks / Conditions'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isBangla ? 'কার্যনির্বাহী কমিটির সিদ্ধান্ত মোতাবেক অনুমোদিত' : 'Approved as per committee resolution'}
                  value={approvalRemarks}
                  onChange={e => setApprovalRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-[11px] text-blue-900">
                <span>
                  {isBangla
                    ? 'অনুমোদনের ফলে ফান্ড ব্যাংক/ক্যাশ থেকে তাৎক্ষণিক বিয়োগ হয় না। পরবর্তী ধাপে তহবিল বিতরণের পর নগদ/ব্যাংক সমন্বয় হবে।'
                    : 'Approval does not move cash immediately. Cash is disbursed upon execution.'}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
                >
                  {isBangla ? 'অনুমোদন নিশ্চিত করুন' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Reject Investment Modal */}
      {isRejectModalOpen && selectedInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {isBangla ? 'বিনিয়োগ প্রস্তাব প্রত্যাখ্যান' : 'Reject Investment Proposal'}
                </h3>
              </div>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-base">
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'প্রত্যাখ্যানের সুস্পষ্ট কারণ *' : 'Rejection Reason *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={isBangla ? 'প্রকল্পের উচ্চ ঝুঁকি / অপর্যাপ্ত জামানত ইত্যাদি কারণে প্রত্যাখ্যান' : 'Reason for rejection...'}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
                >
                  {isBangla ? 'প্রত্যাখ্যান নিশ্চিত করুন' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Execute / Disburse Investment Modal */}
      {isExecuteModalOpen && selectedInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  {isBangla ? 'বিনিয়োগ কার্যকর ও তহবিল বিতরণ' : 'Disburse & Activate Investment'}
                </h3>
              </div>
              <button onClick={() => setIsExecuteModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-base">
                ✕
              </button>
            </div>

            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-emerald-800">{isBangla ? 'বিনিয়োগ আইডি:' : 'Investment ID:'}</span>
                <span className="font-mono font-bold text-slate-900">{selectedInvestment.investmentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-800">{isBangla ? 'বিতরণযোগ্য মূলধন:' : 'Disbursable Principal:'}</span>
                <span className="font-mono font-bold text-emerald-900 text-sm">
                  ৳{(selectedInvestment.originalPrincipal ?? selectedInvestment.investmentAmount ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleExecuteSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'বিতরণের মাধ্যম' : 'Disbursement Method'}
                </label>
                <select
                  value={executePaymentMethod}
                  onChange={e => setExecutePaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="Bank">{isBangla ? 'ব্যাংক হিসাব (Cash at Bank)' : 'Bank Account'}</option>
                  <option value="Cash">{isBangla ? 'নগদ ক্যাশ (Cash in Hand)' : 'Cash in Hand'}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'বিতরণের তারিখ' : 'Disbursement Date'}
                </label>
                <input
                  type="date"
                  required
                  value={executeDate}
                  onChange={e => setExecuteDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                <span>
                  {isBangla
                    ? 'তহবিল বিতরণের সাথে সাথে স্বয়ংক্রিয়ভাবে হিসাবভুক্ত জার্নাল ও ক্যাশ/ব্যাংক আউটফ্লো তৈরি হবে এবং স্ট্যাটাস "চলমান" (ACTIVE) এ রূপান্তরিত হবে।'
                    : 'Disbursement generates journal vouchers, updates cash/bank ledger and activates the investment.'}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsExecuteModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
                >
                  {isBangla ? 'বিতরণ নিশ্চিত করুন' : 'Confirm Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Investment Modal */}
      {isEditModalOpen && selectedInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  {isBangla ? 'বিনিয়োগের তথ্য সংশোধন' : 'Edit Investment Details'}
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-base">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'অংশীদার / প্রতিষ্ঠান' : 'Partner / Institution'}
                </label>
                <input
                  type="text"
                  value={editPartner}
                  onChange={e => setEditPartner(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              {(getInvestmentStatus(selectedInvestment) === 'PENDING_APPROVAL' || getInvestmentStatus(selectedInvestment) === 'DRAFT') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isBangla ? 'মূলধনের পরিমাণ (৳)' : 'Principal Amount (৳)'}
                    </label>
                    <input
                      type="number"
                      min={1000}
                      value={editAmount}
                      onChange={e => setEditAmount(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isBangla ? 'প্রত্যাশিত মুনাফা (%)' : 'ROI Rate (%)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={editExpectedReturnRate}
                      onChange={e => setEditExpectedReturnRate(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'বিবরণ' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'মন্তব্য' : 'Remarks'}
                </label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
                >
                  {isBangla ? 'আপডেট করুন' : 'Update Investment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Return / Profit Deposit Modal */}
      {isReturnModalOpen && selectedInvestment && (() => {
        const currentOutstanding = calculateInvestmentOutstanding(selectedInvestment);
        const remainingAfterThis = Math.max(0, currentOutstanding - returnPrincipal);
        const willComplete = currentOutstanding > 0 && returnPrincipal >= currentOutstanding;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {isBangla ? 'বিনিয়োগ ফেরত ও মুনাফা গ্রহণ ভাউচার' : 'Investment Return & Profit Voucher'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {selectedInvestment.investmentId} - {selectedInvestment.projectName || selectedInvestment.description}
                  </p>
                </div>
                <button onClick={() => setIsReturnModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-base">
                  ✕
                </button>
              </div>

              {/* Outstanding vs Remaining Preview */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">
                    {isBangla ? 'বর্তমান বকেয়া আসল:' : 'Current Outstanding:'}
                  </span>
                  <span className="font-mono font-bold text-rose-700 text-sm">
                    ৳{currentOutstanding.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">
                    {isBangla ? 'রিটার্নের পর বকেয়া:' : 'Remaining Outstanding:'}
                  </span>
                  <span className={`font-mono font-bold text-sm ${remainingAfterThis === 0 ? 'text-emerald-700' : 'text-indigo-900'}`}>
                    ৳{remainingAfterThis.toLocaleString()}
                  </span>
                  {willComplete && (
                    <span className="text-[9px] font-bold text-emerald-600 block">
                      ✓ {isBangla ? 'মূলধন সম্পূর্ণ পরিশোধিত (সমাপ্ত হবে)' : 'Principal fully settled (Will complete)'}
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleReturnSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isBangla ? 'ফেরতকৃত আসল (৳)' : 'Returned Principal (৳)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={currentOutstanding}
                      value={returnPrincipal}
                      onChange={e => setReturnPrincipal(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-indigo-950 focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {isBangla ? 'মূলধন বকেয়া হ্রাস পাবে' : 'Reduces outstanding balance'}
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isBangla ? 'অর্জিত নিট মুনাফা (৳) *' : 'Net Profit (৳) *'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={returnProfit}
                      onChange={e => setReturnProfit(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-emerald-800 focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {isBangla ? 'সমিতির আয়ে জমা হবে' : 'Credited to society income'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isBangla ? 'গ্রহণের মাধ্যম' : 'Payment Method'}
                    </label>
                    <select
                      value={returnPaymentMethod}
                      onChange={e => setReturnPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <option value="Bank">{isBangla ? 'ব্যাংক (Bank Account)' : 'Bank Account'}</option>
                      <option value="Cash">{isBangla ? 'নগদ (Cash in Hand)' : 'Cash in Hand'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isBangla ? 'গ্রহণের তারিখ' : 'Return Date'}
                    </label>
                    <input
                      type="date"
                      required
                      value={returnDate}
                      onChange={e => setReturnDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isBangla ? 'মন্তব্য' : 'Remarks'}
                  </label>
                  <input
                    type="text"
                    value={returnRemarks}
                    onChange={e => setReturnRemarks(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsReturnModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
                  >
                    {isBangla ? 'রিটার্ন জমা নিশ্চিত করুন' : 'Confirm Return'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* 8. Cancel Investment Modal */}
      {isCancelModalOpen && selectedInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  {isBangla ? 'অনুমোদিত বিনিয়োগ বাতিল' : 'Cancel Approved Investment'}
                </h3>
              </div>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-base">
                ✕
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isBangla ? 'বাতিলের কারণ' : 'Cancellation Reason'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={isBangla ? 'প্রকল্প বাতিল করার কারণ...' : 'Reason for cancellation...'}
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  {isBangla ? 'বাতিল' : 'Back'}
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-black text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
                >
                  {isBangla ? 'বাতিল নিশ্চিত করুন' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {isBangla ? 'বিনিয়োগ প্রস্তাব মুছে ফেলুন' : 'Delete Investment Proposal'}
                </h3>
              </div>
              <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-base">
                ✕
              </button>
            </div>

            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-900 space-y-1">
              <p className="font-semibold">
                {isBangla
                  ? `আপনি কি নিশ্চিতভাবে "${selectedInvestment.investmentId}" প্রস্তাবটি মুছে ফেলতে চান?`
                  : `Are you sure you want to delete proposal "${selectedInvestment.investmentId}"?`}
              </p>
              <p className="text-[11px] text-rose-700">
                {isBangla
                  ? 'এই পদক্ষেপটি অপরিবর্তনযোগ্য। শুধুমাত্র অপেক্ষমান প্রস্তাব মুছে ফেলা যাবে।'
                  : 'This action is irreversible. Only pending proposals can be deleted.'}
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-1.5 rounded-lg shadow-md"
              >
                {isBangla ? 'মুছে ফেলুন' : 'Delete Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

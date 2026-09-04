import React, { useState, useEffect } from 'react';
import { 
  Bell, Plus, Calendar, Clock, MapPin, AlertTriangle, 
  CheckCircle2, XCircle, Trash2, Edit2, Eye, Send, 
  Search, Filter, ShieldAlert, Sparkles, AlertCircle, Info,
  ExternalLink, Check, Users, ArrowUpDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppNotification, NotificationType, NotificationPriority, NotificationAudience, NotificationDisplayMode, NotificationStatus } from '../../types';
import { 
  fetchNotificationsAPI, createNotificationAPI, updateNotificationAPI, 
  deleteNotificationAPI, publishNotificationAPI, unpublishNotificationAPI 
} from '../../services/api';

export const NotificationManagementView: React.FC = () => {
  const { language, activeUser, showNotification } = useApp();
  const isBangla = language === 'bn';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<AppNotification | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [form, setForm] = useState<{
    type: NotificationType;
    title: string;
    titleBn: string;
    message: string;
    messageBn: string;
    priority: NotificationPriority;
    audience: NotificationAudience;
    showOnMemberLogin: boolean;
    displayMode: NotificationDisplayMode;
    startDateTime: string;
    endDateTime: string;
    meetingDate: string;
    meetingTime: string;
    meetingLocation: string;
    meetingLocationBn: string;
    meetingDescription: string;
    instructions: string;
    instructionsBn: string;
    issuedBy: string;
    status: NotificationStatus;
  }>({
    type: 'GENERAL',
    title: '',
    titleBn: '',
    message: '',
    messageBn: '',
    priority: 'MEDIUM',
    audience: 'ALL_MEMBERS',
    showOnMemberLogin: true,
    displayMode: 'SHOW_ONCE',
    startDateTime: new Date().toISOString().slice(0, 16),
    endDateTime: '',
    meetingDate: '',
    meetingTime: '',
    meetingLocation: '',
    meetingLocationBn: '',
    meetingDescription: '',
    instructions: '',
    instructionsBn: '',
    issuedBy: 'কার্যনির্বাহী কমিটি',
    status: 'PUBLISHED'
  });

  // Guard: Admin & Accountant Only
  const isAdminOrStaff = activeUser?.role === 'ADMIN' || activeUser?.role === 'ACCOUNTANT';

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetchNotificationsAPI();
      if (res.success && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to load notifications', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrStaff) {
      loadNotifications();
    }
  }, [isAdminOrStaff]);

  if (!isAdminOrStaff) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200 max-w-md mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">
          {isBangla ? 'অনুমতি নেই (Access Denied)' : 'Access Denied'}
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          {isBangla 
            ? 'এই পেজটি দেখার বা নোটিফিকেশন পরিবর্তনের অনুমতি শুধুমাত্র অ্যাডমিনের রয়েছে।' 
            : 'Only administrators have permission to manage notifications.'}
        </p>
      </div>
    );
  }

  const handleOpenCreateModal = () => {
    setEditingNotif(null);
    setForm({
      type: 'GENERAL',
      title: '',
      titleBn: '',
      message: '',
      messageBn: '',
      priority: 'MEDIUM',
      audience: 'ALL_MEMBERS',
      showOnMemberLogin: true,
      displayMode: 'SHOW_ONCE',
      startDateTime: new Date().toISOString().slice(0, 16),
      endDateTime: '',
      meetingDate: '',
      meetingTime: '',
      meetingLocation: '',
      meetingLocationBn: '',
      meetingDescription: '',
      instructions: '',
      instructionsBn: '',
      issuedBy: isBangla ? 'কার্যনির্বাহী কমিটি' : 'Executive Committee',
      status: 'PUBLISHED'
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (notif: AppNotification) => {
    setEditingNotif(notif);
    setForm({
      type: notif.type || 'GENERAL',
      title: notif.title || '',
      titleBn: notif.titleBn || '',
      message: notif.message || '',
      messageBn: notif.messageBn || '',
      priority: notif.priority || 'MEDIUM',
      audience: notif.audience || 'ALL_MEMBERS',
      showOnMemberLogin: Boolean(notif.showOnMemberLogin),
      displayMode: notif.displayMode || 'SHOW_ONCE',
      startDateTime: notif.startDateTime ? new Date(notif.startDateTime).toISOString().slice(0, 16) : '',
      endDateTime: notif.endDateTime ? new Date(notif.endDateTime).toISOString().slice(0, 16) : '',
      meetingDate: notif.meetingDate || '',
      meetingTime: notif.meetingTime || '',
      meetingLocation: notif.meetingLocation || '',
      meetingLocationBn: notif.meetingLocationBn || '',
      meetingDescription: notif.meetingDescription || '',
      instructions: notif.instructions || '',
      instructionsBn: notif.instructionsBn || '',
      issuedBy: notif.issuedBy || '',
      status: notif.status || 'PUBLISHED'
    });
    setIsFormModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) {
      showNotification(isBangla ? 'শিরোনাম ও বিবরণ আবশ্যক' : 'Title and message are required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        startDateTime: form.startDateTime ? new Date(form.startDateTime).toISOString() : new Date().toISOString(),
        endDateTime: form.endDateTime ? new Date(form.endDateTime).toISOString() : null,
      };

      if (editingNotif) {
        await updateNotificationAPI(editingNotif.id, payload);
        showNotification(isBangla ? 'বিজ্ঞপ্তি সফলভাবে আপডেট করা হয়েছে' : 'Notification updated successfully', 'success');
      } else {
        await createNotificationAPI(payload);
        showNotification(isBangla ? 'নতুন বিজ্ঞপ্তি প্রকাশ করা হয়েছে' : 'Notification created successfully', 'success');
      }
      setIsFormModalOpen(false);
      loadNotifications();
    } catch (err: any) {
      showNotification(err.message || 'Operation failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (notif: AppNotification) => {
    try {
      if (notif.status === 'PUBLISHED') {
        await unpublishNotificationAPI(notif.id);
        showNotification(isBangla ? 'বিজ্ঞপ্তি আনপাবলিশ করা হয়েছে' : 'Notification unpublished', 'success');
      } else {
        await publishNotificationAPI(notif.id);
        showNotification(isBangla ? 'বিজ্ঞপ্তি পাবলিশ করা হয়েছে' : 'Notification published', 'success');
      }
      loadNotifications();
    } catch (err: any) {
      showNotification(err.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotificationAPI(id);
      showNotification(isBangla ? 'বিজ্ঞপ্তি মুছে ফেলা হয়েছে' : 'Notification deleted', 'success');
      setDeleteConfirmId(null);
      loadNotifications();
    } catch (err: any) {
      showNotification(err.message || 'Delete failed', 'error');
    }
  };

  // Filtered list
  const filteredNotifications = notifications.filter(n => {
    if (filterType !== 'ALL' && n.type !== filterType) return false;
    if (filterStatus !== 'ALL' && n.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q) || n.titleBn?.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q) || n.messageBn?.toLowerCase().includes(q);
      const matchIssuer = n.issuedBy?.toLowerCase().includes(q);
      return matchTitle || matchMsg || matchIssuer;
    }
    return true;
  });

  return (
    <div id="notification-management-container" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-emerald-600" />
            <span>{isBangla ? 'বিজ্ঞপ্তি ও ঘোষণা ব্যবস্থাপনা' : 'Notification & Notice Management'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isBangla 
              ? 'সদস্যদের লগইন পপআপ নোটিস, মিটিং ঘোষণা ও গুরুত্বপূর্ণ বার্তা পরিচালনা করুন' 
              : 'Manage member login popup notices, meeting announcements, and priority alerts'}
          </p>
        </div>

        <button
          id="btn-create-notification"
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{isBangla ? 'নতুন বিজ্ঞপ্তি তৈরি করুন' : 'Create Notification'}</span>
        </button>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">{isBangla ? 'মোট বিজ্ঞপ্তি' : 'Total Notices'}</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{notifications.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-emerald-600">{isBangla ? 'পাবলিশড (সক্রিয়)' : 'Published'}</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {notifications.filter(n => n.status === 'PUBLISHED').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-indigo-600">{isBangla ? 'লগইন পপআপ নোটিস' : 'Login Popups'}</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {notifications.filter(n => n.showOnMemberLogin && n.status === 'PUBLISHED').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-amber-600">{isBangla ? 'জরুরি / উচ্চ অগ্রাধিকার' : 'High Priority'}</div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {notifications.filter(n => n.priority === 'HIGH').length}
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-notification-search"
            type="text"
            placeholder={isBangla ? 'বিজ্ঞপ্তি খুঁজুন...' : 'Search notifications...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Type Filter */}
          <select
            id="select-filter-type"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">{isBangla ? 'সব ধরন (All Types)' : 'All Types'}</option>
            <option value="MEETING">{isBangla ? 'মিটিং (Meeting)' : 'Meeting'}</option>
            <option value="GENERAL">{isBangla ? 'সাধারণ নোটিস' : 'General Notice'}</option>
            <option value="ANNOUNCEMENT">{isBangla ? 'ঘোষণা' : 'Announcement'}</option>
            <option value="EVENT">{isBangla ? 'ইভেন্ট' : 'Event'}</option>
            <option value="EMERGENCY">{isBangla ? 'জরুরি' : 'Emergency'}</option>
            <option value="PAYMENT_COLLECTION">{isBangla ? 'চাঁদা নোটিস' : 'Payment / Collection'}</option>
            <option value="SOCIETY_INFO">{isBangla ? 'সমিতি তথ্য' : 'Society Info'}</option>
          </select>

          {/* Status Filter */}
          <select
            id="select-filter-status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">{isBangla ? 'সব স্ট্যাটাস' : 'All Status'}</option>
            <option value="PUBLISHED">{isBangla ? 'পাবলিশড (সক্রিয়)' : 'Published'}</option>
            <option value="DRAFT">{isBangla ? 'খসড়া (Draft)' : 'Draft'}</option>
            <option value="UNPUBLISHED">{isBangla ? 'আনপাবলিশড' : 'Unpublished'}</option>
          </select>
        </div>
      </div>

      {/* Notifications List Table / Cards */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">{isBangla ? 'বিজ্ঞপ্তি লোড হচ্ছে...' : 'Loading notifications...'}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">
              {isBangla ? 'কোনো বিজ্ঞপ্তি পাওয়া যায়নি' : 'No notifications found'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isBangla ? 'নতুন বিজ্ঞপ্তি তৈরি করতে উপরের বাটনে ক্লিক করুন।' : 'Click the button above to create a notification.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map(notif => {
              const isPublished = notif.status === 'PUBLISHED';
              const isHighPriority = notif.priority === 'HIGH';

              return (
                <div 
                  key={notif.id}
                  id={`notif-card-${notif.id}`}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                        notif.type === 'MEETING' 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                          : notif.type === 'EMERGENCY'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {notif.type}
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isHighPriority 
                          ? 'bg-rose-100 text-rose-800' 
                          : notif.priority === 'MEDIUM' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {notif.priority}
                      </span>

                      {notif.showOnMemberLogin && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {isBangla ? 'লগইন পপআপ' : 'Login Popup'}
                        </span>
                      )}

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {notif.status}
                      </span>

                      <span className="text-[11px] text-slate-400 font-medium">
                        Audience: {notif.audience === 'ACTIVE_MEMBERS' ? (isBangla ? 'সক্রিয় সদস্য' : 'Active Members') : (isBangla ? 'সব সদস্য' : 'All Members')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {isBangla ? (notif.titleBn || notif.title) : notif.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {isBangla ? (notif.messageBn || notif.message) : notif.message}
                    </p>

                    {/* Meeting Specific Info Tag */}
                    {notif.type === 'MEETING' && (
                      <div className="flex items-center gap-3 text-xs text-indigo-700 font-medium bg-indigo-50/70 p-2 rounded-lg border border-indigo-100/60 w-fit">
                        {notif.meetingDate && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {notif.meetingDate}</span>}
                        {notif.meetingTime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {notif.meetingTime}</span>}
                        {notif.meetingLocation && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {notif.meetingLocation}</span>}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium pt-1">
                      <span>{isBangla ? 'প্রকাশক:' : 'Issued by:'} {notif.issuedBy}</span>
                      <span>{isBangla ? 'তারিখ:' : 'Date:'} {new Date(notif.createdAt).toLocaleDateString()}</span>
                      {(notif as any).totalAcks !== undefined && (
                        <span className="text-emerald-700 font-semibold">
                          {isBangla ? `পড়েছেন: ${(notif as any).totalAcks} জন` : `Acknowledged: ${(notif as any).totalAcks}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {/* Toggle Publish */}
                    <button
                      type="button"
                      id={`btn-toggle-publish-${notif.id}`}
                      onClick={() => handleTogglePublish(notif)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        isPublished 
                          ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200' 
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {isPublished 
                        ? (isBangla ? 'আনপাবলিশ' : 'Unpublish') 
                        : (isBangla ? 'পাবলিশ করুন' : 'Publish')}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      id={`btn-edit-notif-${notif.id}`}
                      onClick={() => handleOpenEditModal(notif)}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title={isBangla ? 'সম্পাদনা করুন' : 'Edit'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    {deleteConfirmId === notif.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(notif.id)}
                          className="px-2 py-1 rounded bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                        >
                          {isBangla ? 'নিশ্চিত' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs font-medium"
                        >
                          {isBangla ? 'বাতিল' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        id={`btn-delete-notif-${notif.id}`}
                        onClick={() => setDeleteConfirmId(notif.id)}
                        className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title={isBangla ? 'মুছে ফেলুন' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Form Modal */}
      {isFormModalOpen && (
        <div 
          id="modal-notification-form-backdrop"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div 
            id="modal-notification-form"
            className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] my-auto"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {editingNotif 
                    ? (isBangla ? 'বিজ্ঞপ্তি সম্পাদনা' : 'Edit Notification') 
                    : (isBangla ? 'নতুন বিজ্ঞপ্তি তৈরি করুন' : 'Create New Notification')}
                </h3>
              </div>
              <button
                type="button"
                id="btn-close-notif-modal"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Type, Priority, Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'বিজ্ঞপ্তির ধরন *' : 'Notification Type *'}
                  </label>
                  <select
                    id="form-select-type"
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as NotificationType })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="GENERAL">{isBangla ? 'সাধারণ নোটিস' : 'General Notice'}</option>
                    <option value="MEETING">{isBangla ? 'মিটিং / সভা' : 'Meeting'}</option>
                    <option value="ANNOUNCEMENT">{isBangla ? 'গুরুত্বপূর্ণ ঘোষণা' : 'Announcement'}</option>
                    <option value="EVENT">{isBangla ? 'ইভেন্ট / অনুষ্ঠান' : 'Event'}</option>
                    <option value="EMERGENCY">{isBangla ? 'জরুরি বিজ্ঞপ্তি' : 'Emergency Notice'}</option>
                    <option value="PAYMENT_COLLECTION">{isBangla ? 'চাঁদা ও আদায়' : 'Payment / Collection'}</option>
                    <option value="SOCIETY_INFO">{isBangla ? 'সমিতির তথ্য' : 'Society Info'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'অগ্রাধিকার *' : 'Priority *'}
                  </label>
                  <select
                    id="form-select-priority"
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value as NotificationPriority })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="HIGH">{isBangla ? 'উচ্চ অগ্রাধিকার (HIGH)' : 'HIGH'}</option>
                    <option value="MEDIUM">{isBangla ? 'মাঝারি (MEDIUM)' : 'MEDIUM'}</option>
                    <option value="LOW">{isBangla ? 'সাধারণ (LOW)' : 'LOW'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'টার্গেট অডিয়েন্স *' : 'Target Audience *'}
                  </label>
                  <select
                    id="form-select-audience"
                    value={form.audience}
                    onChange={e => setForm({ ...form, audience: e.target.value as NotificationAudience })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ALL_MEMBERS">{isBangla ? 'সব সদস্য (All Members)' : 'All Members'}</option>
                    <option value="ACTIVE_MEMBERS">{isBangla ? 'শুধু সক্রিয় সদস্য (Active Only)' : 'Active Members Only'}</option>
                  </select>
                </div>
              </div>

              {/* Show on Login & Display Mode Settings */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    id="checkbox-show-on-login"
                    type="checkbox"
                    checked={form.showOnMemberLogin}
                    onChange={e => setForm({ ...form, showOnMemberLogin: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="checkbox-show-on-login" className="font-bold text-slate-800 cursor-pointer">
                    {isBangla ? 'সদস্য লগইন করার সাথে সাথে পপআপ আকারে দেখান' : 'Show popup immediately after Member login'}
                  </label>
                </div>

                {form.showOnMemberLogin && (
                  <div className="pt-2 border-t border-emerald-100 flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className="text-xs font-semibold text-slate-700">
                      {isBangla ? 'প্রদর্শন মোড (Display Mode):' : 'Display Mode:'}
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="displayMode"
                        value="SHOW_ONCE"
                        checked={form.displayMode === 'SHOW_ONCE'}
                        onChange={() => setForm({ ...form, displayMode: 'SHOW_ONCE' })}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{isBangla ? 'একবার পড়ে নিলেই আর দেখাবে না (Show Once)' : 'Show Once (dismiss after acknowledgement)'}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="displayMode"
                        value="SHOW_EVERY_LOGIN"
                        checked={form.displayMode === 'SHOW_EVERY_LOGIN'}
                        onChange={() => setForm({ ...form, displayMode: 'SHOW_EVERY_LOGIN' })}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{isBangla ? 'প্রতিবার লগইনে দেখাবে (Show Every Login)' : 'Show Every Login (until expired)'}</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Title & Title Bangla */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'বিজ্ঞপ্তির শিরোনাম (English/Title) *' : 'Title *'}
                  </label>
                  <input
                    id="form-input-title"
                    type="text"
                    required
                    placeholder="e.g. Monthly General Meeting"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'বিজ্ঞপ্তির শিরোনাম (বাংলা)' : 'Title (Bangla)'}
                  </label>
                  <input
                    id="form-input-title-bn"
                    type="text"
                    placeholder="উদাঃ মাসিক সাধারণ সভা"
                    value={form.titleBn}
                    onChange={e => setForm({ ...form, titleBn: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Message & Message Bangla */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isBangla ? 'মূল বার্তা / বিবরণ *' : 'Message / Announcement Content *'}
                </label>
                <textarea
                  id="form-input-message"
                  required
                  rows={3}
                  placeholder={isBangla ? 'বিজ্ঞপ্তির বিস্তারিত বিবরণ লিখুন...' : 'Enter message content...'}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Meeting Specific Inputs (if type is MEETING) */}
              {form.type === 'MEETING' && (
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                  <div className="font-bold text-xs text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>{isBangla ? 'মিটিং এর তথ্য ও সময়সূচী' : 'Meeting Details'}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1 text-xs">{isBangla ? 'সভার তারিখ' : 'Meeting Date'}</label>
                      <input
                        type="date"
                        value={form.meetingDate}
                        onChange={e => setForm({ ...form, meetingDate: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1 text-xs">{isBangla ? 'সভার সময়' : 'Meeting Time'}</label>
                      <input
                        type="text"
                        placeholder="e.g. 04:00 PM / বিকাল ৪টা"
                        value={form.meetingTime}
                        onChange={e => setForm({ ...form, meetingTime: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1 text-xs">{isBangla ? 'সভার স্থান / ভেন্যু' : 'Location / Venue'}</label>
                      <input
                        type="text"
                        placeholder="e.g. Society Office"
                        value={form.meetingLocation}
                        onChange={e => setForm({ ...form, meetingLocation: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1 text-xs">{isBangla ? 'আলোচ্য বিষয় (Agenda)' : 'Meeting Agenda'}</label>
                    <textarea
                      rows={2}
                      placeholder={isBangla ? 'সভার আলোচ্য বিষয়...' : 'Meeting description or agenda points...'}
                      value={form.meetingDescription}
                      onChange={e => setForm({ ...form, meetingDescription: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isBangla ? 'সদস্যদের জন্য বিশেষ নির্দেশনা (যদি থাকে)' : 'Important Instructions (Optional)'}
                </label>
                <input
                  id="form-input-instructions"
                  type="text"
                  placeholder={isBangla ? 'যেমন: পাসবুক সাথে নিয়ে আসবেন।' : 'e.g. Please bring your passbook and national ID.'}
                  value={form.instructions}
                  onChange={e => setForm({ ...form, instructions: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Date Validity Window & Issuer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'শুরুর তারিখ ও সময়' : 'Start Date & Time'}
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startDateTime}
                    onChange={e => setForm({ ...form, startDateTime: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'শেষ তারিখ (মেয়াদ উত্তীর্ণ)' : 'End Date (Optional)'}
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endDateTime}
                    onChange={e => setForm({ ...form, endDateTime: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {isBangla ? 'প্রদানকারী / ইস্যুকারী' : 'Issued By'}
                  </label>
                  <input
                    type="text"
                    value={form.issuedBy}
                    onChange={e => setForm({ ...form, issuedBy: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Initial Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isBangla ? 'অবস্থা (Status)' : 'Status'}
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as NotificationStatus })}
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs font-semibold"
                >
                  <option value="PUBLISHED">{isBangla ? 'সরাসরি প্রকাশ করুন (Published)' : 'Published'}</option>
                  <option value="DRAFT">{isBangla ? 'খসড়া হিসেবে রাখুন (Draft)' : 'Draft'}</option>
                </select>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  id="btn-cancel-notif-form"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  id="btn-submit-notif-form"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-50"
                >
                  {isSaving ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBangla ? 'বিজ্ঞপ্তি সংরক্ষণ করুন' : 'Save Notification')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

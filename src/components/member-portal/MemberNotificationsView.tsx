import React, { useState, useEffect } from 'react';
import { 
  Bell, Calendar, Clock, MapPin, AlertTriangle, 
  CheckCircle2, Info, Sparkles, ShieldAlert, AlertCircle 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppNotification } from '../../types';
import { fetchNotificationsAPI, acknowledgeNotificationAPI } from '../../services/api';

export const MemberNotificationsView: React.FC = () => {
  const { language, showNotification } = useApp();
  const isBangla = language === 'bn';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetchNotificationsAPI();
      if (res.success && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
      }
    } catch (err: any) {
      console.error('Failed to load notifications for member:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleAcknowledge = async (id: string) => {
    setAcknowledgingId(id);
    try {
      await acknowledgeNotificationAPI(id);
      showNotification(isBangla ? 'পড়ার স্বীকৃতি নিশ্চিত করা হয়েছে' : 'Acknowledgement confirmed', 'success');
      loadNotifications();
    } catch (err: any) {
      showNotification(err.message || 'Operation failed', 'error');
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div id="member-notifications-view" className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-emerald-600" />
            <span>{isBangla ? 'বিজ্ঞপ্তি ও সাধারণ নোটিস' : 'Notifications & Announcements'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isBangla 
              ? 'সমিতির গুরুত্বপূর্ণ মিটিং, জরুরি ঘোষণা এবং সাধারণ নোটিস তালিকা' 
              : 'Society meetings, priority alerts, and announcements'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">{isBangla ? 'বিজ্ঞপ্তি লোড হচ্ছে...' : 'Loading notifications...'}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-12 text-center text-slate-500">
          <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-bold text-slate-800">
            {isBangla ? 'আপনার কোনো নতুন নোটিফিকেশন নেই' : 'You have no notifications'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isBangla ? 'সমিতি থেকে নতুন কোনো বার্তা বা মিটিং ডাকা হলে এখানে প্রদর্শিত হবে।' : 'New announcements and meeting notices will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notif => {
            const isAck = (notif as any).isAcknowledged;
            const isHighPriority = notif.priority === 'HIGH';

            return (
              <div
                key={notif.id}
                id={`member-notif-card-${notif.id}`}
                className={`bg-white rounded-2xl shadow-xs border p-5 transition-all ${
                  isHighPriority 
                    ? 'border-rose-200 shadow-rose-100/30' 
                    : notif.type === 'MEETING'
                    ? 'border-indigo-100 shadow-indigo-100/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        notif.type === 'MEETING'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : notif.type === 'EMERGENCY'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {notif.type}
                      </span>

                      {isHighPriority && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {isBangla ? 'জরুরি' : 'HIGH PRIORITY'}
                        </span>
                      )}

                      {isAck ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {isBangla ? 'পড়া হয়েছে' : 'Acknowledged'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {isBangla ? 'নতুন' : 'Unread'}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {isBangla ? (notif.titleBn || notif.title) : notif.title}
                    </h2>
                  </div>

                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                    {new Date(notif.createdAt).toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {/* Meeting Details if type is MEETING */}
                {notif.type === 'MEETING' && (
                  <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-100 space-y-2 mb-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                      {notif.meetingDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          <span>{isBangla ? 'তারিখ:' : 'Date:'} <strong>{notif.meetingDate}</strong></span>
                        </div>
                      )}
                      {notif.meetingTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          <span>{isBangla ? 'সময়:' : 'Time:'} <strong>{notif.meetingTime}</strong></span>
                        </div>
                      )}
                    </div>
                    {notif.meetingLocation && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{isBangla ? 'স্থান:' : 'Location:'} <strong>{isBangla ? (notif.meetingLocationBn || notif.meetingLocation) : notif.meetingLocation}</strong></span>
                      </div>
                    )}
                    {notif.instructions && (
                      <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-900 text-[11px] font-medium">
                        {isBangla ? (notif.instructionsBn || notif.instructions) : notif.instructions}
                      </div>
                    )}
                  </div>
                )}

                {/* Message Body */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                  {isBangla ? (notif.messageBn || notif.message) : notif.message}
                </p>

                {/* Footer and Acknowledge Button if unacknowledged */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    <span>{isBangla ? 'ইস্যুকারী:' : 'Issued by:'} {notif.issuedBy}</span>
                  </div>

                  {!isAck && (
                    <button
                      type="button"
                      id={`btn-ack-notif-${notif.id}`}
                      onClick={() => handleAcknowledge(notif.id)}
                      disabled={acknowledgingId === notif.id}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-xs active:scale-95 disabled:opacity-50 self-end sm:self-auto"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{acknowledgingId === notif.id ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBangla ? '✓ আমি পড়েছি' : '✓ Acknowledge')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  Bell, Calendar, Clock, MapPin, AlertTriangle, Info, 
  ChevronRight, ChevronLeft, CheckCircle2, ShieldAlert, 
  FileText, Sparkles, Building, AlertCircle
} from 'lucide-react';
import { AppNotification } from '../../types';
import { useApp } from '../../context/AppContext';
import { acknowledgeNotificationAPI, recordNotificationViewAPI } from '../../services/api';

interface MemberLoginNotificationModalProps {
  notifications: AppNotification[];
  loginSessionId?: string;
  onComplete: () => void;
}

export const MemberLoginNotificationModal: React.FC<MemberLoginNotificationModalProps> = ({
  notifications,
  loginSessionId,
  onComplete
}) => {
  const { language } = useApp();
  const isBangla = language === 'bn';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prevent background scrolling while modal is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const currentNotif = notifications[currentIndex];

  // Record view on current notification
  useEffect(() => {
    if (currentNotif?.id) {
      recordNotificationViewAPI(currentNotif.id).catch(() => {});
    }
    // Reset details expansion when switching notifications
    setIsDetailsExpanded(false);
  }, [currentIndex, currentNotif?.id]);

  if (!currentNotif) {
    return null;
  }

  const isLast = currentIndex === notifications.length - 1;
  const isMultiple = notifications.length > 1;

  const handleAcknowledgeAndNext = async () => {
    setIsSubmitting(true);
    try {
      await acknowledgeNotificationAPI(currentNotif.id, loginSessionId);
    } catch (err) {
      console.error('Failed to acknowledge notification:', err);
    } finally {
      setIsSubmitting(false);
      if (isLast) {
        onComplete();
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Type styling and icon resolver
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'MEETING':
        return {
          icon: Calendar,
          label: isBangla ? 'গুরুত্বপূর্ণ সভা / মিটিং' : 'Important Meeting',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        };
      case 'EMERGENCY':
        return {
          icon: ShieldAlert,
          label: isBangla ? 'জরুরি বিজ্ঞপ্তি' : 'Emergency Notice',
          color: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      case 'PAYMENT_COLLECTION':
        return {
          icon: AlertCircle,
          label: isBangla ? 'চাঁদা ও আদায় নোটিস' : 'Payment / Collection',
          color: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      case 'EVENT':
        return {
          icon: Sparkles,
          label: isBangla ? 'বিশেষ অনুষ্ঠান / ইভেন্ট' : 'Society Event',
          color: 'bg-purple-50 text-purple-700 border-purple-200'
        };
      case 'ANNOUNCEMENT':
        return {
          icon: Bell,
          label: isBangla ? 'বিশেষ ঘোষণা' : 'Announcement',
          color: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      default:
        return {
          icon: Info,
          label: isBangla ? 'সাধারণ নোটিস' : 'General Notice',
          color: 'bg-slate-50 text-slate-700 border-slate-200'
        };
    }
  };

  const typeInfo = getTypeBadge(currentNotif.type);
  const TypeIcon = typeInfo.icon;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3" />
            {isBangla ? 'জরুরি / উচ্চ অগ্রাধিকার' : 'HIGH PRIORITY'}
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {isBangla ? 'সাধারণ' : 'NORMAL'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            {isBangla ? 'মাঝারি অগ্রাধিকার' : 'MEDIUM PRIORITY'}
          </span>
        );
    }
  };

  return (
    <div 
      id="member-login-notification-modal-backdrop"
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none font-sans animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div 
        id="member-login-notification-card"
        className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Top Header Bar */}
        <div className={`p-4 sm:p-5 border-b flex items-start justify-between gap-3 ${
          currentNotif.priority === 'HIGH' 
            ? 'bg-rose-50/70 border-rose-100' 
            : currentNotif.type === 'MEETING'
            ? 'bg-indigo-50/60 border-indigo-100'
            : 'bg-slate-50/80 border-slate-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
              currentNotif.priority === 'HIGH'
                ? 'bg-rose-600 text-white'
                : currentNotif.type === 'MEETING'
                ? 'bg-indigo-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md border ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
                {getPriorityBadge(currentNotif.priority)}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {currentNotif.issuedBy || (isBangla ? 'কার্যনির্বাহী কমিটি' : 'Executive Committee')}
              </p>
            </div>
          </div>

          {/* Multiple Notifications Counter */}
          {isMultiple && (
            <div className="px-2.5 py-1 bg-white/90 rounded-full border border-slate-200/80 text-[11px] font-bold text-slate-700 whitespace-nowrap shadow-xs">
              {isBangla ? `বিজ্ঞপ্তি ${currentIndex + 1} / ${notifications.length}` : `Notice ${currentIndex + 1} of ${notifications.length}`}
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 max-h-[58vh]">
          {/* Title */}
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
              {isBangla ? (currentNotif.titleBn || currentNotif.title) : currentNotif.title}
            </h2>
            {currentNotif.startDateTime && (
              <p className="text-xs text-slate-400 mt-1">
                {new Date(currentNotif.startDateTime).toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>

          {/* Dedicated Meeting Details Card if Meeting */}
          {currentNotif.type === 'MEETING' && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  {isBangla ? 'সভার বিবরণ ও সময়সূচী' : 'Meeting Schedule & Venue'}
                </span>
                <button
                  type="button"
                  id="btn-toggle-meeting-details"
                  onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline transition-colors"
                >
                  {isDetailsExpanded 
                    ? (isBangla ? 'সংক্ষেপ করুন' : 'Hide Details') 
                    : (isBangla ? 'বিস্তারিত দেখুন' : 'View Details')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {currentNotif.meetingDate && (
                  <div className="flex items-center gap-2 text-slate-700 bg-white/80 p-2 rounded-lg border border-indigo-100/60">
                    <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">{isBangla ? 'তারিখ' : 'Date'}</div>
                      <div className="font-semibold">{currentNotif.meetingDate}</div>
                    </div>
                  </div>
                )}
                {currentNotif.meetingTime && (
                  <div className="flex items-center gap-2 text-slate-700 bg-white/80 p-2 rounded-lg border border-indigo-100/60">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">{isBangla ? 'সময়' : 'Time'}</div>
                      <div className="font-semibold">{currentNotif.meetingTime}</div>
                    </div>
                  </div>
                )}
              </div>

              {currentNotif.meetingLocation && (
                <div className="flex items-start gap-2 text-slate-700 bg-white/80 p-2 rounded-lg border border-indigo-100/60 text-xs">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">{isBangla ? 'স্থান / ভেন্যু' : 'Location'}</div>
                    <div className="font-semibold">
                      {isBangla ? (currentNotif.meetingLocationBn || currentNotif.meetingLocation) : currentNotif.meetingLocation}
                    </div>
                  </div>
                </div>
              )}

              {isDetailsExpanded && (
                <div className="pt-2 border-t border-indigo-100/80 space-y-2 animate-in fade-in duration-150">
                  {currentNotif.meetingDescription && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">{isBangla ? 'আলোচ্য বিষয়' : 'Agenda / Description'}</div>
                      <p className="text-xs text-slate-700 mt-0.5 whitespace-pre-line leading-relaxed">
                        {currentNotif.meetingDescription}
                      </p>
                    </div>
                  )}
                  {currentNotif.instructions && (
                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/70">
                      <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {isBangla ? 'বিশেষ নির্দেশনা' : 'Important Instructions'}
                      </div>
                      <p className="text-xs text-amber-900 mt-0.5 whitespace-pre-line leading-relaxed">
                        {isBangla ? (currentNotif.instructionsBn || currentNotif.instructions) : currentNotif.instructions}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Message Content */}
          <div className="text-sm text-slate-700 leading-relaxed bg-slate-50/60 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
            {isBangla ? (currentNotif.messageBn || currentNotif.message) : currentNotif.message}
          </div>

          {/* Additional instructions if present for non-meeting types */}
          {currentNotif.type !== 'MEETING' && currentNotif.instructions && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-xs text-amber-900 leading-relaxed">
              <span className="font-bold flex items-center gap-1 mb-1 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                {isBangla ? 'বিশেষ নির্দেশনা:' : 'Important Instructions:'}
              </span>
              {isBangla ? (currentNotif.instructionsBn || currentNotif.instructions) : currentNotif.instructions}
            </div>
          )}

          {/* Acknowledgement Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              {isBangla 
                ? 'পড়া শেষে "আমি পড়েছি ও বুঝেছি" বাটনে ক্লিক করে মূল পেজে যান।' 
                : 'Click "I Understand / Continue" to proceed to your portal.'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {/* Previous Button (if multiple notices) */}
          {isMultiple && currentIndex > 0 ? (
            <button
              type="button"
              id="btn-login-notification-prev"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{isBangla ? 'পূর্ববর্তী' : 'Previous'}</span>
            </button>
          ) : (
            <div />
          )}

          {/* Continue / Acknowledge Button */}
          <button
            type="button"
            id="btn-login-notification-acknowledge"
            onClick={handleAcknowledgeAndNext}
            disabled={isSubmitting}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${
              currentNotif.priority === 'HIGH'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            {isSubmitting ? (
              <span>{isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
            ) : isLast ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isBangla ? '✓ আমি পড়েছি ও বুঝেছি / প্রবেশ করুন' : '✓ I Understand / Continue'}</span>
              </>
            ) : (
              <>
                <span>{isBangla ? 'পরবর্তী নোটিস' : 'Next Notice'}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

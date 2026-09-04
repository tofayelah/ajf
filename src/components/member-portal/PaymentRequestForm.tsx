import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { submitMemberPaymentRequestAPI } from '../../services/api';
import { CheckCircle2, AlertCircle, Building, Smartphone } from 'lucide-react';
import { Member } from '../../types';

interface Props {
  member: Member;
  dueAmount: number;
  onSuccess: () => void;
}

export const PaymentRequestForm: React.FC<Props> = ({ member, dueAmount, onSuccess }) => {
  const { language, db } = useApp();
  const isBangla = language === 'bn';
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();
  
  const [formData, setFormData] = useState({
    requestedAmount: dueAmount,
    transactionId: '',
    senderMobile: '',
    paymentDate: currentDate.toISOString().split('T')[0],
    note: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const officialBkash = db.settings?.companyBkashNumber || '01XXXXXXXXX';
  const bkashType = db.settings?.companyBkashType || 'Merchant';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.transactionId.trim()) {
      setError(isBangla ? 'ট্রানজেকশন আইডি আবশ্যক' : 'Transaction ID is required');
      return;
    }
    
    if (formData.requestedAmount <= 0) {
      setError(isBangla ? 'ভুল পরিমাণ' : 'Invalid amount');
      return;
    }

    setLoading(true);
    try {
      await submitMemberPaymentRequestAPI({
        month: currentMonth,
        year: currentYear,
        dueAmount,
        requestedAmount: formData.requestedAmount,
        paymentMethod: 'bKash',
        senderMobile: formData.senderMobile,
        transactionId: formData.transactionId,
        paymentDate: formData.paymentDate,
        note: formData.note
      });
      // Optionally mutate global state or trigger refresh here, but wait for dashboard reload is easier
      window.location.reload(); 
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment request');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      {error && (
        <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm font-medium border border-rose-200 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Official Details */}
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-3">
        <h4 className="font-bold text-emerald-900 flex items-center gap-2">
          <Building className="w-5 h-5 text-emerald-700" />
          {isBangla ? 'অফিসিয়াল বিকাশ তথ্য' : 'Official bKash Details'}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-emerald-700 font-medium">{isBangla ? 'বিকাশ নম্বর:' : 'bKash Number:'}</p>
            <p className="font-bold text-emerald-900 text-lg tracking-wide">{officialBkash}</p>
            <p className="text-xs text-emerald-600 font-bold uppercase">{bkashType}</p>
          </div>
          <div>
            <p className="text-emerald-700 font-medium">{isBangla ? 'পরিশোধের পরিমাণ:' : 'Payment Amount:'}</p>
            <p className="font-bold text-emerald-900 text-lg">৳{dueAmount.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-xs text-emerald-700/80 bg-emerald-100/50 p-2 rounded-lg font-medium">
          {isBangla 
            ? 'দয়া করে প্রথমে উপরের নম্বরে বিকাশ করুন। তারপর নিচের ফর্মটি পূরণ করুন।' 
            : 'Please complete your bKash payment first. Then enter the transaction information below.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Read-Only Member Info */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">{isBangla ? 'সদস্যের নাম' : 'Member Name'}</label>
          <input type="text" value={member.fullName} readOnly className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600 font-semibold cursor-not-allowed outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">{isBangla ? 'সদস্য আইডি' : 'Member ID'}</label>
          <input type="text" value={member.memberId} readOnly className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600 font-semibold cursor-not-allowed outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">{isBangla ? 'মাস' : 'Month'}</label>
          <input type="text" value={currentMonth} readOnly className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600 font-semibold cursor-not-allowed outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">{isBangla ? 'বছর' : 'Year'}</label>
          <input type="text" value={currentYear} readOnly className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600 font-semibold cursor-not-allowed outline-none" />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Editable Payment Details */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {isBangla ? 'পরিশোধের পরিমাণ ৳' : 'Payment Amount ৳'} *
          </label>
          <input 
            type="number" 
            name="requestedAmount"
            value={formData.requestedAmount}
            onChange={handleChange}
            min="1"
            required
            className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm outline-none transition-all" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {isBangla ? 'ট্রানজেকশন আইডি (TrxID)' : 'Transaction ID (TrxID)'} *
          </label>
          <input 
            type="text" 
            name="transactionId"
            value={formData.transactionId}
            onChange={handleChange}
            placeholder="e.g. 9B5XQ7D3P1"
            required
            className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm font-mono uppercase outline-none transition-all" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {isBangla ? 'প্রেরকের মোবাইল নম্বর' : 'Sender Mobile Number'} *
          </label>
          <div className="relative">
            <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              name="senderMobile"
              value={formData.senderMobile}
              onChange={handleChange}
              placeholder="01XXXXXXXXX"
              required
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm outline-none transition-all" 
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {isBangla ? 'পেমেন্ট তারিখ' : 'Payment Date'} *
          </label>
          <input 
            type="date" 
            name="paymentDate"
            value={formData.paymentDate}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm outline-none transition-all" 
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {isBangla ? 'নোট (ঐচ্ছিক)' : 'Note (Optional)'}
          </label>
          <textarea 
            name="note"
            value={formData.note}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm outline-none transition-all resize-none" 
          ></textarea>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button 
          type="button"
          onClick={onSuccess}
          disabled={loading}
          className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold text-sm rounded-lg transition-colors"
        >
          {isBangla ? 'বাতিল' : 'Cancel'}
        </button>
        <button 
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"></span>
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {isBangla ? 'অনুরোধ জমা দিন' : 'Submit Payment Request'}
        </button>
      </div>
    </form>
  );
};

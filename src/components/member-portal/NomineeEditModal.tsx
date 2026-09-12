import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Save, AlertCircle } from 'lucide-react';
import { updateNomineeAPI } from '../../services/api';
import { Nominee } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  existingNominee?: Nominee;
  onSuccess: () => void;
}

export const NomineeEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  memberId,
  existingNominee,
  onSuccess
}) => {
  const { language } = useApp();
  const isBangla = language === 'bn';

  const [formData, setFormData] = useState({
    name: existingNominee?.name || '',
    relation: existingNominee?.relation || '',
    dob: existingNominee?.dob || '',
    nid: existingNominee?.nid || '',
    mobile: existingNominee?.mobile || '',
    address: existingNominee?.address || '',
    percentage: existingNominee?.percentage || 100,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError(isBangla ? 'নমিনীর নাম আবশ্যক' : 'Nominee Name is required');
      return;
    }
    if (!formData.relation.trim()) {
      setError(isBangla ? 'সম্পর্ক আবশ্যক' : 'Relationship is required');
      return;
    }

    try {
      setLoading(true);
      await updateNomineeAPI({
        memberId,
        ...formData
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {isBangla ? 'নমিনীর তথ্য আপডেট করুন' : 'Update Nominee Information'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex flex-col gap-1 border border-red-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <form id="nominee-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'নমিনীর নাম *' : 'Nominee Name *'}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'সম্পর্ক *' : 'Relationship *'}
                </label>
                <input
                  type="text"
                  name="relation"
                  value={formData.relation}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'অংশ/শেয়ার (%)' : 'Share (%)'}
                </label>
                <input
                  type="number"
                  name="percentage"
                  value={formData.percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'জন্ম তারিখ' : 'Date of Birth'}
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBangla ? 'মোবাইল নাম্বার' : 'Mobile Number'}
                </label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="e.g. 01XXXXXXXXX"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'এনআইডি / জন্ম নিবন্ধন' : 'NID / Birth Registration No.'}
              </label>
              <input
                type="text"
                name="nid"
                value={formData.nid}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isBangla ? 'ঠিকানা' : 'Address'}
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm resize-none"
              />
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl font-bold transition-colors text-sm"
            disabled={loading}
          >
            {isBangla ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="submit"
            form="nominee-form"
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors text-sm flex items-center gap-2"
            disabled={loading}
          >
            <Save className="w-4 h-4" />
            {loading ? (isBangla ? 'সংরক্ষণ করা হচ্ছে...' : 'Saving...') : (isBangla ? 'সংরক্ষণ করুন' : 'Save Nominee')}
          </button>
        </div>
      </div>
    </div>
  );
};

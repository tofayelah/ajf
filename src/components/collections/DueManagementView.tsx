import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { Search, ArrowRight, Clock, User, Filter } from 'lucide-react';
import { Member } from '../../types';

interface DueManagementViewProps {
  onOpenCollection: (memberId: string) => void;
}

type AgeCategory = 'CURRENT' | '1_MONTH' | '2_MONTHS' | '3_MONTHS' | '4_MONTHS' | '5_MONTHS' | '6_PLUS_MONTHS' | 'ALL';


const DueDetailsModal = ({ memberDue, onClose }: { memberDue: any, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl p-5 max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Due Details: {memberDue.member.fullName}</h3>
            <p className="text-xs text-slate-500">ID: {memberDue.member.memberId} | Mobile: {memberDue.member.mobile}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors">
            <User className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Current Due</div>
            <div className="text-sm font-black text-rose-700">৳{memberDue.dueInfo.totalDueAmount.toLocaleString()}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Total Due</div>
            <div className="text-sm font-black text-rose-700">৳{memberDue.dueInfo.totalDueAmount.toLocaleString()}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Oldest Due Month</div>
            <div className="text-sm font-bold text-slate-800">{memberDue.dueInfo.unpaidMonths.length > 0 ? memberDue.dueInfo.unpaidMonths[0] : 'N/A'}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Months Overdue</div>
            <div className="text-sm font-bold text-slate-800">{memberDue.dueInfo.monthsOverdue}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-3 font-bold text-slate-600">Month</th>
                <th className="p-3 font-bold text-slate-600 text-right">Expected</th>
                <th className="p-3 font-bold text-slate-600 text-right">Paid</th>
                <th className="p-3 font-bold text-slate-600 text-right">Due</th>
                <th className="p-3 font-bold text-slate-600 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(memberDue.dueInfo.unpaidMonthDetails || []).map((detail: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-slate-700">{detail.month}</td>
                  <td className="p-3 text-right font-mono text-slate-600">৳{detail.expected.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-emerald-600">৳{detail.paid.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono font-bold text-rose-600">৳{detail.due.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${detail.paid > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                      {detail.paid > 0 ? 'Partial' : 'Due'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!memberDue.dueInfo.unpaidMonthDetails || memberDue.dueInfo.unpaidMonthDetails.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">No overdue months.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const DueManagementView: React.FC<DueManagementViewProps> = ({ onOpenCollection }) => {
  const { db, language, activeUser } = useApp();
  const isBangla = language === 'bn';
  const [searchTerm, setSearchTerm] = useState('');
  const [agingFilter, setAgingFilter] = useState<AgeCategory>('ALL');
  const [selectedDueDetails, setSelectedDueDetails] = useState<any>(null);

  const memberDues = (activeUser?.role === 'MEMBER' ? (db.members || []).filter(m => m.memberId === activeUser.linkedMemberId) : (db.members || [])).filter(m => m.status === 'ACTIVE' || m.status === 'SUSPENDED')
    .map(member => {
      const dueInfo = AccountingService.calculateMemberDue(
        member,
        db.collections,
        db.settings.monthlyContribution,
        db.settings.lateFine,
        db.settings.latePaymentDay
      );
      
      let category: AgeCategory = 'CURRENT';
      if (dueInfo.monthsOverdue === 1) category = '1_MONTH';
      else if (dueInfo.monthsOverdue === 2) category = '2_MONTHS';
      else if (dueInfo.monthsOverdue === 3) category = '3_MONTHS';
      else if (dueInfo.monthsOverdue === 4) category = '4_MONTHS';
      else if (dueInfo.monthsOverdue === 5) category = '5_MONTHS';
      else if (dueInfo.monthsOverdue >= 6) category = '6_PLUS_MONTHS';

      return { member, dueInfo, category };
    });

  const getFilteredDues = () => {
    return memberDues.filter(item => {
      if (item.dueInfo.totalDueAmount <= 0) return false;
      if (agingFilter !== 'ALL' && item.category !== agingFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          item.member.memberId.toLowerCase().includes(term) ||
          item.member.fullName.toLowerCase().includes(term) ||
          item.member.mobile.includes(term)
        );
      }
      return true;
    }).sort((a, b) => b.dueInfo.totalDueAmount - a.dueInfo.totalDueAmount);
  };

  const filteredDues = getFilteredDues();

  const getCategoryStats = (cat: AgeCategory) => {
    const members = memberDues.filter(m => m.category === cat && m.dueInfo.totalDueAmount > 0);
    return {
      count: members.length,
      amount: members.reduce((sum, m) => sum + m.dueInfo.totalDueAmount, 0)
    };
  };
  
  // Actually, if someone is CURRENT, they owe 0. But wait, what if they partially paid the CURRENT month?
  // "monthsOverdue = number of complete unpaid monthly periods"
  // Wait, if it's partial, it is unpaid. The calculateMemberDue uses unpaidMonths.push(monthStr) if due > 0.
  // So if due > 0, it is 1 month unpaid at least.
  // If someone is purely "CURRENT", they might have 0 due. Let's see what the stats say.
  const currentStats = getCategoryStats('CURRENT');
  const month1Stats = getCategoryStats('1_MONTH');
  const month2Stats = getCategoryStats('2_MONTHS');
  const month3Stats = getCategoryStats('3_MONTHS');
  const month4Stats = getCategoryStats('4_MONTHS');
  const month5Stats = getCategoryStats('5_MONTHS');
  const month6PlusStats = getCategoryStats('6_PLUS_MONTHS');

  return (
    <div className="space-y-4">
      {/* Ageing Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { id: 'CURRENT', label: 'বর্তমান', stats: currentStats },
          { id: '1_MONTH', label: '১ মাস', stats: month1Stats },
          { id: '2_MONTHS', label: '২ মাস', stats: month2Stats },
          { id: '3_MONTHS', label: '৩ মাস', stats: month3Stats },
          { id: '4_MONTHS', label: '৪ মাস', stats: month4Stats },
          { id: '5_MONTHS', label: '৫ মাস', stats: month5Stats },
          { id: '6_PLUS_MONTHS', label: '৬+ মাস', stats: month6PlusStats },
        ].map(cat => (
          <div 
            key={cat.id}
            onClick={() => setAgingFilter(cat.id as AgeCategory)}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              agingFilter === cat.id 
                ? 'bg-emerald-50 border-emerald-400 shadow-sm' 
                : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="text-xs font-bold text-slate-700 mb-1">{cat.label}</div>
            <div className="text-[10px] text-slate-500">Members: {cat.stats.count}</div>
            <div className="text-sm font-black text-rose-700">৳{cat.stats.amount.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="সদস্য নাম, আইডি বা মোবাইল দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <button
            onClick={() => setAgingFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              agingFilter === 'ALL'
                ? 'bg-slate-800 text-white font-bold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            সকল বকেয়া
          </button>
        </div>
      </div>

      {selectedDueDetails && (
        <DueDetailsModal memberDue={selectedDueDetails} onClose={() => setSelectedDueDetails(null)} />
      )}
      {/* Due Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Member ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Mobile</th>
                <th className="p-3 text-center">Oldest Due Month</th>
                <th className="p-3 text-center">Months Overdue</th>
                <th className="p-3 text-right">Total Due</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    কোনো সদস্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredDues.map(item => (
                  <tr key={item.member.memberId} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedDueDetails(item)}>
                    <td className="p-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {item.member.memberId}
                    </td>
                    <td className="p-3 font-medium text-slate-900 whitespace-nowrap">
                      {item.member.fullName}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {item.member.mobile}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {item.dueInfo.unpaidMonths.length > 0 ? item.dueInfo.unpaidMonths[0] : 'N/A'}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap font-bold">
                      {item.dueInfo.monthsOverdue} Months
                    </td>
                    <td className="p-3 text-right font-black text-rose-700 font-mono text-xs whitespace-nowrap">
                      ৳{item.dueInfo.totalDueAmount?.toLocaleString()}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenCollection(item.member.memberId); }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 mx-auto transition-all active:scale-95 shadow-sm"
                      >
                        <span>Collect Due</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

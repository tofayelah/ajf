import React from 'react';
import { useApp } from '../../context/AppContext';
import { AppDatabaseState } from '../../services/db';
import { AccountingService } from '../../services/accounting';

interface Props {
  db: AppDatabaseState;
}

type AgeCategory = 'CURRENT' | '1_MONTH' | '2_MONTHS' | '3_MONTHS' | '4_MONTHS' | '5_MONTHS' | '6_PLUS_MONTHS';

export const DueReport: React.FC<Props> = ({ db }) => {
  const { activeUser } = useApp();
  const agingGroups = {
    'CURRENT': [] as any[],
    '1_MONTH': [] as any[],
    '2_MONTHS': [] as any[],
    '3_MONTHS': [] as any[],
    '4_MONTHS': [] as any[],
    '5_MONTHS': [] as any[],
    '6_PLUS_MONTHS': [] as any[]
  };

  const labels = {
    'CURRENT': 'বর্তমান',
    '1_MONTH': '১ মাস',
    '2_MONTHS': '২ মাস',
    '3_MONTHS': '৩ মাস',
    '4_MONTHS': '৪ মাস',
    '5_MONTHS': '৫ মাস',
    '6_PLUS_MONTHS': '৬+ মাস'
  };

  (activeUser?.role === 'MEMBER' ? (db.members || []).filter(m => m.memberId === activeUser.linkedMemberId) : (db.members || [])).forEach(m => {
    const dueInfo = AccountingService.calculateMemberDue(
      m,
      db.collections,
      db.settings.monthlyContribution,
      db.settings.lateFine,
      db.settings.latePaymentDay
    );

    if (dueInfo.totalDueAmount > 0) {
      const age = dueInfo.monthsOverdue;
      let category: AgeCategory = 'CURRENT';
      if (age === 1) category = '1_MONTH';
      else if (age === 2) category = '2_MONTHS';
      else if (age === 3) category = '3_MONTHS';
      else if (age === 4) category = '4_MONTHS';
      else if (age === 5) category = '5_MONTHS';
      else if (age >= 6) category = '6_PLUS_MONTHS';
      
      agingGroups[category].push({
        member: m,
        ...dueInfo
      });
    }
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
          Due Aging Report
        </h2>
      </div>

      {/* Summary Report */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 border-b border-slate-200 font-bold">Age Category</th>
              <th className="p-3 border-b border-slate-200 font-bold text-center">Member Count</th>
              <th className="p-3 border-b border-slate-200 font-bold text-right">Total Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(Object.keys(agingGroups) as AgeCategory[]).map(cat => {
              const members = agingGroups[cat];
              const totalAmount = members.reduce((sum, m) => sum + m.totalDueAmount, 0);
              return (
                <tr key={cat}>
                  <td className="p-3 font-semibold text-slate-800">{labels[cat]} ({cat})</td>
                  <td className="p-3 text-center">{members.length}</td>
                  <td className="p-3 text-right font-mono font-bold text-rose-600">৳{totalAmount.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detailed Member Report */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 border-b border-slate-200 font-bold">Member ID</th>
              <th className="p-3 border-b border-slate-200 font-bold">Name</th>
              <th className="p-3 border-b border-slate-200 font-bold">Mobile</th>
              <th className="p-3 border-b border-slate-200 font-bold text-center">Oldest Due Month</th>
              <th className="p-3 border-b border-slate-200 font-bold text-center">Months Overdue</th>
              <th className="p-3 border-b border-slate-200 font-bold text-right">Total Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(agingGroups).flatMap(([cat, members]) => 
              members.map((m, idx) => (
                <tr key={`${cat}-${idx}`}>
                  <td className="p-3 font-mono">{m.member.memberId}</td>
                  <td className="p-3 font-semibold text-slate-800">{m.member.fullName}</td>
                  <td className="p-3 font-mono">{m.member.mobile}</td>
                  <td className="p-3 text-center">{m.unpaidMonths.length > 0 ? m.unpaidMonths[0] : 'N/A'}</td>
                  <td className="p-3 text-center">{m.monthsOverdue} Months</td>
                  <td className="p-3 text-right font-mono font-bold text-rose-600">৳{m.totalDueAmount.toLocaleString()}</td>
                </tr>
              ))
            )}
            {Object.values(agingGroups).flat().length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-slate-500">কোনো বকেয়া নেই</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

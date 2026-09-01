import fs from 'fs';

const filePath = 'src/components/members/MemberLedgerView.tsx';
let code = fs.readFileSync(filePath, 'utf-8');

// The JSX return currently looks like:
// return (
//   <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
//      {/* 1. TOP HEADER SECTION */}
//      <div className="flex flex-col md:flex-row ...
//      ...
//      {/* 2. MEMBER SEARCH & FILTER PANEL */}
//      <div className="bg-white p-5 ...
//      ...
//      {/* 3. SELECTED MEMBER CARD & SUMMARY INFO */}
//      {selectedMember && (
//         <div className="bg-gradient-to-r ...
//      ...
//      {/* 4. SUMMARY CARDS (6 Key Metrics) */}
//      {ledgerData && (
//      ...
//      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
//        {/* 5. TRANSACTION HISTORY TABLE */}
//      ...
//      {/* 6. FORMAL PRINT-ONLY STATEMENT TEMPLATE */}

// What we want:
// If !selectedMember, render the 'All Members' view.
// If selectedMember, render sections 3, 4, 5, 6.

// Let's find the start of Section 3.
const section3Index = code.indexOf('{/* 3. SELECTED MEMBER CARD & SUMMARY INFO */}');

const beforeSection3 = code.slice(0, section3Index);
const afterSection3 = code.slice(section3Index);

const newRenderAllMembers = `
      {!selectedMember && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800">
              {isBangla ? 'সদস্য খতিয়ান তালিকা' : 'Member Ledger Summary'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3 font-semibold text-center w-12">#</th>
                  <th className="p-3 font-semibold">Member</th>
                  <th className="p-3 font-semibold text-right">Total Capital</th>
                  <th className="p-3 font-semibold text-right">Admission Fee</th>
                  <th className="p-3 font-semibold text-right">Monthly Chanda</th>
                  <th className="p-3 font-semibold text-right">Jorimana</th>
                  <th className="p-3 font-semibold text-right">Benefit / Profit</th>
                  <th className="p-3 font-semibold text-right">Total Settlement</th>
                  <th className="p-3 font-semibold text-right bg-slate-200">Member Balance</th>
                  <th className="p-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {allMembersSummary.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      No members found.
                    </td>
                  </tr>
                ) : allMembersSummary.map((row, index) => (
                  <tr key={row.member.memberId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center text-slate-400">{index + 1}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-800">{row.member.fullName}</p>
                      <p className="text-[11px] text-slate-500">{row.member.memberId}</p>
                    </td>
                    <td className="p-3 text-right font-medium text-slate-700">{formatMoney(row.ledger?.totalCapital || 0)}</td>
                    <td className="p-3 text-right font-medium text-slate-500">{formatMoney(row.ledger?.totalAdmissionFee || 0)}</td>
                    <td className="p-3 text-right font-medium text-slate-700">{formatMoney(row.ledger?.totalMonthlySubscription || 0)}</td>
                    <td className="p-3 text-right font-medium text-orange-600">{formatMoney(row.ledger?.totalJorimana || 0)}</td>
                    <td className="p-3 text-right font-medium text-purple-600">{formatMoney(row.ledger?.totalBenefitProfit || 0)}</td>
                    <td className="p-3 text-right font-medium text-rose-600">{formatMoney(row.ledger?.totalSettlement || 0)}</td>
                    <td className="p-3 text-right font-black text-emerald-700 bg-slate-50/50">{formatMoney(row.ledger?.currentMemberBalance || 0)}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setCurrentMemberId(row.member.memberId)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors"
                      >
                        View Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={!selectedMember ? 'hidden' : 'space-y-6'}>
`;

let newCode = beforeSection3 + newRenderAllMembers + afterSection3;

// Close the wrapper div just before the end of the return statement
newCode = newCode.replace(
  /<\/div>\n\s*\{viewingProfileId/,
  '</div>\n      </div>\n      {viewingProfileId'
);

fs.writeFileSync(filePath, newCode, 'utf-8');
console.log('MemberLedgerView structure updated!');

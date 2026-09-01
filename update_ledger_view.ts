import fs from 'fs';

const filePath = 'src/components/members/MemberLedgerView.tsx';
let code = fs.readFileSync(filePath, 'utf-8');

// 1. Change effectiveMemberId logic
code = code.replace(
  /const effectiveMemberId = isMemberRole\s*\n\s*\? \(activeUser\?\.linkedMemberId \|\| ''\)\s*\n\s*: \(initialMemberId \|\| db\.members\?\.\[0\]\?\.memberId \|\| ''\);/,
  `const effectiveMemberId = isMemberRole 
    ? (activeUser?.linkedMemberId || '') 
    : (initialMemberId || '');`
);

// 2. Change selectedMember logic
code = code.replace(
  /const selectedMember = useMemo\(\(\) => \{\s*return membersList\.find\(m => m\.memberId === currentMemberId\) \|\| membersList\[0\];\s*\}, \[membersList, currentMemberId\]\);/,
  `const selectedMember = useMemo(() => {
    if (!currentMemberId) return null;
    return membersList.find(m => m.memberId === currentMemberId) || null;
  }, [membersList, currentMemberId]);`
);

// 3. Add allMembersSummary after selectedMember
const allMembersSummaryCode = `
  const allMembersSummary = useMemo(() => {
    if (currentMemberId || !db.members) return [];
    let search = memberSearchQuery.toLowerCase().trim();
    
    let list = db.members;
    if (search) {
      list = list.filter(m => 
        m.fullName?.toLowerCase().includes(search) ||
        m.memberId?.toLowerCase().includes(search) ||
        m.membershipNo?.toLowerCase().includes(search) ||
        m.mobile?.toLowerCase().includes(search)
      );
    }
    
    return list.map(m => {
      const ledger = AccountingService.getComprehensiveMemberLedger(db, m.memberId);
      return { member: m, ledger };
    });
  }, [db, currentMemberId, memberSearchQuery]);
`;
code = code.replace(
  /\/\/ Compute Comprehensive Member Ledger Data/,
  allMembersSummaryCode + '\n  // Compute Comprehensive Member Ledger Data'
);

// 4. Update ledgerData to avoid null errors when selectedMember is null
// It already has `if (!selectedMember) return null;` so it's fine.

// 5. Add "All Members" button next to "Print Statement" or at top
code = code.replace(
  /<button\s+onClick=\{handlePrint\}\s+className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white/,
  `{!isMemberRole && selectedMember && (
            <button 
              onClick={() => setCurrentMemberId('')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-xl transition-colors border border-indigo-200 shadow-sm"
            >
              <Users className="w-4 h-4" />
              {isBangla ? 'সকল সদস্য' : 'All Members'}
            </button>
          )}
          <button 
            onClick={handlePrint} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white`
);

// 6. Add Jorimana Card
const jorimanaCard = `
          {/* 3.5 Total Jorimana */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-orange-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isBangla ? 'মাসিক জরিমানা' : 'Monthly Jorimana'}
              </span>
              <div className="p-1.5 rounded-lg bg-orange-50 text-orange-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-black text-orange-700 tracking-tight">
                {formatMoney(ledgerData.totalJorimana)}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isBangla ? 'বিলম্ব ফি' : 'Late Fine'}
              </p>
            </div>
          </div>
`;

code = code.replace(
  /\{\/\* 4\. Total Benefit \/ Profit \*\/\}/,
  jorimanaCard + '\n          {/* 4. Total Benefit / Profit */}'
);

// 7. Inject All Members view rendering
const renderAllMembers = `
      {!selectedMember && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800">
              {isBangla ? 'সদস্য খতিয়ান তালিকা' : 'Member Ledger Summary'}
            </h2>
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder={isBangla ? "সদস্য খুঁজুন..." : "Search members..."}
                className="pl-10 w-full rounded-xl border-slate-300 border py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
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
`;

code = code.replace(
  /<div className="flex flex-col lg:flex-row gap-6 print:hidden">/,
  renderAllMembers + '\n      {selectedMember && (\n      <div className="flex flex-col lg:flex-row gap-6 print:hidden">'
);

code = code.replace(
  /<\/div>\n\n      \{\/\* 6\. FORMAL PRINT-ONLY STATEMENT TEMPLATE \*\/\}/,
  '</div>\n      )}\n\n      {/* 6. FORMAL PRINT-ONLY STATEMENT TEMPLATE */}'
);

fs.writeFileSync(filePath, code, 'utf-8');
console.log('MemberLedgerView updated!');

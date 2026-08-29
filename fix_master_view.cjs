const fs = require('fs');

let content = fs.readFileSync('src/components/members/MemberMasterView.tsx', 'utf8');

const replacement = `
                    {member.status !== 'EXITED' && (
                      <button
                        onClick={() => setExitRequestMember(member)}
                        className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-100/70 rounded-lg transition-colors cursor-pointer"
                        title={
                          isBangla
                            ? (() => {
                                const req = db.memberExits?.find(e => e.memberId === member.memberId && e.status !== 'REJECTED' && e.status !== 'EXITED');
                                if (!req) return "পদত্যাগের আবেদন";
                                if (req.status === 'APPROVED') return "রিফান্ড প্রসেস করুন";
                                return "আবেদন দেখুন";
                              })()
                            : (() => {
                                const req = db.memberExits?.find(e => e.memberId === member.memberId && e.status !== 'REJECTED' && e.status !== 'EXITED');
                                if (!req) return "Exit / Resign";
                                if (req.status === 'APPROVED') return "Process Refund";
                                return "View Exit Request";
                              })()
                        }
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                    {member.status === 'EXITED' && (
                       <button
                        onClick={() => setExitRequestMember(member)}
                        className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100/70 rounded-lg transition-colors cursor-pointer"
                        title={isBangla ? "প্রস্থান বিবরণ" : "Exit Details"}
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
`;

content = content.replace(
  /<button\s*onClick=\{\(\) => setExitRequestMember\(member\)\}\s*className="p\.1\.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-100\/70 rounded-lg transition-colors cursor-pointer"\s*title=\{isBangla \? "সদস্য প্রস্থান\/পদত্যাগ" : "Exit\/Resign Member"\}\s*>\s*<LogOut className="w-4 h-4" \/>\s*<\/button>/,
  replacement.trim()
);

fs.writeFileSync('src/components/members/MemberMasterView.tsx', content);
console.log('Fixed MemberMasterView');

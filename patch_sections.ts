import fs from 'fs';

const filePath = 'src/components/layout/AppDrawer.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const settlementSection = `
        { 
          id: 'MEMBER_SETTLEMENT', 
          labelBn: 'সদস্য নিষ্পত্তি', 
          labelEn: 'Member Settlement', 
          icon: ClipboardList,
          subItems: [
            { id: 'SETTLEMENT_DASHBOARD' as ActiveScreen, labelBn: 'নিষ্পত্তি ড্যাশবোর্ড', labelEn: 'Settlement Dashboard', icon: LayoutDashboard },
            { id: 'NORMAL_MEMBER_EXIT' as ActiveScreen, labelBn: 'সাধারণ প্রস্থান', labelEn: 'Normal Member Exit', icon: UserMinus },
            { id: 'EARLY_MEMBER_EXIT' as ActiveScreen, labelBn: 'আগাম প্রস্থান', labelEn: 'Early Member Exit', icon: UserMinus },
            { id: 'EARLY_EXIT_REQUESTS' as ActiveScreen, labelBn: 'আগাম প্রস্থান অনুরোধ', labelEn: 'Early Exit Requests', icon: ClipboardList },
            { id: 'DEATH_SETTLEMENT' as ActiveScreen, labelBn: 'মৃত্যু নিষ্পত্তি', labelEn: 'Death Settlement', icon: HeartHandshake },
            { id: 'PENDING_SETTLEMENT_APPROVALS' as ActiveScreen, labelBn: 'অপেক্ষমাণ অনুমোদন', labelEn: 'Pending Approvals', icon: AlertCircle },
            { id: 'COMPLETED_SETTLEMENTS' as ActiveScreen, labelBn: 'সম্পন্ন নিষ্পত্তি', labelEn: 'Completed Settlements', icon: ShieldCheck },
            { id: 'SETTLEMENT_REPORTS' as ActiveScreen, labelBn: 'নিষ্পত্তি রিপোর্ট', labelEn: 'Settlement Reports', icon: FileSpreadsheet }
          ]
        },`;

content = content.replace(
  /{ id: 'DUE_MANAGEMENT' as ActiveScreen, labelBn: 'বকেয়া বিশ্লেষণ ও তালিকা', labelEn: 'Due Management \& Aging', icon: AlertCircle }/g,
  `{ id: 'DUE_MANAGEMENT' as ActiveScreen, labelBn: 'বকেয়া বিশ্লেষণ ও তালিকা', labelEn: 'Due Management & Aging', icon: AlertCircle },${settlementSection}`
);

// We also need to update the rendering logic
const renderingLogic = `{section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeScreen));
                  const isExpanded = expandedMenus[item.id];
                  
                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        onClick={() => item.subItems ? toggleMenu(item.id) : handleNav(item.id)}
                        className={\`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all \${
                          isActive && !item.subItems
                            ? 'bg-emerald-100 text-emerald-900 font-bold shadow-sm'
                            : 'text-slate-700 hover:bg-slate-100'
                        }\`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={\`w-4 h-4 \${
                              isActive ? 'text-emerald-700' : 'text-slate-500'
                            }\`}
                          />
                          <span className="flex-1 text-left">
                            {isBangla ? item.labelBn : item.labelEn}
                          </span>
                          {item.id === 'MEMBER_SETTLEMENT' && (
                            <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                              {db.memberExits?.filter(e => ['NORMAL_EXIT_REQUESTED', 'EARLY_EXIT_REQUESTED', 'DEATH_REPORTED', 'UNDER_REVIEW'].includes(e.status)).length || 0}
                            </span>
                          )}
                        </div>
                        {item.subItems && (
                          isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                      
                      {item.subItems && isExpanded && (
                        <div className="pl-9 pr-2 py-1 space-y-0.5 bg-slate-50/50 rounded-lg mt-0.5 border-l-2 border-emerald-100 ml-3">
                          {item.subItems.map(subItem => {
                            const SubIcon = subItem.icon;
                            const isSubActive = activeScreen === subItem.id;
                            return (
                              <button
                                key={subItem.id}
                                onClick={() => handleNav(subItem.id)}
                                className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all \${
                                  isSubActive
                                    ? 'bg-emerald-100 text-emerald-900 font-bold'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-emerald-800'
                                }\`}
                              >
                                <SubIcon className={\`w-3.5 h-3.5 \${isSubActive ? 'text-emerald-700' : 'text-slate-400'}\`} />
                                <span className="flex-1 text-left">{isBangla ? subItem.labelBn : subItem.labelEn}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}`;

content = content.replace(
  /\{section\.items\.map\(item => \{[\s\S]*?\}\)\}/,
  renderingLogic
);

fs.writeFileSync(filePath, content);

import fs from 'fs';

const filePath = 'src/components/settlement/MemberSettlementDashboardView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const importLucideOld = "import { Briefcase, UserMinus, ShieldCheck, CheckCircle, Clock, Shield, BarChart2, PieChart as PieChartIcon } from 'lucide-react';";
const importLucideNew = "import { Briefcase, UserMinus, ShieldCheck, CheckCircle, Clock, Shield, BarChart2, PieChart as PieChartIcon, TrendingUp, Calculator } from 'lucide-react';";
content = content.replace(importLucideOld, importLucideNew);

const importRechartsOld = "import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';";
const importRechartsNew = "import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';";
content = content.replace(importRechartsOld, importRechartsNew);

const returnStr = "  return (\n    <div className=\"space-y-6";

const projectionLogic = `
  // --- Projection Logic ---
  const completedExitsData = exits.filter(e => ['REFUNDED', 'SETTLED', 'EXITED', 'DECEASED'].includes(e.status));
  const totalSettlementAmount = completedExitsData.reduce((sum, exit) => sum + (exit.netRefundAmount || (exit as any).netSettlementAmount || 0), 0);
  const averageCostPerExit = completedExitsData.length > 0 ? totalSettlementAmount / completedExitsData.length : 0;
  
  const allDates = exits.map(e => new Date(e.requestDate || e.updatedAt || new Date()).getTime()).filter(d => !isNaN(d));
  let overallTimespanMonths = 1;
  if (allDates.length > 1) {
      const minDate = Math.min(...allDates);
      const maxDate = Math.max(...allDates);
      const diffTime = Math.abs(maxDate - minDate);
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
      overallTimespanMonths = diffMonths > 0 ? diffMonths : 1;
  }
  const monthlyExitRate = exits.length / overallTimespanMonths;
  const projectedMonthlyCost = monthlyExitRate * averageCostPerExit;

  const projectionData = [
    { name: isBangla ? '১ মাস' : '1 Mo', amount: Math.round(projectedMonthlyCost) },
    { name: isBangla ? '৩ মাস' : '3 Mo', amount: Math.round(projectedMonthlyCost * 3) },
    { name: isBangla ? '৬ মাস' : '6 Mo', amount: Math.round(projectedMonthlyCost * 6) },
    { name: isBangla ? '৯ মাস' : '9 Mo', amount: Math.round(projectedMonthlyCost * 9) },
    { name: isBangla ? '১২ মাস' : '12 Mo', amount: Math.round(projectedMonthlyCost * 12) },
  ];

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">{isBangla ? 'প্রাক্কলিত দায়:' : 'Est. Liability:'}</span>
            <span className="font-bold text-indigo-600">৳{data.amount.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

`;

content = content.replace(returnStr, projectionLogic + returnStr);


const jsxToReplace = "      </div>\n    </div>\n  );\n};";

const projectionJsx = `      </div>

      {/* Projection Tool */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-8 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">
              {isBangla ? 'ভবিষ্যৎ নিষ্পত্তি প্রাক্কলন' : 'Future Settlement Projections'}
            </h3>
          </div>
          <p className="text-sm text-slate-500">
            {isBangla ? 'ঐতিহাসিক প্রস্থান হার এবং গড় নিষ্পত্তির খরচের উপর ভিত্তি করে আনুমানিক ভবিষ্যৎ আর্থিক বাধ্যবাধকতা।' : 'Estimated future financial obligations based on historical exit rates and average settlement costs.'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          <div className="p-6 lg:col-span-1 space-y-6 bg-slate-50/50">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{isBangla ? 'ঐতিহাসিক প্রস্থান হার' : 'Historical Exit Rate'}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">{monthlyExitRate.toFixed(1)}</span>
                <span className="text-sm text-slate-500 font-medium">{isBangla ? 'সদস্য / মাস' : 'members / mo'}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{isBangla ? 'গড় নিষ্পত্তি খরচ' : 'Avg. Settlement Cost'}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">৳{Math.round(averageCostPerExit).toLocaleString()}</span>
                <span className="text-sm text-slate-500 font-medium">{isBangla ? 'জনপ্রতি' : 'per member'}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">{isBangla ? 'প্রত্যাশিত মাসিক বাধ্যবাধকতা' : 'Expected Monthly Obligation'}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-700">৳{Math.round(projectedMonthlyCost).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6 lg:col-span-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => \`৳\${(val/1000).toFixed(0)}k\`} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};`;

content = content.replace(jsxToReplace, projectionJsx);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Added projection tool.");

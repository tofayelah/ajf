import fs from 'fs';

const filePath = 'src/components/settlement/MemberSettlementDashboardView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace imports
const importLucideOld = "import { Briefcase, UserMinus, ShieldCheck, CheckCircle, Clock, Shield } from 'lucide-react';";
const importLucideNew = "import { Briefcase, UserMinus, ShieldCheck, CheckCircle, Clock, Shield, BarChart2, PieChart as PieChartIcon } from 'lucide-react';\nimport { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';";
content = content.replace(importLucideOld, importLucideNew);

// Find insertion point for logic
const logicInsertionPoint = "  const statusCards = [";
const logicNew = `  const pieData = [
    { name: isBangla ? 'সাধারণ' : 'Normal', value: normalExitCount, color: '#10b981' },
    { name: isBangla ? 'আগাম' : 'Early', value: earlyExitCount, color: '#f59e0b' },
    { name: isBangla ? 'মৃত্যু' : 'Death', value: deathSettlementCount, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const monthlyDataMap: Record<string, { month: string; amount: number; count: number }> = {};
  exits.forEach(exit => {
    if (!exit.requestDate) return;
    const monthPrefix = exit.requestDate.substring(0, 7);
    if (!monthlyDataMap[monthPrefix]) {
      monthlyDataMap[monthPrefix] = { month: monthPrefix, amount: 0, count: 0 };
    }
    monthlyDataMap[monthPrefix].count += 1;
    monthlyDataMap[monthPrefix].amount += (exit.netRefundAmount || (exit as any).netSettlementAmount || 0);
  });

  const barData = Object.values(monthlyDataMap).sort((a, b) => a.month.localeCompare(b.month));

  const formatMonth = (yyyyMm: string) => {
    const [year, month] = yyyMm.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', { month: 'short', year: '2-digit' });
  };
  const formattedBarData = barData.map(d => ({
    ...d,
    monthLabel: formatMonth(d.month)
  }));

  const statusCards = [`;
content = content.replace(logicInsertionPoint, logicNew);

// Find insertion point for JSX
const jsxInsertionPoint = "    </div>\n  );\n};";
const jsxNew = `      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">
            {isBangla ? 'মাসিক নিষ্পত্তি প্রবণতা' : 'Monthly Settlement Trends'}
          </h3>
          <div className="h-72">
            {formattedBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => \`৳\${val.toLocaleString()}\`} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [\`৳\${value.toLocaleString()}\`, isBangla ? 'পরিমাণ' : 'Amount']}
                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <BarChart2 className="w-12 h-12 mb-2 opacity-20" />
                <p>{isBangla ? 'পর্যাপ্ত তথ্য নেই' : 'Not enough data'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">
            {isBangla ? 'নিষ্পত্তির ধরন অনুযায়ী' : 'Settlement by Category'}
          </h3>
          <div className="h-72">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [value, isBangla ? 'সংখ্যা' : 'Count']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <PieChartIcon className="w-12 h-12 mb-2 opacity-20" />
                <p>{isBangla ? 'পর্যাপ্ত তথ্য নেই' : 'Not enough data'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};`;
content = content.replace(jsxInsertionPoint, jsxNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated MemberSettlementDashboardView.tsx with recharts");

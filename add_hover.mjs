import fs from 'fs';

const filePath = 'src/components/settlement/MemberSettlementDashboardView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const customTooltipCode = `  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-slate-500">{isBangla ? 'পরিমাণ:' : 'Amount:'}</span>
            <span className="font-bold text-blue-600">৳{data.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">{isBangla ? 'নিষ্পত্তি সংখ্যা:' : 'Settlements:'}</span>
            <span className="font-bold text-emerald-600">{data.count}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].color }}></div>
            <p className="font-bold text-slate-800">{data.name}</p>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">{isBangla ? 'সংখ্যা:' : 'Count:'}</span>
            <span className="font-bold text-slate-900">{data.value}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const statusCards = [`;

content = content.replace("  const statusCards = [", customTooltipCode);

// Replace Bar Tooltip
const oldBarTooltip = `<Tooltip \n                    cursor={{ fill: '#f1f5f9' }}\n                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}\n                    formatter={(value: number) => [\`৳\${value.toLocaleString()}\`, isBangla ? 'পরিমাণ' : 'Amount']}\n                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}\n                  />\n                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />`;

const newBarTooltip = `<Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomBarTooltip />} />\n                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} activeBar={{ fill: '#2563eb', stroke: '#1d4ed8', strokeWidth: 1 }} />`;

content = content.replace(oldBarTooltip, newBarTooltip);

// Replace Pie Tooltip
const oldPieTooltip = `<Tooltip \n                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}\n                    formatter={(value: number) => [value, isBangla ? 'সংখ্যা' : 'Count']}\n                  />`;
const newPieTooltip = `<Tooltip content={<CustomPieTooltip />} />`;
content = content.replace(oldPieTooltip, newPieTooltip);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Replaced tooltips with custom ones.");

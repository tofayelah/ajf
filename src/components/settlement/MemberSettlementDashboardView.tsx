import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Briefcase, UserMinus, ShieldCheck, CheckCircle, Clock, Shield, BarChart2, PieChart as PieChartIcon, TrendingUp, Calculator } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

export const MemberSettlementDashboardView = () => {
  const { db, language, navigateTo } = useApp();
  const isBangla = language === 'bn';
  const exits = db.memberExits || [];

  const normalExitCount = exits.filter(e => e.exitType === 'NORMAL').length;
  const earlyExitCount = exits.filter(e => e.exitType === 'EARLY').length;
  const deathSettlementCount = exits.filter(e => e.exitType === 'DEATH_SETTLEMENT' || (e.exitType as any) === 'DEATH').length;

  const pendingApprovals = exits.filter(e => 
    ['NORMAL_EXIT_REQUESTED','EARLY_EXIT_REQUESTED','DEATH_REPORTED','UNDER_REVIEW'].includes(e.status)
  ).length;

  const approvedCount = exits.filter(e => e.status === 'APPROVED').length;
  const completedCount = exits.filter(e => 
    ['REFUNDED','SETTLED','EXITED','DECEASED'].includes(e.status)
  ).length;

  const summaryCards = [
    { title: isBangla ? 'সাধারণ প্রস্থান' : 'Normal Exits', count: normalExitCount, icon: UserMinus, color: 'text-emerald-600', bg: 'bg-emerald-50', link: 'NORMAL_MEMBER_EXIT' },
    { title: isBangla ? 'আগাম প্রস্থান' : 'Early Exits', count: earlyExitCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', link: 'EARLY_MEMBER_EXIT' },
    { title: isBangla ? 'মৃত্যু নিষ্পত্তি' : 'Death Settlements', count: deathSettlementCount, icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50', link: 'DEATH_SETTLEMENT' },
  ];

  const pieData = [
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

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', { month: 'short', year: '2-digit' });
  };
  const formattedBarData = barData.map(d => ({
    ...d,
    monthLabel: formatMonth(d.month)
  }));

  const CustomBarTooltip = ({ active, payload, label }: any) => {
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

  const CustomStageTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></div>
            <p className="font-bold text-slate-800">{data.stage}</p>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">{isBangla ? 'সদস্য:' : 'Members:'}</span>
            <span className="font-bold text-slate-900">{data.count}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const stageData = [
    {
      stage: isBangla ? 'নতুন অনুরোধ' : 'Requested',
      count: exits.filter(e => ['EXIT_REQUESTED','NORMAL_EXIT_REQUESTED','EARLY_EXIT_REQUESTED','DEATH_REPORTED'].includes(e.status)).length,
      color: '#3b82f6' // blue
    },
    {
      stage: isBangla ? 'পর্যালোচনাধীন' : 'Under Review',
      count: exits.filter(e => e.status === 'UNDER_REVIEW').length,
      color: '#f59e0b' // amber
    },
    {
      stage: isBangla ? 'অনুমোদিত' : 'Approved',
      count: exits.filter(e => e.status === 'APPROVED').length,
      color: '#8b5cf6' // purple
    },
    {
      stage: isBangla ? 'সম্পন্ন' : 'Completed',
      count: exits.filter(e => ['REFUNDED','SETTLED','EXITED','DECEASED'].includes(e.status)).length,
      color: '#10b981' // emerald
    }
  ];

  const statusCards = [
    { title: isBangla ? 'অপেক্ষমাণ অনুমোদন' : 'Pending Approvals', count: pendingApprovals, icon: Shield, color: 'text-rose-600', bg: 'bg-rose-50', link: 'PENDING_SETTLEMENT_APPROVALS' },
    { title: isBangla ? 'অনুমোদিত' : 'Approved', count: approvedCount, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', link: 'COMPLETED_SETTLEMENTS' },
    { title: isBangla ? 'সম্পন্ন নিষ্পত্তি' : 'Completed', count: completedCount, icon: Briefcase, color: 'text-slate-600', bg: 'bg-slate-50', link: 'COMPLETED_SETTLEMENTS' },
  ];


  // --- Projection Logic ---
  const completedExitsData = exits.filter(e => ['REFUNDED','SETTLED','EXITED','DECEASED'].includes(e.status));
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

  // --- Calculator State ---
  const [calcTenure, setCalcTenure] = useState<number>(5);
  const [calcCapital, setCalcCapital] = useState<number>(50000);
  const [calcInterestRate, setCalcInterestRate] = useState<number>(10);

  const calcInterestAmount = (calcCapital * calcInterestRate * calcTenure) / 100;
  const calcTotalPayout = calcCapital + calcInterestAmount;

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

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-700" />
            <span>{isBangla ? 'সদস্য নিষ্পত্তি ড্যাশবোর্ড' : 'Member Settlement Dashboard'}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isBangla ? 'সদস্যদের প্রস্থান ও নিষ্পত্তির সারাংশ' : 'Overview of member exits and settlements'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryCards.map((card, idx) => (
          <button 
            key={idx}
            onClick={() => navigateTo(card.link as any)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-left flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <p className="text-2xl font-bold text-slate-900">{card.count}</p>
            </div>
          </button>
        ))}
      </div>

      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mt-8 mb-4">
        {isBangla ? 'অবস্থা অনুযায়ী সারাংশ' : 'Status Overview'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statusCards.map((card, idx) => (
          <button 
            key={idx}
            onClick={() => navigateTo(card.link as any)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-left flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <p className="text-2xl font-bold text-slate-900">{card.count}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-8">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            {isBangla ? 'প্রস্থান অনুরোধের অগ্রগতি পর্যায়' : 'Exit Request Progress Pipeline'}
          </h3>
        </div>
        <div className="h-64">
          {stageData.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stageData}
                margin={{ top: 10, right: 30, left: isBangla ? 60 : 50, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} width={isBangla ? 100 : 90} />
                <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomStageTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <Clock className="w-12 h-12 mb-2 opacity-20" />
              <p>{isBangla ? 'কোনো অনুরোধ নেই' : 'No requests in pipeline'}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
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
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `৳${val.toLocaleString()}`} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomBarTooltip />} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} activeBar={{ fill: '#2563eb', stroke: '#1d4ed8', strokeWidth: 1 }} />
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
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
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

      {/* Projection Tool */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 flex-1">
            <div className="p-6 md:col-span-1 space-y-6 bg-slate-50/50">
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
            
            <div className="p-6 md:col-span-2 h-72 lg:h-auto min-h-[250px] flex items-center">
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
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `৳${(val/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Payout Calculator */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-800">
                {isBangla ? 'প্রস্থান পেআউট ক্যালকুলেটর' : 'Exit Payout Calculator'}
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              {isBangla ? 'মেয়াদ, মূলধন অবদান এবং সুদের হারের উপর ভিত্তি করে প্রত্যাশিত চূড়ান্ত নিষ্পত্তির হিসাব করুন।' : 'Compute expected final settlements based on tenure, capital contributions, and interest rates.'}
            </p>
          </div>
          
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {isBangla ? 'সদস্যপদের মেয়াদ (বছর)' : 'Membership Tenure (Years)'}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="0.5"
                    value={calcTenure}
                    onChange={(e) => setCalcTenure(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="w-16 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800">
                    {calcTenure}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {isBangla ? 'মোট মূলধন অবদান' : 'Total Capital Contribution'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={calcCapital}
                    onChange={(e) => setCalcCapital(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {isBangla ? 'সুদের হার (%)' : 'Interest Rate (%)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={calcInterestRate}
                    onChange={(e) => setCalcInterestRate(Number(e.target.value))}
                    className="w-full pl-4 pr-8 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                </div>
              </div>
            </div>

            <div className="mt-8 p-5 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="flex justify-between items-center mb-2 text-sm">
                <span className="text-slate-600 font-medium">{isBangla ? 'মূলধন ফেরত:' : 'Capital Return:'}</span>
                <span className="font-semibold text-slate-800">৳{calcCapital.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-4 text-sm">
                <span className="text-slate-600 font-medium">{isBangla ? 'মোট সুদ (' + calcInterestRate + '%):' : `Total Interest (${calcInterestRate}%):`}</span>
                <span className="font-semibold text-emerald-600">+ ৳{Math.round(calcInterestAmount).toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t border-emerald-200/60 flex justify-between items-center">
                <span className="font-bold text-slate-800">{isBangla ? 'প্রত্যাশিত পেআউট' : 'Expected Payout'}</span>
                <span className="text-2xl font-black text-emerald-700">৳{Math.round(calcTotalPayout).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

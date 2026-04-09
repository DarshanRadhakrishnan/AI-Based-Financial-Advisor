import { useRef, useState } from 'react';
import { DollarSign, CreditCard, TrendingUp, ArrowDownCircle, Upload, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatINR, UserData, fakeProfiles } from './data';
import toast from 'react-hot-toast';

const COLORS = ['#F97316', '#0EA5E9', '#22C55E'];

const priorityBadge = (p: string) => {
  if (p === 'Critical') return 'bg-red-500/20 text-red-400';
  if (p === 'High') return 'bg-orange-500/20 text-orange-400';
  return 'bg-yellow-500/20 text-yellow-400';
};

const statusBadge = (s: string) => {
  if (s === 'In Progress') return 'bg-blue-500/20 text-blue-400';
  return 'bg-slate-500/20 text-slate-400';
};



export default function DashboardSection({ data, setData }: { data: UserData; setData: (d: UserData) => void }) {
  const cf = data.monthly_cash_flow;

  const stats = [
    { label: 'Monthly Income', value: formatINR(cf.net_take_home_income), icon: DollarSign, color: 'from-green-500 to-emerald-600' },
    { label: 'Monthly Expenses', value: formatINR(cf.mandatory_living_expenses), icon: ArrowDownCircle, color: 'from-red-500 to-rose-600' },
    { label: 'Total EMI', value: formatINR(cf.total_emi_payments), icon: CreditCard, color: 'from-blue-500 to-cyan-600' },
    { label: 'Active SIPs', value: formatINR(cf.current_active_sips), icon: TrendingUp, color: 'from-orange-500 to-amber-600' },
  ];

  const totalPortfolio = data.assets_portfolio.reduce((s, a) => s + a.current_value, 0);
  const pieData = data.assets_portfolio.map(a => ({ name: a.category, value: a.current_value }));
  // Merge by category
  const merged: Record<string, number> = {};
  data.assets_portfolio.forEach(a => { merged[a.category] = (merged[a.category] || 0) + a.current_value; });
  const mergedPie = Object.entries(merged).map(([name, value]) => ({ name, value }));



  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="glass rounded-xl p-5 card-hover" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{s.label}</span>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Portfolio + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Portfolio Breakdown</h3>
          {mergedPie.length === 0 ? (
            <div className="flex items-center justify-center w-full h-48 border border-white/5 border-dashed rounded-xl">
              <p className="text-sm text-slate-500">No portfolio data yet. Please upload documents.</p>
            </div>
          ) : (
            <div className="flex items-center gap-6 w-full">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mergedPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                      {mergedPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ background: '#112649', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {mergedPie.map((d, i) => {
                  const pct = totalPortfolio === 0 ? 0 : Math.round((d.value / totalPortfolio) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300">{d.name}</span>
                          <span className="text-white font-medium">{pct}%</span>
                        </div>
                        <p className="text-xs text-slate-500">{formatINR(d.value)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Financial Goals</h3>
          <div className="space-y-4">
            {data.financial_goals.length === 0 ? (
              <div className="flex items-center justify-center w-full h-32 border border-white/5 border-dashed rounded-xl">
                <p className="text-sm text-slate-500">No financial goals defined. Upload documents to generate.</p>
              </div>
            ) : data.financial_goals.map((g) => {
              const progress = g.status === 'Not Started' ? 0 : Math.min(Math.round(Math.random() * 40 + 10), 60);
              return (
                <div key={g.goal_id} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white text-sm">{g.goal_name}</span>
                    <div className="flex gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityBadge(g.priority)}`}>{g.priority}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(g.status)}`}>{g.status}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>Target: {formatINR(g.target_amount)}</span>
                    <span>By {g.target_year}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


    </div>
  );
}

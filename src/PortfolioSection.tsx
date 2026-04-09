import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatINR, UserData } from './data';

export default function PortfolioSection({ data }: { data: UserData }) {
  if (!data.assets_portfolio || data.assets_portfolio.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="glass flex flex-col items-center justify-center rounded-xl p-12 text-center border-2 border-white/5 border-dashed h-64">
          <h3 className="text-xl font-semibold text-white mb-2">No Portfolio Data</h3>
          <p className="text-sm text-slate-400">Upload your portfolio documents to see your asset allocation and values here.</p>
        </div>
      </div>
    );
  }

  const total = data.assets_portfolio.reduce((s, a) => s + a.current_market_value, 0);
  const chartData = data.assets_portfolio.map(a => ({ name: a.asset_name.split(' ').slice(0, 2).join(' '), value: a.current_market_value }));

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="glass rounded-xl p-6 overflow-x-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Asset Allocation</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Asset Name</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Category</th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">Current Value</th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">Monthly SIP</th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">Allocation %</th>
            </tr>
          </thead>
          <tbody>
            {data.assets_portfolio.map((a, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="py-3 px-4 text-white font-medium">{a.asset_name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    a.category === 'Equity' ? 'bg-orange-500/20 text-orange-400' :
                    a.category === 'Commodity' || a.category === 'Cash' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>{a.category}</span>
                </td>
                <td className="py-3 px-4 text-right text-white">{formatINR(a.current_market_value)}</td>
                <td className="py-3 px-4 text-right text-slate-300">{a.monthly_sip > 0 ? formatINR(a.monthly_sip) : '—'}</td>
                <td className="py-3 px-4 text-right text-white font-medium">{Math.round((a.current_market_value / total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Portfolio Value by Asset</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatINR(v)} contentStyle={{ background: '#112649', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9' }} />
              <Bar dataKey="value" fill="#F97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

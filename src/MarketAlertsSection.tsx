import { Bell } from 'lucide-react';
import { marketAlerts } from './data';

export default function MarketAlertsSection() {
  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Market Intelligence Alerts</h2>
        <p className="text-sm text-slate-400">Signals relevant to your portfolio — not generic news</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {marketAlerts.map((a, i) => (
          <div key={i} className="glass rounded-xl p-5 card-hover" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-start gap-4">
              <div className="text-2xl shrink-0 mt-1">{a.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${a.badge}`}>{a.type}</span>
                  <span className="text-xs text-slate-500">{a.time}</span>
                </div>
                <h4 className="font-semibold text-white text-sm mb-1.5 leading-snug">{a.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{a.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

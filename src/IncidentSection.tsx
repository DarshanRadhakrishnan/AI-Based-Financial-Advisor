import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { incidentEvents, formatINR, UserData } from './data';
import toast from 'react-hot-toast';

export default function IncidentSection({ data, setData }: { data: UserData; setData: (d: UserData) => void }) {
  const [modal, setModal] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  const handleApply = () => {
    if (!modal) return;
    const newEvent = { event: modal, timestamp: new Date().toISOString(), amount: Number(amount) || 0 };
    setData({
      ...data,
      system_state: { ...data.system_state, logged_events: [...data.system_state.logged_events, newEvent] },
    });
    toast.success('Life event logged. Your paths will be recalculated.');
    setModal(null);
    setAmount('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="glass rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-1">Log a Life Event</h2>
        <p className="text-sm text-slate-400 mb-6">Select an event to update your financial strategy</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {incidentEvents.map((ev, i) => (
            <button key={i} onClick={() => setModal(ev.label)}
              className="glass rounded-xl p-6 text-center card-hover cursor-pointer border border-transparent hover:border-orange-500/30 transition-all">
              <span className="text-4xl block mb-3">{ev.emoji}</span>
              <span className="font-medium text-white">{ev.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Logged Events */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Logged Events</h3>
        {data.system_state.logged_events.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No events logged yet. Click an event above to get started.</p>
        ) : (
          <div className="space-y-3">
            {data.system_state.logged_events.map((ev, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{ev.event}</p>
                  <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ev.timestamp).toLocaleString()}</span>
                    {ev.amount > 0 && <span>{formatINR(ev.amount)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="glass rounded-2xl p-6 w-full max-w-md mx-4 animate-scaleIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{modal}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-sm text-slate-300 mb-1.5">Relevant Amount</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500000"
              className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all mb-4"
              style={{ background: 'rgba(11,29,58,0.5)' }} />
            <button onClick={handleApply}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 transition-all cursor-pointer">
              Apply to My Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { Check, Shield, BarChart3, Flame } from 'lucide-react';
import { paths, UserData } from './data';
import toast from 'react-hot-toast';

const pathIcons = [Shield, BarChart3, Flame];

export default function PathPlanningSection({ data, setData }: { data: UserData; setData: (d: UserData) => void }) {
  const selected = data.system_state.active_path_selected;

  const selectPath = (id: string) => {
    setData({ ...data, system_state: { ...data.system_state, active_path_selected: id } });
    toast.success('Path selected! Your plan is now active.');
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Your Personalised Investment Paths</h2>
        <p className="text-sm text-slate-400">Choose a strategy that matches your goals and risk appetite</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {paths.map((p, i) => {
          const Icon = pathIcons[i];
          const isSelected = selected === p.id;
          return (
            <div key={p.id}
              className={`glass rounded-xl p-6 border-2 transition-all duration-300 ${
                isSelected ? `${p.border} shadow-lg` : 'border-transparent hover:border-white/10'
              }`}
              style={isSelected ? { boxShadow: `0 0 30px ${p.border.includes('green') ? 'rgba(34,197,94,0.15)' : p.border.includes('blue') ? 'rgba(59,130,246,0.15)' : 'rgba(249,115,22,0.15)'}` } : {}}>
              {isSelected && (
                <div className="flex justify-end mb-2">
                  <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                </div>
              )}
              <div className={`w-12 h-12 rounded-xl ${p.bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${p.color}`} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.bg} ${p.color}`}>Risk: {p.risk}</span>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Retirement Age</span>
                  <span className="text-white font-medium">{p.retireAge}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Projected Corpus</span>
                  <span className="text-white font-medium">{p.corpus}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Monthly SIP</span>
                  <span className="text-white font-medium">{p.sip}</span>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">Key Actions</p>
                <ul className="space-y-2">
                  {p.actions.map((a, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${p.color.replace('text-', 'bg-')}`}></div>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>

              <button onClick={() => selectPath(p.id)}
                className={`mt-6 w-full py-2.5 rounded-xl font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/10 text-white border border-white/20'
                    : `bg-gradient-to-r ${p.border.includes('green') ? 'from-green-500 to-emerald-600' : p.border.includes('blue') ? 'from-blue-500 to-cyan-600' : 'from-orange-500 to-amber-600'} text-white hover:opacity-90`
                }`}>
                {isSelected ? 'Currently Active' : 'Select This Path'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

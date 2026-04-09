import { Check, Shield, BarChart3, Flame, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { paths, UserData } from './data';
import toast from 'react-hot-toast';

const pathIcons = [Shield, BarChart3, Flame];

export default function PathPlanningSection({ data, setData }: { data: UserData; setData: React.Dispatch<React.SetStateAction<UserData>> }) {
  const selected = data.system_state.path_planning.active_path_selected;
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!!selected);

  const selectPath = (id: string) => {
    setData(prev => ({
      ...prev,
      system_state: {
        ...prev.system_state,
        path_planning: { ...prev.system_state.path_planning, active_path_selected: id },
      },
    }));
    toast.success('Path selected! Your plan is now active.');
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate generation delay
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
      toast.success('Generated 3 personalized paths!');
    }, 1500);
  };

  const resetSelection = () => {
    setData(prev => ({
      ...prev,
      system_state: {
        ...prev.system_state,
        path_planning: { ...prev.system_state.path_planning, active_path_selected: null },
      },
    }));
    setHasGenerated(false);
  };

  if (!hasGenerated && !selected) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center animate-fadeIn glass rounded-xl border border-white/10">
        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">AI Path Generation</h2>
        <p className="text-slate-400 max-w-md mb-8">
          We will analyze your profile, cash flow, and goals to generate optimized pathways to achieve financial freedom.
        </p>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium px-8 py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-3 disabled:opacity-70 cursor-pointer"
        >
          {isGenerating ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          {isGenerating ? 'Generating Paths...' : 'Generate Personalized Paths'}
        </button>
      </div>
    );
  }

  // Filter paths based on if one is selected, we only show the selected one, otherwise we show all
  const displayedPaths = selected ? paths.filter(p => p.id === selected) : paths;

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Your Personalised Investment Paths</h2>
          <p className="text-sm text-slate-400">
            {selected ? 'You have successfully activated a financial pathway.' : 'Choose a strategy that matches your goals and risk appetite.'}
          </p>
        </div>
        
        {selected && (
          <button onClick={resetSelection} 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10 cursor-pointer">
            <RefreshCw className="w-4 h-4" /> Start Over
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 ${selected ? 'lg:grid-cols-1 max-w-3xl mx-auto' : 'lg:grid-cols-3'} gap-6`}>
        {displayedPaths.map((p) => {
          const originalIndex = paths.findIndex(x => x.id === p.id);
          const Icon = pathIcons[originalIndex] || Shield;
          const isSelected = selected === p.id;
          return (
            <div key={p.id}
              className={`glass rounded-xl p-6 border-2 transition-all duration-300 ${
                isSelected ? `${p.border} shadow-lg relative overflow-hidden` : 'border-transparent hover:border-white/10'
              }`}
              style={isSelected ? { boxShadow: `0 0 30px ${p.border.includes('green') ? 'rgba(34,197,94,0.15)' : p.border.includes('blue') ? 'rgba(59,130,246,0.15)' : 'rgba(249,115,22,0.15)'}` } : {}}>
              
              {/* Optional background glow if selected */}
              {isSelected && <div className={`absolute top-0 left-0 w-full h-1 ${p.bg}`}></div>}

              {isSelected && (
                <div className="flex justify-end mb-2">
                  <span className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5 border border-green-500/30">
                    <Check className="w-3.5 h-3.5" /> Active Path
                  </span>
                </div>
              )}
              <div className={`w-12 h-12 rounded-xl ${p.bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${p.color}`} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.bg} ${p.color}`}>Risk: {p.risk}</span>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between text-sm p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-slate-400">Retirement Age</span>
                  <span className="text-white font-medium">{p.retireAge}</span>
                </div>
                <div className="flex justify-between text-sm p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-slate-400">Projected Corpus</span>
                  <span className="text-white font-medium">{p.corpus}</span>
                </div>
                <div className="flex justify-between text-sm p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-slate-400">Monthly SIP</span>
                  <span className="text-white font-medium">{p.sip}</span>
                </div>
              </div>

              <div className="mt-5 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wider">Key Actions</p>
                <ul className="space-y-3">
                  {p.actions.map((a, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-slate-300">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${p.color.replace('text-', 'bg-')}`}></div>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>

              {!isSelected && (
                <button onClick={() => selectPath(p.id)}
                  className={`mt-6 w-full py-2.5 rounded-xl font-medium transition-all cursor-pointer bg-gradient-to-r ${p.border.includes('green') ? 'from-green-500 to-emerald-600' : p.border.includes('blue') ? 'from-blue-500 to-cyan-600' : 'from-orange-500 to-amber-600'} text-white hover:opacity-90`}>
                  Select This Path
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

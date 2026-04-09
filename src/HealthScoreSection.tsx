import { useState } from 'react';
import { UserData } from './data';
import { Activity } from 'lucide-react';

interface Props {
  data: UserData;
  setData: React.Dispatch<React.SetStateAction<UserData>>;
}

function CircularGauge({ score }: { score: number }) {
  const r = 70, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#22C55E' : score >= 50 ? '#EAB308' : '#EF4444';
  return (
    <div className="relative w-48 h-48 mx-auto mb-6">
      <svg className="circular-progress w-full h-full" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className="text-sm text-slate-400">/100</span>
      </div>
    </div>
  );
}

export default function HealthScoreSection({ data, setData }: Props) {
  const [isCalculating, setIsCalculating] = useState(false);
  const scoreRaw = data.system_state.health_scores.overall_score;
  const dims = data.system_state.health_scores.dimensions;

  const healthDimensions = [
    { name: 'Emergency Fund', score: dims.emergency_fund, fix: 'Build 6-month expense buffer' },
    { name: 'Insurance Coverage', score: dims.insurance_coverage, fix: 'Get term life insurance — 10x income rule' },
    { name: 'Investment Balance', score: dims.investment_diversification, fix: 'Diversify across equity, debt, and commodities' },
    { name: 'Debt Health', score: dims.debt_health, fix: 'Prepay highest-rate loan this quarter' },
    { name: 'Tax Efficiency', score: dims.tax_efficiency, fix: 'Invest in NPS for 80CCD(1B) benefit' },
    { name: 'Retirement Readiness', score: dims.retirement_readiness, fix: 'Increase SIP by ₹5K/month to stay on track' },
  ];

  const calculateScore = () => {
    setIsCalculating(true);
    // Simulate calculation — in future this calls FastAPI backend
    setTimeout(() => {
      setData(prev => ({
        ...prev,
        system_state: {
          ...prev.system_state,
          health_scores: {
            overall_score: 67,
            dimensions: {
              emergency_fund: 40,
              insurance_coverage: 30,
              investment_diversification: 75,
              debt_health: 55,
              tax_efficiency: 60,
              retirement_readiness: 70,
            },
          },
        },
      }));
      setIsCalculating(false);
    }, 2000);
  };

  if (scoreRaw === null) {
    return (
      <div className="animate-fadeIn flex flex-col items-center justify-center p-12 text-center bg-slate-800/50 rounded-2xl border border-white/5">
        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
          <Activity className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Health Score Pending</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-8">
          Ensure you have uploaded your documents and populated your profile goals. When ready, trigger the AI calculation.
        </p>
        <button
          onClick={calculateScore}
          disabled={isCalculating}
          className={`px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all ${
            isCalculating ? 'bg-indigo-500/50 cursor-not-allowed animate-pulse' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 hover:shadow-indigo-500/25'
          }`}>
          {isCalculating ? 'Processing Analysis...' : 'Calculate Money Health Score'}
        </button>
      </div>
    );
  }

  const label = scoreRaw >= 80 ? 'Excellent' : scoreRaw >= 60 ? 'Good — but can improve' : scoreRaw >= 40 ? 'Needs Attention' : 'Critical';

  return (
    <div className="animate-fadeIn">
      <div className="glass rounded-xl p-8 text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-6">Financial Health Score</h2>
        <CircularGauge score={scoreRaw} />
        <p className={`text-lg font-medium ${scoreRaw >= 75 ? 'text-green-400' : scoreRaw >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{label}</p>
        <p className="text-sm text-slate-400 mt-1">Based on 6 financial health dimensions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthDimensions.map((d, i) => {
          const color = d.score >= 75 ? 'green' : d.score >= 50 ? 'yellow' : 'red';
          const barColor = color === 'green' ? 'from-green-500 to-emerald-400' : color === 'yellow' ? 'from-yellow-500 to-amber-400' : 'from-red-500 to-rose-400';
          const textColor = color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : 'text-red-400';
          return (
            <div key={i} className="glass rounded-xl p-5 card-hover" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white text-sm">{d.name}</h4>
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className={`text-2xl font-bold ${textColor}`}>{d.score}</span>
                <span className="text-sm text-slate-500">/100</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000`} style={{ width: `${d.score}%` }}></div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{d.fix}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

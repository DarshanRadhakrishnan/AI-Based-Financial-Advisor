import { useState } from 'react';
import { UserData } from './data';
import { Activity, Sparkles, ChevronDown, Target, Info, AlertTriangle } from 'lucide-react';

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

  // --- Derived Benchmark Data ---
  const expenses = data.income_and_cashflow.monthly_mandatory_living_expenses + data.income_and_cashflow.monthly_discretionary_spend;
  const annualIncome = (data.income_and_cashflow.monthly_base_pay + data.income_and_cashflow.monthly_variable_pay) * 12;
  const emergencyBenchmark = expenses * 6;
  
  let liquidSavings = 0;
  data.assets_portfolio.forEach(a => {
    if (a.liquidity_status === 'High') liquidSavings += a.current_market_value;
    else if (a.liquidity_status === 'Medium') liquidSavings += a.current_market_value * 0.5;
  });
  const monthsCovered = expenses > 0 ? (liquidSavings / expenses) : 0;

  const termLifeCover = data.insurance_and_protection.total_term_life_cover;
  const healthCover = data.insurance_and_protection.total_health_insurance_cover;
  const lifeBenchmark = annualIncome > 0 ? annualIncome * 10 : 0;

  const emi = data.income_and_cashflow.total_monthly_emi;
  const emiBenchmark = data.income_and_cashflow.monthly_net_take_home * 0.4;
  const emiRatio = data.income_and_cashflow.monthly_net_take_home > 0 ? (emi / data.income_and_cashflow.monthly_net_take_home) * 100 : 0;

  const age = data.personal_profile.current_age || 30;
  const equityBenchmark = Math.max(20, 100 - age);
  let equityTotal = 0, totalPortfolio = 0;
  data.assets_portfolio.forEach(a => {
    totalPortfolio += a.current_market_value;
    if (a.category.toLowerCase() === 'equity') equityTotal += a.current_market_value;
  });
  const equityRatio = totalPortfolio > 0 ? (equityTotal / totalPortfolio) * 100 : 0;

  const formatCur = (v: number) => {
    if (v >= 10000000) return `₹${(v/10000000).toFixed(2)}Cr`;
    if (v >= 100000) return `₹${(v/100000).toFixed(2)}L`;
    return `₹${v.toLocaleString('en-IN')}`;
  };

  const healthDimensions = [
    { 
      name: 'Emergency Fund', score: dims.emergency_fund, fix: 'Build 6-month expense buffer',
      why: 'Serves as an absolute fallback during job loss or uninsurable medical emergencies.',
      benchmark: `6 Months Expenses (${formatCur(emergencyBenchmark)})`,
      current: `${monthsCovered.toFixed(1)} Months (${formatCur(liquidSavings)})`
    },
    { 
      name: 'Insurance Coverage', score: dims.insurance_coverage, fix: 'Get term life insurance — 10x income rule',
      why: 'Protects dependents from financial ruin and covers large medical bills without liquidating assets.',
      benchmark: `Life: 10x Income (${formatCur(lifeBenchmark)}), Health: ₹10L+`,
      current: `Life: ${formatCur(termLifeCover)}, Health: ${formatCur(healthCover)}`
    },
    { 
      name: 'Investment Balance', score: dims.investment_diversification, fix: 'Diversify across equity, debt, and commodities',
      why: 'Avoids concentration risk while taking enough equity risk to beat inflation.',
      benchmark: `~${equityBenchmark}% Equity (100 - Age Rule)`,
      current: `${equityRatio.toFixed(0)}% Equity`
    },
    { 
      name: 'Debt Health', score: dims.debt_health, fix: 'Prepay highest-rate loan this quarter',
      why: 'High EMIs restrict cash flow needed for compounding investments.',
      benchmark: `EMI < 40% of Take-home (${formatCur(emiBenchmark)}/mo)`,
      current: `EMI is ${emiRatio.toFixed(0)}% (${formatCur(emi)}/mo)`
    },
    { 
      name: 'Tax Efficiency', score: dims.tax_efficiency, fix: 'Invest in NPS for 80CCD(1B) benefit',
      why: 'Reduces tax drag on your income, allowing more capital to be deployed for wealth creation.',
      benchmark: 'Maximize 80C (1.5L), 80D (25K), NPS (50K)',
      current: `Regime: ${data.personal_profile.tax_regime}, 80C: ₹${(data.tax_profile.section_80c_utilized/1000).toFixed(0)}K`
    },
    { 
      name: 'Retirement Readiness', score: dims.retirement_readiness, fix: 'Increase SIP by ₹5K/month to stay on track',
      why: 'Ensures you have 25x of your inflation-adjusted annual expenses by your target retirement age.',
      benchmark: `25x Annual Expenses (Inflation Adjusted)`,
      current: `Retirement Target: Age ${data.personal_profile.target_retirement_age || 60}`
    },
  ];

  const calculateScore = async () => {
    setIsCalculating(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/analyze-with-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      
      if (response.ok) {
        setData(prev => ({
          ...prev,
          system_state: {
            ...prev.system_state,
            health_scores: {
              overall_score: result.overall_score,
              dimensions: {
                emergency_fund: result.dimensions['Emergency Fund']?.score || 0,
                insurance_coverage: result.dimensions['Insurance Coverage']?.score || 0,
                investment_diversification: result.dimensions['Investment Diversification']?.score || 0,
                debt_health: result.dimensions['Debt Health']?.score || 0,
                tax_efficiency: result.dimensions['Tax Efficiency']?.score || 0,
                retirement_readiness: result.dimensions['Retirement Readiness']?.score || 0,
              },
              gemini_advisory: result.gemini_advisory,
            },
          },
        }));
      } else {
        console.error("Failed to calculate score:", result);
        alert("Failed to analyze health score. Check backend logs.");
      }
    } catch (error) {
      console.error("Error connecting to backend:", error);
      alert("Error connecting to API. Please ensure the backend is running on port 8000.");
    } finally {
      setIsCalculating(false);
    }
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
        <p className="text-sm text-slate-400 mt-1 mb-5">Based on 6 financial health dimensions</p>
        
        <button
          onClick={calculateScore}
          disabled={isCalculating}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-md ${
            isCalculating ? 'bg-indigo-500/50 cursor-not-allowed animate-pulse text-white/50' : 'bg-white/5 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:text-indigo-300'
          }`}>
          {isCalculating ? 'Recalculating...' : 'Regenerate Analysis'}
        </button>
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

      <div className="mt-8 mb-6">
        <h3 className="text-xl font-bold text-white mb-4">Detailed Benchmark Breakdown</h3>
        <div className="space-y-4">
          {healthDimensions.map((d, i) => {
            const isGood = d.score >= 75;
            const isFair = d.score >= 50 && d.score < 75;
            return (
              <div key={i} className="glass rounded-xl p-5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="md:flex items-start justify-between gap-6">
                  <div className="flex-1 mb-4 md:mb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-white text-lg">{d.name}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isGood ? 'bg-green-500/20 text-green-400' : isFair ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        Score: {d.score}/100
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">{d.why}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-indigo-500/20">
                        <div className="flex items-center gap-1.5 mb-1 text-indigo-300">
                          <Target className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Benchmark Target</span>
                        </div>
                        <p className="text-white text-sm font-medium">{d.benchmark}</p>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                          <Info className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Your Current State</span>
                        </div>
                        <p className="text-white text-sm font-medium">{d.current}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.system_state.health_scores.gemini_advisory && (
        <div className="mt-8 glass rounded-xl p-6 border-l-4 border-indigo-500 animate-fadeIn">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-0">Gemini AI Assessment</h3>
          </div>
          <div className="text-slate-300 leading-relaxed space-y-4 text-left">
            <div className="whitespace-pre-wrap font-sans">
              {data.system_state.health_scores.gemini_advisory}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

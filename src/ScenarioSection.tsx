import { useState } from 'react';
import { Play, ArrowRight } from 'lucide-react';
import { formatINR, UserData } from './data';
import toast from 'react-hot-toast';

const scenarioTypes = ['Take a loan', 'Buy a car', 'Switch jobs', 'Market crash', 'Salary increment'];

interface SimResult {
  currentSurplus: number; afterSurplus: number;
  currentRetire: number; afterRetire: number;
  currentScore: number; afterScore: number;
  currentCorpus: string; afterCorpus: string;
}

function simulate(data: UserData, type: string, amount: number): SimResult {
  const ic = data.income_and_cashflow;
  const surplus = ic.monthly_net_take_home - ic.monthly_mandatory_living_expenses -
    ic.total_monthly_emi - ic.total_active_monthly_sips;
  let afterSurplus = surplus, retireDelta = 0, scoreDelta = 0;
  let afterCorpus = '₹2.8 Cr';

  if (type === 'Take a loan') {
    const emi = Math.round(amount / 60);
    afterSurplus = surplus - emi; retireDelta = 3; scoreDelta = -13;
    afterCorpus = '₹1.9 Cr';
  } else if (type === 'Buy a car') {
    const emi = Math.round(amount / 48);
    afterSurplus = surplus - emi; retireDelta = 2; scoreDelta = -10;
    afterCorpus = '₹2.2 Cr';
  } else if (type === 'Switch jobs') {
    afterSurplus = surplus + Math.round(amount * 0.3); retireDelta = -2; scoreDelta = 5;
    afterCorpus = '₹3.4 Cr';
  } else if (type === 'Market crash') {
    afterSurplus = surplus; retireDelta = 4; scoreDelta = -15;
    afterCorpus = '₹1.6 Cr';
  } else {
    afterSurplus = surplus + amount; retireDelta = -3; scoreDelta = 8;
    afterCorpus = '₹3.6 Cr';
  }

  const currentScore = data.system_state.health_scores.overall_score || 67;

  return {
    currentSurplus: surplus, afterSurplus,
    currentRetire: data.personal_profile.target_retirement_age,
    afterRetire: data.personal_profile.target_retirement_age + retireDelta,
    currentScore, afterScore: currentScore + scoreDelta,
    currentCorpus: '₹2.8 Cr', afterCorpus,
  };
}

export default function ScenarioSection({ data, setData }: { data: UserData; setData: React.Dispatch<React.SetStateAction<UserData>> }) {
  const [name, setName] = useState('');
  const [type, setType] = useState(scenarioTypes[0]);
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<SimResult | null>(null);

  const runSim = () => {
    if (!amount) { toast.error('Enter an amount'); return; }
    setResult(simulate(data, type, Number(amount)));
  };

  const applyToIncident = () => {
    const newEvent = {
      event_id: `evt_sim_${Date.now()}`,
      event_type: `Scenario: ${name || type}`,
      timestamp: new Date().toISOString(),
      impact_summary: `Amount: ₹${Number(amount) || 0}`,
    };
    setData(prev => ({
      ...prev,
      system_state: {
        ...prev.system_state,
        event_ledger: [...prev.system_state.event_ledger, newEvent],
      },
    }));
    toast.success('Scenario applied to Incident Layer');
  };

  const rows = result ? [
    { label: 'Monthly Surplus', current: formatINR(result.currentSurplus), after: formatINR(result.afterSurplus), good: result.afterSurplus >= result.currentSurplus },
    { label: 'Retirement Age', current: `${result.currentRetire} yrs`, after: `${result.afterRetire} yrs`, good: result.afterRetire <= result.currentRetire },
    { label: 'Health Score', current: `${result.currentScore}/100`, after: `${result.afterScore}/100`, good: result.afterScore >= result.currentScore },
    { label: 'Total Corpus (20yr)', current: result.currentCorpus, after: result.afterCorpus, good: result.afterCorpus >= result.currentCorpus },
  ] : [];

  const inputCls = "w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all";

  return (
    <div className="animate-fadeIn">
      <div className="glass rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Simulate a Financial Decision</h2>
        <p className="text-sm text-slate-400 mb-6">Test hypothetical decisions without touching your real plan</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Scenario Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Take home loan"
                className={inputCls} style={{ background: 'rgba(11,29,58,0.5)' }} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Scenario Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className={inputCls + ' cursor-pointer'} style={{ background: 'rgba(11,29,58,0.8)' }}>
                {scenarioTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Amount / Change Value</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1000000"
                className={inputCls} style={{ background: 'rgba(11,29,58,0.5)' }} />
            </div>
            <button onClick={runSim}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold flex items-center justify-center gap-2 hover:from-orange-600 hover:to-orange-700 transition-all cursor-pointer">
              <Play className="w-4 h-4" /> Run Simulation
            </button>
          </div>

          {/* Results */}
          <div>
            {result ? (
              <div className="animate-scaleIn">
                <h4 className="font-semibold text-white mb-3">Comparison</h4>
                <div className="rounded-xl overflow-hidden border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/[0.03]">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Metric</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Current</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td className="py-3 px-4 text-slate-300">{r.label}</td>
                          <td className="py-3 px-4 text-right text-white">{r.current}</td>
                          <td className={`py-3 px-4 text-right font-medium ${r.good ? 'text-green-400' : 'text-red-400'}`}>{r.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={applyToIncident}
                  className="mt-4 w-full py-2.5 rounded-xl border border-orange-500/50 text-orange-400 font-medium flex items-center justify-center gap-2 hover:bg-orange-500/10 transition-all cursor-pointer">
                  Apply to Incident Layer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                <p>Run a simulation to see results here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

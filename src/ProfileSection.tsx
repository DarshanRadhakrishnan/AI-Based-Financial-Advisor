import React, { useState } from 'react';
import { UserData } from './data';
import { User, Shield, Briefcase, Activity, CheckCircle2, PieChart, Target, Plus, Trash2 } from 'lucide-react';

interface Props {
  data: UserData;
  setData: React.Dispatch<React.SetStateAction<UserData>>;
}

export default function ProfileSection({ data, setData }: Props) {
  const [formData, setFormData] = useState({
    dob: data.personal_info.dob || '',
    target_retirement_age: data.personal_info.target_retirement_age || 60,
    dependents: data.personal_info.dependents || 0,
    employment_type: data.personal_info.employment_type || 'Salaried',
    industry_sector: data.personal_info.industry_sector || 'IT & Technology',
    tax_regime: data.personal_info.tax_regime || 'Old',
    
    monthly_mandatory_expenses: data.monthly_cash_flow.mandatory_living_expenses || 0,
    monthly_discretionary_spend: data.monthly_cash_flow.monthly_discretionary_spend || 0,
    
    health_insurance_cover: data.liabilities_and_protection.health_insurance_cover || 0,
    term_life_cover: data.liabilities_and_protection.term_life_cover || 0,
    corporate_health_cover: data.liabilities_and_protection.corporate_health_cover || 0,

    ppf_balance: data.other_assets?.ppf_balance || 0,
    gold_value: data.other_assets?.gold_value || 0,
    real_estate_value: data.other_assets?.real_estate_value || 0,
  });

  const [quizAnswers, setQuizAnswers] = useState({ q1: 1, q2: 1, q3: 1 });
  const [quizDone, setQuizDone] = useState(data.personal_info.risk_appetite_score > 0);
  const [saved, setSaved] = useState(false);

  const [goals, setGoals] = useState<{ goal_id: string; goal_name: string; target_amount: number; target_year: number; priority: string; status: string }[]>(data.financial_goals || []);
  const [newGoal, setNewGoal] = useState({ goal_name: 'Emergency Fund', target_amount: 0, target_year: new Date().getFullYear() + 1, priority: 'Medium' });

  const addGoal = () => {
    if (goals.length >= 5) return;
    setGoals([...goals, { 
      goal_id: 'g_' + Math.floor(Math.random() * 10000), 
      goal_name: newGoal.goal_name, 
      target_amount: Number(newGoal.target_amount), 
      target_year: Number(newGoal.target_year), 
      priority: newGoal.priority, 
      status: 'Not Started' 
    }]);
    setNewGoal({ goal_name: 'Emergency Fund', target_amount: 0, target_year: new Date().getFullYear() + 1, priority: 'Medium' });
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.goal_id !== id));
  };

  // Derive risk score based on quiz (max 10)
  const calculateRiskScore = () => {
    return Math.min(10, quizAnswers.q1 + quizAnswers.q2 + quizAnswers.q3);
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const diff_ms = Date.now() - new Date(dob).getTime();
    const age_dt = new Date(diff_ms); 
    return Math.abs(age_dt.getUTCFullYear() - 1970);
  };

  const handleSave = () => {
    setData((prev) => ({
      ...prev,
      personal_info: {
        ...prev.personal_info,
        dob: formData.dob,
        current_age: calculateAge(formData.dob),
        target_retirement_age: Number(formData.target_retirement_age),
        dependents: Number(formData.dependents),
        employment_type: formData.employment_type,
        industry_sector: formData.industry_sector,
        tax_regime: formData.tax_regime,
        risk_appetite_score: quizDone ? calculateRiskScore() : prev.personal_info.risk_appetite_score,
      },
      monthly_cash_flow: {
        ...prev.monthly_cash_flow,
        mandatory_living_expenses: Number(formData.monthly_mandatory_expenses),
        monthly_discretionary_spend: Number(formData.monthly_discretionary_spend),
      },
      liabilities_and_protection: {
        ...prev.liabilities_and_protection,
        health_insurance_cover: Number(formData.health_insurance_cover),
        term_life_cover: Number(formData.term_life_cover),
        corporate_health_cover: Number(formData.corporate_health_cover),
      },
      other_assets: {
        ppf_balance: Number(formData.ppf_balance),
        gold_value: Number(formData.gold_value),
        real_estate_value: Number(formData.real_estate_value),
      },
      financial_goals: goals
    }));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="space-y-6">
      
      {/* Personal Details */}
      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Personal & Employment</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Date of Birth</label>
            <input type="date" name="dob" value={formData.dob} onChange={handleChange} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Target Retirement Age</label>
            <input type="number" name="target_retirement_age" value={formData.target_retirement_age} onChange={handleChange} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Dependents</label>
            <input type="number" name="dependents" value={formData.dependents} onChange={handleChange} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Employment Type</label>
            <select name="employment_type" value={formData.employment_type} onChange={handleChange}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500">
              <option>Salaried</option>
              <option>Self-Employed/Freelance</option>
              <option>Business Owner</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Industry Sector</label>
            <select name="industry_sector" value={formData.industry_sector} onChange={handleChange}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500">
              <option>IT & Technology</option>
              <option>Creative & Design</option>
              <option>Public Sector / Government</option>
              <option>Healthcare</option>
              <option>Finance</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Tax Regime</label>
            <select name="tax_regime" value={formData.tax_regime} onChange={handleChange}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500">
              <option>Old</option>
              <option>New</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses & Insurance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Expenses</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Monthly Mandatory Expenses (₹)</label>
              <input type="number" name="monthly_mandatory_expenses" value={formData.monthly_mandatory_expenses} onChange={handleChange} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Monthly Discretionary Spend (₹)</label>
              <input type="number" name="monthly_discretionary_spend" value={formData.monthly_discretionary_spend} onChange={handleChange} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Insurance</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Total Health Insurance Cover (₹)</label>
              <input type="number" name="health_insurance_cover" value={formData.health_insurance_cover} onChange={handleChange} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Corporate Health Cover (₹)</label>
              <input type="number" name="corporate_health_cover" value={formData.corporate_health_cover} onChange={handleChange} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Total Term Life Cover (₹)</label>
              <input type="number" name="term_life_cover" value={formData.term_life_cover} onChange={handleChange} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <PieChart className="w-5 h-5 text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Other Assets</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">PPF Balance (₹)</label>
            <input type="number" name="ppf_balance" value={formData.ppf_balance} onChange={handleChange} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Gold Value (₹)</label>
            <input type="number" name="gold_value" value={formData.gold_value} onChange={handleChange} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Real Estate Value (₹)</label>
            <input type="number" name="real_estate_value" value={formData.real_estate_value} onChange={handleChange} 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500" />
          </div>
        </div>
      </div>

      {/* Financial Goals Builder */}
      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Financial Goals <span className="text-sm text-slate-400 font-normal ml-2">({goals.length}/5)</span></h2>
        </div>

        {/* Existing Goals List */}
        <div className="space-y-3 mb-6">
          {goals.map((goal) => (
            <div key={goal.goal_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-white/5">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-white">{goal.goal_name}</h4>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${goal.priority === 'Critical' ? 'bg-red-500/20 text-red-400' : goal.priority === 'High' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {goal.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Target: ₹{goal.target_amount.toLocaleString('en-IN')} by {goal.target_year}</p>
              </div>
              <button onClick={() => removeGoal(goal.goal_id)} className="text-slate-500 hover:text-red-400 p-2 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {goals.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No goals added yet.</p>}
        </div>

        {/* Add Goal Form */}
        {goals.length < 5 && (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
            <h4 className="text-sm font-medium text-indigo-300 mb-4">Add New Goal</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Goal Type</label>
                <select value={newGoal.goal_name} onChange={e => setNewGoal({...newGoal, goal_name: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option>Emergency Fund</option>
                  <option>House</option>
                  <option>Education</option>
                  <option>Retirement</option>
                  <option>Wedding</option>
                  <option>Travel</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Amount (₹)</label>
                <input type="number" value={newGoal.target_amount} onChange={e => setNewGoal({...newGoal, target_amount: Number(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Year</label>
                <input type="number" value={newGoal.target_year} onChange={e => setNewGoal({...newGoal, target_year: Number(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                <select value={newGoal.priority} onChange={e => setNewGoal({...newGoal, priority: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                </select>
              </div>
            </div>
            <button onClick={addGoal} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Goal
            </button>
          </div>
        )}
      </div>

      {/* Risk Assessment Quiz */}
      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Activity className="w-48 h-48" />
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center z-10">
            <Activity className="w-5 h-5 text-pink-400" />
          </div>
          <h2 className="text-xl font-semibold text-white z-10">Risk Appetite Assessment</h2>
        </div>

        {!quizDone ? (
          <div className="space-y-6 z-10 relative">
            <div>
              <p className="text-white mb-3">1. What is your primary investment goal?</p>
              <div className="flex gap-4">
                <button onClick={() => setQuizAnswers(p => ({ ...p, q1: 1 }))} className={`px-4 py-2 rounded-xl text-sm transition-colors ${quizAnswers.q1 === 1 ? 'bg-pink-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>Capital Preservation</button>
                <button onClick={() => setQuizAnswers(p => ({ ...p, q1: 2 }))} className={`px-4 py-2 rounded-xl text-sm transition-colors ${quizAnswers.q1 === 2 ? 'bg-pink-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>Balanced Growth</button>
                <button onClick={() => setQuizAnswers(p => ({ ...p, q1: 3 }))} className={`px-4 py-2 rounded-xl text-sm transition-colors ${quizAnswers.q1 === 3 ? 'bg-pink-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>Aggressive Growth</button>
              </div>
            </div>
            
            <div>
              <p className="text-white mb-3">2. If your portfolio loses 20% in a month, what do you do?</p>
              <div className="flex gap-4">
                <button onClick={() => setQuizAnswers(p => ({ ...p, q2: 1 }))} className={`px-4 py-2 rounded-xl text-sm transition-colors ${quizAnswers.q2 === 1 ? 'bg-pink-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>Sell Everything</button>
                <button onClick={() => setQuizAnswers(p => ({ ...p, q2: 2 }))} className={`px-4 py-2 rounded-xl text-sm transition-colors ${quizAnswers.q2 === 2 ? 'bg-pink-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>Hold and Wait</button>
                <button onClick={() => setQuizAnswers(p => ({ ...p, q2: 3 }))} className={`px-4 py-2 rounded-xl text-sm transition-colors ${quizAnswers.q2 === 3 ? 'bg-pink-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>Buy More (Discount)</button>
              </div>
            </div>

            <div>
              <p className="text-white mb-3">3. When do you need to withdraw a significant portion of this money?</p>
              <div className="flex gap-4">
                <button onClick={() => setQuizAnswers(p => ({ ...p, q3: 1 }))} className={`px-4 py-2 rounded-xl text-sm transition-colors ${quizAnswers.q3 === 1 ? 'bg-pink-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>Within 3 years</button>
                <button onClick={() => setQuizAnswers(p => ({ ...p, q3: 2 }))} className={`px-4 py-2 rounded-xl text-sm transition-colors ${quizAnswers.q3 === 2 ? 'bg-pink-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>3 to 7 years</button>
                <button onClick={() => setQuizAnswers(p => ({ ...p, q3: 3 }))} className={`px-4 py-2 rounded-xl text-sm transition-colors ${quizAnswers.q3 === 3 ? 'bg-pink-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'}`}>More than 7 years</button>
              </div>
            </div>

            <button onClick={() => setQuizDone(true)} className="mt-4 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">
              Complete Assessment
            </button>
          </div>
        ) : (
          <div className="z-10 relative flex items-center justify-between bg-slate-900/50 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Assessment Completed</span>
            </div>
            <div className="text-white">
              Risk Score: <span className="font-bold text-lg ml-2">{data.personal_info.risk_appetite_score || calculateRiskScore()}/10</span>
            </div>
            <button onClick={() => setQuizDone(false)} className="text-sm text-slate-400 hover:text-white transition-colors">
              Retake Quiz
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-orange-500/20 transition-all">
          {saved ? (
             <>
               <CheckCircle2 className="w-5 h-5" />
               Profile Saved!
             </>
          ) : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

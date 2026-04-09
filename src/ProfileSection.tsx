import { useState } from 'react';
import { Save, User, Briefcase, DollarSign, Shield, CheckCircle } from 'lucide-react';
import { UserData, formatINR } from './data';
import { saveUserData } from './lib/userDataService';
import toast from 'react-hot-toast';

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all text-sm';
const inputStyle = { background: 'rgba(11,29,58,0.5)' };
const labelCls = 'block text-sm font-medium text-slate-300 mb-1';

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-6 card-hover">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-orange-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function ProfileSection({ data, setData }: { data: UserData; setData: React.Dispatch<React.SetStateAction<UserData>> }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateProfile = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      personal_profile: { ...prev.personal_profile, [field]: value },
    }));
    setSaved(false);
  };

  const updateIncome = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      income_and_cashflow: { ...prev.income_and_cashflow, [field]: value },
    }));
    setSaved(false);
  };

  const updateInsurance = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      insurance_and_protection: { ...prev.insurance_and_protection, [field]: value },
    }));
    setSaved(false);
  };

  const updateTax = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      tax_profile: { ...prev.tax_profile, [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await saveUserData(data);
    setSaving(false);
    if (success) {
      setSaved(true);
      toast.success('Profile saved to database!');
    } else {
      toast.error('Failed to save profile. Please try again.');
    }
  };

  const pp = data.personal_profile;
  const ic = data.income_and_cashflow;
  const ins = data.insurance_and_protection;
  const tx = data.tax_profile;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">My Profile</h2>
          <p className="text-sm text-slate-400 mt-0.5">Update your personal and financial details. Changes will be saved to your account.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all cursor-pointer ${
            saved
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/20'
          } disabled:opacity-60`}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <SectionCard title="Personal Information" icon={User}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Current Age</label>
              <input type="number" value={pp.current_age || ''} onChange={e => updateProfile('current_age', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="28" />
            </div>
            <div>
              <label className={labelCls}>Retirement Age</label>
              <input type="number" value={pp.target_retirement_age || ''} onChange={e => updateProfile('target_retirement_age', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="45" />
            </div>
            <div>
              <label className={labelCls}>Dependents</label>
              <input type="number" value={pp.dependents || ''} onChange={e => updateProfile('dependents', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="2" />
            </div>
            <div>
              <label className={labelCls}>Risk Appetite (1-10)</label>
              <input type="number" min={1} max={10} value={pp.risk_appetite_score || ''} onChange={e => updateProfile('risk_appetite_score', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="8" />
            </div>
            <div>
              <label className={labelCls}>Employment Type</label>
              <select value={pp.employment_type} onChange={e => updateProfile('employment_type', e.target.value)}
                className={inputCls + ' cursor-pointer'} style={{ background: 'rgba(11,29,58,0.8)' }}>
                <option value="">Select...</option>
                <option value="Salaried">Salaried</option>
                <option value="Self-Employed/Freelance">Self-Employed / Freelance</option>
                <option value="Business Owner">Business Owner</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Industry Sector</label>
              <input type="text" value={pp.industry_sector} onChange={e => updateProfile('industry_sector', e.target.value)}
                className={inputCls} style={inputStyle} placeholder="IT Services" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Tax Regime</label>
              <div className="flex gap-3">
                {['Old', 'New'].map(regime => (
                  <button key={regime} type="button" onClick={() => updateProfile('tax_regime', regime)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      pp.tax_regime === regime
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
                    }`}>
                    {regime} Regime
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Income & Cashflow */}
        <SectionCard title="Income & Cashflow" icon={DollarSign}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Net Take Home (Monthly)</label>
              <input type="number" value={ic.monthly_net_take_home || ''} onChange={e => updateIncome('monthly_net_take_home', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="120000" />
            </div>
            <div>
              <label className={labelCls}>Base Pay</label>
              <input type="number" value={ic.monthly_base_pay || ''} onChange={e => updateIncome('monthly_base_pay', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="100000" />
            </div>
            <div>
              <label className={labelCls}>Variable Pay</label>
              <input type="number" value={ic.monthly_variable_pay || ''} onChange={e => updateIncome('monthly_variable_pay', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="20000" />
            </div>
            <div>
              <label className={labelCls}>Living Expenses</label>
              <input type="number" value={ic.monthly_mandatory_living_expenses || ''} onChange={e => updateIncome('monthly_mandatory_living_expenses', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="40000" />
            </div>
            <div>
              <label className={labelCls}>Discretionary Spend</label>
              <input type="number" value={ic.monthly_discretionary_spend || ''} onChange={e => updateIncome('monthly_discretionary_spend', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="15000" />
            </div>
            <div>
              <label className={labelCls}>EPF/NPS Contribution</label>
              <input type="number" value={ic.monthly_epf_nps_contribution || ''} onChange={e => updateIncome('monthly_epf_nps_contribution', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="7500" />
            </div>
            <div>
              <label className={labelCls}>Total EMIs</label>
              <input type="number" value={ic.total_monthly_emi || ''} onChange={e => updateIncome('total_monthly_emi', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="25000" />
            </div>
            <div>
              <label className={labelCls}>Active SIPs</label>
              <input type="number" value={ic.total_active_monthly_sips || ''} onChange={e => updateIncome('total_active_monthly_sips', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="20000" />
            </div>
          </div>
          {/* Quick summary */}
          <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Monthly Surplus</span>
              <span className={`font-medium ${(ic.monthly_net_take_home - ic.monthly_mandatory_living_expenses - ic.total_monthly_emi - ic.total_active_monthly_sips) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatINR(ic.monthly_net_take_home - ic.monthly_mandatory_living_expenses - ic.monthly_discretionary_spend - ic.total_monthly_emi - ic.total_active_monthly_sips)}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Insurance */}
        <SectionCard title="Insurance & Protection" icon={Shield}>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelCls}>Health Insurance Cover</label>
              <input type="number" value={ins.total_health_insurance_cover || ''} onChange={e => updateInsurance('total_health_insurance_cover', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="500000" />
            </div>
            <div>
              <label className={labelCls}>Term Life Cover</label>
              <input type="number" value={ins.total_term_life_cover || ''} onChange={e => updateInsurance('total_term_life_cover', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="10000000" />
            </div>
            <div>
              <label className={labelCls}>Corporate Health Cover</label>
              <input type="number" value={ins.corporate_health_cover || ''} onChange={e => updateInsurance('corporate_health_cover', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="300000" />
            </div>
          </div>
        </SectionCard>

        {/* Tax */}
        <SectionCard title="Tax Deductions" icon={Briefcase}>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelCls}>Section 80C Utilized</label>
              <input type="number" value={tx.section_80c_utilized || ''} onChange={e => updateTax('section_80c_utilized', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="150000" />
              <p className="text-xs text-slate-500 mt-1">Max ₹1,50,000</p>
            </div>
            <div>
              <label className={labelCls}>Section 80D Utilized</label>
              <input type="number" value={tx.section_80d_utilized || ''} onChange={e => updateTax('section_80d_utilized', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="25000" />
              <p className="text-xs text-slate-500 mt-1">Max ₹25,000 (₹50,000 for senior citizens)</p>
            </div>
            <div>
              <label className={labelCls}>Section 24B Utilized</label>
              <input type="number" value={tx.section_24b_utilized || ''} onChange={e => updateTax('section_24b_utilized', Number(e.target.value))}
                className={inputCls} style={inputStyle} placeholder="200000" />
              <p className="text-xs text-slate-500 mt-1">Max ₹2,00,000 (Home Loan Interest)</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const testData = {
  user_id: 'usr_wewin_001',
  personal_profile: {
    current_age: 28, target_retirement_age: 45, dependents: 2,
    risk_appetite_score: 8, employment_type: 'Salaried',
    industry_sector: 'IT Services', tax_regime: 'New',
  },
  income_and_cashflow: {
    monthly_net_take_home: 120000, monthly_base_pay: 100000,
    monthly_variable_pay: 20000, monthly_mandatory_living_expenses: 40000,
    monthly_discretionary_spend: 15000, monthly_epf_nps_contribution: 7500,
    total_monthly_emi: 25000, total_active_monthly_sips: 20000,
  },
  tax_profile: { section_80c_utilized: 150000, section_80d_utilized: 25000, section_24b_utilized: 200000 },
  insurance_and_protection: { total_health_insurance_cover: 500000, total_term_life_cover: 0, corporate_health_cover: 300000 },
  system_state: {
      health_scores: { overall_score: 72, dimensions: { emergency_fund: 60, insurance_coverage: 40, investment_diversification: 70, debt_health: 55, tax_efficiency: 90, retirement_readiness: 75 } },
      path_planning: { active_path_selected: 'Balanced', projected_fire_date: '2042-05-01', available_paths: ['Safety First', 'Balanced', 'Aggressive'] },
      event_ledger: [{ event_id: 'evt_101', event_type: 'promotion', timestamp: '2024-09-15T09:00:00Z', impact_summary: 'Base pay increased by 15%. Redirected to FIRE goal.' }],
      scenario_cache: { active_simulation: null, last_run_simulation: 'market_crash_-20%' },
    },
};

async function testSave() {
  console.log("Saving user_profiles...");
  let res = await supabase.from('user_profiles').upsert({
    user_id: testData.user_id,
    last_sync_timestamp: new Date().toISOString(),
    current_age: testData.personal_profile.current_age,
    target_retirement_age: testData.personal_profile.target_retirement_age,
    dependents: testData.personal_profile.dependents,
    risk_appetite_score: testData.personal_profile.risk_appetite_score,
    employment_type: testData.personal_profile.employment_type,
    industry_sector: testData.personal_profile.industry_sector,
    tax_regime: testData.personal_profile.tax_regime,
  }, { onConflict: 'user_id' });
  console.log("user_profiles:", res.error);

  console.log("Saving income_cashflow...");
  res = await supabase.from('income_cashflow').upsert({
    user_id: testData.user_id,
    monthly_net_take_home: testData.income_and_cashflow.monthly_net_take_home,
    monthly_base_pay: testData.income_and_cashflow.monthly_base_pay,
    monthly_variable_pay: testData.income_and_cashflow.monthly_variable_pay,
    monthly_mandatory_living_expenses: testData.income_and_cashflow.monthly_mandatory_living_expenses,
    monthly_discretionary_spend: testData.income_and_cashflow.monthly_discretionary_spend,
    monthly_epf_nps_contribution: testData.income_and_cashflow.monthly_epf_nps_contribution,
    total_monthly_emi: testData.income_and_cashflow.total_monthly_emi,
    total_active_monthly_sips: testData.income_and_cashflow.total_active_monthly_sips,
  }, { onConflict: 'user_id' });
  console.log("income_cashflow:", res.error);

  console.log("Saving tax_profiles...");
  res = await supabase.from('tax_profiles').upsert({
    user_id: testData.user_id,
    section_80c_utilized: testData.tax_profile.section_80c_utilized,
    section_80d_utilized: testData.tax_profile.section_80d_utilized,
    section_24b_utilized: testData.tax_profile.section_24b_utilized,
  }, { onConflict: 'user_id' });
  console.log("tax_profiles:", res.error);

  console.log("Saving insurance_protection...");
  res = await supabase.from('insurance_protection').upsert({
    user_id: testData.user_id,
    total_health_insurance_cover: testData.insurance_and_protection.total_health_insurance_cover,
    total_term_life_cover: testData.insurance_and_protection.total_term_life_cover,
    corporate_health_cover: testData.insurance_and_protection.corporate_health_cover,
  }, { onConflict: 'user_id' });
  console.log("insurance_protection:", res.error);

  console.log("Saving system_state...");
  res = await supabase.from('system_state').upsert({
    user_id: testData.user_id,
    overall_health_score: testData.system_state.health_scores.overall_score,
    dim_emergency_fund: testData.system_state.health_scores.dimensions.emergency_fund,
    dim_insurance_coverage: testData.system_state.health_scores.dimensions.insurance_coverage,
    dim_investment_diversification: testData.system_state.health_scores.dimensions.investment_diversification,
    dim_debt_health: testData.system_state.health_scores.dimensions.debt_health,
    dim_tax_efficiency: testData.system_state.health_scores.dimensions.tax_efficiency,
    dim_retirement_readiness: testData.system_state.health_scores.dimensions.retirement_readiness,
    health_last_calculated: new Date().toISOString(),
    active_path_selected: testData.system_state.path_planning.active_path_selected,
    projected_fire_date: testData.system_state.path_planning.projected_fire_date,
    available_paths: testData.system_state.path_planning.available_paths,
    last_run_simulation: testData.system_state.scenario_cache.last_run_simulation,
  }, { onConflict: 'user_id' });
  console.log("system_state:", res.error);
}

testSave();

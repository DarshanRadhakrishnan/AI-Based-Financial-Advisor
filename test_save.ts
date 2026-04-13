import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFullSave() {
  const userId = 'usr_wewin_001';

  const data = {
    user_id: userId,
    personal_profile: {
      current_age: 28,
      target_retirement_age: 45,
      dependents: 2,
      risk_appetite_score: 8,
      employment_type: 'Salaried',
      industry_sector: 'IT Services',
      tax_regime: 'New'
    },
    income_and_cashflow: {
      monthly_net_take_home: 120000,
      monthly_base_pay: 100000,
      monthly_variable_pay: 20000,
      monthly_mandatory_living_expenses: 40000,
      monthly_discretionary_spend: 15000,
      monthly_epf_nps_contribution: 7500,
      total_monthly_emi: 25000,
      total_active_monthly_sips: 20000
    },
    tax_profile: { section_80c_utilized: 150000, section_80d_utilized: 25000, section_24b_utilized: 200000 },
    insurance_and_protection: { total_health_insurance_cover: 500000, total_term_life_cover: 0, corporate_health_cover: 300000 },
    system_state: {
      health_scores: {
        overall_score: 72,
        dimensions: { emergency_fund: 60, insurance_coverage: 40, investment_diversification: 70, debt_health: 55, tax_efficiency: 90, retirement_readiness: 75 }
      },
      path_planning: { active_path_selected: 'Balanced', projected_fire_date: '2042-05-01', available_paths: ['Safety First', 'Balanced', 'Aggressive'] },
      scenario_cache: { last_run_simulation: 'market_crash_-20%' }
    },
    financial_goals: [
      { goal_id: 'g_01', goal_name: 'Emergency Fund', target_amount: 300000, target_year: 2024, priority: 'Critical', status: 'In Progress' },
      { goal_id: 'g_02', goal_name: 'House Downpayment', target_amount: 1500000, target_year: 2028, priority: 'High', status: 'Not Started' },
      { goal_id: 'g_03', goal_name: 'FIRE Retirement', target_amount: 30000000, target_year: 2040, priority: 'Medium', status: 'In Progress' }
    ]
  };

  try {
    console.log("Saving user_profiles...");
    const { error: profileErr } = await supabase.from('user_profiles').upsert(
      { user_id: data.user_id, last_sync_timestamp: new Date().toISOString(), ...data.personal_profile },
      { onConflict: 'user_id' }
    ).select();
    if (profileErr) throw profileErr;

    console.log("Saving income...");
    const { error: incErr } = await supabase.from('income_cashflow').upsert(
      { user_id: data.user_id, ...data.income_and_cashflow }, { onConflict: 'user_id' }
    ).select();
    if (incErr) throw incErr;

    console.log("Saving tax...");
    const { error: taxErr } = await supabase.from('tax_profiles').upsert(
      { user_id: data.user_id, ...data.tax_profile }, { onConflict: 'user_id' }
    ).select();
    if (taxErr) throw taxErr;

    console.log("Saving insurance...");
    const { error: insErr } = await supabase.from('insurance_protection').upsert(
      { user_id: data.user_id, ...data.insurance_and_protection }, { onConflict: 'user_id' }
    ).select();
    if (insErr) throw insErr;

    console.log("Saving system_state...");
    const stateData = {
      user_id: data.user_id,
      overall_health_score: Math.round(data.system_state.health_scores.overall_score),
      dim_emergency_fund: data.system_state.health_scores.dimensions.emergency_fund,
      dim_insurance_coverage: data.system_state.health_scores.dimensions.insurance_coverage,
      dim_investment_diversification: data.system_state.health_scores.dimensions.investment_diversification,
      dim_debt_health: data.system_state.health_scores.dimensions.debt_health,
      dim_tax_efficiency: data.system_state.health_scores.dimensions.tax_efficiency,
      dim_retirement_readiness: data.system_state.health_scores.dimensions.retirement_readiness,
      health_last_calculated: new Date().toISOString(),
      active_path_selected: data.system_state.path_planning.active_path_selected,
      projected_fire_date: data.system_state.path_planning.projected_fire_date,
      available_paths: data.system_state.path_planning.available_paths,
      last_run_simulation: data.system_state.scenario_cache.last_run_simulation,
    };
    const { error: stErr } = await supabase.from('system_state').upsert(stateData, { onConflict: 'user_id' }).select();
    if (stErr) throw stErr;

    console.log("Saving goals...");
    const { error: delErr } = await supabase.from('financial_goals').delete().eq('user_id', data.user_id);
    if (delErr) throw delErr;

    if (data.financial_goals.length > 0) {
      const { error: insGErr } = await supabase.from('financial_goals').insert(
        data.financial_goals.map(g => ({
          goal_id: g.goal_id, user_id: data.user_id, goal_name: g.goal_name,
          target_amount: g.target_amount, target_year: g.target_year, priority: g.priority, status: g.status
        }))
      );
      if (insGErr) throw insGErr;
    }
    
    console.log("ALL SUCCESS 1");

    // Second save!
    console.log("Saving second time to test...");
    // Let's modify a little
    data.personal_profile.current_age = 29;
    
    console.log("Saving user_profiles second...");
    const { error: p2Err } = await supabase.from('user_profiles').upsert(
      { user_id: data.user_id, last_sync_timestamp: new Date().toISOString(), ...data.personal_profile },
      { onConflict: 'user_id' }
    ).select();
    if (p2Err) throw p2Err;
    console.log("ALL SUCCESS 2");
  } catch(e) {
    console.error("ERROR", e);
  }
}

testFullSave();

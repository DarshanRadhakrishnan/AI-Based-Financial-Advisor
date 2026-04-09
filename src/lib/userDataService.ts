import { supabase } from './supabase';
import { UserData, defaultUserData } from '../data';

/**
 * Fetch full user data from Supabase by user_id.
 * Returns defaultUserData if no record is found.
 */
export async function fetchUserData(userId: string): Promise<UserData> {
  try {
    // Fetch all tables in parallel
    const [profileRes, incomeRes, taxRes, insuranceRes, assetsRes, debtsRes, goalsRes, stateRes, eventsRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('income_cashflow').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('tax_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('insurance_protection').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('assets_portfolio').select('*').eq('user_id', userId),
      supabase.from('liabilities_debt').select('*').eq('user_id', userId),
      supabase.from('financial_goals').select('*').eq('user_id', userId),
      supabase.from('system_state').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('event_ledger').select('*').eq('user_id', userId),
    ]);

    const profile = profileRes.data;
    if (!profile) return { ...defaultUserData, user_id: userId };

    const income = incomeRes.data;
    const tax = taxRes.data;
    const insurance = insuranceRes.data;
    const state = stateRes.data;

    return {
      user_id: userId,
      last_updated: profile.last_sync_timestamp || new Date().toISOString(),
      personal_profile: {
        current_age: profile.current_age || 0,
        target_retirement_age: profile.target_retirement_age || 0,
        dependents: profile.dependents || 0,
        risk_appetite_score: profile.risk_appetite_score || 5,
        employment_type: profile.employment_type || '',
        industry_sector: profile.industry_sector || '',
        tax_regime: profile.tax_regime || 'New',
      },
      income_and_cashflow: {
        monthly_net_take_home: income?.monthly_net_take_home || 0,
        monthly_base_pay: income?.monthly_base_pay || 0,
        monthly_variable_pay: income?.monthly_variable_pay || 0,
        monthly_mandatory_living_expenses: income?.monthly_mandatory_living_expenses || 0,
        monthly_discretionary_spend: income?.monthly_discretionary_spend || 0,
        monthly_epf_nps_contribution: income?.monthly_epf_nps_contribution || 0,
        total_monthly_emi: income?.total_monthly_emi || 0,
        total_active_monthly_sips: income?.total_active_monthly_sips || 0,
      },
      tax_profile: {
        section_80c_utilized: tax?.section_80c_utilized || 0,
        section_80d_utilized: tax?.section_80d_utilized || 0,
        section_24b_utilized: tax?.section_24b_utilized || 0,
      },
      insurance_and_protection: {
        total_health_insurance_cover: insurance?.total_health_insurance_cover || 0,
        total_term_life_cover: insurance?.total_term_life_cover || 0,
        corporate_health_cover: insurance?.corporate_health_cover || 0,
      },
      assets_portfolio: (assetsRes.data || []).map((a: any) => ({
        asset_id: a.asset_id,
        asset_name: a.asset_name,
        ticker: a.ticker,
        category: a.category,
        current_market_value: a.current_market_value,
        monthly_sip: a.monthly_sip,
        liquidity_status: a.liquidity_status,
        linked_goal_id: a.linked_goal_id,
      })),
      liabilities_and_debt: (debtsRes.data || []).map((d: any) => ({
        debt_id: d.debt_id,
        loan_type: d.loan_type,
        outstanding_amount: d.outstanding_amount,
        interest_rate: Number(d.interest_rate),
        emi_amount: d.emi_amount,
        remaining_tenure_months: d.remaining_tenure_months,
        is_tax_deductible: d.is_tax_deductible,
      })),
      financial_goals: (goalsRes.data || []).map((g: any) => ({
        goal_id: g.goal_id,
        goal_name: g.goal_name,
        target_amount: g.target_amount,
        target_year: g.target_year,
        priority: g.priority,
        status: g.status,
      })),
      system_state: {
        health_scores: {
          overall_score: state?.overall_health_score ?? null,
          dimensions: {
            emergency_fund: state?.dim_emergency_fund || 0,
            insurance_coverage: state?.dim_insurance_coverage || 0,
            investment_diversification: state?.dim_investment_diversification || 0,
            debt_health: state?.dim_debt_health || 0,
            tax_efficiency: state?.dim_tax_efficiency || 0,
            retirement_readiness: state?.dim_retirement_readiness || 0,
          },
        },
        path_planning: {
          active_path_selected: state?.active_path_selected || null,
          projected_fire_date: state?.projected_fire_date || null,
          available_paths: state?.available_paths || ['Safety First', 'Balanced', 'Aggressive'],
        },
        event_ledger: (eventsRes.data || []).map((e: any) => ({
          event_id: e.event_id,
          event_type: e.event_type,
          timestamp: e.event_timestamp,
          impact_summary: e.impact_summary,
        })),
        scenario_cache: {
          active_simulation: null,
          last_run_simulation: state?.last_run_simulation || null,
        },
      },
    };
  } catch (err) {
    console.error('Error fetching user data:', err);
    return { ...defaultUserData, user_id: userId };
  }
}

/**
 * Save/upsert full user data to Supabase.
 */
export async function saveUserData(data: UserData): Promise<{success: boolean; error?: string}> {
  try {
    console.log("Saving user_profiles...");
    // 1. Upsert user_profiles
    const { error: profileErr } = await supabase.from('user_profiles').upsert({
      user_id: data.user_id,
      last_sync_timestamp: new Date().toISOString(),
      current_age: data.personal_profile.current_age,
      target_retirement_age: data.personal_profile.target_retirement_age,
      dependents: data.personal_profile.dependents,
      risk_appetite_score: data.personal_profile.risk_appetite_score,
      employment_type: data.personal_profile.employment_type,
      industry_sector: data.personal_profile.industry_sector,
      tax_regime: data.personal_profile.tax_regime,
    }, { onConflict: 'user_id' }).select();
    
    console.log("Saved user_profiles. Error:", profileErr);
    if (profileErr) throw profileErr;

    console.log("Saving income_cashflow...");
    // 2. Upsert income_cashflow
    const { error: incomeErr } = await supabase.from('income_cashflow').upsert({
      user_id: data.user_id,
      monthly_net_take_home: data.income_and_cashflow.monthly_net_take_home,
      monthly_base_pay: data.income_and_cashflow.monthly_base_pay,
      monthly_variable_pay: data.income_and_cashflow.monthly_variable_pay,
      monthly_mandatory_living_expenses: data.income_and_cashflow.monthly_mandatory_living_expenses,
      monthly_discretionary_spend: data.income_and_cashflow.monthly_discretionary_spend,
      monthly_epf_nps_contribution: data.income_and_cashflow.monthly_epf_nps_contribution,
      total_monthly_emi: data.income_and_cashflow.total_monthly_emi,
      total_active_monthly_sips: data.income_and_cashflow.total_active_monthly_sips,
    }, { onConflict: 'user_id' }).select();
    if (incomeErr) throw incomeErr;

    console.log("Saving tax_profiles...");
    // 3. Upsert tax_profiles
    const { error: taxErr } = await supabase.from('tax_profiles').upsert({
      user_id: data.user_id,
      section_80c_utilized: data.tax_profile.section_80c_utilized,
      section_80d_utilized: data.tax_profile.section_80d_utilized,
      section_24b_utilized: data.tax_profile.section_24b_utilized,
    }, { onConflict: 'user_id' }).select();
    if (taxErr) throw taxErr;

    console.log("Saving insurance...");
    // 4. Upsert insurance_protection
    const { error: insErr } = await supabase.from('insurance_protection').upsert({
      user_id: data.user_id,
      total_health_insurance_cover: data.insurance_and_protection.total_health_insurance_cover,
      total_term_life_cover: data.insurance_and_protection.total_term_life_cover,
      corporate_health_cover: data.insurance_and_protection.corporate_health_cover,
    }, { onConflict: 'user_id' }).select();
    if (insErr) throw insErr;

    console.log("Saving system_state...");
    // 5. Upsert system_state
    const { error: stateErr } = await supabase.from('system_state').upsert({
      user_id: data.user_id,
      overall_health_score: data.system_state.health_scores.overall_score !== null ? Math.round(data.system_state.health_scores.overall_score) : null,
      dim_emergency_fund: Math.round(data.system_state.health_scores.dimensions.emergency_fund || 0),
      dim_insurance_coverage: Math.round(data.system_state.health_scores.dimensions.insurance_coverage || 0),
      dim_investment_diversification: Math.round(data.system_state.health_scores.dimensions.investment_diversification || 0),
      dim_debt_health: Math.round(data.system_state.health_scores.dimensions.debt_health || 0),
      dim_tax_efficiency: Math.round(data.system_state.health_scores.dimensions.tax_efficiency || 0),
      dim_retirement_readiness: Math.round(data.system_state.health_scores.dimensions.retirement_readiness || 0),
      health_last_calculated: new Date().toISOString(),
      active_path_selected: data.system_state.path_planning.active_path_selected,
      projected_fire_date: data.system_state.path_planning.projected_fire_date,
      available_paths: data.system_state.path_planning.available_paths,
      last_run_simulation: data.system_state.scenario_cache.last_run_simulation,
    }, { onConflict: 'user_id' }).select();
    if (stateErr) throw stateErr;

    console.log("Saving financial goals...");
    // 6. Delete old goals & insert new ones
    const { error: delGoalsErr } = await supabase.from('financial_goals').delete().eq('user_id', data.user_id);
    if (delGoalsErr) throw delGoalsErr;

    if (data.financial_goals.length > 0) {
      const { error: insGoalsErr } = await supabase.from('financial_goals').insert(
        data.financial_goals.map(g => ({
          goal_id: g.goal_id,
          user_id: data.user_id,
          goal_name: g.goal_name,
          target_amount: g.target_amount,
          target_year: g.target_year,
          priority: g.priority,
          status: g.status,
        }))
      );
      if (insGoalsErr) throw insGoalsErr;
    }

    console.log("All saved successfully!");
    return { success: true };
  } catch (err: any) {
    console.error('Error saving user data:', err);
    return { success: false, error: err.message || JSON.stringify(err) || "Unknown database error" };
  }
}

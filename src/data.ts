// ───── Type Definitions ─────

export interface AssetItem {
  asset_id: string;
  asset_name: string;
  ticker: string;
  category: string;
  current_market_value: number;
  monthly_sip: number;
  liquidity_status: string;
  linked_goal_id: string | null;
}

export interface DebtItem {
  debt_id: string;
  loan_type: string;
  outstanding_amount: number;
  interest_rate: number;
  emi_amount: number;
  remaining_tenure_months: number;
  is_tax_deductible: boolean;
}

export interface GoalItem {
  goal_id: string;
  goal_name: string;
  target_amount: number;
  target_year: number;
  priority: string;
  status: string;
}

export interface EventItem {
  event_id: string;
  event_type: string;
  timestamp: string;
  impact_summary: string;
}

export interface UserData {
  user_id: string;
  last_updated: string;
  personal_profile: {
    current_age: number;
    target_retirement_age: number;
    dependents: number;
    risk_appetite_score: number;
    employment_type: string;
    industry_sector: string;
    tax_regime: string;
  };
  income_and_cashflow: {
    monthly_net_take_home: number;
    monthly_base_pay: number;
    monthly_variable_pay: number;
    monthly_mandatory_living_expenses: number;
    monthly_discretionary_spend: number;
    monthly_epf_nps_contribution: number;
    total_monthly_emi: number;
    total_active_monthly_sips: number;
  };
  tax_profile: {
    section_80c_utilized: number;
    section_80d_utilized: number;
    section_24b_utilized: number;
  };
  insurance_and_protection: {
    total_health_insurance_cover: number;
    total_term_life_cover: number;
    corporate_health_cover: number;
  };
  assets_portfolio: AssetItem[];
  liabilities_and_debt: DebtItem[];
  financial_goals: GoalItem[];
  system_state: {
    health_scores: {
      overall_score: number | null;
      dimensions: {
        emergency_fund: number;
        insurance_coverage: number;
        investment_diversification: number;
        debt_health: number;
        tax_efficiency: number;
        retirement_readiness: number;
      };
      gemini_advisory?: string | null;
    };
    path_planning: {
      active_path_selected: string | null;
      projected_fire_date: string | null;
      available_paths: string[];
    };
    event_ledger: EventItem[];
    scenario_cache: {
      active_simulation: string | null;
      last_run_simulation: string | null;
    };
  };
}

// ───── Default (blank) user data ─────

export const defaultUserData: UserData = {
  user_id: 'usr_new',
  last_updated: new Date().toISOString(),
  personal_profile: {
    current_age: 0,
    target_retirement_age: 0,
    dependents: 0,
    risk_appetite_score: 5,
    employment_type: '',
    industry_sector: '',
    tax_regime: 'New',
  },
  income_and_cashflow: {
    monthly_net_take_home: 0,
    monthly_base_pay: 0,
    monthly_variable_pay: 0,
    monthly_mandatory_living_expenses: 0,
    monthly_discretionary_spend: 0,
    monthly_epf_nps_contribution: 0,
    total_monthly_emi: 0,
    total_active_monthly_sips: 0,
  },
  tax_profile: {
    section_80c_utilized: 0,
    section_80d_utilized: 0,
    section_24b_utilized: 0,
  },
  insurance_and_protection: {
    total_health_insurance_cover: 0,
    total_term_life_cover: 0,
    corporate_health_cover: 0,
  },
  assets_portfolio: [],
  liabilities_and_debt: [],
  financial_goals: [],
  system_state: {
    health_scores: {
      overall_score: null,
      dimensions: {
        emergency_fund: 0,
        insurance_coverage: 0,
        investment_diversification: 0,
        debt_health: 0,
        tax_efficiency: 0,
        retirement_readiness: 0,
      },
    },
    path_planning: {
      active_path_selected: null,
      projected_fire_date: null,
      available_paths: ['Safety First', 'Balanced', 'Aggressive'],
    },
    event_ledger: [],
    scenario_cache: {
      active_simulation: null,
      last_run_simulation: null,
    },
  },
};

// ───── 3 Hardcoded Profiles (matching the provided JSON) ─────

export const fakeProfiles: UserData[] = [
  // Profile 0 — usr_wewin_001 (Young IT Salaried, Aggressive)
  {
    user_id: 'usr_wewin_001',
    last_updated: '2024-10-24T10:00:00Z',
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
    assets_portfolio: [
      { asset_id: 'ast_101', asset_name: 'Nifty 50 Index Fund', ticker: '^NSEI', category: 'Equity', current_market_value: 200000, monthly_sip: 10000, liquidity_status: 'High', linked_goal_id: 'g_03' },
      { asset_id: 'ast_102', asset_name: 'Physical Gold', ticker: 'GOLD', category: 'Commodity', current_market_value: 50000, monthly_sip: 0, liquidity_status: 'Medium', linked_goal_id: null },
      { asset_id: 'ast_103', asset_name: 'HDFC Fixed Deposit', ticker: 'NONE', category: 'Debt', current_market_value: 100000, monthly_sip: 0, liquidity_status: 'Low', linked_goal_id: 'g_01' },
    ],
    liabilities_and_debt: [
      { debt_id: 'dbt_101', loan_type: 'Education Loan', outstanding_amount: 1500000, interest_rate: 9.5, emi_amount: 25000, remaining_tenure_months: 72, is_tax_deductible: true },
    ],
    financial_goals: [
      { goal_id: 'g_01', goal_name: 'Emergency Fund', target_amount: 300000, target_year: 2024, priority: 'Critical', status: 'In Progress' },
      { goal_id: 'g_02', goal_name: 'House Downpayment', target_amount: 1500000, target_year: 2028, priority: 'High', status: 'Not Started' },
      { goal_id: 'g_03', goal_name: 'FIRE Retirement', target_amount: 30000000, target_year: 2040, priority: 'Medium', status: 'In Progress' },
    ],
    system_state: {
      health_scores: { overall_score: 72, dimensions: { emergency_fund: 60, insurance_coverage: 40, investment_diversification: 70, debt_health: 55, tax_efficiency: 90, retirement_readiness: 75 } },
      path_planning: { active_path_selected: 'Balanced', projected_fire_date: '2042-05-01', available_paths: ['Safety First', 'Balanced', 'Aggressive'] },
      event_ledger: [{ event_id: 'evt_101', event_type: 'promotion', timestamp: '2024-09-15T09:00:00Z', impact_summary: 'Base pay increased by 15%. Redirected to FIRE goal.' }],
      scenario_cache: { active_simulation: null, last_run_simulation: 'market_crash_-20%' },
    },
  },
  // Profile 1 — usr_wewin_002 (Freelancer, High Risk, Low Score)
  {
    user_id: 'usr_wewin_002',
    last_updated: '2024-10-24T10:00:00Z',
    personal_profile: {
      current_age: 32, target_retirement_age: 55, dependents: 0,
      risk_appetite_score: 9, employment_type: 'Self-Employed/Freelance',
      industry_sector: 'Creative & Design', tax_regime: 'Old',
    },
    income_and_cashflow: {
      monthly_net_take_home: 80000, monthly_base_pay: 10000,
      monthly_variable_pay: 70000, monthly_mandatory_living_expenses: 45000,
      monthly_discretionary_spend: 20000, monthly_epf_nps_contribution: 0,
      total_monthly_emi: 10000, total_active_monthly_sips: 5000,
    },
    tax_profile: { section_80c_utilized: 40000, section_80d_utilized: 15000, section_24b_utilized: 0 },
    insurance_and_protection: { total_health_insurance_cover: 300000, total_term_life_cover: 0, corporate_health_cover: 0 },
    assets_portfolio: [
      { asset_id: 'ast_201', asset_name: 'ICICI Savings Account', ticker: 'NONE', category: 'Cash', current_market_value: 150000, monthly_sip: 0, liquidity_status: 'High', linked_goal_id: 'g_201' },
      { asset_id: 'ast_202', asset_name: 'High-Risk Small Cap Fund', ticker: 'SMALLCAP', category: 'Equity', current_market_value: 80000, monthly_sip: 5000, liquidity_status: 'High', linked_goal_id: 'g_202' },
    ],
    liabilities_and_debt: [
      { debt_id: 'dbt_201', loan_type: 'Personal Loan', outstanding_amount: 150000, interest_rate: 14.0, emi_amount: 10000, remaining_tenure_months: 18, is_tax_deductible: false },
    ],
    financial_goals: [
      { goal_id: 'g_201', goal_name: 'Emergency Fund', target_amount: 540000, target_year: 2024, priority: 'Critical', status: 'In Progress' },
      { goal_id: 'g_202', goal_name: 'Setup Design Studio', target_amount: 1000000, target_year: 2026, priority: 'Medium', status: 'In Progress' },
    ],
    system_state: {
      health_scores: { overall_score: 45, dimensions: { emergency_fund: 27, insurance_coverage: 30, investment_diversification: 40, debt_health: 60, tax_efficiency: 30, retirement_readiness: 20 } },
      path_planning: { active_path_selected: 'Safety First', projected_fire_date: null, available_paths: ['Safety First', 'Balanced', 'Aggressive'] },
      event_ledger: [{ event_id: 'evt_201', event_type: 'client_loss', timestamp: '2024-08-01T14:00:00Z', impact_summary: 'Variable pay dropped by 40%. Path changed to Safety First.' }],
      scenario_cache: { active_simulation: null, last_run_simulation: null },
    },
  },
  // Profile 2 — usr_wewin_003 (Senior Govt, Conservative, High Score)
  {
    user_id: 'usr_wewin_003',
    last_updated: '2024-10-24T10:00:00Z',
    personal_profile: {
      current_age: 52, target_retirement_age: 60, dependents: 3,
      risk_appetite_score: 3, employment_type: 'Salaried',
      industry_sector: 'Public Sector / Government', tax_regime: 'Old',
    },
    income_and_cashflow: {
      monthly_net_take_home: 150000, monthly_base_pay: 150000,
      monthly_variable_pay: 0, monthly_mandatory_living_expenses: 50000,
      monthly_discretionary_spend: 30000, monthly_epf_nps_contribution: 25000,
      total_monthly_emi: 30000, total_active_monthly_sips: 15000,
    },
    tax_profile: { section_80c_utilized: 150000, section_80d_utilized: 50000, section_24b_utilized: 180000 },
    insurance_and_protection: { total_health_insurance_cover: 1000000, total_term_life_cover: 10000000, corporate_health_cover: 1000000 },
    assets_portfolio: [
      { asset_id: 'ast_301', asset_name: 'Public Provident Fund (PPF)', ticker: 'NONE', category: 'Debt', current_market_value: 2500000, monthly_sip: 12500, liquidity_status: 'Low', linked_goal_id: 'g_302' },
      { asset_id: 'ast_302', asset_name: 'SBI Bluechip Fund', ticker: 'SBIBLUE', category: 'Equity', current_market_value: 800000, monthly_sip: 2500, liquidity_status: 'Medium', linked_goal_id: 'g_301' },
    ],
    liabilities_and_debt: [
      { debt_id: 'dbt_301', loan_type: 'Home Loan', outstanding_amount: 800000, interest_rate: 8.5, emi_amount: 30000, remaining_tenure_months: 32, is_tax_deductible: true },
    ],
    financial_goals: [
      { goal_id: 'g_301', goal_name: "Daughter's Education", target_amount: 2000000, target_year: 2027, priority: 'Critical', status: 'In Progress' },
      { goal_id: 'g_302', goal_name: 'Retirement Corpus', target_amount: 15000000, target_year: 2032, priority: 'High', status: 'In Progress' },
    ],
    system_state: {
      health_scores: { overall_score: 85, dimensions: { emergency_fund: 90, insurance_coverage: 95, investment_diversification: 50, debt_health: 80, tax_efficiency: 95, retirement_readiness: 88 } },
      path_planning: { active_path_selected: 'Safety First', projected_fire_date: '2032-01-01', available_paths: ['Safety First', 'Balanced'] },
      event_ledger: [],
      scenario_cache: { active_simulation: null, last_run_simulation: null },
    },
  },
];

// ───── Utility functions ─────

export const formatINR = (n: number): string => {
  if (n === 0) return '₹0';
  const s = Math.abs(n).toString();
  let result = '';
  let count = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    result = s[i] + result;
    count++;
    if (count === 3 && i > 0) { result = ',' + result; }
    else if (count > 3 && (count - 3) % 2 === 0 && i > 0) { result = ',' + result; }
  }
  return (n < 0 ? '-₹' : '₹') + result;
};

export const paths = [
  {
    id: 'safety', name: 'Safety First', border: 'border-green-500', color: 'text-green-400', bg: 'bg-green-500/10',
    risk: 'Low', retireAge: 50, corpus: '₹2.1 Crore', sip: '₹22,000',
    actions: ['Build emergency fund first', 'Get term life insurance', 'Start NPS contributions'],
  },
  {
    id: 'balanced', name: 'Balanced', border: 'border-blue-500', color: 'text-blue-400', bg: 'bg-blue-500/10',
    risk: 'Medium', retireAge: 47, corpus: '₹2.6 Crore', sip: '₹28,000',
    actions: ['Close personal loan in 12 months', 'Increase equity SIP by ₹8,000', 'Claim HRA + NPS tax benefits'],
  },
  {
    id: 'aggressive', name: 'Aggressive Growth', border: 'border-orange-500', color: 'text-orange-400', bg: 'bg-orange-500/10',
    risk: 'High', retireAge: 44, corpus: '₹3.2 Crore', sip: '₹35,000',
    actions: ['Max out 80C + NPS immediately', 'Shift 80% portfolio to equity', 'Review every 3 months'],
  },
];

export const incidentEvents = [
  { emoji: '💍', label: 'Got Married' },
  { emoji: '👶', label: 'New Baby' },
  { emoji: '💰', label: 'Received Bonus' },
  { emoji: '📈', label: 'Got Promoted' },
  { emoji: '😔', label: 'Lost Job' },
  { emoji: '🏠', label: 'Buying a House' },
];

export const marketAlerts = [
  {
    type: 'OPPORTUNITY', emoji: '🔔', badge: 'bg-green-500/20 text-green-400', title: 'Nifty 50 dropped 6.2% this week',
    body: 'You have ₹35,000 monthly surplus. Investing now gives historical avg of 18% return in next 12 months.',
    time: 'Today, 9:15 AM',
  },
  {
    type: 'WARNING', emoji: '⚠️', badge: 'bg-orange-500/20 text-orange-400', title: 'HDFC Mid Cap Fund underperformed benchmark for 2 consecutive quarters',
    body: 'Consider switching to Nifty Next 50 Index Fund for better risk-adjusted returns.',
    time: 'Yesterday, 2:30 PM',
  },
  {
    type: 'TAX TIP', emoji: '💡', badge: 'bg-blue-500/20 text-blue-400', title: 'March 31 deadline in 68 days',
    body: "You haven't used NPS (Section 80CCD) — invest ₹50,000 to save ₹15,000 in tax.",
    time: '2 days ago',
  },
  {
    type: 'SIGNAL', emoji: '📈', badge: 'bg-purple-500/20 text-purple-400', title: 'Insider buying detected: Promoters of Tata Power bought ₹42Cr of own stock',
    body: 'Your portfolio is underweight in energy sector. This may be relevant.',
    time: '3 days ago',
  },
];

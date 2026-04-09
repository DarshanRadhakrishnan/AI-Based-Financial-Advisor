export const defaultUserData = {
  user_id: "usr_new",
  last_updated: new Date().toISOString(),
  personal_info: {
    current_age: 0,
    target_retirement_age: 0,
    dependents: 0,
    risk_appetite_score: 0,
  },
  monthly_cash_flow: {
    net_take_home_income: 0,
    mandatory_living_expenses: 0,
    total_emi_payments: 0,
    current_active_sips: 0,
  },
  assets_portfolio: [] as Array<{ asset_name: string; ticker: string; category: string; current_value: number; monthly_sip: number }>,
  liabilities_and_protection: {
    total_outstanding_debt: 0,
    health_insurance_cover: 0,
    term_life_cover: 0,
  },
  financial_goals: [] as Array<{ goal_id: string; goal_name: string; target_amount: number; target_year: number; priority: string; status: string }>,
  system_state: {
    current_health_score: null as number | null,
    active_path_selected: null as string | null,
    logged_events: [] as Array<{ event: string; timestamp: string; amount: number }>,
  },
};

export type UserData = typeof defaultUserData;

export const fakeProfiles: UserData[] = [
  { // Profile 0: High Income, Conservative (Derived from provided JSON)
    user_id: "usr_wewin_003",
    last_updated: "2024-10-24T10:00:00Z",
    personal_info: { current_age: 52, target_retirement_age: 60, dependents: 3, risk_appetite_score: 3 },
    monthly_cash_flow: { net_take_home_income: 150000, mandatory_living_expenses: 50000, total_emi_payments: 30000, current_active_sips: 15000 },
    assets_portfolio: [
      { asset_name: "Public Provident Fund", ticker: "NONE", category: "Debt", current_value: 2500000, monthly_sip: 12500 },
      { asset_name: "SBI Bluechip Fund", ticker: "SBIBLUE", category: "Equity", current_value: 800000, monthly_sip: 2500 },
    ],
    liabilities_and_protection: { total_outstanding_debt: 800000, health_insurance_cover: 2000000, term_life_cover: 10000000 },
    financial_goals: [
      { goal_id: "g_301", goal_name: "Daughter's Education", target_amount: 2000000, target_year: 2027, priority: "Critical", status: "In Progress" },
      { goal_id: "g_302", goal_name: "Retirement Corpus", target_amount: 15000000, target_year: 2032, priority: "High", status: "In Progress" },
    ],
    system_state: { current_health_score: 85, active_path_selected: "Safety First", logged_events: [] },
  },
  { // Profile 1: Young, Aggressive
    user_id: "usr_young_001",
    last_updated: "2024-10-25T10:00:00Z",
    personal_info: { current_age: 26, target_retirement_age: 40, dependents: 0, risk_appetite_score: 9 },
    monthly_cash_flow: { net_take_home_income: 80000, mandatory_living_expenses: 25000, total_emi_payments: 0, current_active_sips: 30000 },
    assets_portfolio: [
      { asset_name: "Nifty 50 Index Fund", ticker: "^NSEI", category: "Equity", current_value: 400000, monthly_sip: 20000 },
      { asset_name: "Bitcoin", ticker: "BTC", category: "Commodity", current_value: 150000, monthly_sip: 10000 }
    ],
    liabilities_and_protection: { total_outstanding_debt: 0, health_insurance_cover: 500000, term_life_cover: 0 },
    financial_goals: [
      { goal_id: "g_101", goal_name: "Travel Europe", target_amount: 300000, target_year: 2025, priority: "Medium", status: "In Progress" },
      { goal_id: "g_102", goal_name: "House Downpayment", target_amount: 2000000, target_year: 2030, priority: "High", status: "Not Started" }
    ],
    system_state: { current_health_score: 72, active_path_selected: "Aggressive Growth", logged_events: [] }
  },
  { // Profile 2: Balanced mid-career
    user_id: "usr_mid_002",
    last_updated: "2024-10-26T10:00:00Z",
    personal_info: { current_age: 35, target_retirement_age: 55, dependents: 2, risk_appetite_score: 6 },
    monthly_cash_flow: { net_take_home_income: 120000, mandatory_living_expenses: 60000, total_emi_payments: 20000, current_active_sips: 20000 },
    assets_portfolio: [
      { asset_name: "HDFC Mutual Fund", ticker: "HDFCMF", category: "Equity", current_value: 1200000, monthly_sip: 15000 },
      { asset_name: "Physical Gold", ticker: "GOLD", category: "Commodity", current_value: 300000, monthly_sip: 0 },
      { asset_name: "FDs and Bonds", ticker: "NONE", category: "Debt", current_value: 500000, monthly_sip: 5000 }
    ],
    liabilities_and_protection: { total_outstanding_debt: 1500000, health_insurance_cover: 1000000, term_life_cover: 5000000 },
    financial_goals: [
      { goal_id: "g_201", goal_name: "Emergency Fund", target_amount: 500000, target_year: 2024, priority: "Critical", status: "In Progress" },
      { goal_id: "g_202", goal_name: "Child's College", target_amount: 5000000, target_year: 2040, priority: "High", status: "Not Started" }
    ],
    system_state: { current_health_score: 68, active_path_selected: "Balanced", logged_events: [] }
  }
];

export const formatINR = (n: number): string => {
  const s = n.toString();
  let result = '';
  let count = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    result = s[i] + result;
    count++;
    if (count === 3 && i > 0) { result = ',' + result; }
    else if (count > 3 && (count - 3) % 2 === 0 && i > 0) { result = ',' + result; }
  }
  return '₹' + result;
};

export const healthDimensions = [
  { name: "Emergency Fund", score: 40, fix: "Build 6-month expense buffer — target ₹2,40,000" },
  { name: "Insurance Coverage", score: 30, fix: "Get term life insurance — 10x income rule" },
  { name: "Investment Balance", score: 75, fix: "Great mix! Consider adding international equity" },
  { name: "Debt Health", score: 55, fix: "Prepay ₹50K on highest-rate loan this quarter" },
  { name: "Tax Efficiency", score: 60, fix: "Invest ₹50,000 in NPS for 80CCD(1B) benefit" },
  { name: "Retirement Readiness", score: 70, fix: "Increase SIP by ₹5K/month to stay on track" },
];

export const marketAlerts = [
  {
    type: "OPPORTUNITY", emoji: "🔔", badge: "bg-green-500/20 text-green-400", title: "Nifty 50 dropped 6.2% this week",
    body: "You have ₹35,000 monthly surplus. Investing now gives historical avg of 18% return in next 12 months.",
    time: "Today, 9:15 AM",
  },
  {
    type: "WARNING", emoji: "⚠️", badge: "bg-orange-500/20 text-orange-400", title: "HDFC Mid Cap Fund underperformed benchmark for 2 consecutive quarters",
    body: "Consider switching to Nifty Next 50 Index Fund for better risk-adjusted returns.",
    time: "Yesterday, 2:30 PM",
  },
  {
    type: "TAX TIP", emoji: "💡", badge: "bg-blue-500/20 text-blue-400", title: "March 31 deadline in 68 days",
    body: "You haven't used NPS (Section 80CCD) — invest ₹50,000 to save ₹15,000 in tax.",
    time: "2 days ago",
  },
  {
    type: "SIGNAL", emoji: "📈", badge: "bg-purple-500/20 text-purple-400", title: "Insider buying detected: Promoters of Tata Power bought ₹42Cr of own stock",
    body: "Your portfolio is underweight in energy sector. This may be relevant.",
    time: "3 days ago",
  },
];

export const paths = [
  {
    id: "safety", name: "Safety First", border: "border-green-500", color: "text-green-400", bg: "bg-green-500/10",
    risk: "Low", retireAge: 50, corpus: "₹2.1 Crore", sip: "₹22,000",
    actions: ["Build emergency fund first", "Get term life insurance", "Start NPS contributions"],
  },
  {
    id: "balanced", name: "Balanced", border: "border-blue-500", color: "text-blue-400", bg: "bg-blue-500/10",
    risk: "Medium", retireAge: 47, corpus: "₹2.6 Crore", sip: "₹28,000",
    actions: ["Close personal loan in 12 months", "Increase equity SIP by ₹8,000", "Claim HRA + NPS tax benefits"],
  },
  {
    id: "aggressive", name: "Aggressive Growth", border: "border-orange-500", color: "text-orange-400", bg: "bg-orange-500/10",
    risk: "High", retireAge: 44, corpus: "₹3.2 Crore", sip: "₹35,000",
    actions: ["Max out 80C + NPS immediately", "Shift 80% portfolio to equity", "Review every 3 months"],
  },
];

export const incidentEvents = [
  { emoji: "💍", label: "Got Married" },
  { emoji: "👶", label: "New Baby" },
  { emoji: "💰", label: "Received Bonus" },
  { emoji: "📈", label: "Got Promoted" },
  { emoji: "😔", label: "Lost Job" },
  { emoji: "🏠", label: "Buying a House" },
];

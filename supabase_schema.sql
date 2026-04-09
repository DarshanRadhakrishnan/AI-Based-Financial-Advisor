-- ============================================================
-- FinanceIQ — Supabase Schema & Seed Data
-- Run this entire file in Supabase SQL Editor (one shot)
-- ============================================================

-- 1. USER PROFILES
create table if not exists public.user_profiles (
  user_id text primary key,
  auth_uid uuid references auth.users(id) on delete set null,
  onboarding_date timestamptz default now(),
  last_sync_timestamp timestamptz default now(),
  current_age integer,
  target_retirement_age integer,
  dependents integer default 0,
  risk_appetite_score integer default 5,
  employment_type text,
  industry_sector text,
  tax_regime text default 'New'
);

-- 2. INCOME & CASHFLOW
create table if not exists public.income_cashflow (
  id bigint generated always as identity primary key,
  user_id text references public.user_profiles(user_id) on delete cascade,
  monthly_net_take_home integer default 0,
  monthly_base_pay integer default 0,
  monthly_variable_pay integer default 0,
  monthly_mandatory_living_expenses integer default 0,
  monthly_discretionary_spend integer default 0,
  monthly_epf_nps_contribution integer default 0,
  total_monthly_emi integer default 0,
  total_active_monthly_sips integer default 0,
  unique(user_id)
);

-- 3. TAX PROFILES
create table if not exists public.tax_profiles (
  id bigint generated always as identity primary key,
  user_id text references public.user_profiles(user_id) on delete cascade,
  section_80c_utilized integer default 0,
  section_80d_utilized integer default 0,
  section_24b_utilized integer default 0,
  unique(user_id)
);

-- 4. INSURANCE & PROTECTION
create table if not exists public.insurance_protection (
  id bigint generated always as identity primary key,
  user_id text references public.user_profiles(user_id) on delete cascade,
  total_health_insurance_cover integer default 0,
  total_term_life_cover integer default 0,
  corporate_health_cover integer default 0,
  unique(user_id)
);

-- 5. ASSETS PORTFOLIO
create table if not exists public.assets_portfolio (
  asset_id text primary key,
  user_id text references public.user_profiles(user_id) on delete cascade,
  asset_name text not null,
  ticker text default 'NONE',
  category text not null,
  current_market_value integer default 0,
  monthly_sip integer default 0,
  liquidity_status text default 'Medium',
  linked_goal_id text,
  last_nav_update timestamptz default now()
);

-- 6. LIABILITIES & DEBT
create table if not exists public.liabilities_debt (
  debt_id text primary key,
  user_id text references public.user_profiles(user_id) on delete cascade,
  loan_type text not null,
  outstanding_amount integer default 0,
  interest_rate numeric(5,2) default 0,
  emi_amount integer default 0,
  remaining_tenure_months integer default 0,
  is_tax_deductible boolean default false
);

-- 7. FINANCIAL GOALS
create table if not exists public.financial_goals (
  goal_id text primary key,
  user_id text references public.user_profiles(user_id) on delete cascade,
  goal_name text not null,
  target_amount integer default 0,
  target_year integer,
  priority text default 'Medium',
  status text default 'Not Started'
);

-- 8. SYSTEM STATE
create table if not exists public.system_state (
  id bigint generated always as identity primary key,
  user_id text references public.user_profiles(user_id) on delete cascade,
  overall_health_score integer,
  dim_emergency_fund integer,
  dim_insurance_coverage integer,
  dim_investment_diversification integer,
  dim_debt_health integer,
  dim_tax_efficiency integer,
  dim_retirement_readiness integer,
  health_last_calculated timestamptz,
  active_path_selected text,
  projected_fire_date text,
  available_paths text[] default '{"Safety First","Balanced","Aggressive"}',
  last_run_simulation text,
  unique(user_id)
);

-- 9. EVENT LEDGER
create table if not exists public.event_ledger (
  event_id text primary key,
  user_id text references public.user_profiles(user_id) on delete cascade,
  event_type text not null,
  event_timestamp timestamptz default now(),
  impact_summary text
);


-- ============================================================
-- SEED DATA — User 1 (usr_wewin_001)
-- ============================================================

insert into public.user_profiles (user_id, onboarding_date, last_sync_timestamp, current_age, target_retirement_age, dependents, risk_appetite_score, employment_type, industry_sector, tax_regime)
values ('usr_wewin_001', '2024-01-15T08:00:00Z', '2024-10-24T10:00:00Z', 28, 45, 2, 8, 'Salaried', 'IT Services', 'New');

insert into public.income_cashflow (user_id, monthly_net_take_home, monthly_base_pay, monthly_variable_pay, monthly_mandatory_living_expenses, monthly_discretionary_spend, monthly_epf_nps_contribution, total_monthly_emi, total_active_monthly_sips)
values ('usr_wewin_001', 120000, 100000, 20000, 40000, 15000, 7500, 25000, 20000);

insert into public.tax_profiles (user_id, section_80c_utilized, section_80d_utilized, section_24b_utilized)
values ('usr_wewin_001', 150000, 25000, 200000);

insert into public.insurance_protection (user_id, total_health_insurance_cover, total_term_life_cover, corporate_health_cover)
values ('usr_wewin_001', 500000, 0, 300000);

insert into public.assets_portfolio (asset_id, user_id, asset_name, ticker, category, current_market_value, monthly_sip, liquidity_status, linked_goal_id, last_nav_update) values
('ast_101', 'usr_wewin_001', 'Nifty 50 Index Fund', '^NSEI', 'Equity', 200000, 10000, 'High', 'g_03', '2024-10-23T15:30:00Z'),
('ast_102', 'usr_wewin_001', 'Physical Gold', 'GOLD', 'Commodity', 50000, 0, 'Medium', null, '2024-10-23T15:30:00Z'),
('ast_103', 'usr_wewin_001', 'HDFC Fixed Deposit', 'NONE', 'Debt', 100000, 0, 'Low', 'g_01', '2024-10-23T00:00:00Z');

insert into public.liabilities_debt (debt_id, user_id, loan_type, outstanding_amount, interest_rate, emi_amount, remaining_tenure_months, is_tax_deductible)
values ('dbt_101', 'usr_wewin_001', 'Education Loan', 1500000, 9.5, 25000, 72, true);

insert into public.financial_goals (goal_id, user_id, goal_name, target_amount, target_year, priority, status) values
('g_01', 'usr_wewin_001', 'Emergency Fund', 300000, 2024, 'Critical', 'In Progress'),
('g_02', 'usr_wewin_001', 'House Downpayment', 1500000, 2028, 'High', 'Not Started'),
('g_03', 'usr_wewin_001', 'FIRE Retirement', 30000000, 2040, 'Medium', 'In Progress');

insert into public.system_state (user_id, overall_health_score, dim_emergency_fund, dim_insurance_coverage, dim_investment_diversification, dim_debt_health, dim_tax_efficiency, dim_retirement_readiness, health_last_calculated, active_path_selected, projected_fire_date, last_run_simulation)
values ('usr_wewin_001', 72, 60, 40, 70, 55, 90, 75, '2024-10-24T10:00:00Z', 'Balanced', '2042-05-01', 'market_crash_-20%');

insert into public.event_ledger (event_id, user_id, event_type, event_timestamp, impact_summary)
values ('evt_101', 'usr_wewin_001', 'promotion', '2024-09-15T09:00:00Z', 'Base pay increased by 15%. Redirected to FIRE goal.');


-- ============================================================
-- SEED DATA — User 2 (usr_wewin_002)
-- ============================================================

insert into public.user_profiles (user_id, onboarding_date, last_sync_timestamp, current_age, target_retirement_age, dependents, risk_appetite_score, employment_type, industry_sector, tax_regime)
values ('usr_wewin_002', '2024-03-10T11:00:00Z', '2024-10-24T10:00:00Z', 32, 55, 0, 9, 'Self-Employed/Freelance', 'Creative & Design', 'Old');

insert into public.income_cashflow (user_id, monthly_net_take_home, monthly_base_pay, monthly_variable_pay, monthly_mandatory_living_expenses, monthly_discretionary_spend, monthly_epf_nps_contribution, total_monthly_emi, total_active_monthly_sips)
values ('usr_wewin_002', 80000, 10000, 70000, 45000, 20000, 0, 10000, 5000);

insert into public.tax_profiles (user_id, section_80c_utilized, section_80d_utilized, section_24b_utilized)
values ('usr_wewin_002', 40000, 15000, 0);

insert into public.insurance_protection (user_id, total_health_insurance_cover, total_term_life_cover, corporate_health_cover)
values ('usr_wewin_002', 300000, 0, 0);

insert into public.assets_portfolio (asset_id, user_id, asset_name, ticker, category, current_market_value, monthly_sip, liquidity_status, linked_goal_id, last_nav_update) values
('ast_201', 'usr_wewin_002', 'ICICI Savings Account', 'NONE', 'Cash', 150000, 0, 'High', 'g_201', '2024-10-24T00:00:00Z'),
('ast_202', 'usr_wewin_002', 'High-Risk Small Cap Fund', 'SMALLCAP', 'Equity', 80000, 5000, 'High', 'g_202', '2024-10-23T15:30:00Z');

insert into public.liabilities_debt (debt_id, user_id, loan_type, outstanding_amount, interest_rate, emi_amount, remaining_tenure_months, is_tax_deductible)
values ('dbt_201', 'usr_wewin_002', 'Personal Loan', 150000, 14.0, 10000, 18, false);

insert into public.financial_goals (goal_id, user_id, goal_name, target_amount, target_year, priority, status) values
('g_201', 'usr_wewin_002', 'Emergency Fund', 540000, 2024, 'Critical', 'In Progress'),
('g_202', 'usr_wewin_002', 'Setup Design Studio', 1000000, 2026, 'Medium', 'In Progress');

insert into public.system_state (user_id, overall_health_score, dim_emergency_fund, dim_insurance_coverage, dim_investment_diversification, dim_debt_health, dim_tax_efficiency, dim_retirement_readiness, health_last_calculated, active_path_selected, projected_fire_date, last_run_simulation)
values ('usr_wewin_002', 45, 27, 30, 40, 60, 30, 20, '2024-10-24T10:00:00Z', 'Safety First', null, null);

insert into public.event_ledger (event_id, user_id, event_type, event_timestamp, impact_summary)
values ('evt_201', 'usr_wewin_002', 'client_loss', '2024-08-01T14:00:00Z', 'Variable pay dropped by 40%. Path changed to Safety First.');


-- ============================================================
-- SEED DATA — User 3 (usr_wewin_003)
-- ============================================================

insert into public.user_profiles (user_id, onboarding_date, last_sync_timestamp, current_age, target_retirement_age, dependents, risk_appetite_score, employment_type, industry_sector, tax_regime)
values ('usr_wewin_003', '2024-06-20T09:15:00Z', '2024-10-24T10:00:00Z', 52, 60, 3, 3, 'Salaried', 'Public Sector / Government', 'Old');

insert into public.income_cashflow (user_id, monthly_net_take_home, monthly_base_pay, monthly_variable_pay, monthly_mandatory_living_expenses, monthly_discretionary_spend, monthly_epf_nps_contribution, total_monthly_emi, total_active_monthly_sips)
values ('usr_wewin_003', 150000, 150000, 0, 50000, 30000, 25000, 30000, 15000);

insert into public.tax_profiles (user_id, section_80c_utilized, section_80d_utilized, section_24b_utilized)
values ('usr_wewin_003', 150000, 50000, 180000);

insert into public.insurance_protection (user_id, total_health_insurance_cover, total_term_life_cover, corporate_health_cover)
values ('usr_wewin_003', 1000000, 10000000, 1000000);

insert into public.assets_portfolio (asset_id, user_id, asset_name, ticker, category, current_market_value, monthly_sip, liquidity_status, linked_goal_id, last_nav_update) values
('ast_301', 'usr_wewin_003', 'Public Provident Fund (PPF)', 'NONE', 'Debt', 2500000, 12500, 'Low', 'g_302', '2024-10-01T00:00:00Z'),
('ast_302', 'usr_wewin_003', 'SBI Bluechip Fund', 'SBIBLUE', 'Equity', 800000, 2500, 'Medium', 'g_301', '2024-10-23T15:30:00Z');

insert into public.liabilities_debt (debt_id, user_id, loan_type, outstanding_amount, interest_rate, emi_amount, remaining_tenure_months, is_tax_deductible)
values ('dbt_301', 'usr_wewin_003', 'Home Loan', 800000, 8.5, 30000, 32, true);

insert into public.financial_goals (goal_id, user_id, goal_name, target_amount, target_year, priority, status) values
('g_301', 'usr_wewin_003', 'Daughter''s Education', 2000000, 2027, 'Critical', 'In Progress'),
('g_302', 'usr_wewin_003', 'Retirement Corpus', 15000000, 2032, 'High', 'In Progress');

insert into public.system_state (user_id, overall_health_score, dim_emergency_fund, dim_insurance_coverage, dim_investment_diversification, dim_debt_health, dim_tax_efficiency, dim_retirement_readiness, health_last_calculated, active_path_selected, projected_fire_date, last_run_simulation)
values ('usr_wewin_003', 85, 90, 95, 50, 80, 95, 88, '2024-10-24T10:00:00Z', 'Safety First', '2032-01-01', null);


-- ============================================================
-- ROW LEVEL SECURITY (optional but recommended)
-- ============================================================
-- Enable RLS on all tables so only authenticated users can access their own data.
-- For now we keep it simple: allow all authenticated reads/writes.

alter table public.user_profiles enable row level security;
alter table public.income_cashflow enable row level security;
alter table public.tax_profiles enable row level security;
alter table public.insurance_protection enable row level security;
alter table public.assets_portfolio enable row level security;
alter table public.liabilities_debt enable row level security;
alter table public.financial_goals enable row level security;
alter table public.system_state enable row level security;
alter table public.event_ledger enable row level security;

-- Allow all operations for authenticated users (simple policy)
create policy "Allow all for authenticated" on public.user_profiles for all using (true) with check (true);
create policy "Allow all for authenticated" on public.income_cashflow for all using (true) with check (true);
create policy "Allow all for authenticated" on public.tax_profiles for all using (true) with check (true);
create policy "Allow all for authenticated" on public.insurance_protection for all using (true) with check (true);
create policy "Allow all for authenticated" on public.assets_portfolio for all using (true) with check (true);
create policy "Allow all for authenticated" on public.liabilities_debt for all using (true) with check (true);
create policy "Allow all for authenticated" on public.financial_goals for all using (true) with check (true);
create policy "Allow all for authenticated" on public.system_state for all using (true) with check (true);
create policy "Allow all for authenticated" on public.event_ledger for all using (true) with check (true);

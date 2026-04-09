/**
 * ============================================================================
 *   PATH PLANNING ENGINE — We Win | AI Financial Advisor
 *   Pure-function calculation engine for 3 investment path strategies.
 *
 *   Computes:
 *     1. Monthly investable surplus
 *     2. Goal allocations per path (Safety / Balanced / Aggressive)
 *     3. Glide path asset mix (equity → debt transition over time)
 *     4. Monte Carlo success rates (1,000 simulations per goal per path)
 *     5. Projected retirement age per path
 * ============================================================================
 */

import type { UserData, GoalItem } from '../data';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GoalBucket {
  goal_id: string;
  goal_name: string;
  target_amount: number;
  target_year: number;
  priority: string;
  years_to_goal: number;
  monthly_allocation: number;
  success_rate: number; // 0-100
}

export interface GlidePathPoint {
  year: number;
  equity: number; // percentage
  debt: number;   // percentage
}

export interface TimelineTask {
  task: string;
  reason: string;
}

export interface TimelinePhase {
  phase: string;
  title: string;
  subtitle: string;
  emoji: string;
  tasks: TimelineTask[];
}

export interface PathResult {
  id: string;
  name: string;
  risk: string;
  philosophy: string;
  accentColor: string;
  avgReturn: number;         // expected annual return %
  monthlySipNeeded: number;
  retirementAge: number;
  goalBuckets: GoalBucket[];
  glidePath: GlidePathPoint[];
  keyActions: string[];
  tradeoffs: string[];
  executionChecklist: string[];
  xai_explanations: {
    allocation_logic: string;
    monte_carlo_meaning: string;
    glide_path_reasoning: string;
  };
  monthly_timeline: TimelinePhase[];
}

export interface PathPlanningResult {
  monthlySurplus: number;
  totalGoals: number;
  earliestRetirementAge: number;
  currentAge: number;
  paths: PathResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PATH CONFIGURATIONS
// ─────────────────────────────────────────────────────────────────────────────

interface PathConfig {
  id: string;
  name: string;
  risk: string;
  philosophy: string;
  accentColor: string;
  returnRange: [number, number]; // [min, max] annual return %
  avgReturn: number;
  priorityWeights: Record<string, number>; // Critical, High, Medium, Low
}

const PATH_CONFIGS: PathConfig[] = [
  {
    id: 'safety',
    name: 'Safety First',
    risk: 'LOW',
    philosophy: 'Protect what you have, grow slowly. Prioiritises emergency fund + insurance first.',
    accentColor: '#22C55E',
    returnRange: [6, 9], // Very tight variance, higher certainty
    avgReturn: 7.5,
    priorityWeights: { Critical: 0.60, High: 0.25, Medium: 0.15, Low: 0.00 },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    risk: 'MEDIUM',
    philosophy: 'Optimise across all goals equally. Standard rebalancing, realistic for average user.',
    accentColor: '#0EA5E9',
    returnRange: [-2, 22], // Moderate variance
    avgReturn: 10,
    priorityWeights: { Critical: 0.34, High: 0.33, Medium: 0.33, Low: 0.00 },
  },
  {
    id: 'aggressive',
    name: 'Aggressive Growth',
    risk: 'HIGH',
    philosophy: 'Maximise corpus, accept volatility (okay seeing -20% some years). Retirement gets max allocation.',
    accentColor: '#F97316',
    returnRange: [-20, 45], // High expected return, extreme variance
    avgReturn: 12.5,
    priorityWeights: { Critical: 0.10, High: 0.20, Medium: 0.55, Low: 0.15 },
  },
];

const KEY_ACTIONS: Record<string, string[]> = {
  safety: [
    'Build 6-month emergency fund before anything else',
    'Get ₹1 Crore term life cover immediately',
    'Start debt-heavy SIPs (PPF, RBI bonds, short-term debt funds)',
    'Review and rebalance every 6 months',
  ],
  balanced: [
    'Split SIP 60:40 between equity index funds and debt funds',
    'Close high-interest personal loans within 12 months',
    'Claim all available tax deductions (80C, 80D, NPS)',
    'Auto-step-up SIPs by 10% every year',
  ],
  aggressive: [
    'Max out 80C + NPS contributions immediately',
    'Shift 80% of portfolio to diversified equity and small-cap funds',
    'Prepay low-interest debt only after equity allocation is maxed',
    'Review portfolio every quarter — stay the course on dips',
  ],
};

const TRADEOFFS: Record<string, string[]> = {
  safety: [
    'Lower long-term wealth accumulation potential',
    'Retirement age will be later than growth-oriented paths',
    'May not beat inflation in extended low-rate environments',
  ],
  balanced: [
    'Moderate market exposure means some volatility in drawdowns',
    'Requires discipline to stay invested during corrections',
    'Returns can lag aggressive path in strong bull markets',
  ],
  aggressive: [
    'High short-term volatility — portfolio can drop 20-30% in crashes',
    'Short-term goals (< 5 years) have lower success probability',
    'Requires strong emotional discipline during market downturns',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

/**
 * 1. Monthly investable surplus
 */
function computeMonthlySurplus(data: UserData): number {
  const { monthly_net_take_home, monthly_mandatory_living_expenses, total_monthly_emi, total_active_monthly_sips } =
    data.income_and_cashflow;
  const surplus = monthly_net_take_home - monthly_mandatory_living_expenses - total_monthly_emi - total_active_monthly_sips;
  return Math.max(0, surplus);
}

/**
 * 2. Years to each goal
 */
function yearsToGoal(goal: GoalItem): number {
  return Math.max(1, goal.target_year - CURRENT_YEAR);
}

/**
 * 3. Monthly allocation per goal per path
 *    Distributes the monthly surplus based on priority weights defined per path.
 */
function computeGoalAllocations(
  goals: GoalItem[],
  surplus: number,
  config: PathConfig
): { goal: GoalItem; allocation: number }[] {
  if (goals.length === 0) return [];

  // Sum of priority weights for present goals
  let totalWeight = 0;
  const goalWeights: { goal: GoalItem; weight: number }[] = [];

  for (const goal of goals) {
    const w = config.priorityWeights[goal.priority] || config.priorityWeights['Medium'] || 0.25;
    goalWeights.push({ goal, weight: w });
    totalWeight += w;
  }

  // Normalise and distribute surplus
  return goalWeights.map(({ goal, weight }) => ({
    goal,
    allocation: totalWeight > 0 ? Math.round((weight / totalWeight) * surplus) : Math.round(surplus / goals.length),
  }));
}

/**
 * 4. Glide path asset mix
 *    Starts based on years-to-longest-goal and transitions to debt by final year.
 *    Equity allocation is strictly capped based on the path philosophy.
 */
function computeGlidePath(goals: GoalItem[], config: PathConfig): GlidePathPoint[] {
  const maxYears = goals.length > 0 ? Math.max(...goals.map(yearsToGoal)) : 20;
  const horizonYears = Math.max(5, Math.min(maxYears, 30));

  let startEquity: number;
  let endEquity: number;

  if (config.id === 'aggressive') {
    startEquity = horizonYears > 10 ? 90 : (horizonYears >= 5 ? 75 : 50);
    endEquity = 30; // Stays slightly aggressive even near end
  } else if (config.id === 'balanced') {
    startEquity = horizonYears > 10 ? 70 : (horizonYears >= 5 ? 50 : 30);
    endEquity = 15;
  } else {
    // Safety
    startEquity = horizonYears > 10 ? 40 : (horizonYears >= 5 ? 25 : 10);
    endEquity = 0; // 100% debt at the end
  }

  const points: GlidePathPoint[] = [];
  for (let y = 1; y <= horizonYears; y++) {
    const progress = (y - 1) / (horizonYears - 1 || 1);
    const equity = Math.round(startEquity - (startEquity - endEquity) * progress);
    points.push({ year: y, equity: Math.max(0, equity), debt: 100 - Math.max(0, equity) });
  }

  return points;
}

/**
 * 5. Monte Carlo success rate (simplified)
 *    Runs 1,000 iterations with random annual returns within the path's range.
 *    Compounds monthly allocation for `years` years.
 *    Counts how many iterations reach the target amount.
 */
function runMonteCarlo(
  monthlyAllocation: number,
  targetAmount: number,
  years: number,
  returnRange: [number, number]
): number {
  const ITERATIONS = 1000;
  const months = years * 12;
  let hits = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    let corpus = 0;
    for (let m = 0; m < months; m++) {
      // Random annual return → monthly return
      const annualReturn = returnRange[0] + Math.random() * (returnRange[1] - returnRange[0]);
      const monthlyReturn = annualReturn / 100 / 12;
      corpus = (corpus + monthlyAllocation) * (1 + monthlyReturn);
    }
    if (corpus >= targetAmount) hits++;
  }

  return Math.round((hits / ITERATIONS) * 100);
}

/**
 * 6. Projected retirement age
 *    Finds retirement goal and calculates how many years of compounding are needed
 *    at the path's average return to reach the target, then adds to current age.
 */
function computeRetirementAge(
  data: UserData,
  goals: GoalItem[],
  monthlySip: number,
  avgAnnualReturn: number
): number {
  // Find retirement goal
  const retirementGoal = goals.find(
    (g) =>
      g.goal_name.toLowerCase().includes('retire') ||
      g.goal_name.toLowerCase().includes('fire') ||
      g.goal_name.toLowerCase().includes('corpus')
  );

  if (!retirementGoal || monthlySip <= 0) {
    return data.personal_profile.target_retirement_age || 60;
  }

  const target = retirementGoal.target_amount;
  const monthlyReturn = avgAnnualReturn / 100 / 12;

  // Find years needed via FV of annuity formula iteration
  let corpus = 0;
  let months = 0;
  const maxMonths = 50 * 12; // cap at 50 years

  while (corpus < target && months < maxMonths) {
    corpus = (corpus + monthlySip) * (1 + monthlyReturn);
    months++;
  }

  const yearsNeeded = Math.ceil(months / 12);
  return data.personal_profile.current_age + yearsNeeded;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export function computeAllPaths(data: UserData): PathPlanningResult {
  const surplus = computeMonthlySurplus(data);
  const goals = data.financial_goals;

  const pathResults: PathResult[] = PATH_CONFIGS.map((config) => {
    // Allocate surplus across goals
    const allocations = computeGoalAllocations(goals, surplus, config);

    // Compute goal buckets with Monte Carlo
    const goalBuckets: GoalBucket[] = allocations.map(({ goal, allocation }) => {
      const years = yearsToGoal(goal);
      const successRate = runMonteCarlo(allocation, goal.target_amount, years, config.returnRange);

      return {
        goal_id: goal.goal_id,
        goal_name: goal.goal_name,
        target_amount: goal.target_amount,
        target_year: goal.target_year,
        priority: goal.priority,
        years_to_goal: years,
        monthly_allocation: allocation,
        success_rate: successRate,
      };
    });

    // Glide path
    const glidePath = computeGlidePath(goals, config);

    // Total monthly SIP needed (equals surplus since we use all of it)
    const monthlySipNeeded = surplus;

    // Retirement age
    const retirementAge = computeRetirementAge(data, goals, monthlySipNeeded, config.avgReturn);

    // Generate the execution checklist dynamically based on allocations
    const executionChecklist: string[] = [];
    if (surplus > 0) {
       allocations.forEach(({ goal, allocation }) => {
          if (allocation > 0) {
             const lowerName = goal.goal_name.toLowerCase();
             if (lowerName.includes('emergency')) {
                executionChecklist.push(`Set up auto-debit of ₹${allocation.toLocaleString('en-IN')} to a liquid fund or Recurring Deposit for your Emergency Fund.`);
             } else if (lowerName.includes('retire') || lowerName.includes('fire') || config.id === 'aggressive') {
                executionChecklist.push(`Invest ₹${allocation.toLocaleString('en-IN')} via monthly SIP into a low-cost, diversified Equity Index Fund for "${goal.goal_name}".`);
             } else {
                executionChecklist.push(`Allocate ₹${allocation.toLocaleString('en-IN')} monthly into a moderate-risk balanced fund for "${goal.goal_name}".`);
             }
          }
       });
       if (config.id === 'balanced' || config.id === 'safety') {
          executionChecklist.push('Review this allocation every 6 months to ensure you remain on track to reach your goals.');
       }
    } else {
       executionChecklist.push('Your monthly surplus is currently ₹0. Focus on reducing discretionary spending or pausing non-critical SIPs this month.');
    }

    // XAI Explanations
    const xai_explanations = {
      allocation_logic: config.id === 'safety' 
        ? "Because you chose 'Safety First', we mathematically forced the system to heavily fund your Critical goals (like Emergency Funds) before everything else. It ignores long-term growth until you are fully protected."
        : config.id === 'balanced'
        ? "Because you chose 'Balanced', the system split your surplus evenly across all your goals. It tries to make sure you progress towards everything simultaneously."
        : "Because you chose 'Aggressive Growth', we mathematically skewed your money towards your longest-term wealth goals. We accept that short-term goals might miss their targets slightly in exchange for massive long-term compounding.",
      monte_carlo_meaning: "We just generated 1,000 alternate futures mimicking the actual stock market's random ups and downs. The success percentage you see is exactly how many of those 1,000 times you hit your target amount. It's a real-world stress test, not a magical promise.",
      glide_path_reasoning: config.id === 'safety'
        ? "This chart shows how we protect your money. You never go above 40% in risky stocks, and as the deadline approaches, we drag that down to 0% so a market crash can't wipe you out."
        : "This chart shows your auto-pilot landing plan. We start you with high-growth stocks, but as you approach your deadline, we automatically shift your money into safe bonds to lock in your gains.",
    };

    // ── Monthwise Timeline (hyper-specific, zero jargon) ──
    const fmtINR = (n: number) => `\u20B9${n.toLocaleString('en-IN')}`;
    const totalDebt = data.liabilities_and_debt.reduce((s, d) => s + d.outstanding_amount, 0);
    const highInterestDebt = data.liabilities_and_debt.filter(d => d.interest_rate > 10);
    const hasLifeInsurance = data.insurance_and_protection.total_term_life_cover > 0;
    const hasHealthInsurance = data.insurance_and_protection.total_health_insurance_cover >= 500000;
    const currentAge = data.personal_profile.current_age;

    // ────── MONTH 1 ──────
    const month1Tasks: TimelineTask[] = [];
    if (surplus > 0) {
      // Step 1: Bank account setup
      month1Tasks.push({
        task: `Open a zero-balance savings account on Kuvera, Groww, or Coin by Zerodha. Link your primary bank account (auto-debit mandate) so ${fmtINR(surplus)} is auto-deducted on the 5th of every month.`,
        reason: 'Choosing the 5th ensures your salary (usually credited on the 1st) has cleared. These platforms are free, SEBI-regulated, and let you start/stop SIPs in 2 clicks.',
      });

      // Step 2+: One task per goal with exact instrument, fund name, split
      allocations.forEach(({ goal, allocation }) => {
        if (allocation <= 0) return;
        const ln = goal.goal_name.toLowerCase();
        const yrs = yearsToGoal(goal);

        if (ln.includes('emergency')) {
          month1Tasks.push({
            task: `Emergency Fund SIP — ${fmtINR(allocation)}/month → Parag Parikh Liquid Fund (Direct-Growth). Set SIP date: 5th of every month. Goal: Build ${fmtINR(goal.target_amount)} in ${yrs} year${yrs > 1 ? 's' : ''}.`,
            reason: `Liquid funds return 6-7% p.a. (vs 3.5% in a savings account) and you can withdraw to your bank in under 24 hours. "Direct-Growth" means no middleman fees and your gains automatically reinvest.`,
          });
        } else if (ln.includes('retire') || ln.includes('fire') || ln.includes('corpus')) {
          if (config.id === 'aggressive') {
            const idx60 = Math.round(allocation * 0.6);
            const sc40 = allocation - idx60;
            month1Tasks.push({
              task: `Retirement SIP — ${fmtINR(allocation)}/month split into 2 SIPs:\n• ${fmtINR(idx60)}/month → UTI Nifty 50 Index Fund (Direct-Growth) — large-cap equity\n• ${fmtINR(sc40)}/month → Nippon India Small Cap Fund (Direct-Growth) — small-cap equity\nSIP date: 5th of every month. Target: ${fmtINR(goal.target_amount)} in ${yrs} years.`,
              reason: `60% in Nifty 50 gives you the stability of India's top 50 companies (TCS, Reliance, HDFC). 40% in small-cap gives explosive 15-18% growth potential over ${yrs} years. The risk is worth it because you won't touch this money for over a decade.`,
            });
          } else if (config.id === 'balanced') {
            const eq60 = Math.round(allocation * 0.6);
            const db40 = allocation - eq60;
            month1Tasks.push({
              task: `Retirement SIP — ${fmtINR(allocation)}/month split into 2 SIPs:\n• ${fmtINR(eq60)}/month → UTI Nifty 50 Index Fund (Direct-Growth) — equity\n• ${fmtINR(db40)}/month → HDFC Short-Term Debt Fund (Direct-Growth) — debt\nSIP date: 5th of every month. Target: ${fmtINR(goal.target_amount)} in ${yrs} years.`,
              reason: `The 60:40 equity-to-debt split means if the stock market drops 30%, only 60% of this SIP is affected, and the debt portion keeps earning a steady 7%. This balance is ideal for a ${yrs}-year horizon.`,
            });
          } else {
            month1Tasks.push({
              task: `Retirement SIP — ${fmtINR(allocation)}/month → ICICI Pru Balanced Advantage Fund (Direct-Growth). SIP date: 5th. Target: ${fmtINR(goal.target_amount)} in ${yrs} years.`,
              reason: `A Balanced Advantage Fund automatically shifts money between stocks and bonds based on market conditions. When markets crash, it buys more stocks cheap. When markets are overvalued, it moves to bonds. You don't need to do anything — the fund manager handles the risk for you.`,
            });
          }
        } else if (ln.includes('house') || ln.includes('downpayment') || ln.includes('down payment')) {
          month1Tasks.push({
            task: `House Goal SIP — ${fmtINR(allocation)}/month → HDFC Short-Term Debt Fund (Direct-Growth). SIP date: 5th. Target: ${fmtINR(goal.target_amount)} by ${goal.target_year} (${yrs} years).`,
            reason: `With only ${yrs} years to your house goal, stocks are too risky — a single 20% crash could wipe out 2 years of savings. Short-term debt funds give reliable 7-8% with near-zero chance of loss. Your principal stays intact.`,
          });
        } else if (ln.includes('education') || ln.includes('child') || ln.includes('college')) {
          const fundChoice = yrs > 5
            ? `Mirae Asset Large Cap Fund (Direct-Growth) — equity`
            : `SBI Magnum Medium Duration Fund (Direct-Growth) — debt`;
          month1Tasks.push({
            task: `Education Goal SIP — ${fmtINR(allocation)}/month → ${fundChoice}. SIP date: 5th. Target: ${fmtINR(goal.target_amount)} by ${goal.target_year} (${yrs} years).`,
            reason: yrs > 5
              ? `With ${yrs} years, equity is appropriate — large-cap funds have delivered 12%+ over 7-year periods historically. Education costs inflate at 10% p.a., so you need equity returns to keep up.`
              : `Only ${yrs} years left, so we use a medium-duration debt fund to protect the corpus. You cannot afford a market crash this close to the deadline.`,
          });
        } else {
          const fundChoice = yrs > 7
            ? `Parag Parikh Flexi Cap Fund (Direct-Growth)` 
            : yrs > 3 
              ? `HDFC Balanced Advantage Fund (Direct-Growth)`
              : `Axis Short-Term Fund (Direct-Growth)`;
          month1Tasks.push({
            task: `"${goal.goal_name}" SIP — ${fmtINR(allocation)}/month → ${fundChoice}. SIP date: 5th. Target: ${fmtINR(goal.target_amount)} by ${goal.target_year} (${yrs} years).`,
            reason: `Fund was chosen based on your ${yrs}-year timeline. Longer timelines (7+ years) → equity for growth. Medium timelines (3-7 years) → balanced funds. Short timelines (< 3 years) → debt funds for safety.`,
          });
        }
      });

      // Insurance tasks (if missing, for all paths)
      if (!hasLifeInsurance && data.personal_profile.dependents > 0) {
        month1Tasks.push({
          task: `Buy a Term Life Insurance policy of at least ${fmtINR(data.income_and_cashflow.monthly_net_take_home * 12 * 10)} (10× annual income) from HDFC Life or ICICI Pru Life. Apply online → costs ${fmtINR(Math.round(800 + currentAge * 15))}/month approx at age ${currentAge}.`,
          reason: `You have ${data.personal_profile.dependents} dependent(s) and ZERO life cover. If the worst happens, your family gets nothing. Term insurance pays a lump sum to your family — this is non-negotiable.`,
        });
      }
      if (!hasHealthInsurance) {
        month1Tasks.push({
          task: `Buy a \u20B910 Lakh family floater Health Insurance from Star Health or HDFC Ergo. Premium: ~${fmtINR(Math.round(8000 + currentAge * 200))}/year.`,
          reason: `One hospital stay can cost \u20B93-5 lakhs. Without health cover, you'll drain your emergency fund and investments. A \u20B910L cover protects your entire family.`,
        });
      }

      // Debt acceleration task
      if (highInterestDebt.length > 0) {
        const worst = highInterestDebt.sort((a, b) => b.interest_rate - a.interest_rate)[0];
        month1Tasks.push({
          task: `Accelerate your ${worst.loan_type} repayment (${worst.interest_rate}% interest, ${fmtINR(worst.outstanding_amount)} outstanding). Pay ${fmtINR(Math.round(worst.emi_amount * 1.2))}/month instead of ${fmtINR(worst.emi_amount)} — the extra ${fmtINR(Math.round(worst.emi_amount * 0.2))} goes directly to principal.`,
          reason: `At ${worst.interest_rate}% interest, this loan costs you ${fmtINR(Math.round(worst.outstanding_amount * worst.interest_rate / 100))}/year in interest alone. Paying 20% extra each month cuts the tenure by ~30% and saves you lakhs in interest.`,
        });
      }
    } else {
      month1Tasks.push({
        task: 'Your surplus is \u20B90. List ALL subscriptions, food delivery, and discretionary spends from last 3 months. Target cutting \u20B95,000-10,000.',
        reason: 'Even \u20B95,000/month invested for 20 years at 12% becomes \u20B950+ lakhs. Every rupee counts when compounding works for decades.',
      });
    }

    // ────── MONTH 2 ──────
    const month2Tasks: TimelineTask[] = [
      {
        task: 'Log in to your investment platform (Groww / Kuvera / Coin). Verify ALL SIPs from Month 1 have a status of "Active" and the first installment was debited.',
        reason: 'SIPs can silently fail due to: wrong bank account linked, insufficient mandate limit, or bank rejecting the auto-debit. If even one SIP missed Month 1, you already lost one month of compounding.',
      },
      {
        task: 'Create a tracking sheet with columns: Goal Name | Fund Name | Monthly SIP ₹ | Cumulative Invested | Current Value. Update this on the 1st of every month.',
        reason: 'This takes 5 minutes/month and gives you complete clarity on where every rupee is going. It also prevents "financial amnesia" — forgetting what you invested in and why.',
      },
    ];
    if (totalDebt > 0) {
      month2Tasks.push({
        task: `Check your total outstanding debt: ${fmtINR(totalDebt)} across ${data.liabilities_and_debt.length} loan(s). Verify none of them have increased (sometimes missed EMIs get added to principal).`,
        reason: 'A missed EMI doesn\'t just attract a penalty — the unpaid amount gets added to your principal and starts earning interest on itself. Catching this in Month 2 prevents a debt spiral.',
      });
    }

    // ────── MONTHS 3-6 ──────
    const months3to6Tasks: TimelineTask[] = [];
    // A specific reminder per goal about what to expect
    allocations.forEach(({ goal, allocation }) => {
      if (allocation <= 0) return;
      const ln = goal.goal_name.toLowerCase();
      if (ln.includes('emergency')) {
        months3to6Tasks.push({
          task: `By Month 3, your Emergency Fund should have ~${fmtINR(allocation * 3)} invested. Do NOT withdraw this unless there is a genuine emergency (job loss, medical crisis).`,
          reason: 'The urge to "borrow from the emergency fund" is the #1 reason emergency funds fail. Treat this as untouchable money — it only exists for genuine crises.',
        });
      }
    });
    months3to6Tasks.push({
      task: config.id === 'aggressive'
        ? 'Your equity funds WILL show negative returns some months. When your portfolio shows -10% or -15%, do absolutely nothing. Your SIP is automatically buying more units at a cheaper price.'
        : 'Your portfolio may show small gains or small losses month-to-month. This is totally normal. Do not stop or modify any SIP during this period.',
      reason: config.id === 'aggressive'
        ? 'Historical data: Nifty 50 has dropped 30%+ six times in 20 years but has ALWAYS recovered and gone higher. Every crash is a discount sale for your SIP. The moment you stop buying during a crash, you lock in the loss.'
        : 'SIPs use "rupee cost averaging" — when the market drops, your fixed ₹ amount buys MORE units. When the market rises, those extra units multiply your gains. Stopping the SIP during a dip defeats the purpose.',
    });
    if (surplus > 0) {
      months3to6Tasks.push({
        task: `If you receive a bonus or gift money, invest 50% as a lump sum into your longest-term goal's fund. Use the "Additional Purchase" option in your platform. Keep the other 50% for yourself.`,
        reason: 'A one-time \u20B950,000 lump sum invested today at 12% becomes \u20B94.8 lakhs in 20 years. But if you spend it, it\'s gone forever. The 50-50 rule keeps you happy AND wealthy.',
      });
    }

    // ────── MONTH 6 ──────
    const month6Tasks: TimelineTask[] = [
      {
        task: 'Open your tracking sheet. For each SIP, compare: "Monthly SIP target from Month 1" vs "Actual total invested so far". If any SIP is short by more than 1 installment, top up immediately.',
        reason: 'Missing even 2 SIP installments on a \u20B910,000 SIP means \u20B920,000 less invested. Over 15 years at 12%, those missed \u20B920,000 would have become \u20B91.8 lakhs. Small misses compound into big losses.',
      },
      {
        task: 'Come back to this Path Planner and click "Re-run Analysis". Compare your new success rates against Month 1. If any goal dropped below 70%, consider increasing that SIP by 10-15%.',
        reason: 'Market conditions and your spending may have changed. The system re-runs 1,000 fresh simulations with current data. A drop in success rate is an early warning signal to act before it\'s too late.',
      },
    ];
    if (config.id !== 'safety') {
      month6Tasks.push({
        task: 'Check your equity fund returns on Value Research Online (valueresearchonline.com). Compare your fund\'s 6-month return vs its benchmark index. If it underperformed by more than 3%, switch to UTI Nifty 50 Index Fund.',
        reason: 'You\'re paying the fund manager to beat the market. If they can\'t even match it, an index fund does the same job at 1/10th the cost (0.1% expense ratio vs 1-1.5% for active funds).',
      });
    }
    // Glide path check for long horizons
    const longestGoalYrs = goals.length > 0 ? Math.max(...goals.map(yearsToGoal)) : 0;
    if (longestGoalYrs > 10) {
      month6Tasks.push({
        task: `Your current equity-to-debt ratio should be roughly ${glidePath.length > 0 ? glidePath[0].equity : 70}:${glidePath.length > 0 ? glidePath[0].debt : 30} (Equity:Debt). Check this on your platform's portfolio summary page.`,
        reason: 'This ratio was calculated by the glide path engine based on your time horizon. If equity drifted above the target (because stocks went up), you\'re taking more risk than planned.',
      });
    }

    // ────── MONTH 9 ──────
    const month9Tasks: TimelineTask[] = [
      {
        task: `Tax check: Your 80C usage is ${fmtINR(data.tax_profile.section_80c_utilized)} out of \u20B91,50,000 limit. Gap = ${fmtINR(Math.max(0, 150000 - data.tax_profile.section_80c_utilized))}. If there's a gap, invest it in ELSS (Mirae Asset Tax Saver Fund — 3-year lock-in, ~12% returns).`,
        reason: 'ELSS has the shortest lock-in (3 years) among all 80C options. \u20B91,50,000 invested in 80C saves you \u20B946,800 in tax (at 31.2% slab). That\'s an instant 31% return before the fund even grows.',
      },
    ];
    if (data.income_and_cashflow.monthly_epf_nps_contribution === 0) {
      month9Tasks.push({
        task: `Open an NPS Tier-1 account on enps.nsdl.com. Choose the "Auto" allocation (lifecycle fund). Invest \u20B950,000 one-time. This gives you an EXTRA \u20B915,600 tax saving under Section 80CCD(1B) — above and beyond the 80C limit.`,
        reason: 'Most people don\'t know this deduction exists. It\'s \u20B950,000 × 31.2% tax slab = \u20B915,600 saved. The money grows tax-free until retirement. It\'s essentially the government paying you to save for your own retirement.',
      });
    }
    if (data.tax_profile.section_80d_utilized < 25000) {
      month9Tasks.push({
        task: `Your 80D health insurance deduction is only ${fmtINR(data.tax_profile.section_80d_utilized)} out of \u20B925,000. If you haven't bought health insurance yet (from Month 1), do it now. Premium is deductible.`,
        reason: 'Section 80D lets you deduct health insurance premiums up to \u20B925,000 (or \u20B950,000 if you\'re over 60). Not claiming this is literally leaving money on the table.',
      });
    }

    // ────── MONTH 12 ──────
    const steppedSurplus = Math.round(surplus * 1.1);
    const month12Tasks: TimelineTask[] = [
      {
        task: `Step up ALL SIPs by 10%. New total SIP: ${fmtINR(steppedSurplus)}/month (was ${fmtINR(surplus)}). Log into each fund and click "Modify SIP" → increase by the exact amounts below:`,
        reason: 'A 10% annual SIP step-up makes a MASSIVE difference. Example: \u20B920,000/month flat for 20 years at 12% = \u20B92 Cr. With 10% step-up = \u20B94.2 Cr. That\'s 2× the wealth just from small annual increases.',
      },
    ];
    // Add per-fund step-up details
    allocations.forEach(({ goal, allocation }) => {
      if (allocation <= 0) return;
      const newAmt = Math.round(allocation * 1.1);
      month12Tasks.push({
        task: `→ "${goal.goal_name}" SIP: increase from ${fmtINR(allocation)} to ${fmtINR(newAmt)}/month (+${fmtINR(newAmt - allocation)}).`,
        reason: `The extra ${fmtINR(newAmt - allocation)}/month will compound for the remaining ${Math.max(1, yearsToGoal(goal) - 1)} years. Small increases early have the biggest impact because they compound the longest.`,
      });
    });
    month12Tasks.push({
      task: 'Re-run the full Path Planner with your updated salary, expenses, and any new goals (wedding, car, second child, etc.).',
      reason: 'Your life changes every year. The planner needs your latest numbers to recalculate the Monte Carlo simulations and update your roadmap for Year 2.',
    });
    if (config.id === 'aggressive') {
      month12Tasks.push({
        task: `Rebalancing check: Open your portfolio summary. If equity is now > 85% of total portfolio value, sell enough equity to bring it back to ${glidePath.length > 1 ? glidePath[1].equity : 80}% and move the proceeds to a debt fund.`,
        reason: 'After a good year, stocks may have ballooned to 90%+ of your portfolio. That feels great but means one bad quarter could erase months of gains. Rebalancing locks in profits and resets your risk.',
      });
    }

    const monthly_timeline: TimelinePhase[] = [
      { phase: 'Month 1', title: 'Foundation & Setup', subtitle: 'Open accounts, start every SIP, and automate everything. This is the most important month.', emoji: '🚀', tasks: month1Tasks },
      { phase: 'Month 2', title: 'Verify & Track', subtitle: 'Confirm that every automated task from Month 1 is actually running. Set up your tracking system.', emoji: '✅', tasks: month2Tasks },
      { phase: 'Months 3–6', title: 'Stay the Course', subtitle: 'Your money is now on auto-pilot. Your only job is to NOT interfere — let compounding work.', emoji: '🧘', tasks: months3to6Tasks },
      { phase: 'Month 6', title: 'Mid-Year Health Check', subtitle: 'Your first major portfolio review. Compare actual vs target performance and course-correct.', emoji: '🔍', tasks: month6Tasks },
      { phase: 'Month 9', title: 'Tax Optimisation Window', subtitle: 'Maximise your tax savings before the March 31st deadline. Every rupee saved in tax is money you can invest.', emoji: '📋', tasks: month9Tasks },
      { phase: 'Month 12', title: 'Annual Review & Step-Up', subtitle: 'Increase all SIPs, rebalance if needed, and re-run the planner for Year 2.', emoji: '🎯', tasks: month12Tasks },
    ];

    return {
      id: config.id,
      name: config.name,
      risk: config.risk,
      philosophy: config.philosophy,
      accentColor: config.accentColor,
      avgReturn: config.avgReturn,
      monthlySipNeeded,
      retirementAge,
      goalBuckets,
      glidePath,
      keyActions: KEY_ACTIONS[config.id] || [],
      tradeoffs: TRADEOFFS[config.id] || [],
      executionChecklist,
      xai_explanations,
      monthly_timeline,
    };
  });

  const earliestRetirementAge = Math.min(...pathResults.map((p) => p.retirementAge));

  return {
    monthlySurplus: surplus,
    totalGoals: goals.length,
    earliestRetirementAge,
    currentAge: data.personal_profile.current_age,
    paths: pathResults,
  };
}

"""
================================================================================
  MONEY HEALTH SCORE ENGINE  —  We Win | AI Financial Advisor
  Version 2.0  (Schema-Aware + Benchmark-Accurate)
================================================================================
  Benchmarks: RBI, SEBI, IRDAI, Indian IT Act (80C / 80D / 24B).

  Architecture:
    Raw JSON  →  parse_json_to_profile()  →  calculate_money_health_score()
                                                      |
                                               MoneyHealthResult
                                            (scores + insights + LLM prompt)

  Design principles:
    - Each dimension scored 0-100 using smooth curves (no hard step-jumps).
    - Overall = weighted sum (weights sum to 1.0).
    - Bands: Poor <40 | Fair 40-59 | Good 60-79 | Excellent 80-100.

  Key schema derivations (all in parse_json_to_profile):
    monthly_expenses  = mandatory_living + discretionary_spend
    liquid_savings    = High-liq assets + 50% Medium-liq assets
    equity/debt/gold  = summed from assets_portfolio by category
    total_debt        = sum(liabilities.outstanding_amount)
    has_term_plan     = total_term_life_cover > 0
    has_nps           = monthly_epf_nps_contribution > 0
    annual_income     = (base_pay + variable_pay) x 12
================================================================================
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List
import json


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 0 — INTERNAL USER PROFILE
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class UserProfile:
    # Identity
    age: int
    retirement_age: int
    dependents: int
    risk_appetite_score: int     # 1-10
    tax_regime: str              # "New" | "Old"

    # Cash Flow
    monthly_income: float        # Net take-home
    annual_income: float         # Gross (base + variable) x 12
    monthly_expenses: float      # Mandatory living + discretionary
    monthly_sip: float
    monthly_epf_nps: float

    # Emergency Fund
    liquid_savings: float        # High-liq + 50% Medium-liq assets

    # Insurance
    life_cover: float
    health_cover: float          # Personal only — corporate GMC excluded
    corporate_health_cover: float
    has_term_plan: bool

    # Portfolio
    equity_value: float
    debt_value: float
    gold_value: float
    real_estate_value: float
    total_portfolio_value: float

    # Debt
    total_debt: float
    monthly_emi: float
    credit_card_outstanding: float
    has_tax_deductible_loan: bool

    # Tax
    declared_80c: float
    declared_80d: float
    declared_24b: float
    has_nps: bool

    # Retirement
    current_retirement_corpus: float
    monthly_retirement_savings: float


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — JSON → UserProfile PARSER
# ─────────────────────────────────────────────────────────────────────────────

def parse_json_to_profile(data: dict) -> UserProfile:
    """
    Maps the We Win stateful JSON schema to UserProfile.

    Liquid savings derivation:
        High-liquidity assets counted 100%.
        Medium-liquidity assets counted 50% (conservative haircut).
        Low-liquidity assets counted 0%.

    Retirement corpus seed:
        Equity assets linked to FIRE/retirement goal (g_03) + 12 months
        of EPF/NPS contribution as a conservative seed.
    """
    pp     = data["personal_profile"]
    cf     = data["income_and_cashflow"]
    tax    = data.get("tax_profile", {})
    ins    = data.get("insurance_and_protection", {})
    assets = data.get("assets_portfolio", [])
    liabs  = data.get("liabilities_and_debt", [])

    # Cash flow
    monthly_income   = cf["monthly_net_take_home"]
    monthly_base     = cf.get("monthly_base_pay", monthly_income)
    monthly_variable = cf.get("monthly_variable_pay", 0.0)
    annual_income    = (monthly_base + monthly_variable) * 12
    monthly_expenses = (
        cf["monthly_mandatory_living_expenses"]
        + cf.get("monthly_discretionary_spend", 0.0)
    )
    monthly_epf_nps  = cf.get("monthly_epf_nps_contribution", 0.0)
    monthly_sip      = cf.get("total_active_monthly_sips", 0.0)
    monthly_emi      = cf.get("total_monthly_emi", 0.0)

    # Asset aggregation
    equity_value = debt_value = gold_value = re_value = 0.0
    liquid_high = liquid_medium = 0.0
    retirement_equity = 0.0

    for asset in assets:
        val      = asset.get("current_market_value", 0.0)
        category = asset.get("category", "").lower()
        liq      = asset.get("liquidity_status", "Low")
        goal_id  = asset.get("linked_goal_id") or ""

        if category == "equity":
            equity_value += val
        elif category in ("debt", "cash"):
            debt_value += val
        elif category in ("commodity", "gold"):
            gold_value += val
        elif category in ("realestate", "real estate"):
            re_value += val

        if liq == "High":
            liquid_high += val
        elif liq == "Medium":
            liquid_medium += val

        # Seed retirement corpus from FIRE-linked equity
        if goal_id == "g_03" and category == "equity":
            retirement_equity += val

    liquid_savings  = liquid_high + 0.5 * liquid_medium
    total_portfolio = equity_value + debt_value + gold_value + re_value

    # Debt aggregation
    total_debt = sum(l.get("outstanding_amount", 0.0) for l in liabs)
    credit_card_outstanding = sum(
        l.get("outstanding_amount", 0.0)
        for l in liabs
        if l.get("loan_type", "").lower() in ("credit card", "cc")
    )
    has_tax_deductible_loan = any(l.get("is_tax_deductible", False) for l in liabs)

    # Retirement corpus seed
    current_retirement_corpus = retirement_equity + (monthly_epf_nps * 12)

    return UserProfile(
        age=pp["current_age"],
        retirement_age=pp["target_retirement_age"],
        dependents=pp.get("dependents", 0),
        risk_appetite_score=pp.get("risk_appetite_score", 5),
        tax_regime=pp.get("tax_regime", "New"),

        monthly_income=monthly_income,
        annual_income=annual_income,
        monthly_expenses=monthly_expenses,
        monthly_sip=monthly_sip,
        monthly_epf_nps=monthly_epf_nps,

        liquid_savings=liquid_savings,

        life_cover=ins.get("total_term_life_cover", 0.0),
        health_cover=ins.get("total_health_insurance_cover", 0.0),
        corporate_health_cover=ins.get("corporate_health_cover", 0.0),
        has_term_plan=ins.get("total_term_life_cover", 0.0) > 0,

        equity_value=equity_value,
        debt_value=debt_value,
        gold_value=gold_value,
        real_estate_value=re_value,
        total_portfolio_value=total_portfolio,

        total_debt=total_debt,
        monthly_emi=monthly_emi,
        credit_card_outstanding=credit_card_outstanding,
        has_tax_deductible_loan=has_tax_deductible_loan,

        declared_80c=tax.get("section_80c_utilized", 0.0),
        declared_80d=tax.get("section_80d_utilized", 0.0),
        declared_24b=tax.get("section_24b_utilized", 0.0),
        has_nps=monthly_epf_nps > 0,

        current_retirement_corpus=current_retirement_corpus,
        monthly_retirement_savings=monthly_epf_nps,
    )


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — RESULT DATA STRUCTURES
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class DimensionResult:
    name: str
    score: float          # 0-100
    band: str             # Poor | Fair | Good | Excellent
    weight: float
    weighted_contribution: float
    insights: List[str]
    actions: List[str]


@dataclass
class MoneyHealthResult:
    overall_score: float
    overall_band: str
    dimensions: Dict[str, DimensionResult]
    summary: str
    llm_prompt: str

    def to_dict(self) -> dict:
        return {
            "overall_score": self.overall_score,
            "overall_band": self.overall_band,
            "summary": self.summary,
            "dimensions": {
                name: {
                    "score": d.score,
                    "band": d.band,
                    "weight": d.weight,
                    "weighted_contribution": d.weighted_contribution,
                    "insights": d.insights,
                    "actions": d.actions,
                }
                for name, d in self.dimensions.items()
            },
            "llm_prompt": self.llm_prompt,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — UTILITIES
# ─────────────────────────────────────────────────────────────────────────────

def _band(score: float) -> str:
    if score >= 80:
        return "Excellent"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Fair"
    return "Poor"


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, val))


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — DIMENSION 1: EMERGENCY FUND
# RBI benchmark: 3-6 months of expenses in liquid accessible form.
# Weight: 15%
# ─────────────────────────────────────────────────────────────────────────────

def score_emergency_fund(p: UserProfile) -> DimensionResult:
    """
    Smooth scoring curve:
        >= 6 months  ->  90-100
         3-6 months  ->  60-90
         1-3 months  ->  20-60
         < 1 month   ->   0-20
    """
    monthly_need   = p.monthly_expenses
    months_covered = (p.liquid_savings / monthly_need) if monthly_need > 0 else 0.0

    if months_covered >= 6:
        score = _clamp(90 + (months_covered - 6) * 1.5, 0, 100)
    elif months_covered >= 3:
        score = 60 + (months_covered - 3) / 3 * 30
    elif months_covered >= 1:
        score = 20 + (months_covered - 1) / 2 * 40
    else:
        score = months_covered * 20

    insights = [
        f"Liquid savings cover {months_covered:.1f} months of expenses "
        f"(Rs.{p.liquid_savings:,.0f} / Rs.{monthly_need:,.0f} per month).",
        "Liquid savings = High-liquidity assets + 50% of Medium-liquidity assets.",
        "Low-liquidity assets (locked FDs, real estate) are excluded.",
        "RBI benchmark: 3 months minimum; 6 months is the gold standard.",
    ]
    actions = []
    if months_covered < 3:
        shortfall = 3 * monthly_need - p.liquid_savings
        actions.append(
            f"Build Rs.{shortfall:,.0f} more in liquid savings to reach the 3-month floor."
        )
    if months_covered < 6:
        actions.append(
            f"Target Rs.{6 * monthly_need:,.0f} total (6 months). "
            "Park in a high-yield savings account or liquid mutual fund for better returns."
        )

    return DimensionResult(
        name="Emergency Fund",
        score=round(score, 1),
        band=_band(score),
        weight=0.15,
        weighted_contribution=round(score * 0.15, 2),
        insights=insights,
        actions=actions,
    )


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — DIMENSION 2: INSURANCE COVERAGE
# IRDAI HLV: Life cover 10-15x annual income.
# IRDAI: Health cover >= Rs.5 L; Rs.10 L+ recommended.
# Weight: 20%
# ─────────────────────────────────────────────────────────────────────────────

def score_insurance(p: UserProfile) -> DimensionResult:
    """
    Life score (50% weight):
        No term plan  ->  10  (penalty)
        >= 15x income ->  100
        10x-15x       ->  70-100  (smooth)
        5x-10x        ->  40-70
        < 5x          ->  0-40
        Dependents > 0 and cover < 10x -> additional -10 penalty

    Health score (50% weight):
        >= Rs.10 L  ->  100
        Rs.5 L-10 L ->  60-100  (smooth)
        Rs.1 L-5 L  ->  0-60
        0           ->  0

    Corporate GMC is EXCLUDED (job-dependent, fragile).
    """
    annual_income = p.annual_income or 1
    cover_ratio   = p.life_cover / annual_income

    # Life score
    if not p.has_term_plan:
        life_score = 10.0
    elif cover_ratio >= 15:
        life_score = 100.0
    elif cover_ratio >= 10:
        life_score = 70 + (cover_ratio - 10) / 5 * 30
    elif cover_ratio >= 5:
        life_score = 40 + (cover_ratio - 5) / 5 * 30
    else:
        life_score = (cover_ratio / 5) * 40

    if p.dependents > 0 and cover_ratio < 10:
        life_score = max(0.0, life_score - 10)

    # Health score (personal cover only)
    if p.health_cover >= 1_000_000:
        health_score = 100.0
    elif p.health_cover >= 500_000:
        health_score = 60 + (p.health_cover - 500_000) / 500_000 * 40
    elif p.health_cover > 0:
        health_score = (p.health_cover / 500_000) * 60
    else:
        health_score = 0.0

    score = _clamp(0.5 * life_score + 0.5 * health_score, 0, 100)

    insights = [
        f"Term life cover: Rs.{p.life_cover:,.0f} = {cover_ratio:.1f}x annual income "
        f"(IRDAI benchmark: 10-15x).",
        f"Personal health cover: Rs.{p.health_cover:,.0f} (recommended: Rs.10 L+ post-COVID).",
        f"Corporate GMC: Rs.{p.corporate_health_cover:,.0f} — NOT counted in score. "
        "It lapses immediately on job change or layoff.",
        f"Term plan in place: {'Yes' if p.has_term_plan else 'No — CRITICAL GAP.'}",
        f"Dependents: {p.dependents}"
        + (
            " — higher life cover is mandatory."
            if p.dependents > 0
            else " — waives minimum life cover requirement."
        ),
    ]
    actions = []
    if not p.has_term_plan:
        actions.append(
            "Buy a pure term plan immediately. Premiums are cheapest in your 20s-30s. Avoid ULIPs."
        )
    if cover_ratio < 10:
        required = 10 * annual_income
        actions.append(
            f"Increase life cover to at least Rs.{required:,.0f} (10x income). "
            f"Gap: Rs.{required - p.life_cover:,.0f}."
        )
    if p.health_cover < 500_000:
        actions.append(
            "Get personal health cover of Rs.5 L minimum via a floater or super top-up plan."
        )
    if 500_000 <= p.health_cover < 1_000_000:
        gap = 1_000_000 - p.health_cover
        actions.append(
            f"Add a Rs.{gap:,.0f} super top-up to reach the Rs.10 L benchmark. Low cost, high value."
        )

    return DimensionResult(
        name="Insurance Coverage",
        score=round(score, 1),
        band=_band(score),
        weight=0.20,
        weighted_contribution=round(score * 0.20, 2),
        insights=insights,
        actions=actions,
    )


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6 — DIMENSION 3: INVESTMENT DIVERSIFICATION
# SEBI age-based suitability: (100 - age)% equity; 7.5% gold target.
# Weight: 20%
# ─────────────────────────────────────────────────────────────────────────────

def score_investment_diversification(p: UserProfile) -> DimensionResult:
    """
    Ideal allocation:
        Equity  = (100 - age)%  adjusted by risk_appetite_score
        Gold    = 7.5%  (+-2.5% tolerance)
        Debt    = remaining %

    Penalty = |equity_dev| x 0.5 + |debt_dev| x 0.3 + |gold_dev| x 0.2
    Score   = 100 - penalty  (clamped 0-100)
    SIP bonus: >= 20% income -> +5; >= 10% -> +2
    """
    total = p.total_portfolio_value
    if total == 0:
        return DimensionResult(
            name="Investment Diversification",
            score=0.0,
            band="Poor",
            weight=0.20,
            weighted_contribution=0.0,
            insights=["No investments recorded in the portfolio."],
            actions=[
                "Start a Rs.500/month SIP in a diversified equity index fund today.",
                "Even small amounts compounded over 15+ years build significant wealth.",
            ],
        )

    equity_pct = p.equity_value / total * 100
    debt_pct   = p.debt_value / total * 100
    gold_pct   = p.gold_value / total * 100

    base_equity_target = max(20.0, 100.0 - p.age)
    if p.risk_appetite_score >= 8:
        base_equity_target = min(90.0, base_equity_target + 5.0)
    elif p.risk_appetite_score <= 3:
        base_equity_target = max(20.0, base_equity_target - 5.0)

    ideal_equity = base_equity_target
    ideal_debt   = 100.0 - ideal_equity - 7.5
    ideal_gold   = 7.5

    equity_dev = abs(equity_pct - ideal_equity)
    debt_dev   = abs(debt_pct - ideal_debt)
    gold_dev   = max(0.0, abs(gold_pct - ideal_gold) - 2.5)

    penalty = equity_dev * 0.5 + debt_dev * 0.3 + gold_dev * 0.2
    score   = _clamp(100.0 - penalty, 0, 100)

    sip_ratio = (p.monthly_sip / p.monthly_income * 100) if p.monthly_income > 0 else 0.0
    if sip_ratio >= 20:
        score = min(100.0, score + 5)
    elif sip_ratio >= 10:
        score = min(100.0, score + 2)

    insights = [
        f"Portfolio: Equity {equity_pct:.0f}% | Debt {debt_pct:.0f}% | Gold {gold_pct:.0f}%",
        f"Age-adjusted ideal (risk score {p.risk_appetite_score}/10): "
        f"Equity ~{ideal_equity:.0f}% | Debt ~{ideal_debt:.0f}% | Gold ~{ideal_gold:.0f}%",
        f"Monthly SIP: Rs.{p.monthly_sip:,.0f} = {sip_ratio:.1f}% of take-home income.",
        f"Total invested portfolio value: Rs.{total:,.0f}.",
    ]
    actions = []
    if equity_pct < ideal_equity - 10:
        actions.append(
            f"Equity is {ideal_equity - equity_pct:.0f}% below target. "
            "Redirect new SIPs toward diversified equity or index funds."
        )
    if equity_pct > ideal_equity + 15:
        actions.append(
            "Portfolio is overweight on equity — rebalance 10-15% into debt for stability."
        )
    if gold_pct > 15:
        actions.append(
            "Gold exceeds 15% — high concentration risk. Consider trimming and moving to equity/debt."
        )
    if sip_ratio < 10:
        actions.append(
            f"SIP rate is {sip_ratio:.1f}% of income. Target 20%+ monthly (SEBI wealth-building benchmark)."
        )

    return DimensionResult(
        name="Investment Diversification",
        score=round(score, 1),
        band=_band(score),
        weight=0.20,
        weighted_contribution=round(score * 0.20, 2),
        insights=insights,
        actions=actions,
    )


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7 — DIMENSION 4: DEBT HEALTH
# RBI benchmark: EMI/income <= 40%; debt-to-asset <= 40%.
# Weight: 20%
# ─────────────────────────────────────────────────────────────────────────────

def score_debt_health(p: UserProfile) -> DimensionResult:
    """
    Three sub-scores:
        EMI ratio     (50%)
        Debt-to-asset (40%)
        CC penalty    (deducted from final)
    """
    income           = p.monthly_income or 1
    emi_ratio        = (p.monthly_emi / income) * 100
    total_assets     = p.liquid_savings + p.total_portfolio_value
    debt_asset_ratio = (p.total_debt / total_assets * 100) if total_assets > 0 else 100.0

    if emi_ratio <= 20:
        emi_score = 100.0
    elif emi_ratio <= 30:
        emi_score = 80.0
    elif emi_ratio <= 40:
        emi_score = 60.0
    elif emi_ratio <= 50:
        emi_score = 35.0
    else:
        emi_score = max(0.0, 35.0 - (emi_ratio - 50) * 2)

    if debt_asset_ratio <= 20:
        da_score = 100.0
    elif debt_asset_ratio <= 40:
        da_score = 70.0
    elif debt_asset_ratio <= 60:
        da_score = 40.0
    else:
        da_score = max(0.0, 40.0 - (debt_asset_ratio - 60))

    cc_penalty = 0.0
    if p.credit_card_outstanding > 0:
        cc_months  = p.credit_card_outstanding / income
        cc_penalty = min(20.0, cc_months * 10)

    score = _clamp(0.5 * emi_score + 0.4 * da_score - cc_penalty, 0, 100)

    insights = [
        f"EMI burden: {emi_ratio:.1f}% of take-home income (RBI safe zone: <= 40%).",
        f"Debt-to-asset ratio: {debt_asset_ratio:.1f}% (healthy: <= 40%).",
        f"Revolving credit card balance: Rs.{p.credit_card_outstanding:,.0f}.",
        f"Tax-deductible loan detected: "
        f"{'Yes — interest partially offset via 24B/80E.' if p.has_tax_deductible_loan else 'No.'}",
    ]
    actions = []
    if emi_ratio > 40:
        actions.append(
            f"EMI at {emi_ratio:.1f}% is in the danger zone. "
            "Explore prepayment or refinancing to a lower-rate lender."
        )
    if p.credit_card_outstanding > 0:
        actions.append(
            f"Clear Rs.{p.credit_card_outstanding:,.0f} CC balance immediately. "
            "CC interest (~36% p.a.) destroys wealth faster than any investment can build it."
        )
    if debt_asset_ratio > 50:
        actions.append(
            "Debt exceeds 50% of assets. Prioritize debt reduction before increasing investments."
        )

    return DimensionResult(
        name="Debt Health",
        score=round(score, 1),
        band=_band(score),
        weight=0.20,
        weighted_contribution=round(score * 0.20, 2),
        insights=insights,
        actions=actions,
    )


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8 — DIMENSION 5: TAX EFFICIENCY
# IT Act: 80C (Rs.1.5 L), 80D (Rs.25 K), 80CCD(1B) NPS (Rs.50 K), 24B (Rs.2 L).
# Weight: 10%
# ─────────────────────────────────────────────────────────────────────────────

def score_tax_efficiency(p: UserProfile) -> DimensionResult:
    """
    New Regime (2024): 80C / 80D / 24B not available. Score = 100.
    Old Regime: Weighted score from 80C (50%) + 80D (30%) + NPS (20%).
    """
    MAX_80C = 150_000
    MAX_80D = 25_000

    if p.tax_regime == "New":
        return DimensionResult(
            name="Tax Efficiency",
            score=100.0,
            band="Excellent",
            weight=0.10,
            weighted_contribution=10.0,
            insights=[
                "You are on the New Tax Regime (2024).",
                "Sections 80C, 80D, and 24B are NOT available under the New Regime.",
                "New Regime benefit: lower flat slab rates, no lock-ins.",
                "Trade-off: you forgo up to Rs.73,500/year in deductions (80C + 80D + NPS).",
                "Score set to 100 — New Regime users cannot further optimize these deductions.",
            ],
            actions=[
                "Compare actual tax liability under both regimes annually, "
                "especially if you have a home loan.",
                "If total Old Regime deductions (80C+80D+24B+NPS) exceed Rs.3.75 L, "
                "the Old Regime may be more tax-efficient for you.",
            ],
        )

    utilization_80c = min(p.declared_80c, MAX_80C) / MAX_80C * 100
    utilization_80d = min(p.declared_80d, MAX_80D) / MAX_80D * 100
    nps_bonus       = 100.0 if p.has_nps else 0.0

    score = _clamp(
        0.50 * utilization_80c + 0.30 * utilization_80d + 0.20 * nps_bonus,
        0,
        100,
    )

    insights = [
        "Tax Regime: Old (deductions applicable).",
        f"80C: Rs.{p.declared_80c:,.0f} / Rs.{MAX_80C:,.0f} ({utilization_80c:.0f}% utilized).",
        f"80D: Rs.{p.declared_80d:,.0f} / Rs.{MAX_80D:,.0f} ({utilization_80d:.0f}% utilized).",
        f"NPS 80CCD(1B): "
        f"{'Enrolled — extra Rs.50,000 deduction.' if p.has_nps else 'Not enrolled.'}",
    ]
    if p.declared_24b >= 200_000:
        insights.append(
            "Section 24B home loan interest: fully utilized (Rs.2 L cap reached)."
        )
    elif p.declared_24b > 0:
        insights.append(
            f"Section 24B: Rs.{p.declared_24b:,.0f} claimed "
            f"(Rs.{200_000 - p.declared_24b:,.0f} gap to Rs.2 L cap)."
        )

    actions = []
    if utilization_80c < 100:
        gap = MAX_80C - p.declared_80c
        actions.append(
            f"Invest Rs.{gap:,.0f} more in ELSS/PPF/EPF to fully use 80C "
            f"(saves ~Rs.{gap * 0.30:,.0f} in tax at the 30% slab)."
        )
    if utilization_80d < 100:
        actions.append(
            f"Maximize 80D: pay health insurance premiums or preventive health check-up bills "
            f"(Rs.{MAX_80D - p.declared_80d:,.0f} remaining capacity)."
        )
    if not p.has_nps:
        actions.append(
            "Open NPS Tier-1 for an extra Rs.50,000 deduction under 80CCD(1B) "
            "— saves Rs.15,000+ in tax at the 30% bracket."
        )

    return DimensionResult(
        name="Tax Efficiency",
        score=round(score, 1),
        band=_band(score),
        weight=0.10,
        weighted_contribution=round(score * 0.10, 2),
        insights=insights,
        actions=actions,
    )


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9 — DIMENSION 6: RETIREMENT READINESS
# Target: 25x inflation-adjusted annual expenses at retirement (4% SWR).
# Weight: 15%
# ─────────────────────────────────────────────────────────────────────────────

def score_retirement_readiness(p: UserProfile) -> DimensionResult:
    """
    target_corpus = 25 x annual_expenses x inflation_multiplier
    inflation_multiplier = 2 ^ (years_left / 18)  [4% inflation]

    projected = FV(corpus at 8% CAGR) + FV(monthly_retirement_savings SIP at 8%)
    """
    years_left      = max(0, p.retirement_age - p.age)
    annual_expenses = p.monthly_expenses * 12
    is_fire_goal    = p.retirement_age < 45

    inflation_multiplier = 2 ** (years_left / 18)
    target_corpus        = 25 * annual_expenses * inflation_multiplier

    r_annual  = 0.08
    r_monthly = r_annual / 12
    n         = years_left * 12

    if n > 0:
        fv_corpus = p.current_retirement_corpus * ((1 + r_annual) ** years_left)
        fv_sip = (
            p.monthly_retirement_savings
            * (((1 + r_monthly) ** n - 1) / r_monthly)
            * (1 + r_monthly)
        )
        projected = fv_corpus + fv_sip
    else:
        projected = p.current_retirement_corpus

    coverage_ratio = (projected / target_corpus * 100) if target_corpus > 0 else 0.0

    if coverage_ratio >= 100:
        score = 100.0
    elif coverage_ratio >= 80:
        score = 80 + (coverage_ratio - 80) / 20 * 20
    elif coverage_ratio >= 60:
        score = 60 + (coverage_ratio - 60) / 20 * 20
    elif coverage_ratio >= 40:
        score = 40 + (coverage_ratio - 40) / 20 * 20
    else:
        score = (coverage_ratio / 40) * 40

    if years_left < 10 and score < 60:
        score = max(0.0, score - 10)

    insights = [
        f"{'FIRE Goal' if is_fire_goal else 'Retirement'}: target age {p.retirement_age} "
        f"({years_left} years away).",
        f"Projected corpus at age {p.retirement_age}: Rs.{projected:,.0f}",
        f"Target corpus (25x inflation-adjusted expenses): Rs.{target_corpus:,.0f}",
        f"Coverage: {coverage_ratio:.0f}%",
        "Assumptions: 8% CAGR, 4% inflation (expenses double every 18 years).",
    ]
    if is_fire_goal:
        insights.append(
            f"FIRE requires aggressive savings — typically 50-70% of income. "
            f"Current retirement savings: Rs.{p.monthly_retirement_savings:,.0f}/month."
        )

    actions = []
    if coverage_ratio < 80 and n > 0:
        gap       = target_corpus - projected
        fv_factor = (((1 + r_monthly) ** n - 1) / r_monthly) * (1 + r_monthly)
        top_up    = gap / fv_factor if fv_factor > 0 else 0
        if top_up > 0:
            actions.append(
                f"Increase monthly retirement savings by Rs.{top_up:,.0f} to close the gap."
            )
    if not p.has_nps:
        actions.append(
            "Start NPS Tier-1 — retirement corpus + tax benefit under 80CCD(1B)."
        )
    if years_left > 20:
        actions.append(
            "With 20+ years ahead, maximize equity allocation — compounding does the heavy lifting."
        )
    if is_fire_goal and coverage_ratio < 50:
        actions.append(
            "FIRE target requires urgent action: aim to save 50-70% of income. "
            "Review discretionary expenses and increase SIP amounts immediately."
        )

    return DimensionResult(
        name="Retirement Readiness",
        score=round(score, 1),
        band=_band(score),
        weight=0.15,
        weighted_contribution=round(score * 0.15, 2),
        insights=insights,
        actions=actions,
    )


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 10 — MASTER AGGREGATOR
# ─────────────────────────────────────────────────────────────────────────────

def calculate_money_health_score(p: UserProfile) -> MoneyHealthResult:
    """
    Runs all 6 dimension scorers.
    Overall score = weighted sum (weights defined in each DimensionResult).
    """
    dims = [
        score_emergency_fund(p),
        score_insurance(p),
        score_investment_diversification(p),
        score_debt_health(p),
        score_tax_efficiency(p),
        score_retirement_readiness(p),
    ]

    dim_map   = {d.name: d for d in dims}
    overall   = round(sum(d.score * d.weight for d in dims), 1)
    weakest   = min(dims, key=lambda d: d.score)
    strongest = max(dims, key=lambda d: d.score)
    summary   = (
        f"Overall Money Health Score: {overall}/100 ({_band(overall)}). "
        f"Strongest: {strongest.name} ({strongest.score}/100). "
        f"Most urgent fix: {weakest.name} ({weakest.score}/100 — {weakest.band})."
    )

    return MoneyHealthResult(
        overall_score=overall,
        overall_band=_band(overall),
        dimensions=dim_map,
        summary=summary,
        llm_prompt=build_llm_prompt(overall, dim_map, summary),
    )


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 11 — LLM PROMPT BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def build_llm_prompt(overall: float, dim_map: dict, summary: str) -> str:
    """
    Packages the scored output for Gemini.
    LLM only explains and advises — never recalculates.
    """
    dim_json = json.dumps(
        {
            name: {
                "score": d.score,
                "band": d.band,
                "insights": d.insights,
                "actions": d.actions,
            }
            for name, d in dim_map.items()
        },
        indent=2,
    )
    return f"""You are a warm, expert Indian financial advisor. The Money Health Scores below were produced
by a strict rule-based Python engine benchmarked on RBI, SEBI, IRDAI, and IT Act rules.

YOUR TASK:
1. Explain each dimension score in simple, jargon-free language.
2. For each "Poor" or "Fair" dimension, expand the action items with context and motivation.
3. Highlight the top 3 most urgent actions the user should take THIS month.
4. Close with a 2-sentence motivational summary tied to their overall score.

STRICT RULES:
- Do NOT recalculate any numbers. Trust the scores provided.
- Do NOT recommend specific fund names, insurance companies, or brands.
- Always explain WHY a benchmark matters, not just the number.
- Tone: empowering, honest, never alarming.

Overall Score: {overall}/100 ({_band(overall)})
{summary}

Dimension Scores:
{dim_json}

Generate the full personalised explanation and action plan."""


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 12 — PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def run_health_score_from_json(raw_json: dict) -> MoneyHealthResult:
    """
    Public entry point.
    raw_json : the full We Win stateful JSON profile
    returns  : MoneyHealthResult (scores + insights + LLM prompt)
    """
    profile = parse_json_to_profile(raw_json)
    return calculate_money_health_score(profile)

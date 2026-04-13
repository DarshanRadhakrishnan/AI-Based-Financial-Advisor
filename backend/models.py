"""
================================================================================
  PYDANTIC MODELS — We Win | AI Financial Advisor
  Validates the stateful JSON profile sent by the Next.js / Vite frontend.
  Schema mirrors src/data.ts exactly.
================================================================================
"""

from __future__ import annotations
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# INPUT MODELS  (Frontend → Backend)
# ─────────────────────────────────────────────────────────────────────────────

class PersonalProfile(BaseModel):
    current_age: int = Field(..., ge=18, le=100, description="User's current age")
    target_retirement_age: int = Field(..., ge=25, le=100)
    dependents: int = Field(default=0, ge=0)
    risk_appetite_score: int = Field(default=5, ge=1, le=10)
    employment_type: str = Field(default="Salaried")
    industry_sector: str = Field(default="")
    tax_regime: str = Field(default="New", pattern="^(New|Old)$")


class IncomeAndCashflow(BaseModel):
    monthly_net_take_home: float = Field(..., ge=0)
    monthly_base_pay: float = Field(default=0, ge=0)
    monthly_variable_pay: float = Field(default=0, ge=0)
    monthly_mandatory_living_expenses: float = Field(..., ge=0)
    monthly_discretionary_spend: float = Field(default=0, ge=0)
    monthly_epf_nps_contribution: float = Field(default=0, ge=0)
    total_monthly_emi: float = Field(default=0, ge=0)
    total_active_monthly_sips: float = Field(default=0, ge=0)


class TaxProfile(BaseModel):
    section_80c_utilized: float = Field(default=0, ge=0)
    section_80d_utilized: float = Field(default=0, ge=0)
    section_24b_utilized: float = Field(default=0, ge=0)


class InsuranceAndProtection(BaseModel):
    total_health_insurance_cover: float = Field(default=0, ge=0)
    total_term_life_cover: float = Field(default=0, ge=0)
    corporate_health_cover: float = Field(default=0, ge=0)


class AssetItem(BaseModel):
    asset_id: str = Field(default="")
    asset_name: str
    ticker: str = Field(default="NONE")
    category: str  # Equity, Debt, Commodity, Cash, RealEstate
    current_market_value: float = Field(..., ge=0)
    monthly_sip: float = Field(default=0, ge=0)
    liquidity_status: str = Field(default="Low")  # High, Medium, Low
    linked_goal_id: Optional[str] = None


class DebtItem(BaseModel):
    debt_id: str = Field(default="")
    loan_type: str
    outstanding_amount: float = Field(..., ge=0)
    interest_rate: float = Field(default=0, ge=0)
    emi_amount: float = Field(default=0, ge=0)
    remaining_tenure_months: int = Field(default=0, ge=0)
    is_tax_deductible: bool = Field(default=False)


class GoalItem(BaseModel):
    goal_id: str
    goal_name: str
    target_amount: float = Field(..., ge=0)
    target_year: int
    priority: str = Field(default="Medium")
    status: str = Field(default="Not Started")


class HealthScoreRequest(BaseModel):
    """
    Complete user financial profile payload.
    Matches the UserData interface in frontend src/data.ts.
    """
    user_id: str = Field(default="usr_anonymous")
    last_updated: Optional[str] = None

    personal_profile: PersonalProfile
    income_and_cashflow: IncomeAndCashflow
    tax_profile: TaxProfile = Field(default_factory=TaxProfile)
    insurance_and_protection: InsuranceAndProtection = Field(
        default_factory=InsuranceAndProtection
    )
    assets_portfolio: List[AssetItem] = Field(default_factory=list)
    liabilities_and_debt: List[DebtItem] = Field(default_factory=list)
    financial_goals: List[GoalItem] = Field(default_factory=list)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "user_id": "usr_wewin_001",
                    "personal_profile": {
                        "current_age": 28,
                        "target_retirement_age": 45,
                        "dependents": 2,
                        "risk_appetite_score": 8,
                        "employment_type": "Salaried",
                        "industry_sector": "IT Services",
                        "tax_regime": "New",
                    },
                    "income_and_cashflow": {
                        "monthly_net_take_home": 120000,
                        "monthly_base_pay": 100000,
                        "monthly_variable_pay": 20000,
                        "monthly_mandatory_living_expenses": 40000,
                        "monthly_discretionary_spend": 15000,
                        "monthly_epf_nps_contribution": 7500,
                        "total_monthly_emi": 25000,
                        "total_active_monthly_sips": 20000,
                    },
                    "tax_profile": {
                        "section_80c_utilized": 150000,
                        "section_80d_utilized": 25000,
                        "section_24b_utilized": 200000,
                    },
                    "insurance_and_protection": {
                        "total_health_insurance_cover": 500000,
                        "total_term_life_cover": 0,
                        "corporate_health_cover": 300000,
                    },
                    "assets_portfolio": [
                        {
                            "asset_id": "ast_101",
                            "asset_name": "Nifty 50 Index Fund",
                            "ticker": "^NSEI",
                            "category": "Equity",
                            "current_market_value": 200000,
                            "monthly_sip": 10000,
                            "liquidity_status": "High",
                            "linked_goal_id": "g_03",
                        }
                    ],
                    "liabilities_and_debt": [
                        {
                            "debt_id": "dbt_101",
                            "loan_type": "Education Loan",
                            "outstanding_amount": 1500000,
                            "interest_rate": 9.5,
                            "emi_amount": 25000,
                            "remaining_tenure_months": 72,
                            "is_tax_deductible": True,
                        }
                    ],
                    "financial_goals": [
                        {
                            "goal_id": "g_01",
                            "goal_name": "Emergency Fund",
                            "target_amount": 300000,
                            "target_year": 2024,
                            "priority": "Critical",
                            "status": "In Progress",
                        }
                    ],
                }
            ]
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# RESPONSE MODELS  (Backend → Frontend)
# ─────────────────────────────────────────────────────────────────────────────

class DimensionScoreResponse(BaseModel):
    score: float
    band: str
    weight: float
    weighted_contribution: float
    insights: List[str]
    actions: List[str]


class HealthScoreResponse(BaseModel):
    user_id: str
    overall_score: float
    overall_band: str
    summary: str
    dimensions: Dict[str, DimensionScoreResponse]
    llm_prompt: str


class GeminiAdvisoryResponse(BaseModel):
    user_id: str
    overall_score: float
    overall_band: str
    summary: str
    dimensions: Dict[str, DimensionScoreResponse]
    gemini_advisory: Optional[str] = None
    gemini_model: Optional[str] = None
    gemini_error: Optional[str] = None


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)

class ChatResponse(BaseModel):
    response: str
    error: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# MARKET MONITORING MODELS (Per-User)
# ─────────────────────────────────────────────────────────────────────────────

class StartMonitoringRequest(BaseModel):
    """Register a user's assets for market monitoring."""
    user_id: str = Field(..., description="The user ID to register")
    assets_portfolio: List[Dict] = Field(
        ...,
        description="The user's assets_portfolio array containing ticker fields",
    )


class MarketEventRequest(BaseModel):
    """God Mode — simulate a market event on a specific ticker for a user."""
    user_id: str = Field(
        default="usr_wewin_001",
        description="Target user ID",
    )
    ticker: str = Field(
        default="^NSEI",
        description="The yfinance ticker symbol to simulate the event on",
    )
    simulated_drop: float = Field(
        ...,
        description="Simulated percentage change (e.g. -6.5 for crash, +4.0 for rally)",
        examples=[-6.5, -2.5, 3.5],
    )


class TickerStateResponse(BaseModel):
    """State of a single monitored ticker."""
    ticker: str
    ticker_name: str
    current_price: Optional[float] = None
    baseline_price: Optional[float] = None
    percentage_change: float = 0.0
    last_updated: Optional[str] = None
    status: str = "WAITING"


class PollerMetaResponse(BaseModel):
    """Global poller metadata."""
    status: str
    poll_count: int
    last_updated: Optional[str] = None
    last_error: Optional[str] = None
    total_unique_tickers: int = 0


class UserMarketStateResponse(BaseModel):
    """Per-user market monitoring state."""
    user_id: str
    registered: bool
    tickers: List[str] = Field(default_factory=list)
    ticker_states: List[TickerStateResponse] = Field(default_factory=list)
    event_log: List[Dict] = Field(default_factory=list)
    poller: PollerMetaResponse

# ─────────────────────────────────────────────────────────────────────────────
# ADMIN TRIGGER MODELS (Polling Hack)
# ─────────────────────────────────────────────────────────────────────────────

class AdminMarketCrashRequest(BaseModel):
    user_id: str = Field(..., description="Target user ID")
    ticker: str = Field(..., description="Ticker to crash (e.g. ^NSEI)")
    drop_percent: float = Field(..., description="Percentage to drop by (positive number, e.g. 8.5)")

class AdminLifeEventRequest(BaseModel):
    user_id: str = Field(..., description="Target user ID")
    event_type: str = Field(..., description="Event type (e.g. job_loss)")
    new_income: int = Field(..., description="New income value (e.g. 0)")



"""
================================================================================
  MACRO EVENTS MODULE  —  We Win | AI Financial Advisor
  Handles Macro-Economic Triggers (RBI Repo Rate Hikes / Cuts)
  with DTI-Based Deterministic Health Score Recalculation
================================================================================

  Math Engine Pipeline:
    Step A  →  Calculate Old EMI (standard formula)
    Step B  →  Apply rate hike to annual interest rate
    Step C  →  Calculate New EMI (same formula, new rate)
    Step D  →  Calculate DTI ratio → Derive Debt Health Score

  Debt Health Score Formula (DTI-based, RBI-aligned):
    DTI   = (Monthly EMI / Monthly Income) × 100
    Score = 100 - (DTI × 1.5)
    
    RBI benchmark: DTI under 40% is healthy.
    At DTI = 40%, Score = 100 - 60 = 40 → correctly flags danger zone.

  Frontend Integration:
    Events are pushed to admin_events_queue so the React frontend
    autonomously detects and reacts via the 3-second polling hack.

================================================================================
"""

from __future__ import annotations

import math
import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger("wewin-macro-events")


# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────────────────────────────────────

class UserFinancialMock(BaseModel):
    """
    Mock user financial profile for macro event simulation.
    In production, this would be fetched from the database.
    """
    monthly_income: float = Field(default=100_000, description="Monthly take-home income in ₹")
    loan_principal: float = Field(default=25_00_000, description="Outstanding home loan principal in ₹")
    annual_interest_rate: float = Field(default=8.5, description="Current annual interest rate (%)")
    remaining_months: int = Field(default=240, description="Remaining loan tenure in months (20 years)")


class MacroEventRequest(BaseModel):
    """Request payload for triggering a macro-economic event."""
    user_id: str = Field(
        ...,
        description="Target user ID (bridges to the frontend polling hack)",
    )
    event_type: str = Field(
        default="rbi_rate_hike",
        description="Type of macro event",
        examples=["rbi_rate_hike", "rbi_rate_cut"],
    )
    rate_hike_percentage: float = Field(
        default=0.50,
        description="Rate change in percentage points (e.g. 0.50 = 50 bps = +0.50%)",
        examples=[0.25, 0.50, 0.75, 1.0],
    )


class FinancialImpact(BaseModel):
    """Structured financial impact breakdown."""
    old_emi: int
    new_emi: int
    emi_increase: int
    old_interest_rate: float
    new_interest_rate: float
    dti_ratio: float
    debt_health_score: int


class MacroEventResponse(BaseModel):
    """Full structured response after processing a macro event."""
    status: str
    event: str
    timestamp: str
    financial_impact: FinancialImpact
    xai_advisory: dict


# ─────────────────────────────────────────────────────────────────────────────
# MUTABLE MOCK STATE
# ─────────────────────────────────────────────────────────────────────────────
# This is the in-memory "user" that successive API calls accumulate against.
# The initial EMI is calculated from formula to ensure zero mismatch.

_mock_user = UserFinancialMock()


def _reset_mock_user():
    """Reset the mock user to defaults (useful for testing)."""
    global _mock_user
    _mock_user = UserFinancialMock()


# ─────────────────────────────────────────────────────────────────────────────
# STEP A & C: EMI CALCULATOR (Pure Math — No Side Effects)
# ─────────────────────────────────────────────────────────────────────────────

def calculate_emi(principal: float, annual_rate: float, tenure_months: int) -> float:
    """
    Standard EMI Formula (used by all Indian banks):

        EMI = P × r × (1+r)^n / ((1+r)^n - 1)

    Where:
        P = Outstanding loan principal
        r = Monthly interest rate = (annual_rate / 12) / 100
        n = Remaining tenure in months

    Args:
        principal:      Outstanding loan amount in ₹
        annual_rate:    Annual interest rate (e.g. 8.5 for 8.5%)
        tenure_months:  Remaining loan tenure in months

    Returns:
        Monthly EMI amount rounded to 2 decimal places
    """
    if annual_rate <= 0 or tenure_months <= 0 or principal <= 0:
        return 0.0

    # Convert annual percentage to monthly decimal rate
    r = annual_rate / 12.0 / 100.0

    # (1 + r)^n
    compound_factor = math.pow(1 + r, tenure_months)

    # EMI = P × r × (1+r)^n / ((1+r)^n - 1)
    emi = principal * r * compound_factor / (compound_factor - 1)

    return round(emi, 2)


# ─────────────────────────────────────────────────────────────────────────────
# STEP D: DTI-BASED DEBT HEALTH SCORE (Pure Math — No Side Effects)
# ─────────────────────────────────────────────────────────────────────────────

def calculate_debt_health_score(monthly_emi: float, monthly_income: float) -> tuple[float, int]:
    """
    Calculate Debt Health Score using the Debt-to-Income (DTI) ratio.

    DTI Formula (RBI / CIBIL standard):
        DTI = (Monthly EMI / Monthly Income) × 100

    Debt Health Score:
        Score = 100 - (DTI × 1.5)
        Clamped to [0, 100]

    Why 1.5x multiplier?
        RBI recommends DTI under 40%.
        At DTI = 40%:  Score = 100 - (40 × 1.5) = 100 - 60 = 40  → danger zone ✓
        At DTI = 20%:  Score = 100 - (20 × 1.5) = 100 - 30 = 70  → healthy ✓
        At DTI = 60%:  Score = 100 - (60 × 1.5) = 100 - 90 = 10  → critical ✓

    Args:
        monthly_emi:    The user's monthly EMI payment
        monthly_income: The user's monthly take-home income

    Returns:
        Tuple of (dti_ratio, debt_health_score)
    """
    if monthly_income <= 0:
        return (100.0, 0)

    # Step D.1: Calculate DTI ratio
    dti = (monthly_emi / monthly_income) * 100

    # Step D.2: Convert DTI to health score
    raw_score = 100 - (dti * 1.5)

    # Step D.3: Clamp to valid range [0, 100]
    score = max(0, min(100, round(raw_score)))

    return (round(dti, 2), score)


# ─────────────────────────────────────────────────────────────────────────────
# CORE ENGINE: calculate_impact() — Orchestrates Steps A through D
# ─────────────────────────────────────────────────────────────────────────────

def calculate_impact(user: UserFinancialMock, rate_hike: float) -> dict:
    """
    Full macro-event impact calculation pipeline.

    Pipeline:
        Step A  →  Calculate Old EMI using current interest rate
        Step B  →  Apply the rate hike to the annual interest rate
        Step C  →  Calculate New EMI using the increased rate
        Step D  →  Calculate DTI ratio and Debt Health Score

    Args:
        user:       The user's financial profile (mutable mock)
        rate_hike:  Rate change in percentage points (e.g. 0.50)

    Returns:
        Dict with old_emi, new_emi, new_rate, dti, debt_health_score
    """

    # ── Step A: Calculate Old EMI ──
    old_rate = user.annual_interest_rate
    old_emi = calculate_emi(
        principal=user.loan_principal,
        annual_rate=old_rate,
        tenure_months=user.remaining_months,
    )

    # ── Step B: Apply Macro Event (mutate the rate) ──
    new_rate = round(old_rate + rate_hike, 4)

    # ── Step C: Calculate New EMI ──
    new_emi = calculate_emi(
        principal=user.loan_principal,
        annual_rate=new_rate,
        tenure_months=user.remaining_months,
    )

    # ── Step D: Calculate DTI-based Debt Health Score ──
    dti_ratio, debt_health_score = calculate_debt_health_score(
        monthly_emi=new_emi,
        monthly_income=user.monthly_income,
    )

    # Also calculate old DTI for comparison
    _, old_debt_health = calculate_debt_health_score(
        monthly_emi=old_emi,
        monthly_income=user.monthly_income,
    )

    # Log the full calculation chain
    logger.info(
        f"[MACRO ENGINE] "
        f"Rate: {old_rate}% → {new_rate}% | "
        f"EMI: ₹{old_emi:,.0f} → ₹{new_emi:,.0f} (Δ₹{new_emi - old_emi:+,.0f}) | "
        f"DTI: {dti_ratio:.1f}% | "
        f"Debt Health: {old_debt_health} → {debt_health_score}"
    )

    return {
        "old_rate": old_rate,
        "new_rate": new_rate,
        "old_emi": old_emi,
        "new_emi": new_emi,
        "emi_increase": round(new_emi - old_emi, 2),
        "dti_ratio": dti_ratio,
        "old_debt_health": old_debt_health,
        "debt_health_score": debt_health_score,
    }


# ─────────────────────────────────────────────────────────────────────────────
# MOCKED AI / XAI HANDOFF
# ─────────────────────────────────────────────────────────────────────────────

def generate_xai_explanation(
    old_emi: float,
    new_emi: float,
    new_score: int,
    rate_hike: float,
    dti_ratio: float,
) -> dict:
    """
    Generate a structured XAI (Explainable AI) advisory response.
    Simulates what Gemini would produce with full financial context.

    This is deterministic — no API call. In production, this would
    be replaced with a Gemini call that has the math results as context.
    """
    emi_increase = round(new_emi - old_emi)

    return {
        "status": "alert",
        "event": "RBI Rate Hike",
        "financial_impact": {
            "old_emi": round(old_emi),
            "new_emi": round(new_emi),
            "emi_increase": emi_increase,
            "debt_health_score": new_score,
            "dti_ratio": dti_ratio,
        },
        "xai_message": (
            f"The RBI raised rates by {rate_hike}%. "
            f"Your estimated Home Loan EMI has increased from "
            f"₹{round(old_emi):,} to ₹{round(new_emi):,} "
            f"(+₹{emi_increase:,}/month). "
            f"Your Debt-to-Income ratio is now {dti_ratio:.1f}%, "
            f"which drops your Debt Health Score to {new_score}/100. "
            f"We recommend pausing discretionary spending to absorb "
            f"this cash flow impact."
        ),
        "recommended_actions": [
            f"Absorb ₹{emi_increase:,}/month EMI increase from monthly surplus",
            "Pause lowest-priority SIP for 3 months to offset cash flow pressure",
            "Evaluate home loan balance transfer to a bank offering lower rates",
            "Avoid lump-sum prepayment — rising rates increase opportunity cost",
            "Monitor next RBI MPC meeting for potential policy reversal",
        ],
        "model": "WeWin-XAI-v1 (DTI-based macro-event engine)",
        "confidence": "HIGH",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# FASTAPI ROUTER + ADMIN POLLING INTEGRATION
# ─────────────────────────────────────────────────────────────────────────────

router = APIRouter()

# Reference to admin_events_queue — injected by main.py
_admin_queue = None

def set_admin_queue(queue):
    """Called by main.py to inject the shared admin_events_queue."""
    global _admin_queue
    _admin_queue = queue


@router.post(
    "/api/macro/rbi-rate-hike",
    tags=["Macro Events", "Admin (Demo Tricks)"],
    summary="Trigger an RBI Rate Hike macro event",
    description=(
        "Simulates an RBI repo rate hike. Recalculates the user's Home Loan EMI "
        "using the standard banking formula, derives the new DTI ratio, and computes "
        "the Debt Health Score. Pushes an alert to the frontend via polling hack."
    ),
    response_model=MacroEventResponse,
)
async def trigger_rbi_rate_hike(payload: MacroEventRequest):
    """
    POST /api/macro/rbi-rate-hike
    Body: {
        "user_id": "5f6babf7-...",
        "event_type": "rbi_rate_hike",
        "rate_hike_percentage": 0.50
    }

    Pipeline:
      1. Run deterministic math engine (Steps A → D)
      2. Generate XAI explanation
      3. Push event to admin polling queue → frontend auto-reacts
      4. Mutate mock state so successive calls accumulate
    """
    global _mock_user

    logger.info(
        f"[MACRO] Received: {payload.event_type} | "
        f"Hike: +{payload.rate_hike_percentage}% | "
        f"User: {payload.user_id}"
    )

    # ── Step 1: Run the math engine ──
    impact = calculate_impact(_mock_user, payload.rate_hike_percentage)

    # ── Step 2: Mutate mock state for accumulation ──
    _mock_user = UserFinancialMock(
        monthly_income=_mock_user.monthly_income,
        loan_principal=_mock_user.loan_principal,
        annual_interest_rate=impact["new_rate"],
        remaining_months=_mock_user.remaining_months,
    )

    # ── Step 3: Generate XAI explanation ──
    xai_result = generate_xai_explanation(
        old_emi=impact["old_emi"],
        new_emi=impact["new_emi"],
        new_score=impact["debt_health_score"],
        rate_hike=payload.rate_hike_percentage,
        dti_ratio=impact["dti_ratio"],
    )

    # ── Step 4: Push to admin polling queue → frontend auto-reacts ──
    if _admin_queue is not None:
        event = {
            "type": "macro-event",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "user_id": payload.user_id,
                "event_type": payload.event_type,
                "basis_points_change": payload.rate_hike_percentage,
                "new_interest_rate": impact["new_rate"],
                "new_emi": impact["new_emi"],
                "old_emi": impact["old_emi"],
                "emi_delta": impact["emi_increase"],
                "new_debt_health": impact["debt_health_score"],
                "old_debt_health": impact["old_debt_health"],
                "dti_ratio": impact["dti_ratio"],
                "xai_message": xai_result["xai_message"],
            }
        }
        _admin_queue[payload.user_id].append(event)
        logger.info(f"[MACRO] Alert queued for frontend: {payload.user_id}")

    # ── Step 5: Build response ──
    return MacroEventResponse(
        status="alert",
        event=payload.event_type,
        timestamp=datetime.now(timezone.utc).isoformat(),
        financial_impact=FinancialImpact(
            old_emi=round(impact["old_emi"]),
            new_emi=round(impact["new_emi"]),
            emi_increase=round(impact["emi_increase"]),
            old_interest_rate=impact["old_rate"],
            new_interest_rate=impact["new_rate"],
            dti_ratio=impact["dti_ratio"],
            debt_health_score=impact["debt_health_score"],
        ),
        xai_advisory=xai_result,
    )

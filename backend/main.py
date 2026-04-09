"""
================================================================================
  FASTAPI MAIN  —  We Win | AI Financial Advisor Backend
  Version 1.0  (Hackathon MVP — In-Memory, No Database)
================================================================================
  Endpoints:
    POST /api/v1/analyze-health     →  Deterministic 6-dim health score
    POST /api/v1/analyze-with-ai    →  Health score + Gemini advisory
    GET  /api/v1/health             →  Server health check
    GET  /                          →  Welcome page

  Architecture:
    1. Frontend sends full user JSON profile.
    2. Pydantic validates the payload strictly.
    3. scoring_engine.py runs 6 deterministic Python math functions.
    4. (Optional) gemini_service.py sends the scored data to Gemini for
       natural-language explanation and action plan.
    5. Response returned to frontend with scores + insights + LLM advisory.

  Run:
    uvicorn main:app --reload --port 8000
================================================================================
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import (
    HealthScoreRequest,
    HealthScoreResponse,
    DimensionScoreResponse,
    GeminiAdvisoryResponse,
)
from scoring_engine import run_health_score_from_json
from gemini_service import generate_advisory

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("wewin-backend")

# ─────────────────────────────────────────────────────────────────────────────
# APP INITIALIZATION
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="We Win — AI Financial Advisor API",
    description=(
        "Stateful AI Financial Advisor backend. Calculates a 6-Dimension "
        "Money Health Score using deterministic Python math benchmarked on "
        "RBI, SEBI, IRDAI, and Indian IT Act rules. Optionally sends scored "
        "data to Gemini for natural-language Path Planning advisory."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS MIDDLEWARE
# Allow frontend origins (Vite dev + Next.js dev + production)
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS = [
    "http://localhost:3000",      # Next.js dev
    "http://localhost:5173",      # Vite dev
    "http://localhost:5174",      # Vite dev (alt port)
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# Add any custom origin from environment
custom_origin = os.getenv("FRONTEND_ORIGIN")
if custom_origin:
    ALLOWED_ORIGINS.append(custom_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Root"])
async def root():
    """Welcome endpoint — confirms the server is running."""
    return {
        "service": "We Win — AI Financial Advisor API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """Health check for load balancers and monitoring."""
    gemini_configured = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "status": "healthy",
        "gemini_configured": gemini_configured,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 1: ANALYZE HEALTH (Deterministic Only)
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/api/v1/analyze-health",
    response_model=HealthScoreResponse,
    tags=["Health Score"],
    summary="Calculate 6-Dimension Money Health Score",
    description=(
        "Receives the full user financial profile JSON, runs 6 deterministic "
        "scoring algorithms (Emergency Fund, Insurance, Diversification, "
        "Debt Health, Tax Efficiency, Retirement Readiness), and returns "
        "scores with insights, actions, and a pre-built LLM prompt."
    ),
)
async def analyze_health(payload: HealthScoreRequest):
    """
    POST /api/v1/analyze-health

    Accepts the frontend's stateful JSON profile.
    Returns deterministic health scores + generated LLM prompt.
    Does NOT call Gemini — pure Python math.
    """
    try:
        # Convert Pydantic model to dict for the scoring engine
        raw_data = payload.model_dump()
        logger.info(f"[analyze-health] Processing user: {payload.user_id}")

        # Run the scoring engine
        result = run_health_score_from_json(raw_data)

        # Build response
        dimensions_response = {}
        for name, dim in result.dimensions.items():
            dimensions_response[name] = DimensionScoreResponse(
                score=dim.score,
                band=dim.band,
                weight=dim.weight,
                weighted_contribution=dim.weighted_contribution,
                insights=dim.insights,
                actions=dim.actions,
            )

        response = HealthScoreResponse(
            user_id=payload.user_id,
            overall_score=result.overall_score,
            overall_band=result.overall_band,
            summary=result.summary,
            dimensions=dimensions_response,
            llm_prompt=result.llm_prompt,
        )

        logger.info(
            f"[analyze-health] User {payload.user_id} → "
            f"Score: {result.overall_score}/100 ({result.overall_band})"
        )
        return response

    except KeyError as e:
        logger.error(f"[analyze-health] Missing field in payload: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required field in payload: {str(e)}",
        )
    except Exception as e:
        logger.error(f"[analyze-health] Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal scoring error: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 2: ANALYZE WITH AI (Score + Gemini Advisory)
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/api/v1/analyze-with-ai",
    response_model=GeminiAdvisoryResponse,
    tags=["Health Score", "Gemini AI"],
    summary="Calculate Health Score + Get Gemini AI Advisory",
    description=(
        "Runs the full deterministic scoring pipeline, then sends the scored "
        "data to Google Gemini for a personalised natural-language explanation "
        "and action plan. Requires GEMINI_API_KEY to be configured."
    ),
)
async def analyze_with_ai(payload: HealthScoreRequest):
    """
    POST /api/v1/analyze-with-ai

    1. Runs deterministic health score (same as /analyze-health).
    2. Sends the generated LLM prompt to Gemini.
    3. Returns scores + Gemini's personalised advisory.
    """
    try:
        raw_data = payload.model_dump()
        logger.info(f"[analyze-with-ai] Processing user: {payload.user_id}")

        # Step 1: Run scoring engine
        result = run_health_score_from_json(raw_data)

        # Step 2: Call Gemini
        logger.info(f"[analyze-with-ai] Sending prompt to Gemini...")
        gemini_result = await generate_advisory(result.llm_prompt)

        # Step 3: Build response
        dimensions_response = {}
        for name, dim in result.dimensions.items():
            dimensions_response[name] = DimensionScoreResponse(
                score=dim.score,
                band=dim.band,
                weight=dim.weight,
                weighted_contribution=dim.weighted_contribution,
                insights=dim.insights,
                actions=dim.actions,
            )

        response = GeminiAdvisoryResponse(
            user_id=payload.user_id,
            overall_score=result.overall_score,
            overall_band=result.overall_band,
            summary=result.summary,
            dimensions=dimensions_response,
            gemini_advisory=gemini_result["advisory"],
            gemini_model=gemini_result["model"],
            gemini_error=gemini_result["error"],
        )

        if gemini_result["advisory"]:
            logger.info(
                f"[analyze-with-ai] User {payload.user_id} → "
                f"Score: {result.overall_score}/100 + Gemini advisory generated"
            )
        else:
            logger.warning(
                f"[analyze-with-ai] User {payload.user_id} → "
                f"Score: {result.overall_score}/100 | Gemini error: {gemini_result['error']}"
            )

        return response

    except KeyError as e:
        logger.error(f"[analyze-with-ai] Missing field: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required field in payload: {str(e)}",
        )
    except Exception as e:
        logger.error(f"[analyze-with-ai] Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# STARTUP LOG
# ─────────────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_log():
    gemini_status = "✅ configured" if os.getenv("GEMINI_API_KEY") else "❌ NOT set"
    logger.info("=" * 64)
    logger.info("  We Win — AI Financial Advisor Backend")
    logger.info("  Version 1.0.0 | Hackathon MVP")
    logger.info(f"  GEMINI_API_KEY: {gemini_status}")
    logger.info(f"  CORS Origins: {ALLOWED_ORIGINS}")
    logger.info(f"  Docs: http://localhost:8000/docs")
    logger.info("=" * 64)

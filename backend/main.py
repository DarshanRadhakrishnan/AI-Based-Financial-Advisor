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

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import json
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
    ChatRequest,
    ChatResponse,
    StartMonitoringRequest,
    MarketEventRequest,
    UserMarketStateResponse,
    AdminMarketCrashRequest,
    AdminLifeEventRequest,
)
from scoring_engine import run_health_score_from_json
from gemini_service import generate_advisory, generate_chat_response
from market_monitor import (
    register_user_tickers,
    immediate_fetch_for_user,
    unregister_user,
    get_user_market_state,
    start_market_poller,
    god_mode_trigger,
)

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

# Mount the macro events router
from macro_events import router as macro_events_router, set_admin_queue as set_macro_admin_queue
app.include_router(macro_events_router)

# Import market monitor queue setter
from market_monitor import set_market_admin_queue

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
# ENDPOINT 3: CHATBOT INTERACTION
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/api/v1/chat",
    response_model=ChatResponse,
    tags=["Chat"],
    summary="Chat with AI Financial Advisor",
    description=("Answers basic queries and politely declines advanced queries."),
)
async def chat_interaction(payload: ChatRequest):
    try:
        logger.info(f"[chat] Received query: {payload.query[:50]}...")
        result = await generate_chat_response(payload.query)
        if result.get("error"):
            logger.error(f"[chat] Error from Gemini: {result['error']}")
        return ChatResponse(
            response=result["response"],
            error=result["error"]
        )
    except Exception as e:
        logger.error(f"[chat] Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat error: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 4: START MONITORING (Register User Assets)
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/api/v1/start-monitoring",
    tags=["Market Monitor"],
    summary="Register a user's portfolio assets for real-time monitoring",
    description=(
        "Extracts valid tickers from the user's assets_portfolio and begins "
        "tracking them in real-time. Non-tradable assets (ticker=NONE) are skipped."
    ),
)
async def start_monitoring(payload: StartMonitoringRequest):
    """POST /api/v1/start-monitoring"""
    try:
        result = register_user_tickers(payload.user_id, payload.assets_portfolio)
        logger.info(
            f"[MONITOR] Registered {result['count']} tickers for {payload.user_id}"
        )
        # Fetch prices immediately so the UI doesn't wait 60s
        await immediate_fetch_for_user(payload.user_id)
        return JSONResponse(content={"status": "registered", **result})
    except Exception as e:
        logger.error(f"[MONITOR] Registration error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 5: PER-USER MARKET STATE
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/api/v1/market-state/{user_id}",
    tags=["Market Monitor"],
    summary="Get market state for a specific user",
    description="Returns the real-time monitoring state for all tickers registered to a user.",
)
async def get_market_state_for_user(user_id: str):
    """GET /api/v1/market-state/{user_id}"""
    state = get_user_market_state(user_id)
    return JSONResponse(content=state)


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 6: STOP MONITORING (Unregister on logout)
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/api/v1/stop-monitoring/{user_id}",
    tags=["Market Monitor"],
    summary="Unregister a user from market monitoring",
)
async def stop_monitoring(user_id: str):
    """POST /api/v1/stop-monitoring/{user_id}"""
    unregister_user(user_id)
    return JSONResponse(content={"status": "unregistered", "user_id": user_id})


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 7: GOD MODE — SIMULATE MARKET EVENT (Per-User)
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/api/trigger-market-event",
    tags=["Market Monitor", "God Mode"],
    summary="God Mode: Simulate a market event on a specific user's asset",
    description=(
        "Overwrites the percentage_change for a specific ticker in a user's "
        "watcher and forces threshold evaluation + auto path recalculation."
    ),
)
async def trigger_market_event(payload: MarketEventRequest):
    """
    POST /api/trigger-market-event
    Body: { "user_id": "usr_wewin_001", "ticker": "^NSEI", "simulated_drop": -6.5 }
    """
    try:
        logger.warning(
            f"[GOD MODE] User: {payload.user_id} | Ticker: {payload.ticker} | "
            f"Drop: {payload.simulated_drop}"
        )
        result = await god_mode_trigger(
            user_id=payload.user_id,
            ticker=payload.ticker,
            simulated_drop=payload.simulated_drop,
        )
        return JSONResponse(
            content={
                "status": "triggered",
                "user_id": payload.user_id,
                "ticker": payload.ticker,
                "simulated_drop": payload.simulated_drop,
                "xai_result": result,
            }
        )
    except Exception as e:
        logger.error(f"[GOD MODE] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"God Mode error: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN TRIGGER ENDPOINTS (Polling Hack)
# ─────────────────────────────────────────────────────────────────────────────

from collections import defaultdict
admin_events_queue: dict[str, list] = defaultdict(list)

# Inject the queue into macro_events and market_monitor modules
set_macro_admin_queue(admin_events_queue)
set_market_admin_queue(admin_events_queue)

@app.post(
    "/api/v1/market/god-mode",
    tags=["Admin (Demo Tricks)"],
    summary="Trigger God Mode for Market Monitor",
    description="Force a specific percentage drop on a ticker to test real-time thresholds.",
)
async def trigger_god_mode(req: dict):
    from market_monitor import god_mode_trigger
    user_id = req.get("user_id")
    ticker = req.get("ticker", "^NSEI")
    simulated_drop = req.get("simulated_drop", -6.0)
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
        
    result = await god_mode_trigger(user_id, ticker, simulated_drop)
    return {"status": "success", "triggered": result}

@app.post(
    "/api/v1/admin/simulate-market-crash",
    tags=["Admin (Demo Tricks)"],
    summary="Simulate Market Crash on Frontend",
    description="Pushes a simulate-market-crash event to the frontend via the polling hack.",
)
async def admin_simulate_market_crash(payload: AdminMarketCrashRequest):
    event = {
        "type": "simulate-market-crash",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": payload.dict()
    }
    admin_events_queue[payload.user_id].append(event)
    return {"status": "queued", "event": event}


@app.post(
    "/api/v1/admin/log-life-event",
    tags=["Admin (Demo Tricks)"],
    summary="Log Life Event on Frontend",
    description="Pushes a log-life-event to the frontend via the polling hack.",
)
async def admin_log_life_event(payload: AdminLifeEventRequest):
    event = {
        "type": "log-life-event",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": payload.dict()
    }
    admin_events_queue[payload.user_id].append(event)
    return {"status": "queued", "event": event}


@app.get(
    "/api/v1/admin/poll-events/{user_id}",
    tags=["Admin (Demo Tricks)"],
    summary="Frontend Poller for Admin Events",
    description="The React frontend silently polls this endpoint every 3 seconds to retrieve and execute hijacked commands.",
)
async def admin_poll_events(user_id: str):
    # Pop all events so they aren't executed twice
    events = admin_events_queue.pop(user_id, [])
    return {"events": events}

# ─────────────────────────────────────────────────────────────────────────────
# STARTUP LOG + MARKET POLLER
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
    logger.info(f"  Market Monitor: ENABLED (per-user, 60s interval)")
    logger.info("=" * 64)

    # Launch the market poller as a background task
    import asyncio
    asyncio.create_task(start_market_poller())

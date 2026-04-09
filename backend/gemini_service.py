"""
================================================================================
  GEMINI SERVICE  —  We Win | AI Financial Advisor
  Handles communication with Google Gemini API (free tier).
================================================================================
  Usage:
    1. Set GEMINI_API_KEY in your environment or .env file.
    2. Call generate_advisory(prompt) with the LLM prompt from scoring_engine.
    3. Returns the generated text or an error message.
================================================================================
"""

from __future__ import annotations

import os
import httpx
import logging

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

# Free tier rate limits: 15 RPM / 1M TPM / 1500 RPD
# We use a single synchronous call per request — well within limits.


def _get_api_key() -> str | None:
    """Reads GEMINI_API_KEY from environment."""
    return os.getenv("GEMINI_API_KEY")


# ─────────────────────────────────────────────────────────────────────────────
# CORE FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

async def generate_advisory(prompt: str) -> dict:
    """
    Sends the scored health data prompt to Gemini and returns the advisory.

    Returns:
        {
            "advisory": str | None,   # The generated text
            "model": str,             # Model used
            "error": str | None       # Error message if failed
        }
    """
    api_key = _get_api_key()

    if not api_key:
        logger.warning("GEMINI_API_KEY not set — returning placeholder advisory.")
        return {
            "advisory": None,
            "model": GEMINI_MODEL,
            "error": (
                "GEMINI_API_KEY not configured. "
                "Set it in your .env file to enable AI-powered advisory."
            ),
        }

    request_body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.95,
            "topK": 40,
            "maxOutputTokens": 4096,
        },
        "safetySettings": [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE",
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE",
            },
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                GEMINI_API_URL,
                params={"key": api_key},
                json=request_body,
                headers={"Content-Type": "application/json"},
            )

        if response.status_code != 200:
            error_detail = response.text[:500]
            logger.error(
                f"Gemini API returned {response.status_code}: {error_detail}"
            )
            return {
                "advisory": None,
                "model": GEMINI_MODEL,
                "error": f"Gemini API error ({response.status_code}): {error_detail}",
            }

        data = response.json()

        # Extract text from Gemini response
        candidates = data.get("candidates", [])
        if not candidates:
            return {
                "advisory": None,
                "model": GEMINI_MODEL,
                "error": "Gemini returned no candidates. The prompt may have been blocked.",
            }

        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        advisory_text = "".join(part.get("text", "") for part in parts)

        if not advisory_text.strip():
            return {
                "advisory": None,
                "model": GEMINI_MODEL,
                "error": "Gemini returned an empty response.",
            }

        logger.info(
            f"Gemini advisory generated successfully "
            f"({len(advisory_text)} chars, model: {GEMINI_MODEL})"
        )
        return {
            "advisory": advisory_text.strip(),
            "model": GEMINI_MODEL,
            "error": None,
        }

    except httpx.TimeoutException:
        logger.error("Gemini API request timed out after 60s.")
        return {
            "advisory": None,
            "model": GEMINI_MODEL,
            "error": "Gemini API request timed out. Try again.",
        }
    except Exception as e:
        logger.error(f"Unexpected error calling Gemini API: {e}")
        return {
            "advisory": None,
            "model": GEMINI_MODEL,
            "error": f"Unexpected error: {str(e)}",
        }

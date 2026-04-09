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

GEMINI_MODEL = "gemini-2.5-flash"
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
            
            used_model = GEMINI_MODEL

            if response.status_code == 429 and "quota" in response.text.lower():
                logger.warning(f"Quota exceeded for {used_model}. Please check your billing settings or API key limits.")

        if response.status_code != 200:
            error_detail = response.text[:500]
            logger.error(
                f"Gemini API returned {response.status_code}: {error_detail}"
            )
            return {
                "advisory": None,
                "model": used_model,
                "error": f"Gemini API error ({response.status_code}): {error_detail}",
            }

        data = response.json()
        candidates = data.get("candidates", [])
        
        if not candidates:
            return {
                "advisory": None,
                "model": used_model,
                "error": "Gemini returned no candidates. The prompt may have been blocked.",
            }

        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        advisory_text = "".join(part.get("text", "") for part in parts)

        if not advisory_text.strip():
            return {
                "advisory": None,
                "model": used_model,
                "error": "Gemini returned an empty response.",
            }

        logger.info(
            f"Gemini advisory generated successfully "
            f"({len(advisory_text)} chars, model: {used_model})"
        )
        return {
            "advisory": advisory_text.strip(),
            "model": used_model,
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

async def generate_chat_response(query: str) -> dict:
    """
    Sends a user query to Gemini for the chatbot.
    """
    api_key = _get_api_key()

    if not api_key:
        return {
            "response": "GEMINI_API_KEY not configured.",
            "error": "Missing key"
        }

    system_prompt = (
        "You are a helpful and polite financial assistant for the 'We Win' AI Financial Advisor system. "
        "You ONLY answer the user queries about the system and basic doubts in finance effectively. "
        "Do NOT answer advanced queries. If a user asks an advanced query, politely and smoothly say a no."
    )

    request_body = {
        "contents": [
            {
                "parts": [
                    {"text": f"System Context: {system_prompt}\n\nUser Query: {query}"}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.5,
            "maxOutputTokens": 1024,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GEMINI_API_URL,
                params={"key": api_key},
                json=request_body,
                headers={"Content-Type": "application/json"},
            )
            
            used_model = GEMINI_MODEL

            if response.status_code == 429 and "quota" in response.text.lower():
                logger.warning(f"Quota exceeded for {used_model}.")

        if response.status_code != 200:
            return {
                "response": "Sorry, I am currently unavailable. Please try again later.",
                "error": f"API error ({response.status_code}): {response.text[:500]}",
            }

        data = response.json()
        candidates = data.get("candidates", [])
        
        if not candidates:
            return {
                "response": "I'm sorry, I couldn't generate a response for that.",
                "error": "No candidates",
            }

        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        response_text = "".join(part.get("text", "") for part in parts)

        return {
            "response": response_text.strip(),
            "error": None,
        }

    except Exception as e:
        logger.error(f"Chat API error: {e}")
        return {
            "response": "Sorry, I encountered an error. Please try again later.",
            "error": str(e),
        }

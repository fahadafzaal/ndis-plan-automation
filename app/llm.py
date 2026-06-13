"""LLM wrapper for the two structured-output agents.

Provider-agnostic: talks to any OpenAI-compatible gateway via the ``openai`` SDK, configured by
environment variables. Defaults to OpenCode Go (`glm-5.1`). The OpenCode Go models don't support
provider-native structured outputs, so we use JSON mode + Pydantic validation + one corrective
retry — portable across gateways (OpenCode Go, Wafer, etc.).

Robustness:
- a real request timeout (NDIS_TIMEOUT, default 120s) so a slow/hung gateway fails fast;
- a generous token budget (NDIS_MAX_TOKENS, default 16000) so reasoning models have room to emit
  the JSON after their chain-of-thought (an empty reply with finish_reason="length" means this is
  too low or the model reasons too much — raise it or pick a lighter model);
- if a JSON-mode reply comes back empty, one retry without response_format;
- live progress + finish_reason printed to the server console, and every call logged to logs/.

Environment variables:
  OPENCODE_API_KEY / NDIS_API_KEY   gateway API key (NDIS_API_KEY wins if both set)
  NDIS_BASE_URL                     OpenAI-compatible base URL (default OpenCode Go)
  NDIS_MODEL                        model id (default glm-5.1)
  NDIS_MAX_TOKENS                   max completion tokens (default 16000)
  NDIS_TIMEOUT                      per-request timeout seconds (default 120)
"""
from __future__ import annotations

import datetime as _dt
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Tuple, Type, TypeVar

from pydantic import BaseModel

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"

DEFAULT_BASE_URL = "https://opencode.ai/zen/go/v1"
# Use an instruction model (not a reasoning model). glm-5.1 burns its budget on chain-of-thought
# and returns empty content. kimi-k2.7-code only accepts temperature=1.
# deepseek-v4-flash: fast, instruction-following, returns JSON cleanly. Good default.
DEFAULT_MODEL = "deepseek-v4-flash"

T = TypeVar("T", bound=BaseModel)

_client = None

JSON_CONTRACT = (
    "\n\nYou MUST respond with a single JSON object that conforms exactly to the JSON Schema "
    "below. Output ONLY the JSON object — no markdown, no code fences, no reasoning, no "
    "commentary before or after it. Include every property defined in the schema; follow the "
    "[MISSING] / exclusion rules above for any value not present in the source.\n\nJSON Schema:\n"
)


def _api_key() -> str | None:
    return os.getenv("NDIS_API_KEY") or os.getenv("OPENCODE_API_KEY")


def _base_url() -> str:
    return os.getenv("NDIS_BASE_URL", DEFAULT_BASE_URL)


def _model_name() -> str:
    return os.getenv("NDIS_MODEL", DEFAULT_MODEL)


def _max_tokens() -> int:
    return int(os.getenv("NDIS_MAX_TOKENS", "16000"))


def _timeout() -> float:
    return float(os.getenv("NDIS_TIMEOUT", "120"))


def _progress(msg: str) -> None:
    print(f"[ndis] {msg}", file=sys.stderr, flush=True)


def get_client():
    global _client
    if _client is None:
        from openai import OpenAI  # imported lazily so the app/tests load without the SDK present

        key = _api_key()
        if not key:
            raise RuntimeError(
                "No API key set. Copy .env.example to .env and add OPENCODE_API_KEY "
                "(or NDIS_API_KEY for another OpenAI-compatible gateway)."
            )
        _client = OpenAI(base_url=_base_url(), api_key=key, timeout=_timeout(), max_retries=1)
    return _client


def _log(session_id: str, agent: str, payload: dict) -> None:
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        ts = _dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
        (LOG_DIR / f"{session_id}-{agent}-{ts}.json").write_text(
            json.dumps(payload, indent=2, default=str), encoding="utf-8"
        )
    except Exception:  # logging must never break the request
        pass


def _extract_json(text: str) -> str:
    """Pull the JSON object out of a model response (tolerates code fences / stray prose)."""
    t = (text or "").strip()
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z]*\n?", "", t)
        t = re.sub(r"\n?```$", "", t).strip()
    start, end = t.find("{"), t.rfind("}")
    if start != -1 and end > start:
        return t[start:end + 1]
    return t


def _is_param_error(exc: Exception) -> bool:
    return getattr(exc, "status_code", None) == 400 or exc.__class__.__name__ == "BadRequestError"


def _read(resp) -> Tuple[str, str, dict]:
    choice = resp.choices[0]
    msg = choice.message
    content = msg.content or ""
    reasoning = getattr(msg, "reasoning_content", None) or getattr(msg, "reasoning", None) or ""
    usage = getattr(resp, "usage", None)
    meta = {
        "finish_reason": getattr(choice, "finish_reason", None),
        "content_len": len(content),
        "has_reasoning": bool(reasoning),
        "usage": usage.model_dump() if hasattr(usage, "model_dump") else usage,
    }
    return content, reasoning, meta


_TEMP_1_MODELS = ("kimi-k2.7-code", "kimi-k2.5")  # only accept temperature=1


def _chat(messages: list, want_json: bool) -> Tuple[str, dict]:
    """One chat completion. Returns (content, meta). Handles json-mode quirks robustly."""
    client = get_client()
    temp = 1.0 if _model_name() in _TEMP_1_MODELS else 0.2
    kwargs = dict(model=_model_name(), messages=messages, max_tokens=_max_tokens(), temperature=temp)

    if not want_json:
        content, reasoning, meta = _read(client.chat.completions.create(**kwargs))
    else:
        try:
            resp = client.chat.completions.create(response_format={"type": "json_object"}, **kwargs)
        except Exception as exc:
            if not _is_param_error(exc):
                raise  # connection/timeout/auth — surface it, don't silently retry
            resp = client.chat.completions.create(**kwargs)  # gateway rejected response_format
        content, reasoning, meta = _read(resp)
        if not content.strip():  # empty under json mode -> retry once without it
            content, reasoning, meta = _read(client.chat.completions.create(**kwargs))

    # Defence-in-depth for reasoning models: if the answer field is empty but a reasoning field
    # came back, try to recover the JSON from it.
    if not content.strip() and reasoning.strip():
        content = reasoning
    return content, meta


def structured_call(
    *,
    system_prompt: str,
    user_text: str,
    output_model: Type[T],
    session_id: str,
    agent: str,
) -> T:
    """Run one structured-output LLM call and return a validated pydantic instance."""
    schema = json.dumps(output_model.model_json_schema())
    system = system_prompt + JSON_CONTRACT + schema
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_text},
    ]

    _progress(f"{agent}: calling {_model_name()} @ {_base_url()} "
              f"(max_tokens={_max_tokens()}, timeout={_timeout():.0f}s)…")
    t0 = time.monotonic()
    last_error: Exception | None = None
    raw_text, meta = "", {}

    for attempt in range(2):
        raw_text, meta = _chat(messages, want_json=True)
        _progress(f"{agent}: attempt {attempt + 1} in {time.monotonic() - t0:.1f}s — "
                  f"{meta.get('content_len', 0)} chars, finish={meta.get('finish_reason')}")

        if not raw_text.strip():
            last_error = RuntimeError(
                f"model returned empty content (finish_reason={meta.get('finish_reason')}). "
                "If finish_reason is 'length', raise NDIS_MAX_TOKENS or use a lighter model."
            )
            messages.append({"role": "user", "content":
                "Your reply was empty. Respond with ONLY the JSON object — no reasoning."})
            continue

        try:
            parsed = output_model.model_validate_json(_extract_json(raw_text))
            _log(session_id, agent, {
                "model": _model_name(), "base_url": _base_url(), "agent": agent,
                "attempt": attempt, "meta": meta, "system": system, "user": user_text,
                "raw_text": raw_text, "parsed": parsed.model_dump(),
            })
            _progress(f"{agent}: ✓ valid JSON in {time.monotonic() - t0:.1f}s")
            return parsed
        except Exception as exc:
            last_error = exc
            _progress(f"{agent}: JSON invalid ({str(exc)[:90]}), retrying")
            messages.append({"role": "assistant", "content": raw_text})
            messages.append({"role": "user", "content":
                f"Your previous reply did not validate against the schema ({exc}). "
                "Return ONLY the corrected JSON object."})

    _log(session_id, agent, {
        "model": _model_name(), "base_url": _base_url(), "agent": agent,
        "meta": meta, "system": system, "user": user_text,
        "raw_text": raw_text, "error": str(last_error),
    })
    _progress(f"{agent}: ✗ failed after 2 attempts: {last_error}")
    raise RuntimeError(
        f"{agent} did not return schema-valid JSON after 2 attempts: {last_error}. See logs/."
    )

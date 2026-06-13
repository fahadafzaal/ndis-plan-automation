"""Quick connectivity / behaviour check for the configured LLM gateway.

Run:  python check_llm.py
It loads .env, makes one tiny call, and prints exactly what came back (content, finish_reason,
whether the model used a separate reasoning field) — so a hang/empty/auth problem is obvious.
"""
from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv()

base_url = os.getenv("NDIS_BASE_URL", "https://opencode.ai/zen/go/v1")
model = os.getenv("NDIS_MODEL", "deepseek-v4-flash")
key = os.getenv("NDIS_API_KEY") or os.getenv("OPENCODE_API_KEY")

print(f"base_url : {base_url}")
print(f"model    : {model}")
print(f"key set  : {bool(key)}")
if not key:
    sys.exit("No API key — set OPENCODE_API_KEY (or NDIS_API_KEY) in .env")

from openai import OpenAI

client = OpenAI(base_url=base_url, api_key=key, timeout=30, max_retries=0)

print("\nSending a 1-line test request (30s timeout)…")
try:
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": 'Reply with this exact JSON and nothing else: {"ok": true}'}],
        max_tokens=2000,
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    choice = resp.choices[0]
    msg = choice.message
    reasoning = getattr(msg, "reasoning_content", None) or getattr(msg, "reasoning", None)
    print("finish_reason :", choice.finish_reason)
    print("content       :", repr(msg.content))
    print("has reasoning :", bool(reasoning))
    if resp.usage:
        print("usage         :", resp.usage)
    if (msg.content or "").strip():
        print("\nRESULT: gateway works and returns content. OK")
    else:
        print("\nRESULT: empty content. If finish_reason='length', raise NDIS_MAX_TOKENS or use a "
              "lighter model (deepseek-v4-flash / mimo-v2.5). If reasoning is present, the model "
              "put everything in the reasoning field.")
except Exception as exc:
    print("ERROR class :", type(exc).__name__)
    print("ERROR       :", exc)
    sc = getattr(exc, "status_code", None)
    if sc:
        print("status_code :", sc)
    print("\nRESULT: the call failed — fix the above (check base_url / model id / key) and retry.")

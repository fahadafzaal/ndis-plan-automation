"""Export rendered Markdown to .md and .pdf files.

PDF uses a pure-Python, Windows-friendly path: python-markdown -> HTML -> xhtml2pdf (no GTK or
other system dependencies).
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Dict

import markdown as md_lib

EXPORT_DIR = Path(__file__).resolve().parent.parent / "exports"

_PDF_CSS = """
@page { size: A4; margin: 1.8cm; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 10pt; color: #1a1a1a; }
h1 { font-size: 17pt; border-bottom: 2px solid #444; padding-bottom: 4px; }
h2 { font-size: 13pt; margin-top: 14px; color: #222; }
h3 { font-size: 11pt; margin-top: 10px; }
table { border-collapse: collapse; width: 100%; margin: 6px 0; }
th, td { border: 1px solid #999; padding: 4px 6px; font-size: 9pt; text-align: left; }
th { background: #eee; }
li { margin: 2px 0; }
"""


def slugify(text: str) -> str:
    text = (text or "participant").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "participant"


def write_markdown(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def write_pdf(path: Path, markdown_text: str) -> None:
    from xhtml2pdf import pisa  # imported lazily

    body = md_lib.markdown(markdown_text, extensions=["tables", "sane_lists"])
    html = f"<html><head><meta charset='utf-8'><style>{_PDF_CSS}</style></head><body>{body}</body></html>"
    with open(path, "wb") as fh:
        result = pisa.CreatePDF(src=html, dest=fh, encoding="utf-8")
    if result.err:
        raise RuntimeError(f"PDF generation failed for {path.name}")


def export_documents(participant_name: str, documents: Dict[str, str]) -> Dict[str, str]:
    """Write each document to .md and .pdf. ``documents`` maps a doc key to Markdown text.

    Returns a map of output filename -> absolute path.
    """
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    slug = slugify(participant_name)
    written: Dict[str, str] = {}

    for key, markdown_text in documents.items():
        md_path = EXPORT_DIR / f"{slug}-{key}.md"
        pdf_path = EXPORT_DIR / f"{slug}-{key}.pdf"
        write_markdown(md_path, markdown_text)
        written[md_path.name] = str(md_path)
        try:
            write_pdf(pdf_path, markdown_text)
            written[pdf_path.name] = str(pdf_path)
        except Exception as exc:  # keep the .md even if PDF tooling hiccups
            written[f"{slug}-{key}.pdf (FAILED)"] = str(exc)

    return written

#!/usr/bin/env python3
"""
Fill the Supabase variables into the auth email templates so they can be opened
in a browser.

    python3 scripts/preview-emails.py            # writes .preview.html files
    python3 scripts/preview-emails.py --check    # verify the templates are sane

The check is worth having in CI. A template that has lost `{{ .ConfirmationURL }}`
still renders perfectly and sends a sign-in email nobody can sign in with, and
the only symptom is a support message from someone locked out.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO / "docs/email-templates"
OUT_DIR = REPO / "docs/email-templates"

SAMPLE = {
    "{{ .ConfirmationURL }}": (
        "https://jadeapp.co/auth/callback?code=8f3a1c2e-4b6d-47a9-9c11-2ef0b7d5a4c8&next=%2Fpeople"
    ),
    "{{ .Email }}": "someone@example.com",
    "{{ .SiteURL }}": "https://jadeapp.co",
}

# Every template must contain these, or the email cannot do its job.
REQUIRED = ["{{ .ConfirmationURL }}", "{{ .Email }}"]

# Things that do not survive real email clients.
FORBIDDEN = [
    ("display:flex", "flexbox does not work in Outlook"),
    ("display:grid", "grid does not work in Outlook"),
    ("<style", "a <style> block is stripped by Gmail in several contexts"),
    ("fonts.googleapis.com", "web fonts do not load in most clients"),
    ("position:absolute", "absolute positioning is unsupported in Outlook"),
]


def templates() -> list[pathlib.Path]:
    return sorted(p for p in TEMPLATE_DIR.glob("*.html") if not p.name.endswith(".preview.html"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    found = templates()
    if not found:
        print("No templates found.")
        return 1

    problems: list[str] = []
    for path in found:
        html = path.read_text(encoding="utf-8")
        # Comments explain *why* these things are avoided and naturally quote
        # them. Scanning the raw file makes the documentation fail the check.
        markup = re.sub(r"<!--.*?-->", "", html, flags=re.S)

        for token in REQUIRED:
            if token not in markup:
                problems.append(f"{path.name}: missing {token}")
        for needle, why in FORBIDDEN:
            if needle in markup.lower():
                problems.append(f"{path.name}: contains {needle!r} — {why}")

        if not args.check:
            preview = html
            for token, value in SAMPLE.items():
                preview = preview.replace(token, value)
            target = OUT_DIR / f"{path.stem}.preview.html"
            target.write_text(
                '<!doctype html><meta charset="utf-8">'
                '<title>Jade email preview</title>'
                '<body style="margin:0">' + preview + "</body>",
                encoding="utf-8",
            )
            print(f"wrote {target.relative_to(REPO)}")

    if problems:
        for problem in problems:
            print(f"  {problem}")
        return 1

    print(f"{len(found)} template(s) checked, all sound.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

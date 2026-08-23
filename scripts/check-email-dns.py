#!/usr/bin/env python3
"""
Check whether the sending domain is actually ready to send.

    python3 scripts/check-email-dns.py
    python3 scripts/check-email-dns.py --domain jadeapp.co

Domain verification is the step that silently blocks everything else. Resend
will not send from an unverified domain, Supabase will report an SMTP failure
that says nothing about DNS, and the only visible symptom is that sign-in emails
stop arriving. Meanwhile DNS takes minutes to hours to propagate, so "I added
the records" and "the records are live" are different facts.

This asks a public resolver what the world can actually see, which is the
question that matters — not what a dashboard claims was saved.

Uses DNS-over-HTTPS so it works anywhere there is a network, with no dig.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request

RESOLVER = "https://dns.google/resolve"

TYPES = {"A": 1, "TXT": 16, "MX": 15, "CNAME": 5, "NS": 2}


class ResolverUnreachable(Exception):
    """The resolver could not be asked. Different from "the record is absent"."""


def query(name: str, record: str) -> list[str]:
    """
    Records for `name`, or an empty list if there genuinely are none.

    Raises rather than returning empty when the resolver cannot be reached.
    Conflating the two is how a checker tells someone their DNS is broken when
    the truth is that it could not look — which is worse than not checking, and
    sends them off editing records that were already correct.
    """
    url = f"{RESOLVER}?{urllib.parse.urlencode({'name': name, 'type': record})}"
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            payload = json.load(response)
    except Exception as exc:  # noqa: BLE001
        raise ResolverUnreachable(str(exc)) from exc
    return [answer.get("data", "").strip('"') for answer in payload.get("Answer", [])]


def report(domain: str, lookup) -> tuple[bool, list[str]]:
    """
    Turn DNS answers into lines and a verdict.

    Separated from the network so it can be tested against recorded payloads —
    the reporting is where the mistakes live, not the HTTP.
    """
    lines: list[str] = []
    ok = True

    def safe(name: str, record: str) -> list[str]:
        try:
            return lookup(name, record)
        except ResolverUnreachable as exc:
            lines.append(f"  ! could not check {record} for {name}: {exc}")
            return []

    nameservers = safe(domain, "NS")
    if nameservers:
        lines.append("Nameservers — this is where the DNS records have to be added:")
        for ns in nameservers:
            lines.append(f"  {ns}")
        host = next(
            (
                label
                for needle, label in (
                    ("vercel", "Vercel"),
                    ("cloudflare", "Cloudflare"),
                    ("domaincontrol", "GoDaddy"),
                    ("awsdns", "AWS Route 53"),
                )
                if any(needle in ns for ns in nameservers)
            ),
            None,
        )
        if host:
            lines.append(f"  -> managed by {host}. Add the records there, not at the registrar.")
    lines.append("")

    # SPF has to be checked on both hosts. Resend's usual layout puts the MX and
    # the SPF on a `send.` subdomain while the DKIM sits on the apex, so looking
    # only at the apex reports a correctly-configured domain as missing SPF —
    # and sends someone off adding a second, wrong record at the root.
    spf_host = None
    spf: list[str] = []
    for candidate in (f"send.{domain}", domain):
        found = [t for t in safe(candidate, "TXT") if t.lower().startswith("v=spf1")]
        if found:
            spf_host, spf = candidate, found
            break

    if spf:
        lines.append(f"SPF   found on {spf_host}:")
        for record in spf:
            lines.append(f"  {record}")
            if "resend" not in record and "amazonses" not in record:
                lines.append("  ! does not authorise Resend — sending will still be refused")
                ok = False
    else:
        lines.append(f"SPF   MISSING — no v=spf1 TXT on {domain} or send.{domain}")
        ok = False

    for selector_host in (f"resend._domainkey.{domain}", f"resend._domainkey.send.{domain}"):
        if safe(selector_host, "TXT"):
            lines.append(f"DKIM  found on {selector_host}")
            break
    else:
        lines.append(f"DKIM  MISSING — nothing at resend._domainkey.{domain}")
        ok = False

    # Say *which* host, because that is what tells you where the rest of the
    # records belong.
    mx_host = None
    mx: list[str] = []
    for candidate in (f"send.{domain}", domain):
        found = safe(candidate, "MX")
        if found:
            mx_host, mx = candidate, found
            break

    if mx:
        lines.append(f"MX    found on {mx_host}:")
        for record in mx:
            lines.append(f"  {record}")
        if mx_host != spf_host and spf:
            lines.append(
                f"  ! the MX is on {mx_host} but the SPF is on {spf_host} — "
                "Resend expects them on the same host"
            )
            ok = False
        elif mx_host and not spf:
            lines.append(f"  -> so the missing SPF record belongs on {mx_host}, not the apex")
    else:
        lines.append("MX    none — only needed if Resend asked for one on a send subdomain")

    dmarc = safe(f"_dmarc.{domain}", "TXT")
    lines.append(
        "DMARC found: " + dmarc[0]
        if dmarc
        else "DMARC none — optional, but worth adding once sending works"
    )
    return ok, lines


RECORDED = {
    "unverified": {
        ("example.test", "NS"): ["ns1.vercel-dns.com.", "ns2.vercel-dns.com."],
        ("example.test", "TXT"): [],
        ("send.example.test", "TXT"): [],
        ("resend._domainkey.example.test", "TXT"): [],
        ("resend._domainkey.send.example.test", "TXT"): [],
        ("send.example.test", "MX"): [],
        ("example.test", "MX"): [],
        ("_dmarc.example.test", "TXT"): [],
    },
    # Resend's real layout: MX and SPF on the send subdomain, DKIM on the apex.
    "verified": {
        ("example.test", "NS"): ["ns1.vercel-dns.com."],
        ("example.test", "TXT"): [],
        ("send.example.test", "TXT"): ["v=spf1 include:amazonses.com ~all"],
        ("resend._domainkey.example.test", "TXT"): ["p=MIGfMA0GCSq..."],
        ("send.example.test", "MX"): ["10 feedback-smtp.us-east-1.amazonses.com."],
        ("example.test", "MX"): [],
        ("_dmarc.example.test", "TXT"): ["v=DMARC1; p=none;"],
    },
    "spf-without-resend": {
        ("example.test", "NS"): ["ns1.domaincontrol.com."],
        ("example.test", "TXT"): ["v=spf1 include:_spf.google.com ~all"],
        ("send.example.test", "TXT"): [],
        ("resend._domainkey.example.test", "TXT"): ["p=abc"],
        ("resend._domainkey.send.example.test", "TXT"): [],
        ("send.example.test", "MX"): [],
        ("example.test", "MX"): [],
        ("_dmarc.example.test", "TXT"): [],
    },
    # Exactly the state jadeapp.co was in: DKIM and MX present, SPF absent.
    "dkim-and-mx-but-no-spf": {
        ("example.test", "NS"): ["ns1.vercel-dns.com."],
        ("example.test", "TXT"): [],
        ("send.example.test", "TXT"): [],
        ("resend._domainkey.example.test", "TXT"): ["p=abc"],
        ("send.example.test", "MX"): ["10 feedback-smtp.us-east-1.amazonses.com."],
        ("example.test", "MX"): [],
        ("_dmarc.example.test", "TXT"): [],
    },
}


def self_test() -> int:
    """Check the reporting against recorded answers. No network involved."""
    failures = []

    ok, lines = report("example.test", lambda n, t: RECORDED["unverified"][(n, t)])
    text = "\n".join(lines)
    if ok:
        failures.append("an unverified domain was reported as sendable")
    if "Vercel" not in text:
        failures.append("did not identify the Vercel nameservers")
    if "SPF   MISSING" not in text or "DKIM  MISSING" not in text:
        failures.append("did not report the missing records")

    ok, lines = report("example.test", lambda n, t: RECORDED["verified"][(n, t)])
    text = "\n".join(lines)
    if not ok:
        failures.append("a verified domain was reported as not sendable")
    if "DKIM  found" not in text or "SPF   found" not in text:
        failures.append("did not report the records it found")

    ok, lines = report("example.test", lambda n, t: RECORDED["spf-without-resend"][(n, t)])
    text = "\n".join(lines)
    if ok:
        failures.append("an SPF that does not authorise Resend was accepted")
    if "GoDaddy" not in text:
        failures.append("did not identify the GoDaddy nameservers")

    ok, lines = report("example.test", lambda n, t: RECORDED["dkim-and-mx-but-no-spf"][(n, t)])
    text = "\n".join(lines)
    if ok:
        failures.append("a domain with no SPF anywhere was reported as sendable")
    if "belongs on send.example.test" not in text:
        failures.append("did not say which host the missing SPF belongs on")
    if "MX    found on send.example.test" not in text:
        failures.append("did not name the host the MX was found on")

    # An unreachable resolver must never look like a missing record.
    def unreachable(_name: str, _type: str) -> list[str]:
        raise ResolverUnreachable("network down")

    _ok, lines = report("example.test", unreachable)
    if "could not check" not in "\n".join(lines):
        failures.append("an unreachable resolver was not distinguished from a missing record")

    for failure in failures:
        print(f"  FAIL {failure}")
    print("self-test: " + ("all checks passed" if not failures else f"{len(failures)} failure(s)"))
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", default="jadeapp.co")
    parser.add_argument("--self-test", action="store_true", help="check the reporting offline")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    domain = args.domain.rstrip(".")

    print(f"Checking {domain}\n")

    try:
        query(domain, "NS")
    except ResolverUnreachable as exc:
        print(f"Could not reach the DNS resolver: {exc}")
        print("Nothing was checked. This says nothing about your records.")
        return 2

    ok, lines = report(domain, query)
    for line in lines:
        print(line)

    print()
    if ok:
        print("Looks sendable. If Resend still says unverified, press its verify button again —")
        print("it re-checks on demand rather than continuously.")
        return 0

    print("Not sendable yet. Add the records Resend shows you, then re-run this.")
    print("Propagation is usually minutes; the TTL on a new record can make it longer.")
    return 1


if __name__ == "__main__":
    sys.exit(main())

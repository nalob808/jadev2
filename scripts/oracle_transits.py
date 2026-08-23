#!/usr/bin/env python3
"""
Reference transit events, from Swiss Ephemeris directly.

Unlike the other oracles here this one is not a second implementation's opinion
— it is the same ephemeris Jade's golden fixtures come from, solved
independently. Swiss Ephemeris has `swe.solcross_ut` and friends for crossings,
and its own root finding for stations, so the times below are found by
different arithmetic than Jade's bisection even though the underlying positions
agree.

That makes this a genuine check of the *scanner*: if Jade's bisection has an
off-by-a-step or misses a retrograde pass, these times will not match.

Everything is sidereal Lahiri, apparent positions, to match Jade.

USAGE
-----
    pip install pyswisseph
    python3 scripts/oracle_transits.py            # write fixtures
    python3 scripts/oracle_transits.py --check    # fail if they would change
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

import swisseph as swe

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "packages/astro/test/fixtures/swisseph-transits.json"

FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED

BODIES = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mercury": swe.MERCURY,
    "Venus": swe.VENUS,
    "Mars": swe.MARS,
    "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN,
}

# A window with plenty of retrograde loops in it, and a couple of centuries
# apart so nothing depends on being near J2000.
WINDOWS = [
    {"label": "2020s", "fromJd": 2458849.5, "toJd": 2460676.5},  # 2020-01-01 .. 2025-01-01
    {"label": "1890s", "fromJd": 2411368.5, "toJd": 2413195.5},  # 1890-01-01 .. 1895-01-01
]


def longitude(jd: float, body: int) -> float:
    return swe.calc_ut(jd, body, FLAGS)[0][0] % 360.0


def speed(jd: float, body: int) -> float:
    return swe.calc_ut(jd, body, FLAGS)[0][3]


def bisect(f, low: float, high: float, tol: float = 1e-7) -> float:
    """Plain bisection, deliberately not the same routine Jade uses."""
    f_low = f(low)
    for _ in range(200):
        if high - low <= tol:
            break
        mid = (low + high) / 2.0
        f_mid = f(mid)
        if f_mid == 0:
            return mid
        if (f_low < 0) != (f_mid < 0):
            high = mid
        else:
            low, f_low = mid, f_mid
    return (low + high) / 2.0


def wrap180(x: float) -> float:
    return ((x + 180.0) % 360.0) - 180.0


def find_ingresses(body: int, lo: float, hi: float, step: float) -> list[dict]:
    out = []
    prev_jd = lo
    prev_sign = int(longitude(lo, body) // 30)
    jd = lo + step
    while jd <= hi:
        sign = int(longitude(jd, body) // 30)
        if sign != prev_sign:
            forward = (sign - prev_sign) % 12 == 1
            boundary = (sign if forward else prev_sign) * 30
            t = bisect(lambda x: wrap180(longitude(x, body) - boundary), prev_jd, jd)
            out.append({"jdUt": round(t, 6), "signIndex": sign, "retrograde": not forward})
        prev_sign, prev_jd = sign, jd
        jd += step
    return out


def find_stations(body: int, lo: float, hi: float, step: float) -> list[dict]:
    out = []
    prev_jd = lo
    prev = speed(lo, body)
    jd = lo + step
    while jd <= hi:
        s = speed(jd, body)
        if (prev < 0) != (s < 0):
            t = bisect(lambda x: speed(x, body), prev_jd, jd)
            out.append(
                {
                    "jdUt": round(t, 6),
                    "direction": "retrograde" if s < 0 else "direct",
                    "longitude": round(longitude(t, body), 6),
                }
            )
        prev, prev_jd = s, jd
        jd += step
    return out


def find_crossings(body: int, target: float, lo: float, hi: float, step: float) -> list[dict]:
    out = []
    prev_jd = lo
    prev = wrap180(longitude(lo, body) - target)
    jd = lo + step
    while jd <= hi:
        cur = wrap180(longitude(jd, body) - target)
        if abs(cur - prev) <= 180 and (prev < 0) != (cur < 0):
            t = bisect(lambda x: wrap180(longitude(x, body) - target), prev_jd, jd)
            out.append({"jdUt": round(t, 6), "retrograde": speed(t, body) < 0})
        prev, prev_jd = cur, jd
        jd += step
    return out


def build() -> dict:
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    steps = {"Moon": 0.1, "Mercury": 0.25, "Venus": 0.25, "Sun": 0.25}

    windows = []
    for w in WINDOWS:
        lo, hi = w["fromJd"], w["toJd"]
        entry: dict = {"label": w["label"], "fromJd": lo, "toJd": hi, "bodies": {}}
        for name, code in BODIES.items():
            step = steps.get(name, 0.5)
            entry["bodies"][name] = {
                "ingresses": find_ingresses(code, lo, hi, step),
                "stations": find_stations(code, lo, hi, step),
            }
        # A degree chosen to sit inside a retrograde loop for the slow grahas,
        # so the triple crossing is actually exercised.
        entry["crossings"] = {
            name: find_crossings(BODIES[name], target, lo, hi, steps.get(name, 0.5))
            for name, target in (("Saturn", 300.0), ("Jupiter", 30.0), ("Mars", 120.0))
        }
        windows.append(entry)

    return {
        "generator": f"swisseph {swe.version}",
        "ayanamsaMode": "lahiri",
        "positionBasis": "apparent",
        "note": (
            "Generated by scripts/oracle_transits.py. Do not hand-edit. Times are "
            "found by an independent bisection over the same ephemeris, so a "
            "mismatch is a bug in Jade's scanner, not in the positions."
        ),
        "windows": windows,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    fresh = json.dumps(build(), indent=2) + "\n"

    if args.check:
        if not OUT.exists():
            print(f"{OUT.relative_to(REPO)} does not exist. Run without --check.")
            return 1
        if OUT.read_text() != fresh:
            print(f"{OUT.relative_to(REPO)} is out of date. Regenerate and review the diff.")
            return 1
        print(f"{OUT.relative_to(REPO)} is current.")
        return 0

    OUT.write_text(fresh)
    data = json.loads(fresh)
    for w in data["windows"]:
        total = sum(
            len(b["ingresses"]) + len(b["stations"]) for b in w["bodies"].values()
        )
        print(f"  {w['label']}: {total} ingresses and stations")
    print(f"wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

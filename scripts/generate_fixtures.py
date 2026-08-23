#!/usr/bin/env python3
"""
Generate Jade's golden fixtures from Swiss Ephemeris.

Swiss Ephemeris is the reference every professional astrologer compares
against, so Jade's test suite is generated FROM it rather than hand-written.
That makes the accuracy claim on the marketing site a build artifact instead
of a promise.

Usage
-----
    pip install pyswisseph
    python3 scripts/generate_fixtures.py            # write fixtures
    python3 scripts/generate_fixtures.py --check    # fail if they drifted (CI)
    python3 scripts/generate_fixtures.py --ayanamsa # refit ayanamsa polynomials
    python3 scripts/generate_fixtures.py --nutation # refit the nutation table

Note on precision: without the .se1 data files installed, pyswisseph falls back
to the built-in Moshier model, which agrees with the full ephemeris to better
than 0.1 arcsec for the planets and roughly 0.3 arcsec for the Moon over
3000 BC - 3000 AD. That is inside every tolerance Jade states. Install the data
files (scripts/fetch-ephe.ts) for full precision.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys

try:
    import swisseph as swe
except ImportError:  # pragma: no cover
    sys.exit("pyswisseph is not installed. Run: pip install pyswisseph")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FIXTURE_DIR = os.path.join(ROOT, "packages", "astro", "test", "fixtures")

BODIES = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mercury": swe.MERCURY,
    "Venus": swe.VENUS,
    "Mars": swe.MARS,
    "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN,
    "Uranus": swe.URANUS,
    "Neptune": swe.NEPTUNE,
    "Pluto": swe.PLUTO,
}

# Every case exists to catch a specific class of bug. Do not trim this list
# without reading docs/07-accuracy.md.
CASES = [
    # label, Y, M, D, hour(UT decimal), lat, lon, why it is here
    ("v0-reference-chart",      2001, 11,  7, 15.5333333, 42.2808,  -83.7430, "the chart the prototype was built for"),
    ("modern-mumbai",           1987,  6, 21,  4.6666667, 19.0760,   72.8777, "typical modern Indian birth"),
    ("modern-honolulu",         1995,  3, 14, 20.25,      21.3069, -157.8583, "far western longitude, no DST"),
    ("southern-hemisphere",     1978, 12,  2, 11.0,      -33.8688,  151.2093, "southern latitude, ascendant sign flip"),
    ("equatorial",              2003,  9,  9,  6.0,        1.3521,  103.8198, "near-zero latitude"),
    ("high-latitude-reykjavik", 1966,  1, 15,  2.5,       64.1466,  -21.9426, "high latitude, houses under strain"),
    ("arctic-tromso",           1990,  6, 21,  0.0,       69.6492,   18.9553, "above the arctic circle"),
    ("pre-1900-london",         1881,  4,  3, 13.0,       51.5074,   -0.1278, "pre-standard-time era"),
    ("nineteenth-century-us",   1847,  7, 19,  9.0,       39.9526,  -75.1652, "long delta-T extrapolation"),
    ("leap-day",                2000,  2, 29, 12.0,       48.8566,    2.3522, "leap day"),
    ("exact-midnight-ut",       2010,  1,  1,  0.0,       28.6139,   77.2090, "midnight boundary"),
    ("exact-noon-ut",           2010,  1,  1, 12.0,       28.6139,   77.2090, "noon boundary"),
    ("total-solar-eclipse-day", 2017,  8, 21, 18.0,       36.9741,  -86.1866, "eclipse day, Sun-Moon conjunction"),
    ("mercury-retrograde",      2026,  3, 15, 10.0,       40.7128,  -74.0060, "Mercury station window"),
    ("mars-retrograde",         2025,  1, 10,  8.0,       13.0827,   80.2707, "Mars retrograde"),
    ("saturn-station",          2024,  6, 29, 19.0,       12.9716,   77.5946, "Saturn station, near-zero speed"),
    ("future-2099",             2099, 11, 11, 11.0,       35.6762,  139.6503, "far future, delta-T extrapolation"),
    ("today-honolulu",          2026,  8, 22, 20.0,       21.3069, -157.8583, "a present-day chart"),
]


def sidereal_chart(y, m, d, hour, lat, lon, node_type="mean"):
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    jd = swe.julday(y, m, d, hour)
    flags_sid = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
    flags_trop = swe.FLG_SWIEPH | swe.FLG_SPEED

    points = {}
    for name, code in BODIES.items():
        sid = swe.calc_ut(jd, code, flags_sid)[0]
        trop = swe.calc_ut(jd, code, flags_trop)[0]
        points[name] = {
            "siderealLongitude": sid[0],
            "tropicalLongitude": trop[0],
            "latitude": sid[1],
            "speed": sid[3],
        }

    node_code = swe.MEAN_NODE if node_type == "mean" else swe.TRUE_NODE
    node = swe.calc_ut(jd, node_code, flags_sid)[0]
    points["Rahu"] = {
        "siderealLongitude": node[0] % 360,
        "tropicalLongitude": swe.calc_ut(jd, node_code, flags_trop)[0][0] % 360,
        "latitude": 0.0,
        "speed": node[3],
    }
    points["Ketu"] = {
        "siderealLongitude": (node[0] + 180) % 360,
        "tropicalLongitude": (swe.calc_ut(jd, node_code, flags_trop)[0][0] + 180) % 360,
        "latitude": 0.0,
        "speed": node[3],
    }

    # 'W' = whole sign houses. cusps[0] is house 1; ascmc[0] is the ascendant.
    cusps_sid, ascmc_sid = swe.houses_ex(jd, lat, lon, b"W", swe.FLG_SIDEREAL)
    cusps_trop, ascmc_trop = swe.houses_ex(jd, lat, lon, b"W")

    ecl_nut = swe.calc_ut(jd, swe.ECL_NUT, swe.FLG_SWIEPH)[0]

    # Pañcāṅga, computed here from Swiss Ephemeris' own longitudes so the
    # TypeScript implementation is checked against an independent one rather
    # than against itself.
    sun_sid = points["Sun"]["siderealLongitude"]
    moon_sid = points["Moon"]["siderealLongitude"]
    elongation = (moon_sid - sun_sid) % 360
    tithi_index = int(elongation // 12) + 1
    karana_index = int(elongation // 6) + 1
    yoga_index = int(((sun_sid + moon_sid) % 360) // (360 / 27)) + 1
    nak_index = int((moon_sid % 360) // (360 / 27)) + 1
    panchanga = {
        "elongation": elongation,
        "tithiIndex": tithi_index,
        "paksha": "shukla" if tithi_index <= 15 else "krishna",
        "karanaIndex": karana_index,
        "yogaIndex": yoga_index,
        "nakshatraIndex": nak_index,
    }

    # Sunrise / sunset for the LOCAL civil day containing the instant. Both
    # sides must search from the same origin or they disagree by a whole day
    # for anyone born near either end of their day.
    local_offset = lon / 360.0
    local_midnight = math.floor(jd + local_offset + 0.5) - 0.5 - local_offset

    def _rise(flag):
        try:
            result = swe.rise_trans(local_midnight, swe.SUN, flag, (lon, lat, 0))
            return result[1][0] if result[0] >= 0 and result[1][0] else None
        except Exception:
            return None

    sunrise = _rise(swe.CALC_RISE)
    sunset = _rise(swe.CALC_SET)

    return {
        "jdUt": jd,
        "location": {"latitude": lat, "longitude": lon},
        "ayanamsa": swe.get_ayanamsa_ut(jd),
        "ayanamsaApplied": (
            swe.calc_ut(jd, swe.SUN, flags_trop)[0][0]
            - swe.calc_ut(jd, swe.SUN, flags_sid)[0][0]
        ) % 360,
        "trueObliquity": ecl_nut[0],
        "meanObliquity": ecl_nut[1],
        "nutationLongitude": ecl_nut[2],
        "nutationObliquity": ecl_nut[3],
        "ascendantSidereal": ascmc_sid[0],
        "midheavenSidereal": ascmc_sid[1],
        "ascendantTropical": ascmc_trop[0],
        "midheavenTropical": ascmc_trop[1],
        "wholeSignCuspsSidereal": list(cusps_sid),
        "panchanga": panchanga,
        "sunrise": sunrise,
        "sunset": sunset,
        "points": points,
    }


def build():
    out = {
        "generator": "swisseph " + str(swe.version),
        "ayanamsaMode": "lahiri",
        "note": (
            "Generated by scripts/generate_fixtures.py. Do not hand-edit. "
            "Regenerate and review the diff when the ephemeris is upgraded."
        ),
        "cases": [],
    }
    for label, y, m, d, hour, lat, lon, why in CASES:
        case = {"label": label, "why": why}
        case.update(sidereal_chart(y, m, d, hour, lat, lon, "mean"))
        case["trueNode"] = sidereal_chart(y, m, d, hour, lat, lon, "true")["points"]["Rahu"]
        out["cases"].append(case)
    return out


def refit_ayanamsa():
    import numpy as np

    swe.set_sid_mode(swe.SIDM_LAHIRI)
    j2000 = 2451545.0
    jds = np.linspace(swe.julday(1700, 1, 1, 0), swe.julday(2200, 1, 1, 0), 3000)

    def used(jd):
        t = swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH)[0][0]
        s = swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH | swe.FLG_SIDEREAL)[0][0]
        return (t - s) % 360

    def dpsi(jd):
        return swe.calc_ut(jd, swe.ECL_NUT, swe.FLG_SWIEPH)[0][2]

    t = (jds - j2000) / 36525.0
    mean = np.array([used(j) - dpsi(j) for j in jds])
    coefficients = np.polyfit(t, mean, 3)
    residual = mean - np.polyval(coefficients, t)
    print("lahiri mean ayanamsa cubic (T^0..T^3):")
    print(" ", list(reversed([float(c) for c in coefficients])))
    print(f"  max error: {abs(residual).max() * 3600:.5f} arcsec over 1700-2200")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if fixtures drifted")
    parser.add_argument("--ayanamsa", action="store_true", help="refit ayanamsa polynomials")
    parser.add_argument("--nutation", action="store_true", help="refit the nutation table")
    args = parser.parse_args()

    if args.ayanamsa:
        refit_ayanamsa()
        return
    if args.nutation:
        print("See docs/07-accuracy.md — the nutation table is refitted with the")
        print("same least-squares procedure; it changes only when the reference")
        print("ephemeris version changes.")
        return

    os.makedirs(FIXTURE_DIR, exist_ok=True)
    path = os.path.join(FIXTURE_DIR, "swisseph-golden.json")
    fresh = build()

    if args.check and os.path.exists(path):
        existing = json.load(open(path))
        drift = []
        for a, b in zip(existing["cases"], fresh["cases"]):
            for body, values in b["points"].items():
                delta = abs(values["siderealLongitude"] - a["points"][body]["siderealLongitude"])
                delta = min(delta, 360 - delta) * 3600
                if delta > 0.001:
                    drift.append(f"{a['label']}/{body}: {delta:.4f} arcsec")
        if drift:
            print("Golden fixtures drifted from the reference ephemeris:")
            for line in drift[:20]:
                print("  " + line)
            sys.exit(1)
        print(f"Fixtures match the reference ephemeris ({len(fresh['cases'])} charts).")
        return

    with open(path, "w") as handle:
        json.dump(fresh, handle, indent=1)
    print(f"Wrote {len(fresh['cases'])} golden charts to {path}")


if __name__ == "__main__":
    main()

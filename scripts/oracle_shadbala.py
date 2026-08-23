#!/usr/bin/env python3
"""
Differential oracle: ṣaḍbala sub-components, via PyJHora.

Ṣaḍbala is six strengths built from about twenty sub-components, and
`shad_bala` returns only the six aggregates. Matching an aggregate means
guessing conventions for everything inside it until the number agrees — which
is fitting to a tool rather than implementing from a text, and is exactly how a
plausible-but-wrong ṣaḍbala gets shipped.

The module exposes each sub-component separately, so this emits them one by
one. A disagreement then localises to a single rule instead of a bucket.

Two of them are recorded specially:

  * `dig` is emitted under both of PyJHora's methods, because it ships two and
    where an implementation ships alternatives the sources disagree.
  * `cheshta` uses `_cheshta_bala_new`; the older `_cheshta_bala` raises in this
    version of the package.

See scripts/oracle_jhora.py for the licence position. PyJHora is AGPL-3.0, is a
developer tool, and never ships.

USAGE
-----
    pip install PyJHora
    python3 scripts/oracle_shadbala.py            # write fixtures
    python3 scripts/oracle_shadbala.py --check    # fail if they would change
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
GOLDEN = REPO / "packages/astro/test/fixtures/swisseph-golden.json"
OUT = REPO / "packages/astro/test/fixtures/jhora-shadbala.json"

GRAHAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]


def configure():
    import swisseph as swe
    from jhora.panchanga import drik

    drik.PLANET_FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
    drik.set_ayanamsa_mode("LAHIRI")
    return drik


def build() -> dict:
    drik = configure()
    from jhora import utils
    from jhora.horoscope.chart import charts
    from jhora.horoscope.chart import strength as st

    golden = json.loads(GOLDEN.read_text())
    cases: dict[str, dict] = {}
    skipped: list[dict] = []
    failures: dict[str, str] = {}

    for case in golden["cases"]:
        label = case["label"]
        jd = case["jdUt"]
        place = drik.Place(
            "x", case["location"]["latitude"], case["location"]["longitude"], 0.0
        )
        try:
            positions = charts.rasi_chart(jd, place)
        except Exception as exc:  # noqa: BLE001
            skipped.append({"label": label, "reason": str(exc)})
            continue

        navamsa = charts.divisional_chart(jd, place, divisional_chart_factor=9)
        drekkana = charts.divisional_chart(jd, place, divisional_chart_factor=3)
        drekkana_p2h = utils.get_planet_to_house_dict_from_chart(
            utils.get_house_planet_list_from_planet_positions(drekkana)
        )

        components = {
            "uchcha": lambda: st._uchcha_bala(positions),
            "ojayugma": lambda: st._ojayugama_bala(positions, navamsa),
            "drekkana": lambda: st._drekkana_bala(drekkana_p2h),
            "sapthavargaja": lambda: st._sapthavargaja_bala(jd, place),
            "kendra": lambda: st._kendra_bala(positions),
            "dig_method1": lambda: st._dig_bala(jd, place, method=1),
            "dig_method2": lambda: st._dig_bala(jd, place, method=2),
            "nathonnath": lambda: st._nathonnath_bala(jd, place),
            "paksha": lambda: st._paksha_bala(jd, place),
            "tribhaga": lambda: st._tribhaga_bala(jd, place),
            "abda": lambda: st._abda_bala(jd, place),
            "masa": lambda: st._masa_bala(jd, place),
            "vaara": lambda: st._vaara_bala(jd, place),
            "hora": lambda: st._hora_bala(jd, place),
            "ayana": lambda: st._ayana_bala(jd, place),
            "yuddha": lambda: st._yuddha_bala(jd, place),
            "cheshta": lambda: st._cheshta_bala_new(jd, place),
            "naisargika": lambda: st._naisargika_bala(),
            "drik": lambda: st._drik_bala(jd, place),
        }

        row: dict[str, object] = {}
        for name, fn in components.items():
            try:
                values = fn()
                row[name] = {
                    GRAHAS[i]: round(float(values[i]), 6) for i in range(len(GRAHAS))
                }
            except Exception as exc:  # noqa: BLE001
                # Recorded as null, not zero. "The oracle could not answer" and
                # "the value is zero" are different facts.
                row[name] = None
                failures.setdefault(name, str(exc)[:120])

        # The aggregates, for a second opinion on the totals.
        try:
            agg = st.shad_bala(jd, place)
            row["total_rupas"] = {GRAHAS[i]: round(float(agg[7][i]), 6) for i in range(7)}
        except Exception as exc:  # noqa: BLE001
            row["total_rupas"] = None
            failures.setdefault("shad_bala", str(exc)[:120])

        cases[label] = row

    return {
        "generator": "PyJHora (Jagannātha Hora), AGPL-3.0 — developer tool, never shipped",
        "ayanamsaMode": "lahiri",
        "positionBasis": "apparent",
        "note": (
            "Generated by scripts/oracle_shadbala.py. Do not hand-edit. Values are "
            "in virupas (sixtieths of a rupa) except total_rupas. A null means the "
            "reference raised, which is recorded rather than flattened to zero."
        ),
        "componentFailures": failures,
        "skipped": skipped,
        "cases": cases,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    fresh = json.dumps(build(), indent=2, ensure_ascii=False) + "\n"

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
    print(f"wrote {OUT.relative_to(REPO)}: {len(data['cases'])} charts")
    if data["componentFailures"]:
        for name, why in data["componentFailures"].items():
            print(f"  component unavailable: {name} — {why}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

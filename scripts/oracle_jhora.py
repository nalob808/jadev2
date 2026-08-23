#!/usr/bin/env python3
"""
Differential oracle: Jagannātha Hora, via PyJHora.

WHAT THIS IS
------------
A developer tool. It runs Jagannātha Hora's arithmetic over the same birth
moments as `packages/astro/test/fixtures/swisseph-golden.json` and writes the
results out as fixtures, so Jade's own implementations of ashtakavarga,
shadbala and the yogas can be diffed against a reference instead of against
someone's memory of a textbook.

WHAT THIS IS NOT
----------------
PyJHora is **AGPL-3.0**. It is not a dependency of Jade, it is never installed
by `pnpm install`, and no Jade code imports it. Linking it into a hosted
product — even server-side, even privately — would oblige Jade to be released
in full, which is the same trap Swiss Ephemeris sets.

The line this script holds:

  * Techniques are implemented in `packages/astro` from the classical sources
    (BPHS and its commentaries), then *checked* here. This file's output is
    the check, not the source.
  * PyJHora's code is not read for logic and not transcribed.
  * What lands in the repository is numbers — computed values for specific
    moments. Facts about a chart, not expression.

See `docs/07-accuracy.md` for the full position.

USAGE
-----
    pip install PyJHora
    python3 scripts/oracle_jhora.py            # write fixtures
    python3 scripts/oracle_jhora.py --check    # fail if they would change
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
GOLDEN = REPO / "packages/astro/test/fixtures/swisseph-golden.json"
OUT = REPO / "packages/astro/test/fixtures/jhora-oracle.json"

# jhora's planet indices, in its own order. Index 7/8 are the nodes, which
# take no part in ashtakavarga.
JHORA_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

# The nodes sit at jhora indices 7 and 8. They take no part in ashtakavarga,
# but they do count as grahas for jhora's lunar and solar yogas, so the yoga
# comparison needs their signs.
NODE_INDEX = {"Rahu": 7, "Ketu": 8}

# Jade's yoga ids -> the oracle's detector name. Only the yogas Jade implements
# are pulled; the oracle carries roughly 260, and most of those are cited
# without their cancellation rules.
YOGA_DETECTORS = {
    "ruchaka": "ruchaka_yoga_from_planet_positions",
    "bhadra": "bhadra_yoga_from_planet_positions",
    "hamsa": "hamsa_yoga_from_planet_positions",
    "malavya": "maalavya_yoga_from_planet_positions",
    "sasa": "sasa_yoga_from_planet_positions",
    "gaja_kesari": "gaja_kesari_yoga_from_planet_positions",
    "budha_aditya": "budha_aaditya_yoga_from_planet_positions",
    "chandra_mangala": "chandra_mangala_yoga_from_planet_positions",
    "adhi": "adhi_yoga_from_planet_positions",
    "sunapha": "sunaphaa_yoga_from_planet_positions",
    "anapha": "anaphaa_yoga_from_planet_positions",
    "durudhura": "duradhara_yoga_from_planet_positions",
    "kemadruma": "kemadruma_yoga_from_planet_positions",
    "vesi": "vesi_yoga_from_planet_positions",
    "vasi": "vosi_yoga_from_planet_positions",
    "ubhayachari": "ubhayachara_yoga_from_planet_positions",
}


def configure():
    """
    Pin PyJHora to Jade's conventions.

    Both of these matter and neither is the default:

      * Ayanamsa LAHIRI. PyJHora defaults to TRUE_PUSHYA.
      * Apparent positions. PyJHora defaults to SEFLG_TRUEPOS (true/geometric),
        Jade uses apparent. Left alone, every comparison is off by up to 55
        arcseconds and real technique bugs hide inside that noise.
    """
    import swisseph as swe
    from jhora.panchanga import drik

    drik.PLANET_FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
    drik.set_ayanamsa_mode("LAHIRI")
    return drik


def build() -> dict:
    drik = configure()
    from jhora import utils
    from jhora.horoscope.chart import ashtakavarga as av
    from jhora.horoscope.chart import charts
    from jhora.horoscope.chart import dosha as dosha_mod
    from jhora.horoscope.chart import yoga as yoga_mod

    golden = json.loads(GOLDEN.read_text())
    cases = {}
    skipped = []

    for case in golden["cases"]:
        label = case["label"]
        place = drik.Place(
            "x", case["location"]["latitude"], case["location"]["longitude"], 0.0
        )
        try:
            positions = charts.rasi_chart(case["jdUt"], place)
        except Exception as exc:  # noqa: BLE001
            # arctic-tromso: PyJHora derives the ascendant through Placidus,
            # which is undefined above the Arctic Circle. Jade uses whole-sign
            # and handles it, which is why that fixture exists.
            skipped.append({"label": label, "reason": str(exc)})
            continue

        house_to_planet = utils.get_house_planet_list_from_planet_positions(positions)
        bhinna_rows, sarva, _detail = av.get_ashtaka_varga(house_to_planet)

        # bhinna_rows is 8 rows of 12: the seven grahas in jhora's order, then
        # the ascendant. Each row is indexed by sign, Aries first.
        bhinna = {name: bhinna_rows[i] for i, name in enumerate(JHORA_ORDER)}
        bhinna["Ascendant"] = bhinna_rows[7]

        yogas = {}
        for key, fn in YOGA_DETECTORS.items():
            try:
                yogas[key] = bool(getattr(yoga_mod, fn)(positions))
            except Exception:  # noqa: BLE001
                # A detector that raises is recorded as null rather than false.
                # "The oracle could not answer" and "the yoga is absent" are
                # different facts, and collapsing them hides a broken check.
                yogas[key] = None

        by_key = {key: value for key, value in positions}

        # Maṅgala doṣa, geometry only: the 1st house included (PyJHora omits it
        # by default, which is not the classical reading) and its own exception
        # handling switched off, so this compares the house test and nothing else.
        manglik = bool(
            dosha_mod.manglik(
                positions,
                manglik_reference_planet="L",
                include_lagna_house=True,
                include_2nd_house=True,
                apply_exceptions=False,
            )[0]
        )

        cases[label] = {
            "ascendantSignIndex": positions[0][1][0],
            "signIndexes": {
                **{name: positions[i + 1][1][0] for i, name in enumerate(JHORA_ORDER)},
                **{name: by_key[i][0] for name, i in NODE_INDEX.items() if i in by_key},
            },
            # Degrees within the sign. Needed for mulatrikona and debilitation,
            # which are degree-bounded and not sign-bounded.
            "degreesInSign": {
                name: round(positions[i + 1][1][1], 9)
                for i, name in enumerate(JHORA_ORDER)
            },
            "bhinnashtakavarga": bhinna,
            "sarvashtakavarga": sarva,
            "yogas": yogas,
            "manglikFromLagna": manglik,
        }

    return {
        "generator": "PyJHora (Jagannātha Hora), AGPL-3.0 — developer tool, never shipped",
        "ayanamsaMode": "lahiri",
        "positionBasis": "apparent",
        "note": (
            "Generated by scripts/oracle_jhora.py. Do not hand-edit. "
            "These are reference values, not Jade's output: a diff means Jade "
            "disagrees with Jagannātha Hora and one of them is wrong."
        ),
        "skipped": skipped,
        "cases": cases,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="exit non-zero if the fixtures on disk differ from a fresh run",
    )
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
    print(f"wrote {OUT.relative_to(REPO)}: {len(data['cases'])} charts", end="")
    if data["skipped"]:
        print(f", {len(data['skipped'])} skipped ({data['skipped'][0]['label']})")
    else:
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())

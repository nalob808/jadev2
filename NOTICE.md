# Third-party assets and licences

## Astrological symbols

The twelve zodiac signs and the seven visible grahas (Sun, Moon, Mars,
Mercury, Jupiter, Venus, Saturn) are drawn from the **Astrological Symbols**
set by **Telllu**, used under the licence purchased for this project. The
path data lives in `packages/ui/src/glyphs.tsx`.

Rāhu, Ketu and the lagna marker are **not** from that set — no Western symbol
pack includes them — and are drawn for this project. They are the three
`kind: 'drawn'` entries in the same file.

If the licence for the Telllu set is ever in doubt, those nineteen glyphs are
the only thing that has to be replaced: the file's two-kind structure means a
substitute set can be dropped into the `filled` entries without touching
anything that renders them.

## Ephemeris

Positions are computed by the provider configured in `packages/astro`. Swiss
Ephemeris, if enabled, is AGPL-3.0 or commercially licensed — see
`docs/07-accuracy.md`.

## The 3D sphere spike (`/spike/sphere`, not in production)

**Yale Bright Star Catalogue**, as packaged by Bretton Wade in
[brettonw/YaleBrightStarCatalog](https://github.com/brettonw/YaleBrightStarCatalog)
— MIT licence, Copyright (c) 2016 Bretton Wade. `apps/web/public/sky/bsc-v6.0.bin`
is derived from it by `scripts/build-star-catalogue.ts` (pinned commit). Not
HYG, whose CC BY-SA 4.0 ShareAlike would attach to the shipped file.

**Fira Sans Condensed** Medium, Copyright (c) 2012-2015 The Mozilla Foundation
and Telefonica S.A., SIL Open Font License 1.1 (no Reserved Font Name), subset
to Latin + Latin Extended Additional as
`apps/web/public/sky/fira-sans-condensed-500-iast.woff`. Licence text beside it
in `OFL-FiraSansCondensed.txt`. Used because Barlow Condensed has no
underdotted IAST glyphs — see `docs/10-sphere-spike.md`.

The same subset now serves the whole app as the **"Jade IAST"** fallback face
(`apps/web/src/fonts/`, declared in `apps/web/src/app/fonts.css`, licence text
beside it), limited by `unicode-range` to Latin Extended Additional so it
supplies only the underdotted letters Barlow, Barlow Condensed and IBM Plex Mono
lack. It is also embedded in the generated visual-system assets
(`assets/visual-system/`, licence copied to `notices/`).

## Tools that are not dependencies

**PyJHora** (AGPL-3.0) has been used as a _reference implementation_ for
cross-checking calculations during development. It is not a dependency, is
not vendored, and is never imported by Jade.

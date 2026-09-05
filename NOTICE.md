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

## Tools that are not dependencies

**PyJHora** (AGPL-3.0) has been used as a _reference implementation_ for
cross-checking calculations during development. It is not a dependency, is
not vendored, and is never imported by Jade.

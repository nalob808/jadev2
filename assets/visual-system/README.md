# Jade visual-system assets

Open **index.html** in a browser to explore the working visual system. The preview runs locally and uses the same React/SVG components and shared instrument store as Jade. All scripts, fonts and styles are included; no account or network request is required.

For a local web preview, run `python3 -m http.server 3187 --directory assets/visual-system` from the project root, then open `http://localhost:3187`.

## Contents

- `index.html`, `preview.js`, `preview.css`, `fonts/`: portable interactive instrument with the wheel, nakṣatra ring, graphic ephemeris, aṣṭakavarga graphics and daśā timeline.
- `nakshatra-ring.svg`: all 27 nakṣatras and 108 padas, natal/transit positions and tārā shading.
- `graphic-ephemeris-{longitude,rashi,nakshatra}.svg`: the three dials, generated from the same computed series.
- `ashtakavarga.svg`: sarva radial profile and eight contributor graphics.
- `kaksha-transits.svg`: Jupiter and Saturn through their kakṣās.
- `dasha-timeline.svg`: proportional periods with a Saturn/sarva context band and labelled example event pins.
- `data.json`: reproducible demo inputs; `manifest.json`: file inventory and calculation settings.
- `notices/`: licences for the bundled code/fonts and the project's glyph attribution.

The fixture is Jade's existing public demonstration chart: 7 November 2001, 10:32 Ann Arbor, Julian Day 2452221.147222221. The preview's initial cursor is **28 September 2026, 00:00 UTC**. Its “Today” control refers to that fixed demonstration date. Event annotations are fictional examples. No workspace or client records are included.

Settings are explicit: Lahiri ayanāṁśa, mean lunar nodes, apparent geocentric positions, whole-sign houses and a 365.25-day Vimśottarī year. Charts show ecliptic longitude; latitude is not plotted. The astronomy-engine provider is the existing **interactive** provider. These exports are reproducible visual assets, not reference-provider certificates for consultation dates.

## Regenerate

From the project root:

```sh
pnpm exec tsx apps/web/scripts/build-visual-assets.tsx
```

The source components live in `packages/ui/src/charts/`; pure calculations live in `packages/astro/src/`; the connected production page is `/people/[id]/instrument`.

The brief requests dated notes. Jade's notes have no event-date field, so the production timeline reads dated `life_events` records, including their recorded precision. It does not mistake a note's creation time for an event date.

The SVGs retain editable text and embed the display/mono fonts. Glyph paths remain covered by Jade's existing Telllu licence; this asset package does not grant additional redistribution rights to that glyph set.

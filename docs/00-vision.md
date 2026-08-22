# 00 — Vision, market and positioning

## The gap, in one table

What exists today, and what it costs (all figures verified August 2026):

| Product                           | Price                  | What it is                                                | What it lacks                                                                       |
| --------------------------------- | ---------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Jagannātha Hora                   | Free                   | The deepest Jyotiṣa engine ever shipped                   | Windows-only, closed-source, 2005-era UI, no client layer, effectively unmaintained |
| Kala                              | $255 one-time          | Nine+ dasha systems, professional Vedic desktop           | Desktop-only, no web, no client layer                                               |
| Shri Jyoti Star                   | $295 one-time          | 36+ chart screens, respected by pros                      | Windows desktop, no collaboration, no mobile                                        |
| Parashara's Light                 | $299–$700              | Industry standard in India, 5,000+ calculations           | Desktop, dated, proprietary engine                                                  |
| Solar Fire                        | $360 one-time          | The Western pro standard, 30+ house systems               | **Windows only**, no CRM, static reports                                            |
| Sirius / Kepler                   | $430 one-time          | Western + some Vedic, harmonics, research                 | Windows only, no modern workspace                                                   |
| Astro Gold                        | $200 one-time          | Mac/iPad native                                           | Platform-locked, thinner feature set                                                |
| Astrolium                         | $29/mo                 | Closest thing to a modern web workspace, has a CRM        | Western/Hellenistic-leaning; Vedic depth is not its game                            |
| LUNA                              | $7.99/mo               | Modern UI, Swiss Ephemeris, Hellenistic                   | Small feature set, light CRM                                                        |
| AstrologyPro                      | **$97/mo** + setup fee | Booking, video, CRM, branded page, payments               | **Almost no astrology** — it's a business layer with a chart bolted on              |
| AstroSage / AstroTalk             | Free / marketplace     | Mass market. AstroTalk did ₹1,214 crore in FY25, +85% YoY | Consumer-grade output; not a practitioner's tool                                    |
| Co-Star / The Pattern / Sanctuary | Free–$20/mo            | Consumer horoscope apps                                   | No professional use case at all                                                     |

**Read that table again and the opening is obvious.** The deep Vedic engines are desktop
software from the 2000s with no client layer. The modern web tools with a client layer are
Western-leaning and astrologically shallow. And the one product already charging $97/month is
charging it for _booking and video calls_ — not for astrology.

Nobody owns the intersection: **deep Jyotiṣa + modern web + the practitioner's workday.**
That is Jade.

## Positioning statement

> Jade is the practice OS for Vedic astrologers. Classical depth computed to the arcsecond,
> a client book that knows every chart in it, and timing intelligence that tells you which of
> your clients needs to hear from you this week.

Not "an astrology app." A **professional instrument**, in the sense that Figma is an
instrument, or Linear, or a DAW. The aesthetic bar is set by tools people are proud to have
open on their screen during a paid consultation.

## Who we're building for, in order

1. **The working consulting astrologer.** 5–60 clients. Charges $75–$400 per reading.
   Currently: Jagannātha Hora in a Windows VM + Google Calendar + Notion + Canva + a PDF
   exporter. Spends 30–60 minutes preparing for each session by hand. This person is the
   $99/month customer and everything is aimed at them.
2. **The serious student.** Studying under a teacher, casting 20 charts a week for practice,
   wants correct varga charts and a place to keep notes. $19/month.
3. **The astrologically fluent friend-of-the-practice.** Knows their nakṣatra and their
   current dasha, wants their own chart and the charts of the people they love, and wants it
   to be beautiful. Free → $9/month. This is user #1 for Jade — the person this started for —
   and the top of the funnel for everyone else.
4. **Later: institutes and API customers.** Schools that need 200 student seats; apps that
   need a Vedic calculation API.

## The three moats

Anyone can render a chart wheel. These are the things that get harder to copy over time:

1. **Verified accuracy.** A published, versioned, public accuracy report — every planet,
   every varga, every dasha boundary, cross-checked against Swiss Ephemeris and the classical
   desktop tools, with the tolerances stated. Professionals do not switch tools on vibes; they
   switch when the numbers match to the arcsecond and someone proves it. See `07-accuracy.md`.
2. **The prediction ledger.** Jade asks the astrologer to log what they predicted and, later,
   what actually happened — tied to the exact dasha, transit and yoga that prompted it. Over a
   year this becomes the practitioner's own research corpus, searchable across their whole
   client book ("show me every Saturn–Moon transit I flagged and what came of it"). No
   competitor has this. It compounds, and it makes leaving painful in the best way.
3. **The book-wide sky.** Because Jade holds every client chart, it can answer questions no
   desktop tool can: _which of my clients is entering Sade Sati this quarter? Who has a dasha
   change in the next 60 days? Which five people should I email about the eclipse?_ This turns
   a calculation tool into a business development tool, which is what actually justifies $99.

## What we refuse to build

Saying no is part of the positioning.

- **A marketplace.** We are not competing with AstroTalk for per-minute consult economics. We
  sell tools to practitioners; we do not take a cut of their readings or disintermediate them.
- **Fortune-telling automation.** No "you will get married in 2027." Jade names factors and
  timing windows; the astrologer supplies the judgement. This is both an ethics line and a
  legal one.
- **Death, disease and litigation predictions.** Ever. Enforced in code.
- **A generic Western app with Vedic bolted on.** Western tropical support arrives as a
  first-class _second_ tradition in Phase 8, once the Vedic side is unarguably the best in the
  world — not before.
- **Free-form AI horoscopes.** Interpretation must cite its computed factors.

## Sources

- [Astrolium — best astrology software 2026 comparison](https://astrolium.com/compare/best-astrology-software)
- [Bharat Ephemeris — Vedic platform comparison](https://bharatephemeris.com/compare)
- [AstrologyPro pricing](https://www.astrologypro.com/pricing)
- [Astrology app statistics 2026](https://astrologyapi.com/blog/astrology-app-statistics)

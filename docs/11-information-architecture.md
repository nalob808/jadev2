# 11 — Information architecture

_Where everything lives, and the rule that keeps it there._

## The problem this fixes

By the end of phase 16 the app had forty-six routes and a ten-item menu, and the
menu was a hand-kept array inside `Shell.tsx`. Three of the newest surfaces —
the instrument, the plain reading, the event search — were reachable only from a
sentence on one other page, or from nothing at all. Nobody decided that. Adding
a route simply did not touch the menu, so the menu drifted behind the app.

Ten flat items was also the wrong shape, not just the wrong length. It put
`Wheel`, `Houses` and `Timing` — which are ways of looking at **one person** —
next to `People`, `Sessions` and `Notes`, which are places you go. Clicking
`Houses` with nobody chosen is a question, not a destination.

## The model

Jade has two kinds of surface, and flattening them is what broke the menu.

**Sections** are places. They mean something with no chart open: your week, your
people, the sky, the library, your practice. There are five, they are the
masthead, and they do not grow — a sixth word is a sign that two of them should
have been one.

**Lenses** are ways of looking at one subject: the sheet, the houses, the plain
reading, the instrument, that person's timing, a report, a rectification. A lens
is meaningless without a subject, so lenses live in the **subject bar** beside
the name of the person they are lenses on — never in the masthead.

That gives three rows of chrome, in this order:

1. **The masthead** — five section words, plus the account corner. Never changes.
2. **The section row** — the parts of whichever section you are in. Changes with
   the section; absent where a section has no parts.
3. **The subject bar** — who you are looking at, the birth data the chart was
   cast from, and the seven lenses. Present on every surface that is about one
   person, including `/wheel?person=` and `/timing?person=`.

The birth line belongs in the subject bar for a second reason beyond navigation:
a degree only means something given the moment it was cast for, and a screen of
positions with the birth data scrolled off the top invites reading the wrong
chart.

## Where it is written down

`apps/web/src/lib/nav.ts` — all of it, as data. Sections, their parts, the
lenses, and `UNLINKED`: the routes deliberately absent from the menu, each with
its reason. `Shell.tsx` and `/map` both render from it, so neither can describe a
menu that is no longer there.

## The rule

**A page either appears in the map, or it is named in `UNLINKED` with a reason.**

`nav.test.ts` walks the `app` directory and enforces both halves — an orphaned
route fails, and a menu word pointing at a route somebody deleted fails too. It
reads the filesystem rather than a list, because a list would need exactly the
maintenance the menu needed.

## Two decisions worth recording

**`/library` exists as well as `/charts`.** `/charts` is the public, indexable
page, written for somebody arriving from a search result; it renders the
marketing chrome. A practitioner wants something the public page cannot offer —
to put a library chart underneath one of their own — so the menu's Library word
lands on `/library`, inside the app's chrome, and the public pages are one marked
link away rather than a trapdoor out of the app.

**Crossing back from the reading host is an absolute URL.** `read.jadeapp.co`
rewrites every path that does not begin with `/read` into the reading group, so a
relative `/people/abc` link on that host resolves to `/read/people/abc` and 404s
— in production only, since development serves both surfaces from localhost.
`workbenchHref()` handles the crossing, deriving the app origin by dropping the
`read.` prefix so it cannot be forgotten in an environment.

## What is still not solved

- `/charts/[slug]` and the other public figure pages still render the marketing
  header, so a signed-in practitioner following `public page ↗` leaves the app
  chrome. The link is marked, which is honest, but a session-aware public page
  would be better.
- `/legacy`, the v0 prototype, and `/spike/sphere` are in `UNLINKED` as labs.
  The sphere is unfinished — no `prefers-reduced-motion`, no pause control, no
  `aria` — and must not be linked to users until it is.

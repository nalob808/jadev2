# Jade — project constitution

You are working on Jade, a professional Vedic astrology platform. Read this file fully
before touching code. When something here conflicts with a habit or a default, this file wins.

## What Jade is

A subscription web app for people who practise astrology seriously — professional Jyotiṣīs,
serious students, and the astrologically fluent. It combines three things that today live in
three different (or zero) products:

1. **Correct classical mathematics** — the depth of Kala / Shri Jyoti Star / Jagannātha Hora.
2. **A modern, fast, beautiful interface** — which none of those have.
3. **The practice layer** — client book, session prep, notes, reports, alerts.

## The $100 test

Every feature proposal must answer one question: _does this save a working astrologer an
hour of their week, or let them charge more for their work?_ If it does neither, it is not a
Professional-tier feature no matter how clever it is. Put it in the consumer tier or cut it.

## Non-negotiables

1. **Accuracy is the product.** A wrong degree is a bug of the highest severity. Every
   calculation ships with tests against a golden fixture set (see `docs/07-accuracy.md`).
   Never "approximate for now" in the calculation core — approximation belongs behind an
   explicit, labelled flag or nowhere.
2. **The calculation core is pure.** `packages/astro` has no database, no network, no React,
   no `Date.now()` inside functions. Time is always an explicit argument. This is what makes
   it testable, cacheable, and portable to the browser.
3. **No silent defaults in astrology settings.** Ayanāṁśa, node type (mean/true), house
   system, and dasha variant are always explicit, always persisted with the chart, and always
   visible in the UI. Two astrologers disagreeing about ayanāṁśa is normal; a tool that hides
   which one it used is unusable.
4. **Birth data is sensitive personal data.** Encrypt at rest, never log it, never send it to
   a third-party model without explicit per-workspace consent, and always support export and
   hard delete.
5. **Interpretation is grounded.** Any generated interpretive text must be derived from
   computed factors that are shown alongside it. No free-floating prose. If we can't name the
   yoga, the dasha, and the transit that produced a statement, we don't print the statement.
6. **Never predict death, disease, or legal outcomes.** Hard product rule, enforced in the
   interpretation layer and in the terms of service.

## Working rules for agents

- **Work phase by phase.** `docs/05-phases.md` is the order. Do not start a phase whose
  acceptance criteria depend on an unfinished earlier phase.
- **Types before implementation.** Define the interfaces in `packages/astro/src/types.ts`
  (or the relevant package) and get them reviewed before writing the bodies.
- **Tests are part of the phase, not a follow-up.** A phase is not complete until its
  acceptance tests pass in CI.
- **Small commits, conventional messages** (`feat(astro): vimshottari to prāṇa level`).
- **Never commit ephemeris data files or `.env`.** Data files are fetched by a setup script.
- **When astrological sources disagree** (and they will — e.g. Ashtakavarga reduction rules,
  Mangal Dosha cancellation), do not pick one silently. Implement the variants behind a named
  option, default to the most widely used, and document the disagreement in
  `docs/03-calculation-spec.md`.
- **Sanskrit terms**: use IAST in code identifiers only where it is unambiguous ASCII
  (`vimshottari`, `ashtakavarga`); use proper diacritics in user-facing strings, with a plain
  transliteration always available in the UI.

## Vocabulary (use these words consistently)

| Term            | Meaning in this codebase                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Subject**     | A person (or entity, or event) a chart can be cast for.                                                                 |
| **Birth event** | A dated, timed, located moment belonging to a subject. A subject may have several (birth, rectified birth, relocation). |
| **Chart**       | A computed result derived from a birth event + a settings profile. Always reproducible, never hand-edited.              |
| **Reading**     | A saved analytical view — chart + settings + selected techniques + notes.                                               |
| **Session**     | A consultation with a client, with prep, notes, and follow-ups.                                                         |
| **Watch**       | A standing rule that fires an alert when a sky condition becomes true for a subject.                                    |
| **Workspace**   | One practice. Owns subjects, sessions, branding, and the subscription.                                                  |

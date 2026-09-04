import { SIGNS, type ComputedChart, type DashaPeriod, type SessionTransits } from '@jade/astro';
import { houseSignification } from './significations/houses.js';
import { grahaSignification } from './significations/grahas.js';
import { permitted, type GroundedStatement, type ReadingSection } from './reading.js';

/**
 * The prep sheet.
 *
 * This is the hour a practitioner currently spends before a reading, and the
 * whole justification for a Practitioner tier. It is worth being precise about
 * what makes it valuable, because the obvious version of this feature is
 * worthless.
 *
 * The obvious version prints the chart again. The practitioner already knows
 * the chart. What they do not have at their fingertips, five minutes before
 * somebody arrives, is:
 *
 *  1. **Exactly where this person is in their daśā, and when it next changes.**
 *     Not "Venus–Saturn" — that they remember. The date the antara turns over,
 *     because that is what they will be asked and it is tedious to work out.
 *  2. **The dated transit contacts either side of today**, with all three
 *     passes of a retrograde loop, because those are the dates that get
 *     written on a piece of paper and handed over.
 *  3. **What was said last time**, which after forty clients is genuinely
 *     unrecoverable from memory.
 *
 * Everything here is composed from computed factors and carries them
 * (constitution item 5), and everything runs through the same forbidden-topic
 * filter as every other composer (item 6) rather than a second copy of it.
 *
 * ## The line this feature must not cross
 *
 * A prep sheet lists what is *there*. It never says what it means for the
 * person, never rates a period good or bad, and never suggests what to tell
 * them. The moment it does, it stops being preparation and becomes a script —
 * and a script read out by a practitioner who has not checked it is exactly
 * the failure mode that makes generated astrology worthless.
 */

export interface PrepSheet {
  readonly sections: readonly ReadingSection[];
  /** Dates worth writing down, already sorted. Rendered as a table, not prose. */
  readonly diary: readonly PrepDiaryEntry[];
  /** How long since the previous session, in days. Null when this is the first. */
  readonly daysSinceLast: number | null;
}

export interface PrepDiaryEntry {
  readonly jdUt: number;
  readonly headline: string;
  readonly detail: string;
}

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

function withinSign(longitude: number): string {
  return degrees((((longitude % 360) + 360) % 360) % 30);
}

function signOf(longitude: number): string {
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)]!;
}

export interface PrepInput {
  /** Innermost last, as `dashaChainAt` returns it. */
  readonly dasha?: readonly DashaPeriod[];
  readonly transits?: SessionTransits;
  /** The consultation moment. Everything dated is relative to this. */
  readonly sessionJd: number;
  /** Previous sessions with this person, most recent first. */
  readonly previous?: readonly { jdUt: number; summary: string | null }[];
  readonly openFollowUps?: readonly { body: string; dueOn: string | null }[];
  /** Recent notes about this person, most recent first. */
  readonly recentNotes?: readonly { body: string; anchorLabel: string | null }[];
}

/**
 * How many days until a period ends. Negative means it has already turned,
 * which the caller should never see but which is printed honestly if it does.
 */
function daysUntil(fromJd: number, toJd: number): number {
  return Math.round(toJd - fromJd);
}

function periodLabel(period: DashaPeriod, chart: ComputedChart): string {
  const point = chart.points[period.lord];
  if (!point) return period.lord;
  const house = point.house != null ? `${ORDINALS[point.house - 1]} house` : 'no counted house';
  return `${period.lord} in the ${house}`;
}

export function prepSheetFor(chart: ComputedChart, input: PrepInput): PrepSheet {
  const sections: ReadingSection[] = [];
  const diary: PrepDiaryEntry[] = [];
  const { sessionJd } = input;

  // ------------------------------------------------------- where they are
  if (input.dasha && input.dasha.length > 0) {
    const statements: GroundedStatement[] = [];
    const chain = input.dasha;

    statements.push({
      text: `The chain running at this consultation is ${chain.map((p) => p.lord).join(' → ')}.`,
      factors: chain.map((p) => ({
        kind: 'period',
        detail: `${p.lord}: ${periodLabel(p, chart)}`,
      })),
      anchor: {
        kind: 'dasha',
        key: chain.map((p) => p.lord).join('/'),
        label: chain.map((p) => p.lord).join('–'),
      },
    });

    // The detail that actually saves time: when each level turns over. A
    // practitioner is asked "how long does this last" in almost every reading
    // and works it out by hand almost every time.
    for (const period of chain) {
      const days = daysUntil(sessionJd, period.endJd);
      const level =
        chain.indexOf(period) === 0
          ? 'mahādaśā'
          : chain.indexOf(period) === 1
            ? 'antardaśā'
            : 'pratyantardaśā';
      // Pluralised properly. "about 1 years" is the kind of seam that makes a
      // document a practitioner reads aloud from look machine-made, and this
      // one is read aloud to a paying client.
      const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? '' : 's'}`;
      const when =
        days > 400
          ? `about ${plural(Math.round(days / 365.25), 'year')} from the session`
          : days > 60
            ? `about ${plural(Math.round(days / 30.4), 'month')} from the session`
            : days >= 0
              ? `${plural(days, 'day')} from the session`
              : `${plural(Math.abs(days), 'day')} before the session — this chain had already turned`;

      statements.push({
        text: `The ${period.lord} ${level} runs out ${when}.`,
        factors: [
          { kind: 'level', detail: level },
          { kind: 'lord', detail: periodLabel(period, chart) },
        ],
        anchor: { kind: 'dasha', key: period.lord, label: `${period.lord} ${level}` },
      });

      // Only the two inner levels are diary-worthy. A mahādaśā ending in nine
      // years is not a date anybody writes down.
      if (days >= 0 && days <= 400 && level !== 'mahādaśā') {
        diary.push({
          jdUt: period.endJd,
          headline: `${period.lord} ${level} ends`,
          detail: `Next level begins. ${periodLabel(period, chart)}.`,
        });
      }
    }

    // What the innermost lord governs — the one thing about the period that is
    // a chart fact rather than a date.
    const inner = chain[chain.length - 1];
    if (inner) {
      const point = chart.points[inner.lord];
      const lib = grahaSignification(inner.lord);
      if (point && lib && point.house != null) {
        const houseLib = houseSignification(point.house);
        statements.push({
          text: `${inner.lord} sits at ${withinSign(point.longitude)} ${signOf(point.longitude)} in the ${ORDINALS[point.house - 1]}, so this period runs through ${houseLib ? houseLib.keywords.slice(0, 3).join(', ') : 'that house'}.`,
          factors: [
            {
              kind: 'placement',
              detail: `${inner.lord} ${degrees(point.longitude)} · ${ORDINALS[point.house - 1]} house`,
            },
            { kind: 'signifies', detail: lib.karaka.slice(0, 4).join(', ') },
          ],
          anchor: { kind: 'graha', key: inner.lord, label: inner.lord },
        });
      }
    }

    sections.push({
      id: 'prep-dasha',
      kicker: 'Where they are',
      title: 'The period running',
      lede: 'Dates are computed from the birth moment on record. If the birth time is uncertain, so are they.',
      statements: statements.filter(permitted),
    });
  }

  // ------------------------------------------------ what the sky is doing
  if (input.transits) {
    const statements: GroundedStatement[] = [];
    const { contacts, stations, placements } = input.transits;

    for (const placement of placements) {
      if (placement.house == null) continue;
      const houseLib = houseSignification(placement.house);
      statements.push({
        text: `${placement.body} is transiting the ${ORDINALS[placement.house - 1]}${placement.retrograde ? ', retrograde' : ''} — ${houseLib ? houseLib.keywords.slice(0, 3).join(', ') : 'that house'}.`,
        factors: [
          {
            kind: 'position',
            detail: `${withinSign(placement.longitude)} ${placement.sign}${placement.retrograde ? ' ℞' : ''}`,
          },
          { kind: 'house', detail: `${ORDINALS[placement.house - 1]} from the natal ascendant` },
        ],
        anchor: {
          kind: 'house',
          key: String(placement.house),
          label: `${ORDINALS[placement.house - 1]} house`,
        },
      });
    }

    for (const contact of contacts) {
      const passNote = contact.pass > 1 ? ` (pass ${contact.pass} of the retrograde loop)` : '';
      const houseNote =
        contact.targetHouse != null ? ` in the ${ORDINALS[contact.targetHouse - 1]}` : '';
      diary.push({
        jdUt: contact.jdUt,
        headline: `${contact.body} reaches natal ${contact.target}`,
        detail: `${degrees(contact.targetLongitude)}${houseNote}${passNote}${contact.retrograde ? ' · retrograde' : ''}`,
      });
    }

    for (const station of stations) {
      diary.push({
        jdUt: station.jdUt,
        headline: `${station.body} turns ${station.direction}`,
        detail: `${withinSign(station.longitude)} ${station.sign}${station.house != null ? ` · ${ORDINALS[station.house - 1]} house` : ''}`,
      });
    }

    // Said once, plainly: a list of contacts is not a list of events in
    // somebody's life.
    sections.push({
      id: 'prep-transits',
      kicker: 'What the sky is doing',
      title: 'Slow transits to this chart',
      lede: 'Positions and contact dates only. What any of it means for this person is your reading, not the software’s.',
      statements: statements.filter(permitted),
    });
  }

  // -------------------------------------------------------- since last time
  const since: GroundedStatement[] = [];
  const previous = input.previous ?? [];
  const daysSinceLast = previous[0] ? Math.round(sessionJd - previous[0].jdUt) : null;

  for (const followUp of input.openFollowUps ?? []) {
    since.push({
      text: followUp.body,
      factors: [
        {
          kind: 'raised',
          detail: followUp.dueOn ? `to revisit by ${followUp.dueOn}` : 'to revisit next time',
        },
      ],
    });
  }

  for (const note of (input.recentNotes ?? []).slice(0, 6)) {
    since.push({
      text: note.body,
      factors: [{ kind: 'note', detail: note.anchorLabel ?? 'about the whole chart' }],
    });
  }

  if (since.length > 0) {
    sections.push({
      id: 'prep-history',
      kicker: 'Since last time',
      title:
        daysSinceLast == null
          ? 'What you have written'
          : `${daysSinceLast} days since the last session`,
      // Deliberately unfiltered by `permitted`: these are the practitioner's
      // own words, not generated text. Constitution item 6 constrains what
      // Jade says, not what a professional may record about their own client.
      statements: since,
    });
  }

  diary.sort((a, b) => a.jdUt - b.jdUt);
  return { sections, diary, daysSinceLast };
}

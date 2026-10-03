import { SIGNS, type Graha, type PointId, type WatchRule } from '@jade/astro';

/**
 * Turning a submitted form into a watch rule, or refusing to.
 *
 * ## Why this is a module and not fifteen lines in the action
 *
 * A watch is the one thing in Jade a user writes that a *service* later
 * executes, unattended, against every chart they own. A malformed rule does
 * not fail where it was typed; it fails at three in the morning inside a job,
 * for one workspace, in a way nobody sees until the alerts stop. So the rule
 * is validated once, here, against the same discriminated union the evaluator
 * switches on — and anything that is not a valid rule never reaches the table.
 *
 * ## The shape of the answer
 *
 * `parseWatchForm` returns either a rule or a reason. Not a rule or null: a
 * form that rejects without saying what was wrong is a form people abandon,
 * and the reasons here are written to be shown.
 *
 * ## Why the union is re-checked rather than trusted
 *
 * `rule` is a `jsonb` column, so the database accepts any shape. The evaluator
 * has an exhaustiveness guard that fails to compile on an unhandled kind, and
 * that guard protects it from *Jade* adding a kind without handling it. It
 * does nothing about a row that was already wrong when it was written. This is
 * the other half.
 */

/** The four kinds, with what each is for, in the order a form should offer them. */
export const WATCH_KINDS = [
  {
    id: 'transitCrossing',
    label: 'A graha reaches a natal point',
    blurb: 'Saturn arrives on your Moon. The one most alerts are.',
  },
  {
    id: 'ingress',
    label: 'A graha changes sign',
    blurb: 'Optionally only into one sign, or only into one house of this chart.',
  },
  {
    id: 'station',
    label: 'A graha turns',
    blurb: 'Retrograde or direct, optionally only in one house.',
  },
  {
    id: 'dashaChange',
    label: 'A daśā period begins',
    blurb: 'At whichever level you work with, optionally only for one lord.',
  },
] as const satisfies readonly { id: WatchRule['kind']; label: string; blurb: string }[];

/**
 * The bodies a watch may name.
 *
 * The outers are absent deliberately. A watch fires against a chart, and a
 * chart only carries Uranus, Neptune and Pluto when the profile asks for
 * them — so a rule naming one would evaluate for some of a practice's charts
 * and silently not for others. The ascendant and midheaven are here as natal
 * points but never as transiting ones, because they do not transit.
 */
export const TRANSITING_BODIES: readonly PointId[] = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
];

export const NATAL_POINTS: readonly PointId[] = [...TRANSITING_BODIES, 'Ascendant', 'Midheaven'];

export const DASHA_LORDS: readonly Graha[] = [
  'Ketu',
  'Venus',
  'Sun',
  'Moon',
  'Mars',
  'Rahu',
  'Jupiter',
  'Saturn',
  'Mercury',
];

export const DASHA_LEVELS = [
  { level: 1, label: 'Mahādaśā', blurb: 'Years. A handful in a life.' },
  { level: 2, label: 'Antardaśā', blurb: 'Months to years. The usual working level.' },
  { level: 3, label: 'Pratyantardaśā', blurb: 'Weeks to months.' },
] as const;

/** The longest window a watch may look ahead, and the default. */
export const HORIZON_CHOICES = [30, 90, 180, 365, 730] as const;
export const DEFAULT_HORIZON_DAYS = 120;

export type ParsedWatch =
  | { readonly ok: true; readonly rule: WatchRule; readonly horizonDays: number }
  | { readonly ok: false; readonly reason: string };

function read(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}

/** An optional whole number in a range, or undefined, or an error. */
function optionalIndex(raw: string, max: number, what: string): { value?: number; error?: string } {
  if (raw === '' || raw === 'any') return {};
  if (!/^\d{1,2}$/.test(raw)) return { error: `${what} is not a number.` };
  const value = Number(raw);
  if (value < 0 || value > max) return { error: `${what} is out of range.` };
  return { value };
}

export function parseWatchForm(form: FormData): ParsedWatch {
  const kind = read(form, 'kind');

  const horizonRaw = read(form, 'horizonDays');
  const horizonDays = horizonRaw === '' ? DEFAULT_HORIZON_DAYS : Number(horizonRaw);
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 1825) {
    return { ok: false, reason: 'Look-ahead must be between 1 and 1825 days.' };
  }

  switch (kind) {
    case 'transitCrossing': {
      const transiting = read(form, 'transiting');
      const natalPoint = read(form, 'natalPoint');
      if (!TRANSITING_BODIES.includes(transiting as PointId)) {
        return { ok: false, reason: 'Pick a graha to watch.' };
      }
      if (!NATAL_POINTS.includes(natalPoint as PointId)) {
        return { ok: false, reason: 'Pick a natal point for it to reach.' };
      }
      return {
        ok: true,
        horizonDays,
        rule: {
          kind: 'transitCrossing',
          transiting: transiting as PointId,
          natalPoint: natalPoint as PointId,
        },
      };
    }

    case 'ingress': {
      const transiting = read(form, 'transiting');
      if (!TRANSITING_BODIES.includes(transiting as PointId)) {
        return { ok: false, reason: 'Pick a graha to watch.' };
      }
      const sign = optionalIndex(read(form, 'intoSign'), 11, 'Sign');
      if (sign.error) return { ok: false, reason: sign.error };
      const house = optionalIndex(read(form, 'intoHouse'), 12, 'House');
      if (house.error) return { ok: false, reason: house.error };
      if (house.value !== undefined && house.value < 1) {
        return { ok: false, reason: 'Houses are numbered 1 to 12.' };
      }
      /*
       * Both at once is accepted by the type and is almost always a mistake:
       * a given sign IS a given house for a given chart, so naming both either
       * says the same thing twice or can never fire. Refused with the reason,
       * rather than stored as a rule that silently never matches.
       */
      if (sign.value !== undefined && house.value !== undefined) {
        return {
          ok: false,
          reason:
            'Choose a sign or a house, not both — for one chart they are the same thing, so a rule naming both can never fire.',
        };
      }
      return {
        ok: true,
        horizonDays,
        rule: {
          kind: 'ingress',
          transiting: transiting as PointId,
          ...(sign.value !== undefined ? { intoSign: sign.value } : {}),
          ...(house.value !== undefined ? { intoHouse: house.value } : {}),
        },
      };
    }

    case 'station': {
      const transiting = read(form, 'transiting');
      if (!TRANSITING_BODIES.includes(transiting as PointId)) {
        return { ok: false, reason: 'Pick a graha to watch.' };
      }
      /* The luminaries never station, and the mean nodes are always
         retrograde — a station rule on any of them can never fire. */
      if (['Sun', 'Moon', 'Rahu', 'Ketu'].includes(transiting)) {
        return {
          ok: false,
          reason: `${transiting} never stations, so this rule could never fire. Watch a sign change instead.`,
        };
      }
      const direction = read(form, 'direction');
      if (direction !== '' && direction !== 'retrograde' && direction !== 'direct') {
        return { ok: false, reason: 'A station is either retrograde or direct.' };
      }
      const house = optionalIndex(read(form, 'inHouse'), 12, 'House');
      if (house.error) return { ok: false, reason: house.error };
      if (house.value !== undefined && house.value < 1) {
        return { ok: false, reason: 'Houses are numbered 1 to 12.' };
      }
      return {
        ok: true,
        horizonDays,
        rule: {
          kind: 'station',
          transiting: transiting as PointId,
          ...(direction === '' ? {} : { direction }),
          ...(house.value !== undefined ? { inHouse: house.value } : {}),
        },
      };
    }

    case 'dashaChange': {
      const level = Number(read(form, 'level'));
      if (!DASHA_LEVELS.some((one) => one.level === level)) {
        return { ok: false, reason: 'Pick a daśā level.' };
      }
      const lord = read(form, 'lord');
      if (lord !== '' && !DASHA_LORDS.includes(lord as Graha)) {
        return { ok: false, reason: 'That is not one of the nine daśā lords.' };
      }
      return {
        ok: true,
        horizonDays,
        rule: {
          kind: 'dashaChange',
          level,
          ...(lord === '' ? {} : { lord: lord as Graha }),
        },
      };
    }

    default:
      return { ok: false, reason: 'Pick what to watch for.' };
  }
}

/**
 * A rule, said the way the person who wrote it would say it.
 *
 * The stored rule is a small object and the list has to read as sentences, or
 * a practitioner with fifteen watches cannot tell them apart at a glance.
 * Deliberately not stored alongside the rule: a label written once would not
 * follow a change to the rule, and a list that lies about what it is watching
 * is worse than a list of objects.
 */
export function describeWatch(rule: WatchRule): string {
  switch (rule.kind) {
    case 'transitCrossing':
      return `${rule.transiting} reaches natal ${rule.natalPoint}`;
    case 'ingress': {
      if (rule.intoSign !== undefined) {
        return `${rule.transiting} enters ${SIGNS[rule.intoSign] ?? `sign ${rule.intoSign}`}`;
      }
      if (rule.intoHouse !== undefined) return `${rule.transiting} enters the ${rule.intoHouse}th`;
      return `${rule.transiting} changes sign`;
    }
    case 'station': {
      const turn = rule.direction === undefined ? 'turns' : `turns ${rule.direction}`;
      return rule.inHouse === undefined
        ? `${rule.transiting} ${turn}`
        : `${rule.transiting} ${turn} in the ${rule.inHouse}th`;
    }
    case 'dashaChange': {
      const level = DASHA_LEVELS.find((one) => one.level === rule.level)?.label ?? 'period';
      return rule.lord === undefined
        ? `Any ${level.toLowerCase()} begins`
        : `${rule.lord} ${level.toLowerCase()} begins`;
    }
  }
}

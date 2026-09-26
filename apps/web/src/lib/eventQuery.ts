import { SIGNS, type EventClause, type Graha, type PointId } from '@jade/astro';

/**
 * Event-search clauses, in and out of a URL.
 *
 * ## Why the query lives in the address bar
 *
 * The same three reasons the wheel's selection does. A search is reloadable, the
 * back button walks previous searches, and a compound question — "Saturn on her
 * Moon during a Saturn period" — becomes a link you can send to a colleague or
 * keep in a case file. A query held in component state is a question you have to
 * re-ask by hand every time.
 *
 * The encoding is deliberately readable: `contact:Saturn:Moon`, not base64 of a
 * JSON blob. Someone editing it by hand is a feature, which is also why every
 * parse failure is dropped rather than thrown — a mistyped URL should return a
 * narrower search, never a stack trace.
 */

const BODIES: readonly PointId[] = [
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

/** The natal points worth aiming a transit at. */
export const TARGETS: readonly PointId[] = [
  'Ascendant',
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

const GRAHAS: readonly Graha[] = [
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

export const SCANNABLE_BODIES: readonly PointId[] = BODIES;

const isBody = (value: string): value is PointId => (BODIES as readonly string[]).includes(value);
const isGraha = (value: string): value is Graha => (GRAHAS as readonly string[]).includes(value);

/** `contact:Saturn:Moon` → a clause, or null if it is not one. */
export function parseClause(raw: string): EventClause | null {
  const [kind, second, third] = raw.split(':');
  if (!kind || !second) return null;

  switch (kind) {
    case 'contact': {
      if (!isBody(second) || !third || !isBody(third)) return null;
      return { kind: 'contact', body: second, target: third };
    }
    case 'ingress': {
      if (!isBody(second)) return null;
      if (third === undefined || third === '') return { kind: 'ingress', body: second };
      const sign = Number.parseInt(third, 10);
      if (!Number.isInteger(sign) || sign < 0 || sign > 11) return null;
      return { kind: 'ingress', body: second, sign };
    }
    case 'station': {
      if (!isBody(second)) return null;
      if (third === 'retrograde' || third === 'direct') {
        return { kind: 'station', body: second, direction: third };
      }
      return { kind: 'station', body: second };
    }
    case 'lord': {
      if (!isGraha(second)) return null;
      if (third === undefined || third === '') return { kind: 'lord', lord: second };
      const level = Number.parseInt(third, 10);
      if (level !== 1 && level !== 2 && level !== 3) return null;
      return { kind: 'lord', lord: second, level };
    }
    case 'degree': {
      if (!isBody(second) || !third) return null;
      const longitude = Number.parseFloat(third);
      if (!Number.isFinite(longitude) || longitude < 0 || longitude >= 360) return null;
      return { kind: 'degree', body: second, longitude };
    }
    default:
      return null;
  }
}

export function serialiseClause(clause: EventClause): string {
  switch (clause.kind) {
    case 'contact':
      return `contact:${clause.body}:${clause.target}`;
    case 'ingress':
      return clause.sign === undefined
        ? `ingress:${clause.body}`
        : `ingress:${clause.body}:${clause.sign}`;
    case 'station':
      return clause.direction === undefined
        ? `station:${clause.body}`
        : `station:${clause.body}:${clause.direction}`;
    case 'lord':
      return clause.level === undefined
        ? `lord:${clause.lord}`
        : `lord:${clause.lord}:${clause.level}`;
    case 'degree':
      return `degree:${clause.body}:${clause.longitude.toFixed(2)}`;
  }
}

/** Every `c=` param, parsed, bad ones dropped. Order is preserved. */
export function parseClauses(raw: string | string[] | undefined): EventClause[] {
  const list = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  return list
    .flatMap((entry) => entry.split(','))
    .map((entry) => parseClause(entry.trim()))
    .filter((clause): clause is EventClause => clause !== null);
}

/**
 * The questions a practitioner actually asks, as one click each.
 *
 * An empty query builder is a blank page with nine dropdowns on it, and the
 * honest answer to "what do I do with this" is "you already have to know". The
 * presets are the answer: each one is a real technique, and running one then
 * shows exactly how its clauses were built, so the builder becomes readable by
 * example rather than by documentation.
 */
export interface Preset {
  readonly key: string;
  readonly label: string;
  readonly note: string;
  readonly clauses: readonly EventClause[];
  readonly withinDays: number;
}

export const PRESETS: readonly Preset[] = [
  {
    key: 'sade-sati',
    label: 'Saturn arrives on the natal Moon',
    note: 'The contact at the centre of sade sati. Three passes, because Saturn retrogrades over the degree.',
    clauses: [{ kind: 'contact', body: 'Saturn', target: 'Moon' }],
    withinDays: 30,
  },
  {
    key: 'saturn-in-period',
    label: 'Saturn reaches the Moon while a Saturn period runs',
    note: 'The transit and the daśā agreeing. The classical reason to read a date twice, and the query no other tool will build for you.',
    clauses: [
      { kind: 'contact', body: 'Saturn', target: 'Moon' },
      { kind: 'lord', lord: 'Saturn' },
    ],
    withinDays: 120,
  },
  {
    key: 'jupiter-lagna',
    label: 'Jupiter crosses the lagna',
    note: 'Jupiter over the rising degree — once every twelve years, give or take the retrograde loop.',
    clauses: [{ kind: 'contact', body: 'Jupiter', target: 'Ascendant' }],
    withinDays: 30,
  },
  {
    key: 'both-slow',
    label: 'Jupiter and Saturn both on natal points',
    note: 'Both slow grahas landing within a season of each other. Rare, and worth knowing about in advance.',
    clauses: [
      { kind: 'contact', body: 'Jupiter', target: 'Moon' },
      { kind: 'contact', body: 'Saturn', target: 'Sun' },
    ],
    withinDays: 90,
  },
  {
    key: 'saturn-sign',
    label: 'Saturn changes sign',
    note: 'Every entry, including the ones it backs out of and makes again — all three are real dates.',
    clauses: [{ kind: 'ingress', body: 'Saturn' }],
    withinDays: 30,
  },
  {
    key: 'jupiter-station-period',
    label: 'Jupiter stations during its own period',
    note: 'A stationary graha holds one degree for weeks, so whatever it sits on is contacted far longer than a date suggests.',
    clauses: [
      { kind: 'station', body: 'Jupiter' },
      { kind: 'lord', lord: 'Jupiter' },
    ],
    withinDays: 120,
  },
];

export const SIGN_OPTIONS = SIGNS.map((name, index) => ({ value: String(index), label: name }));

/**
 * Clauses from the builder's own form fields.
 *
 * The form posts `body0`/`kind0`/`arg0` per row rather than a pre-encoded
 * clause, because a `<select>` cannot compose one without JavaScript and this
 * page deliberately ships none. So the translation happens here, on the server,
 * on the way in.
 *
 * An incomplete row is **dropped, never guessed**. A "reaches natal…" row with
 * no natal point chosen could plausibly default to the Moon, and that is exactly
 * the silent default the constitution forbids (#3): the reader would get an
 * answer to a question they did not ask and no sign that it happened. Dropping
 * it means the echoed query shows one condition instead of two, which is visible.
 */
export function clausesFromForm(
  params: Record<string, string | string[] | undefined>,
  slots = 2,
): EventClause[] {
  const one = (key: string): string => {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    return (first ?? '').trim();
  };

  const out: EventClause[] = [];
  for (let slot = 0; slot < slots; slot += 1) {
    const body = one(`body${slot}`);
    const kind = one(`kind${slot}`);
    const arg = one(`arg${slot}`);
    if (!body || !kind) continue;

    if (kind === 'contact') {
      // Needs a target; an unchosen one is not a default, it is a missing answer.
      if (!arg || /^\d+$/.test(arg)) continue;
      const clause = parseClause(`contact:${body}:${arg}`);
      if (clause) out.push(clause);
      continue;
    }
    if (kind === 'ingress') {
      // The sign is genuinely optional here: "Saturn changes sign" is a whole
      // question, so an empty arg widens rather than breaks.
      const clause = parseClause(/^\d+$/.test(arg) ? `ingress:${body}:${arg}` : `ingress:${body}`);
      if (clause) out.push(clause);
      continue;
    }
    if (kind === 'station') {
      const clause = parseClause(`station:${body}`);
      if (clause) out.push(clause);
      continue;
    }
    if (kind === 'lord') {
      const clause = parseClause(`lord:${body}`);
      if (clause) out.push(clause);
    }
  }
  return out;
}

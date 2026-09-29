import { norm360 } from '../angles.js';

/**
 * Degree-based aspects, with orbs — the second aspect engine.
 *
 * Jade's first and default engine is whole-sign dṛṣṭi (`drishti.ts`): Saturn
 * aspects the third, seventh and tenth signs from itself, and a graha either
 * aspects a sign or it does not. That is the classical model, it is what the
 * yogas and the aṣṭakavarga reasoning are built on, and it does not change.
 *
 * This module adds the other model, in which an aspect is an angle between two
 * points and holds within an orb. Sextiles and trines live here. Many sidereal
 * practitioners read both; some read only one. So both ship, neither is
 * implied, and the wheel prints which engine drew its lines — CLAUDE.md item 3
 * is about the ayanāṁśa but the principle is the same, and an aspect line whose
 * rule is unstated is exactly the kind of silent default it forbids.
 *
 * ## The angles are generated, not typed
 *
 * Every aspect is a harmonic: the nth harmonic divides the circle into n, and
 * the kth of those divisions is an angle of 360k/n. A trine is the first
 * division of the third harmonic; a septile is the first of the seventh, which
 * is 51°25′42.86″ and is the sort of number that gets mistyped when a table is
 * entered by hand. Storing (n, k) and computing the angle means the seconds are
 * right by construction, and it makes the family relationships — septile,
 * bi-septile, tri-septile — visible in the data rather than implied by naming.
 *
 * ## Applying and separating
 *
 * A pair moving toward exactness is read differently from a pair moving apart,
 * which is why orbs are configured separately for each. Deciding which is which
 * needs speed, so `AspectPoint.speed` is optional and its absence is handled
 * explicitly rather than assumed: with no speed, the wider of the two orbs is
 * used and nothing is reported as applying. Guessing a direction of motion
 * would be worse than declining to.
 */

export type AspectType = 'major' | 'minor';
export type AspectQuality = 'hard' | 'soft';

export interface AspectDefinition {
  readonly id: string;
  readonly name: string;
  readonly glyph: string;
  /** Divide the circle into this many parts. */
  readonly harmonic: number;
  /** Take this many of them. Always coprime with the harmonic, or it reduces. */
  readonly multiple: number;
  readonly type: AspectType;
  readonly quality: AspectQuality;
  /** Degrees, applying then separating, as the settings form starts them. */
  readonly defaultOrb: readonly [number, number];
  readonly defaultOn: boolean;
}

/** The exact angle an aspect stands for, in degrees. */
export function aspectAngle(definition: Pick<AspectDefinition, 'harmonic' | 'multiple'>): number {
  return (360 * definition.multiple) / definition.harmonic;
}

/**
 * The set.
 *
 * Majors on by default at 4°, minors off at 1 to 2°, which is where most
 * software starts and is a defensible place to argue from rather than a claim
 * that these are the right orbs. They are settings precisely because
 * astrologers disagree about them.
 */
export const ASPECTS: readonly AspectDefinition[] = [
  {
    id: 'conjunction',
    name: 'Conjunction',
    glyph: '☌',
    harmonic: 1,
    multiple: 0,
    type: 'major',
    quality: 'hard',
    defaultOrb: [4, 4],
    defaultOn: true,
  },
  {
    id: 'opposition',
    name: 'Opposition',
    glyph: '☍',
    harmonic: 2,
    multiple: 1,
    type: 'major',
    quality: 'hard',
    defaultOrb: [4, 4],
    defaultOn: true,
  },
  {
    id: 'trine',
    name: 'Trine',
    glyph: '△',
    harmonic: 3,
    multiple: 1,
    type: 'major',
    quality: 'soft',
    defaultOrb: [4, 4],
    defaultOn: true,
  },
  {
    id: 'square',
    name: 'Square',
    glyph: '□',
    harmonic: 4,
    multiple: 1,
    type: 'major',
    quality: 'hard',
    defaultOrb: [4, 4],
    defaultOn: true,
  },
  {
    id: 'sextile',
    name: 'Sextile',
    glyph: '⚹',
    harmonic: 6,
    multiple: 1,
    type: 'major',
    quality: 'soft',
    defaultOrb: [4, 4],
    defaultOn: true,
  },

  {
    id: 'quintile',
    name: 'Quintile',
    glyph: 'Q',
    harmonic: 5,
    multiple: 1,
    type: 'minor',
    quality: 'soft',
    defaultOrb: [1.5, 1],
    defaultOn: false,
  },
  {
    id: 'bi-quintile',
    name: 'Bi-Quintile',
    glyph: 'bQ',
    harmonic: 5,
    multiple: 2,
    type: 'minor',
    quality: 'soft',
    defaultOrb: [1.5, 1],
    defaultOn: false,
  },
  {
    id: 'septile',
    name: 'Septile',
    glyph: 'S',
    harmonic: 7,
    multiple: 1,
    type: 'minor',
    quality: 'soft',
    defaultOrb: [1, 1],
    defaultOn: false,
  },
  {
    id: 'bi-septile',
    name: 'Bi-Septile',
    glyph: 'bS',
    harmonic: 7,
    multiple: 2,
    type: 'minor',
    quality: 'soft',
    defaultOrb: [1, 1],
    defaultOn: false,
  },
  {
    id: 'tri-septile',
    name: 'Tri-Septile',
    glyph: 'tS',
    harmonic: 7,
    multiple: 3,
    type: 'minor',
    quality: 'soft',
    defaultOrb: [1, 1],
    defaultOn: false,
  },
  {
    id: 'semi-square',
    name: 'Semi-Square',
    glyph: '∠',
    harmonic: 8,
    multiple: 1,
    type: 'minor',
    quality: 'hard',
    defaultOrb: [2, 1.5],
    defaultOn: false,
  },
  {
    id: 'sesquiquadrate',
    name: 'Sesquiquadrate',
    glyph: '⚼',
    harmonic: 8,
    multiple: 3,
    type: 'minor',
    quality: 'hard',
    defaultOrb: [2, 1.5],
    defaultOn: false,
  },
  {
    id: 'novile',
    name: 'Novile',
    glyph: 'N',
    harmonic: 9,
    multiple: 1,
    type: 'minor',
    quality: 'soft',
    defaultOrb: [1, 1],
    defaultOn: false,
  },
  {
    id: 'bi-novile',
    name: 'Bi-Novile',
    glyph: 'bN',
    harmonic: 9,
    multiple: 2,
    type: 'minor',
    quality: 'soft',
    defaultOrb: [1, 1],
    defaultOn: false,
  },
  {
    id: 'quad-novile',
    name: 'Quad-Novile',
    glyph: 'qN',
    harmonic: 9,
    multiple: 4,
    type: 'minor',
    quality: 'soft',
    defaultOrb: [1, 1],
    defaultOn: false,
  },
  {
    id: 'decile',
    name: 'Decile',
    glyph: 'D',
    harmonic: 10,
    multiple: 1,
    type: 'minor',
    quality: 'soft',
    defaultOrb: [1, 1],
    defaultOn: false,
  },
  {
    id: 'tri-decile',
    name: 'Tri-Decile',
    glyph: 'tD',
    harmonic: 10,
    multiple: 3,
    type: 'minor',
    quality: 'soft',
    defaultOrb: [1, 1],
    defaultOn: false,
  },
  {
    id: 'semi-sextile',
    name: 'Semi-Sextile',
    glyph: '⚺',
    harmonic: 12,
    multiple: 1,
    type: 'minor',
    quality: 'soft',
    defaultOrb: [2, 1.5],
    defaultOn: false,
  },
  {
    id: 'quincunx',
    name: 'Quincunx',
    glyph: '⚻',
    harmonic: 12,
    multiple: 5,
    type: 'minor',
    quality: 'hard',
    defaultOrb: [2, 1.5],
    defaultOn: false,
  },
];

export const ASPECTS_BY_ID: ReadonlyMap<string, AspectDefinition> = new Map(
  ASPECTS.map((definition) => [definition.id, definition]),
);

export interface AspectSetting {
  readonly on: boolean;
  readonly applying: number;
  readonly separating: number;
}

/** Keyed by aspect id. A missing key means the aspect is off. */
export type AspectSettings = Readonly<Record<string, AspectSetting>>;

export function defaultAspectSettings(): AspectSettings {
  const settings: Record<string, AspectSetting> = {};
  for (const definition of ASPECTS) {
    settings[definition.id] = {
      on: definition.defaultOn,
      applying: definition.defaultOrb[0],
      separating: definition.defaultOrb[1],
    };
  }
  return settings;
}

export interface AspectPoint {
  readonly id: string;
  /** Sidereal longitude, degrees. */
  readonly longitude: number;
  /** Degrees per day. Absent when unknown, which is handled rather than assumed. */
  readonly speed?: number | undefined;
}

export interface FoundAspect {
  readonly aspect: string;
  readonly name: string;
  readonly glyph: string;
  readonly type: AspectType;
  readonly quality: AspectQuality;
  /** The exact angle of this aspect. */
  readonly angle: number;
  /** How far apart the two points actually are, folded to [0, 180]. */
  readonly separation: number;
  /** Distance from exact, always positive. */
  readonly orb: number;
  readonly from: string;
  readonly to: string;
  /** Which ring each end is on. Equal for an aspect inside one chart. */
  readonly fromRing: number;
  readonly toRing: number;
  readonly applying: boolean;
  /** False when a point had no speed, so applying could not be decided. */
  readonly directionKnown: boolean;
}

/** Angular distance between two longitudes, folded into [0, 180]. */
export function separationOf(a: number, b: number): number {
  const delta = norm360(b - a);
  return delta <= 180 ? delta : 360 - delta;
}

/**
 * Is the pair closing on exactness?
 *
 * The separation changes at (speedB − speedA), negated when the pair is
 * measured the long way round. The aspect is applying when that rate carries
 * the signed orb toward zero. Exactly on the aspect it is neither, and is
 * reported as separating so that an exact hit uses the tighter of the two
 * orbs rather than the looser.
 */
function isApplying(
  a: AspectPoint,
  b: AspectPoint,
  signedOrb: number,
): { applying: boolean; known: boolean } {
  if (a.speed === undefined || b.speed === undefined) return { applying: false, known: false };
  const delta = norm360(b.longitude - a.longitude);
  const rate = (b.speed - a.speed) * (delta <= 180 ? 1 : -1);
  return { applying: signedOrb * rate < 0, known: true };
}

function matchPair(
  a: AspectPoint,
  aRing: number,
  b: AspectPoint,
  bRing: number,
  settings: AspectSettings,
): FoundAspect | null {
  const separation = separationOf(a.longitude, b.longitude);
  let best: FoundAspect | null = null;

  for (const definition of ASPECTS) {
    const setting = settings[definition.id];
    if (!setting?.on) continue;

    const angle = aspectAngle(definition);
    const signedOrb = separation - angle;
    const { applying, known } = isApplying(a, b, signedOrb);
    const limit = known
      ? applying
        ? setting.applying
        : setting.separating
      : Math.max(setting.applying, setting.separating);
    const orb = Math.abs(signedOrb);
    if (orb > limit) continue;

    /*
     * Two aspects can both be in orb where their angles are close and the orbs
     * are wide — a semi-sextile at 30° and a decile at 36° with 4° orbs, say.
     * The tighter one is the one being read, so it wins.
     */
    if (best && best.orb <= orb) continue;

    best = {
      aspect: definition.id,
      name: definition.name,
      glyph: definition.glyph,
      type: definition.type,
      quality: definition.quality,
      angle,
      separation,
      orb,
      from: a.id,
      to: b.id,
      fromRing: aRing,
      toRing: bRing,
      applying,
      directionKnown: known,
    };
  }
  return best;
}

/**
 * Every aspect in play across a stack of rings.
 *
 * One ring gives the aspects inside a chart. Two or more gives synastry as
 * well, which is the reason the signature takes rings rather than a point list:
 * on a two-person wheel the interesting lines are the ones crossing between
 * them, and a function that only looked inside one chart could not draw them.
 *
 * Sorted tightest first, because that is the reading order.
 */
export function findAspects(
  rings: readonly (readonly AspectPoint[])[],
  settings: AspectSettings = defaultAspectSettings(),
): FoundAspect[] {
  const found: FoundAspect[] = [];

  for (let ringA = 0; ringA < rings.length; ringA += 1) {
    const pointsA = rings[ringA]!;
    for (let ringB = ringA; ringB < rings.length; ringB += 1) {
      const pointsB = rings[ringB]!;
      for (let i = 0; i < pointsA.length; i += 1) {
        /* Inside one ring a pair is counted once; across rings, every pair. */
        const start = ringA === ringB ? i + 1 : 0;
        for (let j = start; j < pointsB.length; j += 1) {
          const match = matchPair(pointsA[i]!, ringA, pointsB[j]!, ringB, settings);
          if (match) found.push(match);
        }
      }
    }
  }

  return found.sort((one, two) => one.orb - two.orb);
}

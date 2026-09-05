/**
 * Zodiac and graha glyphs, drawn rather than typed.
 *
 * ## Why these are not Unicode characters
 *
 * The obvious implementation is the Unicode block — ♈ ♉ ♊ for the signs, ☉ ☽
 * ♂ for the grahas — and it is what the wheel used until now. It is wrong on
 * exactly the devices this app most needs to look right on.
 *
 * Those code points sit in the "Miscellaneous Symbols" block, and iOS has
 * emoji presentations for several of them. So on an iPhone a chart renders
 * some signs as flat monochrome type and others as full-colour emoji, at a
 * different optical size, on a different baseline — and which ones depends on
 * the OS version. Android substitutes from whatever fallback font it has.
 * Nothing about it is controllable from CSS, because the glyph is coming from
 * a font the page did not choose.
 *
 * Drawn as SVG they render identically everywhere, scale to any size without
 * hinting artefacts, inherit `currentColor` so they can be tinted by element
 * or by nature, and can be given a real accessible name.
 *
 * ## How they are constructed
 *
 * From primitives — circles, arcs, straight strokes — rather than opaque path
 * data lifted from a font. That is also how these glyphs are actually built
 * typographically: Venus is a circle over a cross, Mars is a circle with an
 * arrow, Aquarius is two waves. Written this way each one can be read and
 * adjusted by a person, where a single 400-character `d` attribute cannot.
 *
 * Everything lives in a 24×24 box and strokes with `currentColor`, so the
 * caller controls size and colour entirely.
 */

export const SIGN_NAMES = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

export type SignName = (typeof SIGN_NAMES)[number];

export const GRAHA_NAMES = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
  'Ascendant',
] as const;

export type GrahaName = (typeof GRAHA_NAMES)[number];
export type GlyphName = SignName | GrahaName;

/**
 * The classical element of each sign, in zodiac order.
 *
 * Used for tinting. Colour that encodes something true is worth having; colour
 * chosen because a chart looked plain is decoration, and decoration on an
 * instrument makes it harder to read.
 */
export const SIGN_ELEMENT: readonly ('fire' | 'earth' | 'air' | 'water')[] = [
  'fire',
  'earth',
  'air',
  'water',
  'fire',
  'earth',
  'air',
  'water',
  'fire',
  'earth',
  'air',
  'water',
];

/** Classical benefic / malefic / neutral, for tinting grahas by nature. */
export const GRAHA_NATURE: Record<string, 'benefic' | 'malefic' | 'neutral' | 'angle'> = {
  Jupiter: 'benefic',
  Venus: 'benefic',
  Moon: 'benefic',
  Mercury: 'neutral',
  Sun: 'malefic',
  Mars: 'malefic',
  Saturn: 'malefic',
  Rahu: 'malefic',
  Ketu: 'malefic',
  Ascendant: 'angle',
};

/** Each glyph as the primitives that make it up, in a 24×24 box. */
const SHAPES: Record<GlyphName, React.ReactNode> = {
  // ------------------------------------------------------------- the signs
  // Two horns rising from a shared stem and curling outward.
  Aries: (
    <>
      <path d="M12 20.5V12" />
      <path d="M12 12C12 7.5 10.2 5 7.4 5 4.9 5 3.4 7.2 4.3 9.8" />
      <path d="M12 12C12 7.5 13.8 5 16.6 5c2.5 0 4 2.2 3.1 4.8" />
    </>
  ),
  // A bull: circle, horns opening upward.
  Taurus: (
    <>
      <circle cx="12" cy="15.6" r="5.4" />
      <path d="M5.6 5.4c0 5 12.8 5 12.8 0" />
    </>
  ),
  // The Roman numeral two, serifed.
  Gemini: (
    <>
      <path d="M8 5.4v13.2M16 5.4v13.2" />
      <path d="M5.4 5.4h13.2M5.4 18.6h13.2" />
    </>
  ),
  // Two claws, the familiar 69.
  Cancer: (
    <>
      <path d="M3.4 11.2C6.2 7.6 11.4 6.4 16 8" />
      <circle cx="18" cy="9.4" r="2.3" />
      <path d="M20.6 12.8c-2.8 3.6-8 4.8-12.6 3.2" />
      <circle cx="6" cy="14.6" r="2.3" />
    </>
  ),
  // A mane looping away from the body.
  Leo: (
    <>
      <circle cx="8.2" cy="16.4" r="4" />
      <path d="M11.6 14.2C13 8.6 15.2 5.4 18 6.4c2.4.9 2 4.8-.4 6.7-1.8 1.4-1.6 4 .9 5.1" />
    </>
  ),
  // Three legs and a closing loop.
  Virgo: (
    <>
      <path d="M4 6.4v11.4" />
      <path d="M4 8.2c0-2.2 4-2.2 4 0v9.6" />
      <path d="M8 8.2c0-2.2 4-2.2 4 0v8.4" />
      <path d="M12 10.4c1.6-2.6 5.6-1.8 6 1.6.4 3.4-3.2 5.6-6.4 3.4" />
      <path d="M15.4 13.6c1.8 2.6 3.4 4 5 4.6" />
    </>
  ),
  // Scales: a beam above a ground line.
  Libra: (
    <>
      <path d="M3.4 18.8h17.2" />
      <path d="M3.4 14.4h4.8M20.6 14.4h-4.8" />
      <path d="M8.2 14.4a4.4 4.4 0 0 1 7.6 0" />
    </>
  ),
  // Three legs and a sting.
  Scorpio: (
    <>
      <path d="M4 6.4v11.4" />
      <path d="M4 8.2c0-2.2 4-2.2 4 0v9.6" />
      <path d="M8 8.2c0-2.2 4-2.2 4 0v9.6" />
      <path d="M12 8.2c0-2.2 4-2.2 4 0v8.4l4 4" />
      <path d="M20 20.6v-4M20 20.6h-4" />
    </>
  ),
  // The arrow and its crossing bar.
  Sagittarius: (
    <>
      <path d="M5.4 18.6 18.6 5.4" />
      <path d="M18.6 5.4h-5.4M18.6 5.4v5.4" />
      <path d="M7.6 11.4 12.6 16.4" />
    </>
  ),
  // The sea-goat: horn, body, and a fish tail.
  Capricorn: (
    <>
      <path d="M3.6 7v9.6" />
      <path d="M3.6 8.4c0-2.4 4-2.6 5.2.4l3 7.4" />
      <path d="M11.8 16.2c.8-3.6 4.8-4 6.2-1 1.4 3-1.2 5.6-3.6 4.4" />
    </>
  ),
  // Two waves. The most legible glyph in the set at small sizes.
  Aquarius: (
    <>
      <path d="M3.4 10.4 7.4 7l4.2 3.4L15.8 7l4.8 3.4" />
      <path d="M3.4 17 7.4 13.6l4.2 3.4 4.2-3.4 4.8 3.4" />
    </>
  ),
  // Two fishes bound together.
  Pisces: (
    <>
      <path d="M7.4 4c-3.6 4.4-3.6 11.6 0 16" />
      <path d="M16.6 4c3.6 4.4 3.6 11.6 0 16" />
      <path d="M4 12h16" />
    </>
  ),

  // ------------------------------------------------------------ the grahas
  Sun: (
    <>
      <circle cx="12" cy="12" r="7.8" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  Moon: <path d="M15.4 3.6a8.8 8.8 0 1 0 0 16.8 7.1 7.1 0 0 1 0-16.8Z" />,
  Mars: (
    <>
      <circle cx="9.8" cy="14.2" r="5.4" />
      <path d="M13.8 10.2 20 4" />
      <path d="M20 4h-5M20 4v5" />
    </>
  ),
  Mercury: (
    <>
      <path d="M8.4 3.2a4 4 0 0 0 7.2 0" />
      <circle cx="12" cy="11.4" r="4.5" />
      <path d="M12 15.9v5.1M9 18.4h6" />
    </>
  ),
  Jupiter: (
    <>
      <path d="M11.4 4.2v16.2" />
      <path d="M5.6 20.4h12" />
      <path d="M11.4 8.6c0-3.8-5-3.8-5 0 0 3 3 3.6 5 1.6" />
    </>
  ),
  Venus: (
    <>
      <circle cx="12" cy="8.6" r="5" />
      <path d="M12 13.6V21M8.6 17.6h6.8" />
    </>
  ),
  Saturn: (
    <>
      <path d="M6 5.2h7.2" />
      <path d="M9.8 4.4v10.8c0 4 4 5 6.1 2.4 1.5-1.9-.1-4.5-2.6-3.3" />
    </>
  ),
  // The ascending node — a horseshoe standing on two feet.
  Rahu: (
    <>
      <path d="M6.2 20v-6.2a5.8 5.8 0 0 1 11.6 0V20" />
      <circle cx="6.2" cy="21.4" r="1.7" />
      <circle cx="17.8" cy="21.4" r="1.7" />
    </>
  ),
  // The descending node — the same figure inverted.
  Ketu: (
    <>
      <path d="M6.2 4v6.2a5.8 5.8 0 0 0 11.6 0V4" />
      <circle cx="6.2" cy="2.6" r="1.7" />
      <circle cx="17.8" cy="2.6" r="1.7" />
    </>
  ),
  // Not a classical glyph — the lagna gets a mark of its own so it never
  // reads as a graha sitting in a sign.
  Ascendant: (
    <>
      <path d="M4 19 12 5l8 14" />
      <path d="M7.6 14.6h8.8" />
    </>
  ),
};

export interface GlyphProps {
  readonly name: GlyphName;
  /** Rendered size in px. The drawing is a 24-unit box scaled to this. */
  readonly size?: number;
  /** Stroke weight in the 24-unit space. Heavier reads better below ~16px. */
  readonly weight?: number;
  readonly className?: string;
  /**
   * An accessible name. Omit inside a chart that already labels the point —
   * the glyph is then decorative and correctly hidden from a screen reader.
   */
  readonly title?: string;
}

/**
 * One glyph.
 *
 * Draws with `currentColor`, so tinting is `color:` on any ancestor — which is
 * what lets the wheel colour a sign by element and a graha by nature without
 * this component knowing either concept exists.
 */
export function Glyph({
  name,
  size = 20,
  weight = 1.7,
  className,
  title,
}: GlyphProps): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {SHAPES[name]}
    </svg>
  );
}

/**
 * The same drawing, for use inside an existing SVG.
 *
 * The wheel is one SVG, so it cannot nest `<svg>` elements without the browser
 * establishing a new viewport per glyph and destroying the coordinate system.
 * This returns a `<g>` positioned and scaled into the parent's space instead.
 */
export function GlyphGroup({
  name,
  x,
  y,
  size,
  weight = 1.7,
  color,
}: {
  name: GlyphName;
  /** Centre of the glyph, in the parent SVG's coordinates. */
  x: number;
  y: number;
  /** Width and height in the parent's units. */
  size: number;
  weight?: number;
  color?: string;
}): React.ReactElement {
  const scale = size / 24;
  return (
    <g
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${scale})`}
      fill="none"
      stroke={color ?? 'currentColor'}
      /* Left unscaled on purpose. Inside a scaled group the stroke scales
         with everything else, which is what a glyph should do: a mark drawn
         at 12px wants a lighter stroke than the same mark at 32px. Dividing
         by `scale` here would give every size the same absolute weight and
         make small glyphs look clotted. */
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {SHAPES[name]}
    </g>
  );
}

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * The share card.
 *
 * This is the first thing most people will ever see of Jade — a link pasted
 * into a message, a Slack, a tweet — and an unstyled preview reads as a
 * side project regardless of what is behind the link.
 *
 * Generated rather than photographed, deliberately. Stock imagery is what the
 * low-trust end of this market uses, and an astrologer recognises it
 * instantly. A card carrying the actual wordmark and an actual North Indian
 * chart frame says what the product is and could not have come from anywhere
 * else.
 *
 * Rendered at build time into a static PNG, so nothing is computed per
 * request.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

/**
 * Satori reads TTF, OTF and WOFF — not WOFF2, which is why these are the
 * larger .woff variants even though the browser is served .woff2.
 *
 * Read from a path built at runtime rather than `require.resolve`. A literal
 * font path in the source makes webpack try to *bundle* the font as a module,
 * and no loader handles binary font files — the build fails with an unhelpful
 * "Unexpected character" on the first byte. See the README beside the files.
 */
async function fonts() {
  const dir = join(process.cwd(), 'src', 'assets', 'og-fonts');
  const read = (file: string) => readFile(join(dir, file));

  // Latin AND latin-ext, for every family.
  //
  // Google splits these fonts by subset, and every Sanskrit diacritic this
  // product is made of — ṣ, ṁ, ṛ, ā — lives in latin-ext (U+1E00–1E9F for the
  // dotted consonants). Loading only the latin file renders "Jyotiṣa" as
  // "Jyoti□a" in the share card, which is a worse first impression than no
  // card at all. Satori falls back across fonts registered under the same
  // name, so both files are supplied for each.
  const [display, displayExt, body, bodyExt, mono, monoExt] = await Promise.all([
    read('display.woff'),
    read('display-ext.woff'),
    read('body.woff'),
    read('body-ext.woff'),
    read('mono.woff'),
    read('mono-ext.woff'),
  ]);

  return [
    { name: 'Display', data: display, weight: 600 as const, style: 'normal' as const },
    { name: 'Display', data: displayExt, weight: 600 as const, style: 'normal' as const },
    { name: 'Body', data: body, weight: 400 as const, style: 'normal' as const },
    { name: 'Body', data: bodyExt, weight: 400 as const, style: 'normal' as const },
    { name: 'Mono', data: mono, weight: 500 as const, style: 'normal' as const },
    { name: 'Mono', data: monoExt, weight: 500 as const, style: 'normal' as const },
  ];
}

const INK = '#16222E';
const MUTED = '#4A5C6B';
const FAINT = '#7C8A95';
const PAPER = '#EFEFE9';
const RULE = '#C8CEC9';
const ACCENT = '#33668F';

/**
 * The North Indian chart frame, as a data URI.
 *
 * Satori does not run our React SVG components, so the frame is drawn here as
 * a plain string: the square, both diagonals, and the inner diamond. Geometry
 * only — no placements, because a share card is a mark rather than a reading.
 */
function chartFrame(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="360" height="360">
    <rect x="1" y="1" width="98" height="98" fill="none" stroke="${RULE}" stroke-width="0.8"/>
    <line x1="1" y1="1" x2="99" y2="99" stroke="${RULE}" stroke-width="0.6"/>
    <line x1="99" y1="1" x2="1" y2="99" stroke="${RULE}" stroke-width="0.6"/>
    <polygon points="50,1 99,50 50,99 1,50" fill="none" stroke="${ACCENT}" stroke-width="0.9"/>
    <circle cx="50" cy="50" r="1.6" fill="${ACCENT}"/>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export async function ogImage({
  /**
   * Kept free of Sanskrit diacritics, and pre-uppercased.
   *
   * The eyebrow is set in IBM Plex Mono, which does not carry Latin Extended
   * Additional — so `ṣ` renders as a tofu box no matter which subset file is
   * loaded. Google's `unicode-range` declarations describe the subset, not
   * what a given face actually contains, which is why the CSS claims coverage
   * the font does not have.
   *
   * "Vedic astrology" is the better line here regardless: it is what this
   * audience actually types into a search box, and a share card is the wrong
   * place to make someone parse a transliteration.
   */
  eyebrow = 'SIDEREAL · VEDIC ASTROLOGY · PROFESSIONAL',
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
}): Promise<ImageResponse> {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: PAPER,
        fontFamily: 'Body',
        position: 'relative',
      }}
    >
      {/* The blueprint grid, drawn as a repeating gradient the same way the
            app draws it. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          backgroundImage: `linear-gradient(to right, rgba(22,34,46,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(22,34,46,0.045) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Steel rule down the left edge. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 10,
          background: ACCENT,
          display: 'flex',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          width: 760,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span
              style={{
                fontFamily: 'Display',
                fontSize: 40,
                letterSpacing: 10,
                color: INK,
              }}
            >
              JADE
            </span>
            <span
              style={{
                fontFamily: 'Mono',
                fontSize: 15,
                letterSpacing: 2.5,
                color: FAINT,
              }}
            >
              JADEAPP.CO
            </span>
          </div>

          <div
            style={{
              fontFamily: 'Mono',
              fontSize: 16,
              letterSpacing: 3,
              color: ACCENT,
              marginTop: 44,
              display: 'flex',
            }}
          >
            {eyebrow}
          </div>

          <div
            style={{
              fontFamily: 'Display',
              fontSize: 68,
              lineHeight: 1.04,
              color: INK,
              marginTop: 14,
              display: 'flex',
              maxWidth: 660,
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 26,
              lineHeight: 1.35,
              color: MUTED,
              marginTop: 22,
              display: 'flex',
              maxWidth: 600,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 28,
            fontFamily: 'Mono',
            fontSize: 15,
            color: FAINT,
            letterSpacing: 1.2,
          }}
        >
          <span>16 VARGAS · VERIFIED AGAINST SWISS EPHEMERIS · FREE TO START</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderLeft: `1px solid ${RULE}`,
        }}
      >
        {/* Satori renders a plain <img>; next/image does not exist here. */}
        <img src={chartFrame()} width={360} height={360} alt="" />
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts() },
  );
}

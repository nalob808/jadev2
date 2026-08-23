/**
 * Jade's design tokens.
 *
 * Lifted from the v0 prototype's stylesheet — the steel accent, the bone
 * paper and the blueprint corner marks are the product's identity and predate
 * this repo. Change them here and nowhere else.
 */
export const tokens = {
  color: {
    light: {
      paper: '#EFEFE9',
      surface: '#F9F9F4',
      surfaceAlt: '#E7E8E2',
      ink: '#16222E',
      inkMuted: '#4A5C6B',
      inkFaint: '#7C8A95',
      rule: '#C8CEC9',
      ruleStrong: '#A9B2AE',
      accent: '#33668F',
      accentSoft: '#5A8CB4',
      accentWash: '#E1E9EF',
      jade: '#2C7A64',
      clay: '#9E5B3A',
      benefic: '#2C7A64',
      malefic: '#9E5B3A',
    },
    dark: {
      paper: '#121A21',
      surface: '#18222B',
      surfaceAlt: '#1F2B35',
      ink: '#E6EAE7',
      inkMuted: '#A8B6BE',
      inkFaint: '#7B8B95',
      rule: '#2C3A45',
      ruleStrong: '#3E4F5B',
      accent: '#7FADD4',
      accentSoft: '#5E8FB6',
      accentWash: '#1C2A36',
      jade: '#5CBBA0',
      clay: '#CD8964',
      benefic: '#5CBBA0',
      malefic: '#CD8964',
    },
  },
  font: {
    display: '"Barlow Condensed", "Barlow", sans-serif',
    body: '"Barlow", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
  radius: { none: '0px', sm: '2px' },
  space: [0, 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96] as const,
} as const;

/** Glyphs. Astrologers read these faster than names. */
export const GLYPHS = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
  Rahu: '☊',
  Ketu: '☋',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  Ascendant: 'As',
  Midheaven: 'MC',
} as const;

/**
 * Zodiac glyphs, each followed by U+FE0E — VARIATION SELECTOR-15.
 *
 * Without it browsers pick the *emoji* presentation of these codepoints and
 * render twelve coloured cartoon badges in the middle of a monochrome chart.
 * The selector asks for the text presentation, which is the typographic form
 * that belongs here. The graha glyphs above do not need it: they have no emoji
 * variant to fall back to.
 */
export const SIGN_GLYPHS = [
  '♈\uFE0E',
  '♉\uFE0E',
  '♊\uFE0E',
  '♋\uFE0E',
  '♌\uFE0E',
  '♍\uFE0E',
  '♎\uFE0E',
  '♏\uFE0E',
  '♐\uFE0E',
  '♑\uFE0E',
  '♒\uFE0E',
  '♓\uFE0E',
] as const;

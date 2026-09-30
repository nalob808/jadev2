/**
 * The 3D sphere's palette: the dark block of globals.css, always — a sky is
 * dark whatever the app theme is. Mirrored here because a canvas cannot read a
 * custom property from a theme it is not in; sky3d-palette.test.ts fails if
 * these drift.
 */
export const SKY = {
  ground: '#0b0d1a',
  ink: '#e8e9f5',
  inkMuted: '#a6abcc',
  inkFaint: '#787da6',
  rule: '#262b4a',
  ruleStrong: '#5a62a0',
  accent: '#8f9cff',
  accentSoft: '#6b78d6',
  elements: ['#e8876a', '#d4b06a', '#8fa8ff', '#5fc8c4'], // fire, earth, air, water
  drishti: {
    Sun: '#e8b45c',
    Moon: '#6fd6bb',
    Mars: '#e8876a',
    Mercury: '#9aa0c4',
    Jupiter: '#4fd6b0',
    Venus: '#64c9c4',
    Saturn: '#9aa2e8',
    Rahu: '#c49ae0',
    Ketu: '#d4a988',
  } as Record<string, string>,
} as const;

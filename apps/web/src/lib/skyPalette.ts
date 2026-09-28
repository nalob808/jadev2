/**
 * The 3D sphere's palette: the dark block of globals.css, always — a sky is
 * dark whatever the app theme is. Mirrored here because a canvas cannot read a
 * custom property from a theme it is not in; sky3d-palette.test.ts fails if
 * these drift.
 */
export const SKY = {
  ground: '#121a21',
  ink: '#e6eae7',
  inkMuted: '#a8b6be',
  inkFaint: '#7b8b95',
  rule: '#2c3a45',
  ruleStrong: '#3e4f5b',
  accent: '#7fadd4',
  accentSoft: '#5e8fb6',
  elements: ['#d9866a', '#b9a06a', '#7fadd4', '#6faaa8'], // fire, earth, air, water
  drishti: {
    Sun: '#d3a163',
    Moon: '#6fc0a6',
    Mars: '#d9866a',
    Mercury: '#97a2ad',
    Jupiter: '#5cbba0',
    Venus: '#6fbdb4',
    Saturn: '#8f97bd',
    Rahu: '#b491c2',
    Ketu: '#bfa088',
  } as Record<string, string>,
} as const;

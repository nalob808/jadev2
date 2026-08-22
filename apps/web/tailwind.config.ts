import type { Config } from 'tailwindcss';
// Imported from the tokens entry point, not the package barrel: the barrel
// also exports React chart components, and Tailwind's config loader runs
// outside webpack, so it cannot resolve their .js-specifier TSX imports. A
// stylesheet has no business loading React anyway.
import { tokens } from '@jade/ui/tokens';

/**
 * Tailwind reads Jade's tokens rather than defining its own palette, so the
 * design system has exactly one source of truth.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        rule: 'var(--rule)',
        accent: 'var(--accent)',
        jade: 'var(--jade)',
      },
      fontFamily: {
        display: [tokens.font.display],
        body: [tokens.font.body],
        mono: [tokens.font.mono],
      },
    },
  },
  plugins: [],
} satisfies Config;

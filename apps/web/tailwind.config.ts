import type { Config } from 'tailwindcss';
import { tokens } from '@jade/ui';

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

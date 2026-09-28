import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SKY } from './skyPalette';

/**
 * The sphere mirrors the dark token block because a canvas cannot read a
 * custom property from a theme it is not in. This keeps the mirror honest:
 * change a dṛṣṭi hue in globals.css and the sphere must change with it, or
 * the 3D view and the wheel disagree about which colour is Saturn.
 */
const css = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');
const darkBlock = css.slice(css.indexOf(":root[data-theme='dark']"));

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(darkBlock);
  if (!match) throw new Error(`no --${name} in the dark block`);
  return match[1]!.toLowerCase();
}

describe('the sphere palette', () => {
  it('matches the dark dṛṣṭi tokens', () => {
    for (const [id, hex] of Object.entries(SKY.drishti)) {
      expect(hex, id).toBe(token(`drishti-${id.toLowerCase()}`));
    }
  });

  it('matches the dark ground, rules and elements', () => {
    expect(SKY.ground).toBe(token('paper'));
    expect(SKY.inkMuted).toBe(token('ink-muted'));
    expect(SKY.inkFaint).toBe(token('ink-faint'));
    expect(SKY.accentSoft).toBe(token('accent-soft'));
    expect(SKY.elements).toEqual(['fire', 'earth', 'air', 'water'].map((e) => token(`elem-${e}`)));
  });
});

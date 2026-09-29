import { describe, expect, it } from 'vitest';
import { ASPECTS, defaultAspectSettings } from '@jade/astro';
import { MAX_ORB, aspectSettingsFromForm, aspectSettingsOrDefaults } from './aspectForm';

/** A form carrying every aspect field, so `touched` is true. */
function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const defaults = defaultAspectSettings();
  for (const definition of ASPECTS) {
    data.set(`aspect:${definition.id}:applying`, String(defaults[definition.id]!.applying));
    data.set(`aspect:${definition.id}:separating`, String(defaults[definition.id]!.separating));
    if (defaults[definition.id]!.on) data.set(`aspect:${definition.id}:on`, 'on');
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === '') data.delete(key);
    else data.set(key, value);
  }
  return data;
}

describe('reading the aspects tab', () => {
  it('round-trips the defaults', () => {
    const result = aspectSettingsFromForm(form());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings).toEqual(defaultAspectSettings());
  });

  /* An unchecked checkbox sends nothing, which is how HTML works. */
  it('reads a missing checkbox as off', () => {
    const result = aspectSettingsFromForm(form({ 'aspect:sextile:on': '' }));
    expect(result.ok && result.settings.sextile!.on).toBe(false);
    expect(result.ok && result.settings.trine!.on).toBe(true);
  });

  it('turns a minor on', () => {
    const result = aspectSettingsFromForm(form({ 'aspect:quincunx:on': 'on' }));
    expect(result.ok && result.settings.quincunx!.on).toBe(true);
  });

  it('takes decimal orbs', () => {
    const result = aspectSettingsFromForm(form({ 'aspect:square:applying': '3.75' }));
    expect(result.ok && result.settings.square!.applying).toBe(3.75);
  });

  it('refuses an orb that is not a number, negative, or absurd', () => {
    for (const bad of ['abc', '-1', String(MAX_ORB + 0.1), 'Infinity']) {
      const result = aspectSettingsFromForm(form({ 'aspect:trine:applying': bad }));
      expect(result.ok, bad).toBe(false);
      if (!result.ok) expect(result.error).toContain('Trine');
    }
  });

  it('falls back to the default when a field is left blank', () => {
    const result = aspectSettingsFromForm(form({ 'aspect:trine:applying': '' }));
    expect(result.ok && result.settings.trine!.applying).toBe(
      defaultAspectSettings().trine!.applying,
    );
  });

  /*
   * A submit that never carried the tab must not reset the workspace's orbs.
   * The caller is told to leave what is stored alone.
   */
  it('reports a form that did not carry the tab, rather than resetting', () => {
    const result = aspectSettingsFromForm(new FormData());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('');
  });
});

describe('what the form starts with', () => {
  it('uses the defaults when nothing is stored', () => {
    expect(aspectSettingsOrDefaults(null)).toEqual(defaultAspectSettings());
    expect(aspectSettingsOrDefaults(undefined)).toEqual(defaultAspectSettings());
    expect(aspectSettingsOrDefaults('nonsense')).toEqual(defaultAspectSettings());
  });

  it('takes what is stored over the default', () => {
    const merged = aspectSettingsOrDefaults({ sextile: { on: false, applying: 2, separating: 1 } });
    expect(merged.sextile).toEqual({ on: false, applying: 2, separating: 1 });
    expect(merged.trine).toEqual(defaultAspectSettings().trine);
  });

  /* A row written by an older version, or by hand, must not break the form. */
  it('survives a half-written row', () => {
    const merged = aspectSettingsOrDefaults({ trine: { on: true } });
    expect(merged.trine!.on).toBe(true);
    expect(merged.trine!.applying).toBe(defaultAspectSettings().trine!.applying);
  });

  it('covers every aspect the core defines, whatever was stored', () => {
    const merged = aspectSettingsOrDefaults({ made_up: { on: true, applying: 9, separating: 9 } });
    for (const definition of ASPECTS) expect(merged[definition.id], definition.id).toBeDefined();
  });
});

import { ASPECTS, defaultAspectSettings, type AspectSettings } from '@jade/astro';

/**
 * Reading the Aspects tab back off the form.
 *
 * Pure and separate from the action so it can be tested without a database, a
 * session or a request — the parsing is where the mistakes live, not the write.
 *
 * Field names are `aspect:<id>:on`, `aspect:<id>:applying` and
 * `aspect:<id>:separating`. An unchecked checkbox sends nothing at all, which
 * is why absence means off rather than an error.
 */

/** Wider than this is not an orb; it is a claim that everything aspects everything. */
export const MAX_ORB = 15;

export type AspectFormResult =
  | { readonly ok: true; readonly settings: AspectSettings }
  | { readonly ok: false; readonly error: string };

function orb(raw: FormDataEntryValue | null, fallback: number): number | null {
  if (raw === null || String(raw).trim() === '') return fallback;
  const value = Number(String(raw).trim());
  if (!Number.isFinite(value) || value < 0 || value > MAX_ORB) return null;
  return value;
}

export function aspectSettingsFromForm(formData: FormData): AspectFormResult {
  /*
   * Absence of every aspect field means this form did not carry the tab — an
   * older client, or a submit from somewhere else. Returning the defaults would
   * silently reset the workspace's orbs, so the caller is told to leave the
   * stored value alone instead.
   */
  const touched = ASPECTS.some((definition) => formData.has(`aspect:${definition.id}:applying`));
  if (!touched) return { ok: false, error: '' };

  const defaults = defaultAspectSettings();
  const settings: Record<string, { on: boolean; applying: number; separating: number }> = {};

  for (const definition of ASPECTS) {
    const fallback = defaults[definition.id]!;
    const applying = orb(formData.get(`aspect:${definition.id}:applying`), fallback.applying);
    const separating = orb(formData.get(`aspect:${definition.id}:separating`), fallback.separating);
    if (applying === null || separating === null) {
      return {
        ok: false,
        error: `${definition.name}: an orb must be a number between 0 and ${MAX_ORB} degrees.`,
      };
    }
    settings[definition.id] = {
      on: formData.get(`aspect:${definition.id}:on`) === 'on',
      applying,
      separating,
    };
  }

  return { ok: true, settings };
}

/** What the form should start with: the stored settings, or the core's defaults. */
export function aspectSettingsOrDefaults(stored: unknown): AspectSettings {
  const defaults = defaultAspectSettings();
  if (!stored || typeof stored !== 'object') return defaults;
  const merged: Record<string, { on: boolean; applying: number; separating: number }> = {
    ...defaults,
  };
  for (const definition of ASPECTS) {
    const entry = (stored as Record<string, unknown>)[definition.id];
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Partial<{ on: unknown; applying: unknown; separating: unknown }>;
    merged[definition.id] = {
      on: row.on === true,
      applying: typeof row.applying === 'number' ? row.applying : merged[definition.id]!.applying,
      separating:
        typeof row.separating === 'number' ? row.separating : merged[definition.id]!.separating,
    };
  }
  return merged;
}

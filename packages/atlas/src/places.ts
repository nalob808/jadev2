import type { Place } from './types.js';

/**
 * Normalise a place query for matching: fold case, strip diacritics and
 * punctuation, collapse whitespace. "São Paulo" and "sao paulo" must hit the
 * same row, and an astrologer typing fast should not be punished for it.
 */
export function normalizePlaceQuery(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rank candidates for a query. Exact match first, then prefix, then
 * substring; population breaks ties, because someone typing "Springfield"
 * almost always means the big one.
 */
function scorePlace(place: Place, normalizedQuery: string): number {
  const name = normalizePlaceQuery(place.name);
  if (!normalizedQuery) return 0;

  let score: number;
  if (name === normalizedQuery) score = 1000;
  else if (name.startsWith(normalizedQuery)) score = 700;
  else if (name.includes(normalizedQuery)) score = 400;
  else return 0;

  // Population contributes at most ~100 points, so it orders ties without
  // ever promoting a substring match above a prefix match.
  const population = place.population ?? 0;
  return score + Math.min(100, Math.log10(population + 1) * 12);
}

export function rankPlaces(places: readonly Place[], query: string, limit = 10): Place[] {
  const normalized = normalizePlaceQuery(query);
  return places
    .map((place) => ({ place, score: scorePlace(place, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.place);
}

/**
 * Coordinates written the way an astrologer reads them: 19°04′N 72°52′E.
 * Charts get printed, and decimal degrees look like a spreadsheet.
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  const fmt = (value: number, positive: string, negative: string): string => {
    const hemisphere = value < 0 ? negative : positive;
    const abs = Math.abs(value);
    const degrees = Math.floor(abs);
    const minutes = Math.round((abs - degrees) * 60);
    const carry = minutes === 60;
    return `${degrees + (carry ? 1 : 0)}°${String(carry ? 0 : minutes).padStart(2, '0')}′${hemisphere}`;
  };
  return `${fmt(latitude, 'N', 'S')} ${fmt(longitude, 'E', 'W')}`;
}

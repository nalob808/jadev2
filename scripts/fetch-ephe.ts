/**
 * Downloads Swiss Ephemeris data files into .ephe/.
 *
 * These are ~100 MB and are never committed. Without them, the swisseph
 * provider falls back to the built-in Moshier model, which is accurate to
 * better than 0.1″ for the planets and roughly 0.3″ for the Moon over
 * 3000 BC – 3000 AD. Install them for full precision and for dates outside
 * that span.
 *
 * Reminder: using Swiss Ephemeris in a hosted product requires the CHF 700
 * professional licence (one-off, no royalties). AGPL is the alternative and it
 * would oblige you to publish all of Jade. See docs/06-launch.md.
 */
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/';

// 600-year segments covering 1800–2400, which is every chart Jade will ever
// cast in practice. Add sepl_18.se1 style files for wider ranges.
const FILES = ['sepl_18.se1', 'semo_18.se1', 'seas_18.se1'];

async function main(): Promise<void> {
  await mkdir('.ephe', { recursive: true });
  for (const file of FILES) {
    const response = await fetch(BASE + file);
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    await writeFile(`.ephe/${file}`, Buffer.from(await response.arrayBuffer()));
    console.warn(`fetched ${file}`);
  }
}

void main();

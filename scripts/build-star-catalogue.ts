/**
 * Packs the Yale Bright Star Catalogue into the binary the 3D sphere loads.
 *
 * Source: brettonw/YaleBrightStarCatalog, MIT licensed, pinned to a commit so
 * the output is reproducible. Not HYG: that is CC BY-SA 4.0 and the ShareAlike
 * would attach to the file we ship.
 *
 * Output: apps/web/public/sky/bsc-v6.0.bin, little-endian —
 *
 *   header   4 bytes  "JBS1"
 *            4 bytes  uint32 star count
 *   record   2 bytes  uint16 RA   × 360/65536 °     (J2000, ~20″ resolution)
 *            2 bytes  int16  Dec  × 90/32767 °      (J2000, ~10″ resolution)
 *            1 byte   uint8  (V + 1.5) × 30         (1/30 mag resolution)
 *            1 byte   uint8  colour temperature / 100 K, 0 = unknown
 *
 * Six bytes rather than the five the spike spec budgets: the extra byte is
 * colour temperature, which is what makes Antares read red and Spica blue at a
 * cost of ~5 KB. Records are sorted brightest first.
 *
 * Run: pnpm tsx scripts/build-star-catalogue.ts [--limit 6.0]
 */
import { mkdir, writeFile } from 'node:fs/promises';

const COMMIT = 'abffb3b7223ae37e879b0a3ff5b49ad06aed5576';
const SOURCE = `https://raw.githubusercontent.com/brettonw/YaleBrightStarCatalog/${COMMIT}/bsc5-short.json`;

interface Row {
  readonly RA?: string;
  readonly Dec?: string;
  readonly V?: string;
  readonly K?: string;
}

/** "13h 25m 11.6s" → degrees. */
function parseRa(text: string): number {
  const match = /^(\d+)h\s+(\d+)m\s+([\d.]+)s$/.exec(text.trim());
  if (!match) throw new Error(`unreadable RA: ${text}`);
  return (Number(match[1]) + Number(match[2]) / 60 + Number(match[3]) / 3600) * 15;
}

/** "-11° 09′ 41″" → degrees. */
function parseDec(text: string): number {
  const match = /^([+-])(\d+)°\s+(\d+)′\s+([\d.]+)″$/.exec(text.trim());
  if (!match) throw new Error(`unreadable Dec: ${text}`);
  const magnitude = Number(match[2]) + Number(match[3]) / 60 + Number(match[4]) / 3600;
  return match[1] === '-' ? -magnitude : magnitude;
}

async function main(): Promise<void> {
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg === -1 ? 6.0 : Number(process.argv[limitArg + 1]);

  const response = await fetch(SOURCE);
  if (!response.ok) throw new Error(`catalogue: HTTP ${response.status}`);
  const rows = (await response.json()) as Row[];

  const stars = rows
    .filter((row) => row.RA && row.Dec && row.V !== undefined && Number(row.V) <= limit)
    .map((row) => ({
      ra: parseRa(row.RA!),
      dec: parseDec(row.Dec!),
      v: Number(row.V),
      kelvin: row.K ? Number(row.K) : 0,
    }))
    .sort((a, b) => a.v - b.v);

  const buffer = Buffer.alloc(8 + stars.length * 6);
  buffer.write('JBS1', 0, 'ascii');
  buffer.writeUInt32LE(stars.length, 4);
  stars.forEach((star, index) => {
    const at = 8 + index * 6;
    buffer.writeUInt16LE(Math.round((star.ra / 360) * 65536) % 65536, at);
    buffer.writeInt16LE(Math.round((star.dec / 90) * 32767), at + 2);
    buffer.writeUInt8(Math.max(0, Math.min(255, Math.round((star.v + 1.5) * 30))), at + 4);
    buffer.writeUInt8(Math.max(0, Math.min(255, Math.round(star.kelvin / 100))), at + 5);
  });

  await mkdir('apps/web/public/sky', { recursive: true });
  const out = `apps/web/public/sky/bsc-v${limit.toFixed(1)}.bin`;
  await writeFile(out, buffer);
  console.warn(
    `${stars.length} of ${rows.length} stars ≤ V ${limit} → ${out} (${buffer.length} B)`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

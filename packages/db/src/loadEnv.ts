import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Load `.env.local` / `.env` for standalone scripts.
 *
 * Next.js loads these files itself, so the app works — but `tsx scripts/x.ts`
 * gets a bare process with none of them, which is why `pnpm db:migrate` once
 * reported a missing DIRECT_DATABASE_URL that was sitting in `.env.local` the
 * whole time.
 *
 * Deliberately hand-rolled rather than pulling in a dependency: it is fifteen
 * lines, and real environment variables always win over file values, which is
 * what CI and production need.
 */
export function loadEnvFiles(startDir: string = process.cwd()): string[] {
  const loaded: string[] = [];

  // Scripts run from a package directory; the env files live at the monorepo
  // root. Walk up until we find a pnpm-workspace.yaml, then read from there.
  let dir = resolve(startDir);
  const candidates = [dir];
  for (let depth = 0; depth < 5; depth += 1) {
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
    candidates.push(dir);
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) break;
  }

  // Nearest file first; `.env.local` beats `.env`.
  for (const base of candidates) {
    for (const name of ['.env.local', '.env']) {
      const path = resolve(base, name);
      if (!existsSync(path)) continue;
      applyEnvFile(path);
      loaded.push(path);
    }
  }
  return loaded;
}

function applyEnvFile(path: string): void {
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const equals = line.indexOf('=');
    if (equals === -1) continue;

    const key = line.slice(0, equals).trim();
    if (!key || key in process.env) continue; // a real env var always wins

    let value = line.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

/**
 * Resolve the connection string a script should use, loading env files first
 * and failing with something actionable rather than a driver stack trace.
 */
export function requireDatabaseUrl(kind: 'direct' | 'pooled' = 'direct'): string {
  const files = loadEnvFiles();
  const name = kind === 'direct' ? 'DIRECT_DATABASE_URL' : 'DATABASE_URL';
  const url = process.env[name] ?? process.env.DATABASE_URL;
  if (url) return url;

  const looked = files.length ? files.join(', ') : 'no .env.local or .env found';
  throw new Error(
    `${name} is not set.\n` +
      `  Looked in: ${looked}\n` +
      '  Copy .env.example to .env.local at the repo root and paste your connection strings.\n' +
      '  DIRECT_DATABASE_URL is the endpoint WITHOUT "-pooler" — migrations need it.',
  );
}

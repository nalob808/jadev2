import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Load the monorepo-root .env.local before Next boots.
 *
 * Next reads env files from the Next project directory — apps/web — not from
 * the workspace root, so a single .env.local at the top of the repo is
 * invisible to it. That produced a genuinely confusing state: `pnpm db:migrate`
 * connected fine (its loader walks up to the root) while the app insisted it
 * had no database.
 *
 * One .env.local at the repo root is the right shape for a monorepo, so the
 * config bridges the gap. Real environment variables always win, which is what
 * Vercel and CI need.
 */
function loadRootEnv() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 5; depth += 1) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) break;
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }

  for (const name of ['.env.local', '.env']) {
    const path = resolve(dir, name);
    if (!existsSync(path)) continue;
    for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const equals = line.indexOf('=');
      if (equals === -1) continue;
      const key = line.slice(0, equals).trim();
      if (!key || key in process.env) continue;
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
}

loadRootEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The calculation core is consumed straight from TypeScript source so that
  // editing it hot-reloads the app. Next has to transpile it, and webpack has
  // to be told that the ESM-correct `./foo.js` specifiers inside that source
  // resolve to `./foo.ts` on disk.
  transpilePackages: ['@jade/astro', '@jade/ui'],

  webpack(config) {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },

  experimental: {
    externalDir: true,
    turbo: {
      resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
    },
  },
};

export default nextConfig;

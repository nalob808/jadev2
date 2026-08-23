import { createBrowserClient } from '@supabase/ssr';
import { supabaseCredentials } from './supabase-config.js';

/**
 * The browser. Used by the sign-in form only.
 *
 * `@supabase/supabase-js` must stay a *direct* dependency of this app even
 * though nothing here imports it by name. The client these factories return is
 * typed by it, and under pnpm's strict layout TypeScript cannot name a type it
 * can only reach transitively — `next build` fails with "cannot be named
 * without a reference to .pnpm/@supabase+supabase-js". Removing it as an
 * unused dependency breaks the production build, not the dev server.
 */
export function createSupabaseBrowserClient() {
  const { url, key } = supabaseCredentials();
  return createBrowserClient(url, key);
}

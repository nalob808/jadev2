import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseCredentials } from './supabase-config.js';

/**
 * Server components, server actions and route handlers.
 *
 * Kept apart from the browser client on purpose: this module imports
 * `next/headers`, and any client component that transitively reaches it fails
 * the build with a message that does not name the real culprit.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseCredentials();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components get a read-only cookie store. The middleware
          // refreshes the session instead, so ignoring this is correct.
        }
      },
    },
  });
}

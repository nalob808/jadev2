import { createBrowserClient } from '@supabase/ssr';
import { supabaseCredentials } from './supabase-config.js';

/** The browser. Used by the sign-in form only. */
export function createSupabaseBrowserClient() {
  const { url, key } = supabaseCredentials();
  return createBrowserClient(url, key);
}

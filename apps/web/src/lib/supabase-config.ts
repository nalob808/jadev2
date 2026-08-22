/**
 * Shared, environment-only. Safe to import from both sides — it touches
 * nothing but NEXT_PUBLIC_ variables, which are inlined at build time.
 */
export function supabaseCredentials(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'AUTH_MODE=supabase needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Both come from Supabase → Settings → API.',
    );
  }
  return { url, key };
}

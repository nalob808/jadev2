import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Where the magic link lands. Exchanges the one-time code for a session and
 * sends the person on to their people list.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home';

  if (!code) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent('That link was missing its code. Try signing in again.')}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(`That link did not work: ${error.message}. Links expire after an hour and can only be used once.`)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}

import { cookies } from 'next/headers';
import { bootstrapUser } from '@jade/db';
import { getDatabase } from './db.js';
import { env } from './env.js';

export interface Session {
  userId: string;
  workspaceId: string;
  settingsProfileId: string;
  email: string;
}

const DEV_COOKIE = 'jade_dev_user';

/**
 * Authentication.
 *
 * Two modes, chosen by AUTH_MODE:
 *
 *  - `dev`      a local cookie naming an email address. No external service,
 *               so Jade runs on a database alone. Hard-refuses in production.
 *  - `supabase` emailed sign-in links, refreshed by middleware. The provider
 *               URL allow-list lives in Supabase's dashboard.
 *
 * Either way the app only ever sees a Session, so swapping providers later
 * touches this file and nothing else.
 */
export async function getSession(): Promise<Session | null> {
  if (env.authMode === 'dev') {
    if (env.isProduction) {
      throw new Error(
        'AUTH_MODE=dev cannot run in production. Set AUTH_MODE=supabase in your Vercel ' +
          'environment variables, along with NEXT_PUBLIC_SUPABASE_URL and ' +
          'NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      );
    }
    const email = (await cookies()).get(DEV_COOKIE)?.value;
    if (!email) return null;
    const bootstrapped = await bootstrapUser(getDatabase(), { email });
    return { ...bootstrapped, email };
  }

  const { createSupabaseServerClient } = await import('./supabase-server.js');
  let email: string | undefined;
  let metadata: Record<string, unknown> = {};
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email;
    metadata = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  } catch {
    // Misconfiguration or an unreachable auth service must render the
    // sign-in page, not a 500. Nobody can fix a stack trace.
    return null;
  }
  if (!email) return null;
  const data = { user: { email, user_metadata: metadata } };
  const bootstrapped = await bootstrapUser(getDatabase(), {
    email: data.user.email,
    name: (data.user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
  });
  return { ...bootstrapped, email: data.user.email };
}

/** For pages that must have a session. Throws rather than rendering an empty shell. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHENTICATED');
  return session;
}

export async function signInDev(email: string): Promise<void> {
  if (env.isProduction) throw new Error('Dev sign-in is disabled in production.');
  (await cookies()).set(DEV_COOKIE, email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signOut(): Promise<void> {
  if (env.authMode === 'supabase') {
    const { createSupabaseServerClient } = await import('./supabase-server.js');
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return;
  }
  (await cookies()).delete(DEV_COOKIE);
}

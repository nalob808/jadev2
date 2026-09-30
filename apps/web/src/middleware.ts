import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresh the Supabase session on every request.
 *
 * Access tokens are short-lived. Server Components cannot write cookies, so
 * without this the session silently expires mid-visit and the user is bounced
 * to sign-in while still holding a valid refresh token.
 *
 * Does nothing in dev auth mode, which uses a plain cookie.
 */
/**
 * The reading subdomain.
 *
 * `read.jadeapp.co` is not a second application. It is the same Jade — same
 * session, same people, same charts — wearing a friendlier register, so it is a
 * route group behind a host rewrite rather than a separate deploy.
 *
 * That decision is worth recording, because a second Next app was the obvious
 * shape and it is the wrong one here. It would need its own build, its own
 * environment, and a session shared across two origins by hand — cookie domain
 * juggling that breaks quietly and in production. A rewrite keeps one deploy and
 * one session, and `/read` also works on the apex domain, so the feature ships
 * and can be used before any DNS record exists.
 */
const READING_HOST = 'read.';

function readingRewrite(request: NextRequest): URL | null {
  const host = request.headers.get('host') ?? '';
  if (!host.startsWith(READING_HOST)) return null;
  // Already inside the group — rewriting again would double the prefix.
  if (request.nextUrl.pathname.startsWith('/read')) return null;
  /*
   * A share link is its own surface and belongs to nobody's host.
   *
   * `/s/<token>` is opened by a client who has never heard of either domain,
   * usually from whichever one the practitioner happened to copy. Rewriting it
   * into the reading group would make the same link work on one host and 404 on
   * the other, which is the one thing a link somebody sent a client must not do.
   */
  if (request.nextUrl.pathname.startsWith('/s/')) return null;
  const url = request.nextUrl.clone();
  url.pathname = `/read${request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname}`;
  return url;
}

/**
 * A withdrawn link must stop working in the browser too.
 *
 * `dynamic = 'force-dynamic'` stops the server caching a shared reading, and
 * that is not enough: a client who opened the link once and comes back to the
 * same URL can be served it from their own cache long after the practitioner
 * withdrew it. Found exactly that way — a revocation test passed against a
 * fresh browser and failed against the one that had already visited.
 *
 * `no-store` costs nothing here. The page is one visitor reading one chart, not
 * traffic worth caching.
 */
function noStore(response: NextResponse, request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/s/')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
  }
  return response;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const rewrite = readingRewrite(request);

  if (process.env.AUTH_MODE !== 'supabase') {
    return noStore(rewrite ? NextResponse.rewrite(rewrite) : NextResponse.next(), request);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = rewrite ? NextResponse.rewrite(rewrite) : NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = rewrite ? NextResponse.rewrite(rewrite) : NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          /*
           * The session cookie has to be readable on both hosts.
           *
           * Without an explicit domain the cookie is scoped to whichever host
           * set it, so signing in at jadeapp.co leaves read.jadeapp.co signed
           * out and vice versa — the single most likely way this feature breaks,
           * and it breaks only in production, where the two hosts differ.
           * `COOKIE_DOMAIN` should be set to `.jadeapp.co` there and left unset
           * in development, where everything is localhost.
           */
          const domain = process.env.COOKIE_DOMAIN;
          response.cookies.set(name, value, domain ? { ...options, domain } : options);
        }
      },
    },
  });

  // Must be getUser(), not getSession(): only getUser revalidates the token
  // with Supabase. getSession trusts whatever the cookie says.
  await supabase.auth.getUser();

  return noStore(response, request);
}

export const config = {
  matcher: [
    // Everything except static assets, images and the legacy prototype.
    '/((?!_next/static|_next/image|favicon.ico|legacy|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

import tzlookup from 'tz-lookup';
import { getSession } from '@/lib/auth';

/**
 * The time zone governing a coordinate.
 *
 * This exists because the manual birthplace form used to ask people to type
 * an IANA zone identifier from memory. Nobody knows that Honolulu is
 * `Pacific/Honolulu` and Phoenix is `America/Phoenix`; a person who has just
 * looked up their village's latitude on a map is not then going to produce
 * `Asia/Kolkata` unprompted. So the form asks for the two numbers a map can
 * give them, and derives the zone — which is the one piece of this that a
 * computer is strictly better at than a person.
 *
 * The zone is still shown before anything is saved, and can still be
 * overridden. Constitution #3 forbids a silent default in a setting this
 * consequential, and a derived value the user never sees is exactly that.
 */

/** Session-dependent: never prerender this at build time. */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get('lat'));
  const longitude = Number(params.get('lon'));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return Response.json({ error: 'Latitude and longitude must be numbers.' }, { status: 400 });
  }
  if (latitude < -90 || latitude > 90) {
    return Response.json({ error: 'Latitude runs from −90 to 90.' }, { status: 400 });
  }
  if (longitude < -180 || longitude > 180) {
    return Response.json({ error: 'Longitude runs from −180 to 180.' }, { status: 400 });
  }

  try {
    return Response.json({ timezoneId: tzlookup(latitude, longitude) });
  } catch {
    // Genuinely unresolvable — mid-ocean, mostly. Said plainly rather than
    // defaulted to UTC, which would be a wrong chart that looks like a right
    // one.
    return Response.json(
      { error: 'No time zone covers that point. Check the coordinates, or set the zone by hand.' },
      { status: 422 },
    );
  }
}

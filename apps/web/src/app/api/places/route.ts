import { searchPlaces } from '@jade/db';
import { getDatabase } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * Place search for the add-a-person form.
 *
 * Behind the session on purpose: an open endpoint over the atlas is a free
 * scraping target, and there is no reason for it to be public.
 */
/** Session-dependent: never prerender this at build time. */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const query = new URL(request.url).searchParams.get('q') ?? '';
  const results = await searchPlaces(getDatabase(), query, 8);

  return Response.json(
    results.map((place) => ({
      id: place.id,
      label: [place.name, place.admin1, place.countryCode].filter(Boolean).join(', '),
      latitude: place.latitude,
      longitude: place.longitude,
      timezoneId: place.timezoneId,
    })),
  );
}

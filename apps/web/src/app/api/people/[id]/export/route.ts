import { exportSubject } from '@jade/db';
import { getDatabase } from '@/lib/db';
import { requireSession } from '@/lib/auth';

/**
 * Everything Jade holds about one person, as a file. No hostage-taking.
 *
 * Never gated by tier, and deliberately so — constitution item 4 requires
 * export on every plan, and `plans.ts` has no capability key that could be
 * used to switch this off. If you are here to add one, read the note above
 * CAPABILITIES first.
 */
/** Session-dependent: never prerender this at build time. */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await requireSession();
  const { id } = await context.params;
  const data = await exportSubject(getDatabase(), session.workspaceId, id);
  if (!data) return new Response('Not found', { status: 404 });

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="jade-${id}.json"`,
    },
  });
}

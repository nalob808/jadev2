import { exportWorkspace } from '@jade/db';
import { getDatabase } from '@/lib/db';
import { requireSession } from '@/lib/auth';

/**
 * Everything Jade holds about a whole practice, as a file.
 *
 * The per-person export answered "give me my client's data". Nothing answered
 * "give me mine" — which is the request that actually arrives with a legal
 * deadline attached, and the one a practitioner makes when they are deciding
 * whether they can leave.
 *
 * Never gated by tier, for the same structural reason as the per-person route:
 * `plans.ts` has no capability key that could switch it off, so the guarantee
 * does not depend on anybody remembering it. If you are here to add one, read
 * the note above CAPABILITIES first.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const session = await requireSession();
  const data = await exportWorkspace(getDatabase(), session.workspaceId);
  if (!data) return new Response('Not found', { status: 404 });

  /* Dated in the filename, because somebody will have several of these and
     will need to know which one is current without opening them. */
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="jade-practice-${stamp}.json"`,
    },
  });
}

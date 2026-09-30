import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getSubject, listShareLinks } from '@jade/db';
import { createShare, revokeShare } from '@/app/actions';
import { getSession } from '@/lib/auth';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { CopyField } from '@/components/CopyField';

export const dynamic = 'force-dynamic';

/**
 * The links a client can open, and the one moment each of them is visible.
 *
 * ## Why the token is in this page's own URL
 *
 * Only the hash is stored, so after this render Jade cannot produce the link
 * again — not through a support request, not through the database. It travels
 * once, in the redirect from `createShare`, and this page is built around
 * getting it out of the address bar and into a message before it is lost.
 *
 * That is why the issued link is the loudest thing on the screen and why the
 * copy control is the first thing under it.
 *
 * ## Why every row says how many times it was opened
 *
 * A practitioner who shared a reading in March and sees it opened ninety times
 * has learned something they should act on. Nothing else here tells them that,
 * and a share link without a view count is a door with no hinge — you can open
 * it and close it and never know whether anyone came through.
 */
const EXPIRY_CHOICES = [
  { value: '7', label: 'A week' },
  { value: '30', label: 'A month' },
  { value: '90', label: 'Three months' },
  { value: '365', label: 'A year' },
  { value: 'never', label: 'No expiry' },
];

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ issued?: string; revoked?: string; error?: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { id } = await params;
  const { issued, revoked, error } = await searchParams;

  const database = getDatabase();
  const [record, links, clock] = await Promise.all([
    getSubject(database, session.workspaceId, id),
    listShareLinks(database, session.workspaceId, id),
    getClock(session.workspaceId),
  ]);
  if (!record) notFound();

  /*
   * The origin the practitioner is actually looking at, so the link they copy
   * is the one they expect. Reading it from the request rather than from an
   * environment variable means it is right in development, right on a preview
   * deploy, and right on whichever of the two production hosts they came from.
   */
  const host = headers().get('host') ?? '';
  const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  const origin = `${protocol}://${host.replace(/^read\./, '')}`;

  const day = (value: Date | null): string =>
    value
      ? clock.format(value.getTime(), { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

  const live = links.filter(
    (link) => !link.revokedAt && (!link.expiresAt || link.expiresAt.getTime() > Date.now()),
  );

  return (
    <Shell
      email={session.email}
      subject={{ id, name: record.subject.displayName, kicker: 'Sharing' }}
    >
      <div className="mb-6">
        <Kicker>Sharing</Kicker>
        <h1 className="font-display text-4xl">A link they can open</h1>
        <p className="mt-2 max-w-[64ch] text-[var(--ink-muted)]">
          A live reading rather than a file: it stays current if you correct a birth time, it says
          how many times it has been opened, and you can withdraw it. Anyone holding the link can
          read it — there is no password and no sign-in — so it is unlisted rather than private.
        </p>
      </div>

      {error ? (
        <p className="mb-4 border border-[var(--clay)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--clay)]">
          {error}
        </p>
      ) : null}
      {revoked ? (
        <p className="mb-4 border border-[var(--jade)] bg-[var(--surface)] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--jade)]">
          Withdrawn. That link no longer opens anything.
        </p>
      ) : null}

      {/* ------------------------------------------------- the one showing */}
      {issued ? (
        <section className="mb-6 border-2 border-[var(--accent)] bg-[var(--surface)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            Your new link — copy it now
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-[var(--ink-muted)]">
            Jade stores only a fingerprint of this link, so this is the one time it can be shown. If
            you lose it, withdraw it and make another.
          </p>
          <div className="mt-3">
            <CopyField value={`${origin}/s/${issued}`} label="Share link" />
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------ issue a new */}
      <Panel>
        <h2 className="mb-4 font-display text-2xl">New link</h2>
        {record.birthEvent ? (
          <form action={createShare} className="flex flex-col gap-4">
            <input type="hidden" name="subjectId" value={id} />

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                What is it for
              </span>
              <input
                type="text"
                name="label"
                placeholder="Sent after the March session"
                className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                Stops working after
              </span>
              <select
                name="expiresInDays"
                defaultValue="30"
                className="border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {EXPIRY_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>

            {/*
              Off by default, and the sentence says why rather than the label
              alone. A client reading their own chart usually wants their birth
              moment on it; a link that gets forwarded should not carry it. The
              practitioner knows which of those this is and Jade does not.
            */}
            <label className="flex items-start gap-2.5">
              <input type="checkbox" name="showsBirthData" className="mt-1" />
              <span className="text-sm leading-relaxed">
                Show the birth date, time and place on the page
                <span className="block text-[13px] text-[var(--ink-muted)]">
                  Off by default. The reading works without it, and a link that gets forwarded
                  carries whatever is on the page.
                </span>
              </span>
            </label>

            <div>
              <button
                type="submit"
                className="bg-[var(--accent)] px-4 py-2.5 font-display text-lg text-white transition-opacity hover:opacity-90"
              >
                Create the link
              </button>
            </div>
          </form>
        ) : (
          <p className="text-[var(--ink-muted)]">
            There is no birth data for {record.subject.displayName} yet, so there is no reading to
            share.{' '}
            <Link href={`/people/${id}/edit`} className="text-[var(--accent)] underline">
              Add it
            </Link>
            .
          </p>
        )}
      </Panel>

      {/* ---------------------------------------------------------- the list */}
      <section className="jade-panel mt-4 p-5">
        <h2 className="mb-1 font-display text-2xl">
          Links{' '}
          <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
            {live.length} live of {links.length}
          </span>
        </h2>

        {links.length === 0 ? (
          <p className="mt-2 text-[var(--ink-muted)]">Nothing shared yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {links.map((link) => {
              const expired = Boolean(link.expiresAt && link.expiresAt.getTime() <= Date.now());
              const dead = Boolean(link.revokedAt) || expired;
              return (
                <li
                  key={link.id}
                  className={`border px-4 py-3 ${
                    dead ? 'border-dashed border-[var(--rule)]' : 'border-[var(--rule-strong)]'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-display text-lg leading-tight">
                      {link.label ?? 'Untitled link'}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                      {link.revokedAt
                        ? `withdrawn ${day(link.revokedAt)}`
                        : expired
                          ? `expired ${day(link.expiresAt)}`
                          : link.expiresAt
                            ? `until ${day(link.expiresAt)}`
                            : 'no expiry'}
                    </p>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                    made {day(link.createdAt)} · opened {link.viewCount}{' '}
                    {link.viewCount === 1 ? 'time' : 'times'}
                    {link.lastViewedAt ? `, last on ${day(link.lastViewedAt)}` : ''} ·{' '}
                    {link.showsBirthData ? 'shows birth data' : 'birth data hidden'}
                  </p>
                  {!dead ? (
                    <form action={revokeShare} className="mt-2">
                      <input type="hidden" name="subjectId" value={id} />
                      <input type="hidden" name="id" value={link.id} />
                      <button
                        type="submit"
                        className="border border-[var(--clay)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--clay)] transition-colors hover:bg-[var(--clay)] hover:text-white"
                      >
                        Withdraw
                      </button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Shell>
  );
}

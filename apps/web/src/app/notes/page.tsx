import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listNotes, listSubjects, listNoteTags, noteAnchorCounts } from '@jade/db';
import { ANCHOR_KIND_LABELS, describeAnchor, isAnchorKind, type AnchorKind } from '@jade/astro';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { PageHead, Panel, Shell } from '@/components/Shell';
import { NoteCard } from '@/components/NoteCard';
import { NoteComposer } from '@/components/NoteComposer';
import { NotesSearch } from '@/components/NotesSearch';

export const dynamic = 'force-dynamic';

/**
 * Every note in the workspace, and the thing that makes anchoring worth it.
 *
 * Filtering by anchor answers "show me everything I have written about
 * Gajakesarī" across every chart at once. Jade can answer that because an
 * anchor is a factor name rather than a pointer at one chart — the same yoga
 * in two people's charts carries the same key.
 */
export default async function NotesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const one = (key: string): string => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
  };

  const query = one('q');
  const tag = one('tag');
  const kindRaw = one('anchorKind');
  const anchorKind = isAnchorKind(kindRaw) ? kindRaw : '';
  const anchorKey = one('anchorKey');
  const noteError = one('noteError');

  const database = getDatabase();
  const [notes, people, tags, counts] = await Promise.all([
    listNotes(database, session.workspaceId, {
      query: query || undefined,
      tag: tag || undefined,
      anchorKind: anchorKind || undefined,
      anchorKey: anchorKey || undefined,
    }),
    listSubjects(database, session.workspaceId),
    listNoteTags(database, session.workspaceId),
    noteAnchorCounts(database, session.workspaceId),
  ]);

  const nameOf = new Map(people.map((p) => [p.subject.id, p.subject.displayName]));

  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (tag) params.set('tag', tag);
  if (anchorKind) params.set('anchorKind', anchorKind);
  if (anchorKey) params.set('anchorKey', anchorKey);
  const returnTo = `/notes${params.toString() ? `?${params}` : ''}`;

  const filtered = Boolean(query || tag || anchorKind);

  // The sidebar shows what she writes about most. Chart-level notes are
  // excluded: they are "notes about this person", which the person filter
  // already covers, and they would otherwise always top the list.
  const topAnchors = counts.filter((row) => row.anchorKind !== 'chart').slice(0, 14);

  const activeLabel = anchorKind
    ? (topAnchors.find((r) => r.anchorKind === anchorKind && r.anchorKey === anchorKey)?.label ??
      describeAnchor(anchorKind as AnchorKind, anchorKey))
    : '';

  return (
    <Shell email={session.email}>
      <PageHead
        kicker="Study log"
        title={notes.length === 0 && !filtered ? 'Nothing written yet' : 'Notes'}
        lede={
          filtered
            ? undefined
            : 'Anything attached to a factor — a graha, a house, a yoga — can be found again from every chart that has it.'
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="flex flex-col gap-3">
          <NotesSearch query={query} tag={tag} tags={tags} basePath="/notes" />

          {filtered ? (
            <p className="jade-fade flex flex-wrap items-center gap-2 font-mono text-[11px] text-[var(--ink-muted)]">
              <span>
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </span>
              {activeLabel ? (
                <span className="border-l-2 border-[var(--accent)] pl-2 text-[var(--accent)]">
                  {activeLabel}
                </span>
              ) : null}
              <Link href="/notes" className="underline hover:text-[var(--ink)]">
                clear
              </Link>
            </p>
          ) : null}

          {/*
            Keyed on the newest note. React keeps a client component's state
            across a server redirect — same component, same position — so
            without this the composer stays open holding the text it just
            saved, and the obvious next move is to save it again.
          */}
          <NoteComposer
            key={notes[0]?.id ?? 'empty'}
            anchors={[]}
            returnTo={returnTo}
            error={noteError || undefined}
          />

          {notes.length === 0 ? (
            <Panel>
              <p className="text-[var(--ink-muted)]">
                {filtered
                  ? 'No notes match that.'
                  : 'Open anyone’s chart and write the first note beside it — it will show up here too.'}
              </p>
            </Panel>
          ) : (
            notes.map((note, index) => (
              <NoteCard
                key={`${note.id}:${new Date(note.updatedAt).getTime()}`}
                note={note}
                index={index}
                returnTo={returnTo}
                subjectName={note.subjectId ? nameOf.get(note.subjectId) : undefined}
              />
            ))
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              What you write about
            </p>
            {topAnchors.length === 0 ? (
              <p className="text-sm text-[var(--ink-faint)]">Nothing anchored yet.</p>
            ) : (
              <ul className="flex flex-col">
                {topAnchors.map((row, index) => {
                  const active = row.anchorKind === anchorKind && row.anchorKey === anchorKey;
                  const label =
                    row.label ?? describeAnchor(row.anchorKind as AnchorKind, row.anchorKey ?? '');
                  return (
                    <li
                      key={`${row.anchorKind}:${row.anchorKey}`}
                      className="jade-rise"
                      style={{ '--i': index } as React.CSSProperties}
                    >
                      <Link
                        href={
                          active
                            ? '/notes'
                            : `/notes?anchorKind=${row.anchorKind}&anchorKey=${encodeURIComponent(row.anchorKey ?? '')}`
                        }
                        className={`flex items-baseline gap-2 border-b border-[var(--rule)] py-1.5 text-sm transition-colors ${
                          active
                            ? 'text-[var(--accent)]'
                            : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                        }`}
                      >
                        <span className="truncate">{label}</span>
                        <span className="ml-auto font-mono text-[10px] text-[var(--ink-faint)]">
                          {row.count}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
            {ANCHOR_KIND_LABELS.yoga}, {ANCHOR_KIND_LABELS.graha} and {ANCHOR_KIND_LABELS.dasha}{' '}
            anchors carry across charts. A note on Mars appears whenever you filter by Mars,
            whoever’s chart you wrote it in.
          </p>
        </aside>
      </div>
    </Shell>
  );
}

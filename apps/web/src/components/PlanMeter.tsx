import Link from 'next/link';
import { COUNTED, type CountedId } from '@/lib/plans';

/**
 * "2 of 3 people · Free".
 *
 * Shown only when a limit exists — an unlimited tier gets nothing, because a
 * meter that always reads ∞ is furniture. The point is that somebody on Free
 * knows where they stand *before* they fill in a birth certificate and get
 * refused, which is the difference between a limit and an ambush.
 */
export function PlanMeter({
  counted,
  used,
  limit,
  planName,
}: {
  counted: CountedId;
  used: number;
  limit: number | null;
  planName: string;
}): React.ReactElement | null {
  if (limit === null) return null;

  const full = used >= limit;
  const noun = limit === 1 ? COUNTED[counted].one : COUNTED[counted].many;

  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.14em]">
      <span style={{ color: full ? 'var(--clay)' : 'var(--ink-faint)' }}>
        {used} of {limit} {noun}
      </span>
      <span className="text-[var(--ink-faint)]"> · {planName}</span>
      {full ? (
        <>
          {' · '}
          <Link
            href={`/upgrade?full=${counted}&used=${used}`}
            className="text-[var(--accent)] underline underline-offset-2"
          >
            more
          </Link>
        </>
      ) : null}
    </p>
  );
}

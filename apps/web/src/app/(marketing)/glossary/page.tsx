import type { Metadata } from 'next';
import Link from 'next/link';
import { GLOSSARY } from '@jade/interpret';

/**
 * The vocabulary, in one place.
 *
 * The hover cards are the primary way these definitions are met — at the
 * moment the word is in front of you, which is when you actually want them.
 * This page exists for the other two cases: a reader who wants to study the
 * vocabulary rather than stumble on it, and a search engine, which cannot
 * hover. It is deliberately plain, deliberately complete, and deliberately
 * built from the same array the tooltips read, so the two can never disagree.
 */

export const metadata: Metadata = {
  title: 'Glossary — Jade',
  description:
    'The Sanskrit and technical vocabulary of Jyotiṣa, defined plainly: nakṣatra, daśā, varga, aṣṭakavarga, lagna, dṛṣṭi and the rest.',
};

export default function GlossaryPage(): React.ReactElement {
  const sorted = [...GLOSSARY].sort((a, b) => a.plain.localeCompare(b.plain));
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
        Reference
      </p>
      <h1 className="mt-1 font-display text-4xl">Glossary</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
        Every one of these words also explains itself wherever it appears in Jade — point at it, or
        tap it on a phone, and the definition comes to you with what it refers to in the chart you
        are looking at.
      </p>

      <nav className="mt-6 flex flex-wrap gap-1.5">
        {sorted.map((entry) => (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            className="border border-[var(--rule)] px-2 py-1 font-mono text-[10.5px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {entry.term}
          </a>
        ))}
      </nav>

      <dl className="mt-10 flex flex-col gap-8">
        {sorted.map((entry) => (
          <div key={entry.id} id={entry.id} className="scroll-mt-20">
            <dt className="flex flex-wrap items-baseline gap-2">
              <span className="font-display text-2xl">{entry.term}</span>
              <span className="font-mono text-[11px] text-[var(--ink-faint)]">{entry.plain}</span>
              {entry.literal ? (
                <span className="text-[12.5px] italic text-[var(--ink-faint)]">
                  literally “{entry.literal}”
                </span>
              ) : null}
            </dt>
            <dd className="mt-1.5">
              <p className="text-[15px] font-medium leading-relaxed">{entry.short}</p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--ink-muted)]">
                {entry.body}
              </p>
              {entry.whereInJade ? (
                <p className="mt-1.5 text-[13px] italic text-[var(--ink-faint)]">
                  In Jade: {entry.whereInJade}
                </p>
              ) : null}
              {entry.related.length > 0 ? (
                <p className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] text-[var(--ink-faint)]">
                  <span className="uppercase tracking-[0.12em]">See also</span>
                  {entry.related.map((id) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      className="border-b border-dotted border-[var(--accent-soft)] text-[var(--accent)]"
                    >
                      {GLOSSARY.find((candidate) => candidate.id === id)?.term ?? id}
                    </a>
                  ))}
                </p>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-12 border-t border-[var(--rule)] pt-5 text-[13.5px] text-[var(--ink-muted)]">
        <Link href="/charts" className="text-[var(--accent)] underline">
          The chart library
        </Link>{' '}
        is where most of this is easiest to see in use.
      </p>
    </div>
  );
}

'use client';

import { createContext, useContext, useMemo } from 'react';
import { Term, type TermDefinition } from '@jade/ui';
import { GLOSSARY, glossaryEntry, glossaryLookup } from '@jade/interpret';

/**
 * Wiring the glossary into the app.
 *
 * Two things are needed everywhere and neither should be passed by hand
 * through the tree: the definitions, which are static, and the per-chart
 * context lines, which are not. So the definitions are imported directly and
 * only the context goes through React context — a page with no chart simply
 * provides nothing and every term still works.
 *
 * The reason this file exists rather than callers using `<Term>` directly is
 * `AutoTerms`. Marking up vocabulary by hand across forty components is work
 * nobody finishes; half the labels end up plain, the reader learns the
 * feature is unreliable, and stops trying. Scanning the text instead means
 * every occurrence is covered by construction, including in prose that is
 * generated rather than written.
 */

const ContextLines = createContext<Readonly<Record<string, readonly string[]>>>({});

/**
 * The narrower answer, when there is one.
 *
 * A `GlossaryScope` says "everything inside me is about Saturn" (or about the
 * 7th house, or about the navāṁśa). A term inside it resolves against that
 * scope first and only falls back to the chart at large — so hovering
 * `Nakṣatra` in Saturn's row tells you Saturn's nakṣatra, which is the thing
 * the reader actually pointed at.
 *
 * Scopes nest, and the innermost wins. That matters in the focus panel, which
 * is inside a page scoped to the chart and itself scoped to the selected
 * graha.
 */
const ScopeLines = createContext<Readonly<Record<string, readonly string[]>>>({});

/** All scopes on the page, so a scope can be named rather than passed. */
const ScopeIndex = createContext<
  Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>
>({});

export function GlossaryProvider({
  lines,
  scopes,
  children,
}: {
  readonly lines: Readonly<Record<string, readonly string[]>>;
  /** Per-graha, per-house, per-sign and per-varga context for this chart. */
  readonly scopes?: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <ContextLines.Provider value={lines}>
      <ScopeIndex.Provider value={scopes ?? {}}>{children}</ScopeIndex.Provider>
    </ContextLines.Provider>
  );
}

/**
 * Declare what the words inside this element are about.
 *
 * `<Scope of="Saturn">` for a graha, `<Scope of="house:7">`, `<Scope
 * of="sign:3">`, `<Scope of="varga:D9">`. An unknown name is not an error —
 * it simply adds nothing, so a caller can name a scope optimistically without
 * having to know whether the page provided one.
 */
export function Scope({
  of,
  children,
}: {
  readonly of: string | null | undefined;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const index = useContext(ScopeIndex);
  const outer = useContext(ScopeLines);
  const lines = (of ? index[of] : undefined) ?? outer;
  return <ScopeLines.Provider value={lines}>{children}</ScopeLines.Provider>;
}

/**
 * Scope first, chart second.
 *
 * Deliberately not a merge. If a scope has something to say about `nakṣatra`,
 * appending the chart-wide line about the Moon's nakṣatra underneath it turns
 * a precise answer into two answers, one of which is about something the
 * reader did not ask about.
 */
function useResolvers(): {
  resolve: (id: string) => TermDefinition | null;
  contextFor: (id: string) => readonly string[] | undefined;
} {
  const lines = useContext(ContextLines);
  const scope = useContext(ScopeLines);
  return useMemo(
    () => ({
      resolve: (id: string) => glossaryEntry(id),
      contextFor: (id: string) => scope[id] ?? lines[id],
    }),
    [lines, scope],
  );
}

/**
 * One explained word.
 *
 * `<T id="nakshatra" />` renders the term as written in the glossary;
 * `<T id="nakshatra">lunar mansion</T>` explains a phrase that is not the
 * term itself, which is what most real labels need.
 */
export function T({
  id,
  children,
  plainTrigger,
}: {
  readonly id: string;
  readonly children?: React.ReactNode;
  readonly plainTrigger?: boolean;
}): React.ReactElement | null {
  const { resolve, contextFor } = useResolvers();
  const entry = glossaryEntry(id);
  if (!entry) {
    // A term that does not exist must not take the text with it. Render the
    // words plainly; the test suite is what catches the missing entry.
    return <>{children ?? id}</>;
  }
  return (
    <Term
      entry={entry}
      context={contextFor(id)}
      resolve={resolve}
      contextFor={contextFor}
      plainTrigger={plainTrigger}
    >
      {children}
    </Term>
  );
}

/**
 * Every glossary word, in one regular expression.
 *
 * Built once. Longest first, so `sarvāṣṭakavarga` is matched before
 * `aṣṭakavarga` and the reader gets the specific entry rather than the
 * general one. Both the IAST and the plain spelling are alternatives,
 * because generated prose and hand-written labels disagree about diacritics
 * and a reader should not be able to tell which she is looking at.
 */
const SCANNER = (() => {
  const spellings: { pattern: string; id: string }[] = [];
  for (const entry of GLOSSARY) {
    for (const form of new Set([entry.term, entry.plain])) {
      spellings.push({ pattern: form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), id: entry.id });
    }
  }
  spellings.sort((a, b) => b.pattern.length - a.pattern.length);
  return new RegExp(
    `(?<![\\p{L}])(${spellings.map((s) => s.pattern).join('|')})(?![\\p{L}])`,
    'giu',
  );
})();

/**
 * Wrap known vocabulary in a run of text.
 *
 * Only the first occurrence of each term in a given block is made
 * interactive. A paragraph mentioning `daśā` five times with five dotted
 * underlines reads as an error message, not as help — the affordance has to
 * stay quiet enough that prose is still prose.
 */
export function AutoTerms({ children }: { readonly children: string }): React.ReactElement {
  const seen = new Set<string>();
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  SCANNER.lastIndex = 0;
  let match: RegExpExecArray | null = SCANNER.exec(children);
  while (match) {
    const word = match[0];
    const entry = glossaryLookup(word);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      if (match.index > cursor) nodes.push(children.slice(cursor, match.index));
      nodes.push(
        <T key={`${entry.id}-${match.index}`} id={entry.id}>
          {word}
        </T>,
      );
      cursor = match.index + word.length;
    }
    match = SCANNER.exec(children);
  }
  if (cursor < children.length) nodes.push(children.slice(cursor));
  return <>{nodes}</>;
}

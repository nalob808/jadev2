'use client';

import { useState } from 'react';
import { NakshatraRing, type InstrumentSelection } from '@jade/ui';
import type { DemoRing } from '@/lib/demoChart';

/**
 * The one thing on the public site a visitor can take hold of.
 *
 * A client component rather than a lazily loaded one, so Next still renders the
 * SVG into the HTML: the dial is drawn before any JavaScript arrives, which
 * keeps the paint fast and leaves something for a crawler to read. Hydration
 * then makes it selectable.
 *
 * Selection is local state here. On a real chart the same ring shares the
 * instrument's cursor with every other view; on a landing page there is nothing
 * to share it with, and a URL full of demo state would be a strange first thing
 * to hand somebody.
 */
export function RingDemo({ data }: { data: DemoRing }): React.ReactElement {
  const [selection, setSelection] = useState<InstrumentSelection | null>(null);

  return (
    <NakshatraRing
      natal={data.natal}
      transits={data.transits}
      natalMoonLongitude={data.natalMoonLongitude}
      selection={selection}
      onSelect={setSelection}
      frameLabel={data.frameLabel}
      ayanamsaValue={data.ayanamsaValue}
      transitLabel={data.transitLabel}
      size={520}
      title="The nakṣatra dial"
    />
  );
}

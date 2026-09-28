import React from 'react';
import { createRoot } from 'react-dom/client';
import { InstrumentWorkspace, type InstrumentWorkspaceProps } from '../../src/components/InstrumentWorkspace';
import data from '../../../../assets/visual-system/data.json';
import '../../src/app/globals.css';
import './preview.css';

function Preview() {
  return (
    <main>
      <header className="asset-header">
        <p className="asset-eyebrow">JADE / VISUAL SYSTEM</p>
        <h1>One moment. Every view.</h1>
        <p>Explore the same reference chart through nakṣatras, folded transits, aṣṭakavarga and Vimśottarī periods.</p>
        <p className="asset-note">Demonstration chart · 7 November 2001, Ann Arbor · fixed starting date 28 September 2026 UTC · apparent Lahiri positions, mean nodes, whole-sign houses.</p>
        <nav aria-label="Exported assets">
          <a href="nakshatra-ring.svg">Nakṣatra SVG</a>
          <a href="graphic-ephemeris-nakshatra.svg">Ephemeris SVG</a>
          <a href="ashtakavarga.svg">Aṣṭakavarga SVG</a>
          <a href="dasha-timeline.svg">Daśā SVG</a>
          <a href="manifest.json">Asset manifest</a>
          <button type="button" onClick={() => {
            document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
          }}>Light / dark</button>
        </nav>
      </header>
      <InstrumentWorkspace {...data as InstrumentWorkspaceProps} />
      <footer className="asset-footer">Interactive ephemeris for exploration. Event pins are labelled examples, not client records. Natal positions remain fixed while transit positions follow the cursor. Reuse and licence details are in README.md and notices/.</footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);

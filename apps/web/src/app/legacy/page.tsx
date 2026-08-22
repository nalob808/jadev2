export const metadata = { title: 'Jade v0 — the original prototype' };

/**
 * The v0 single-file console, kept verbatim and served here so every rebuilt
 * screen can be compared against what it replaces. Delete this route only when
 * Phase 3 is complete and the comparison is no longer useful.
 */
export default function Legacy() {
  return (
    <iframe
      title="Jade v0 prototype"
      src="/legacy/jade-v0.html"
      style={{ border: 0, width: '100%', height: '100vh' }}
    />
  );
}

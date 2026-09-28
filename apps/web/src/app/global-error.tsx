'use client';

/**
 * The boundary of last resort: a throw in the root layout itself, where
 * `error.tsx` cannot help because the layout it renders inside is the thing
 * that failed.
 *
 * It therefore carries its own `<html>` and `<body>`, and its own colours —
 * `globals.css` is loaded by the layout that is not running. Kept to one
 * screen of plain markup for the same reason: every dependency it takes is
 * another thing that can be broken at the moment it is needed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#efefe9',
          color: '#16222e',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          padding: '4rem 1.25rem',
        }}
      >
        <main style={{ margin: '0 auto', maxWidth: '36rem' }}>
          <p
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#7c8a95',
              margin: 0,
            }}
          >
            Jade
          </p>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.1, margin: '0.25rem 0 0' }}>
            Jade could not start this page
          </h1>
          <p style={{ color: '#4a5c6b', lineHeight: 1.6 }}>
            Nothing was lost. Reload, and if it happens again, sign in from the home page.
          </p>
          <p>
            <button
              type="button"
              onClick={reset}
              style={{
                border: '1px solid #33668f',
                background: '#33668f',
                color: 'white',
                padding: '0.5rem 1rem',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </p>
          {error.digest ? (
            <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: '#7c8a95' }}>
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}

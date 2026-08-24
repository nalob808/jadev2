# Fonts for the share card

Three faces, copied here from the `@fontsource/*` packages in `node_modules`.

They are checked in rather than read from `node_modules` because the Open Graph
image is rendered by webpack-compiled code, and a `require.resolve` of a
`.woff` path makes webpack try to _bundle_ the font as a module — which fails,
because no loader handles binary font files. Reading from a path under the app
at runtime sidesteps the bundler entirely.

Satori reads TTF, OTF and WOFF, but **not WOFF2**, which is why these are the
larger `.woff` variants even though the browser is served `.woff2`.

To update, re-copy from the matching package version:

    cp node_modules/.pnpm/@fontsource+barlow@*/node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff body.woff

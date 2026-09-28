import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import {
  AstronomyEngineProvider,
  computeChart,
  POINT_DISPLAY_ORDER,
  signsAspectedBy,
  vimshottari,
  dashaChainAt,
  jdFromUnixMs,
  ayanamsa,
  jdTtFromJdUt,
  sarvaByContributor,
  sarvaTransitSeries,
  kakshaTransitSeries,
  graphicEphemerisSeries,
  type GraphicEphemerisFold,
} from '@jade/astro';
import {
  NakshatraRing,
  GraphicEphemeris,
  SarvaProfile,
  ContributorMultiples,
  KakshaBand,
  DashaTimeline,
  type DashaStrengthSegment,
} from '@jade/ui';
import { transitRing } from '../src/lib/transitRing';
import type { InstrumentWorkspaceProps } from '../src/components/InstrumentWorkspace';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(webRoot, '../..');
const output = resolve(root, 'assets/visual-system');
const require = createRequire(import.meta.url);
const requireTsx = createRequire(require.resolve('tsx/package.json'));
/*
 * esbuild arrives with tsx rather than as a dependency of this app, so its
 * types are not resolvable here. Only the slice of the API used below is typed.
 */
interface EsbuildPlugin {
  name: string;
  setup(build: {
    onLoad(
      options: { filter: RegExp },
      callback: (args: {
        path: string;
      }) => Promise<{ contents: string; loader: 'css'; resolveDir: string }>,
    ): void;
  }): void;
}
const { build } = requireTsx('esbuild') as {
  build(options: Record<string, unknown> & { plugins?: EsbuildPlugin[] }): Promise<unknown>;
};
await mkdir(output, { recursive: true });
await mkdir(resolve(output, 'notices'), { recursive: true });

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame = { ayanamsa: 'lahiri', nodeType: 'mean', positionBasis: 'apparent' } as const;
const birthJd = 2452221.147222221;
const todayJd = jdFromUnixMs(Date.UTC(2026, 8, 28));
const chart = computeChart(
  provider,
  {
    jdUt: birthJd,
    location: { latitude: 42.2808, longitude: -83.743 },
  },
  { ...frame, houseSystem: 'whole_sign', includeOuters: false },
);
const points = POINT_DISPLAY_ORDER.filter((id) => chart.points[id]).map((id) => ({
  ...chart.points[id]!,
  nakshatra: chart.points[id]!.nakshatra.name,
  dignity: chart.dignity[id] ?? null,
}));
const aspects = (['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const).flatMap(
  (id) => signsAspectedBy(id, chart.points[id]!.signIndex),
);
const dashas = vimshottari(chart.points.Moon!.longitude, birthJd, {
  levels: 3,
  yearLength: 'julian',
});
const full = { fromJd: dashas.periods[0]!.startJd, toJd: dashas.periods.at(-1)!.endJd };
const band = sarvaTransitSeries(provider, 'Saturn', full, frame, chart.ashtakavarga.sarva);
const kakshaWindow = { fromJd: todayJd - 365, toJd: todayJd + 3 * 365 };
const kakshaRows = (['Saturn', 'Jupiter'] as const).map((subject) => ({
  subject,
  segments: kakshaTransitSeries(provider, subject, kakshaWindow, frame, chart.ashtakavarga),
}));
const events = [
  {
    id: 'example-study',
    jd: todayJd - 180,
    label: 'Example: study began',
    detail: 'Fictional demonstration annotation.',
    precision: 'day' as const,
  },
  {
    id: 'example-move',
    jd: todayJd - 1200,
    label: 'Example: relocation',
    detail: 'Fictional demonstration annotation; recorded only to the month.',
    precision: 'month' as const,
  },
];
const data: InstrumentWorkspaceProps = {
  todayJd,
  frame,
  positionBasis: 'apparent',
  settingsLabel:
    'Lahiri ayanāṁśa · mean nodes · apparent positions · whole-sign houses · Vimśottarī Julian year',
  natal: {
    points,
    aspects,
    ascendant: chart.points.Ascendant!.longitude,
    ascendantSign: chart.houses.ascendantSign,
    sarva: chart.ashtakavarga.sarva,
    moonLongitude: chart.points.Moon!.longitude,
    birthJd,
    yearLength: 'julian',
  },
  saturnBand: band,
  bySource: sarvaByContributor(chart.ashtakavarga),
  kakshaRows,
  kakshaWindow,
  events,
};
await writeFile(resolve(output, 'data.json'), JSON.stringify(data, null, 2) + '\n');

const fontSpecs = [
  [
    'Barlow Condensed',
    '@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2',
  ],
  ['IBM Plex Mono', '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2'],
] as const;
const fontCss =
  (
    await Promise.all(
      fontSpecs.map(async ([name, path]) => {
        const bytes = await readFile(require.resolve(path));
        return `@font-face{font-family:'${name}';src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');font-weight:100 900;}`;
      }),
    )
  ).join('\n') +
  // The underdotted IAST letters Barlow and Plex lack; see src/app/fonts.css.
  `\n@font-face{font-family:'Jade IAST';src:url(data:font/woff;base64,${(
    await readFile(resolve(webRoot, 'src/fonts/fira-sans-condensed-500-iast.woff'))
  ).toString('base64')}) format('woff');font-weight:100 900;unicode-range:U+1E00-1EFF;}`;
const svgStyles = `${fontCss}\nsvg{--font-display:'Barlow Condensed','Jade IAST';--font-mono:'IBM Plex Mono','Jade IAST';color:#16222e;background:#efefe9;}text{font-variant-numeric:tabular-nums;}svg svg{font-family:'Barlow Condensed','Jade IAST',sans-serif;}`;
const frameText =
  'Lahiri · mean nodes · apparent positions · ecliptic longitude; latitude not plotted';
const dateText = '28 September 2026 UTC';

/** Compose actual rendered SVG nodes; no screenshot or invented chart data. */
async function exportSvg(name: string, element: React.ReactElement, title: string) {
  const markup = renderToStaticMarkup(element);
  const svgs = [...markup.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/g)].map((match) => match[0]);
  if (!svgs.length) throw new Error(`${name}: no SVG rendered`);
  const items = svgs.map((svg) => {
    const box = /viewBox="([^"]+)"/.exec(svg)?.[1]?.split(/\s+/).map(Number);
    if (!box) throw new Error(`${name}: missing viewBox`);
    return { svg, width: box[2]!, height: box[3]! };
  });
  const width = items.length > 1 ? 1000 : Math.max(640, items[0]!.width);
  let y = 74;
  const pieces: string[] = [];
  if (items.length === 8) {
    items.forEach((item, index) => {
      const x = 18 + (index % 4) * 241;
      const rowY = y + Math.floor(index / 4) * 170;
      pieces.push(
        item.svg
          .replace('<svg', `<svg x="${x}" y="${rowY}" width="226" height="142"`)
          .replace(/style="[^"]*"/, ''),
      );
    });
    y += 345;
  } else {
    for (const item of items) {
      const height = ((width - 32) * item.height) / item.width;
      pieces.push(
        item.svg
          .replace('<svg', `<svg x="16" y="${y}" width="${width - 32}" height="${height}"`)
          .replace(/style="[^"]*"/, ''),
      );
      y += height + 18;
    }
  }
  const safe = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${Math.ceil(y + 60)}" viewBox="0 0 ${width} ${Math.ceil(y + 60)}" role="img" aria-label="${safe(title)}">
<title>${safe(title)}</title><desc>${safe(frameText)}. ${dateText}. Jade public demonstration chart. Static export of interactive SVG components.</desc>
<style>${svgStyles}</style><rect width="100%" height="100%" fill="#efefe9"/>
<text x="18" y="28" font-family="Barlow Condensed,sans-serif" font-size="23" fill="#16222e">${safe(title)}</text>
<text x="18" y="49" font-family="IBM Plex Mono,monospace" font-size="10" fill="#4a5c6b">JADE / ${dateText} / DEMONSTRATION CHART</text>
${pieces.join('\n')}
<text x="18" y="${y + 16}" font-family="IBM Plex Mono,monospace" font-size="9" fill="#4a5c6b">${safe(frameText)}</text>
<text x="18" y="${y + 33}" font-family="IBM Plex Mono,monospace" font-size="9" fill="#4a5c6b">Interactive ephemeris · see index.html for controls, tables and full context.</text></svg>\n`;
  await writeFile(resolve(output, name), svg);
}

// Ring marks need a PointId; the transit ring's points carry a looser string id.
const transits = transitRing(todayJd, frame, chart.houses.ascendantSign).map((point) => ({
  id: point.id as (typeof points)[number]['id'],
  longitude: point.longitude,
  retrograde: point.retrograde,
}));
await exportSvg(
  'nakshatra-ring.svg',
  <NakshatraRing
    natal={points}
    transits={transits}
    natalMoonLongitude={chart.points.Moon!.longitude}
    rotation={chart.points.Ascendant!.longitude}
    frameLabel={frameText}
    ayanamsaValue={ayanamsa(jdTtFromJdUt(todayJd), { mode: 'lahiri', includeNutation: true })}
  />,
  'Nakṣatra ring · 27 mansions / 108 padas',
);
await exportSvg(
  'sarva-profile.svg',
  <SarvaProfile
    sarva={data.natal.sarva}
    rotation={data.natal.ascendant}
    ascendantSign={data.natal.ascendantSign}
  />,
  'Sarvāṣṭakavarga · 337 bindus',
);
await exportSvg(
  'contributor-multiples.svg',
  <ContributorMultiples bySource={data.bySource} ascendantSign={data.natal.ascendantSign} />,
  'Aṣṭakavarga · eight contributors',
);
await exportSvg(
  'ashtakavarga.svg',
  <>
    <SarvaProfile
      sarva={data.natal.sarva}
      rotation={data.natal.ascendant}
      ascendantSign={data.natal.ascendantSign}
    />
    <ContributorMultiples bySource={data.bySource} ascendantSign={data.natal.ascendantSign} />
  </>,
  'Aṣṭakavarga · strength and its contributors',
);
await exportSvg(
  'kaksha-transits.svg',
  <KakshaBand rows={kakshaRows} range={kakshaWindow} jd={todayJd} />,
  'Kakṣā transits · Saturn and Jupiter',
);

const series = graphicEphemerisSeries(
  provider,
  { fromJd: todayJd - 180, toJd: todayJd + 545 },
  frame,
  {
    bodies: ['Sun', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'],
    natal: points
      .filter((p) => p.id !== 'Midheaven')
      .map((p) => ({ id: p.id, longitude: p.longitude })),
    stepDays: 1,
    toleranceDays: 1e-6,
  },
);
for (const fold of ['longitude', 'rashi', 'nakshatra'] as GraphicEphemerisFold[]) {
  await exportSvg(
    `graphic-ephemeris-${fold}.svg`,
    <GraphicEphemeris
      series={series}
      fold={fold}
      contacts={series.contacts[fold]!}
      jd={todayJd}
      frameLabel={frameText}
    />,
    `Graphic ephemeris · ${fold === 'longitude' ? '360°' : fold === 'rashi' ? '30° rāśi fold' : '13°20′ nakṣatra fold'}`,
  );
}
const strength: DashaStrengthSegment[] = band.map((segment) => ({
  id: String(segment.fromJd),
  fromJd: segment.fromJd,
  toJd: segment.toJd,
  value: segment.bindus / Math.max(...chart.ashtakavarga.sarva),
  label: `Saturn in ${segment.sign}: ${segment.bindus} natal sarva bindus`,
  factors: [`${segment.bindus} bindus in the natal sarvāṣṭakavarga`],
}));
const maha = dashaChainAt(dashas, todayJd)[0]!;
await exportSvg(
  'dasha-timeline.svg',
  <DashaTimeline
    dashas={dashas}
    jd={todayJd}
    strength={strength}
    events={events}
    initialWindow={{ fromJd: maha.startJd, toJd: maha.endJd }}
    frameLabel="Julian year; Saturn's sign scored by natal sarva bindus"
  />,
  'Vimśottarī daśā · proportional time',
);

await build({
  absWorkingDir: webRoot,
  entryPoints: [resolve(webRoot, 'scripts/visual-assets/preview.tsx')],
  outdir: output,
  entryNames: 'preview',
  assetNames: 'fonts/[name]-[hash]',
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  jsx: 'automatic',
  // The demo data is compiled in rather than imported, so preview.tsx does not
  // depend on a generated file existing and a fresh clone still typechecks.
  define: {
    'process.env.NODE_ENV': '"production"',
    __JADE_PREVIEW_DATA__: JSON.stringify(data),
  },
  alias: { 'next/navigation': resolve(webRoot, 'scripts/visual-assets/navigation.ts') },
  loader: { '.woff': 'file', '.woff2': 'file' },
  plugins: [
    {
      name: 'jade-preview-css',
      setup(plugin) {
        plugin.onLoad({ filter: /\/app\/globals\.css$/ }, async ({ path }) => {
          const source = await readFile(path, 'utf8');
          const result = await postcss([
            tailwind({
              content: [resolve(webRoot, 'src/**/*.{ts,tsx}')],
              theme: {
                extend: { fontFamily: { display: ['Barlow Condensed'], mono: ['IBM Plex Mono'] } },
              },
            }),
          ]).process(source, { from: path });
          return { contents: result.css, loader: 'css', resolveDir: dirname(path) };
        });
      },
    },
  ],
});
await writeFile(
  resolve(output, 'index.html'),
  `<!doctype html>
<html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jade — visual system</title><link rel="stylesheet" href="preview.css"></head><body><div id="root"></div><noscript>This interactive preview needs JavaScript. The SVG files beside it are readable without JavaScript.</noscript><script src="preview.js"></script></body></html>\n`,
);
/**
 * A package's root folder. Some packages (astronomy-engine) do not export
 * `./package.json`, so fall back to walking up from their entry file.
 */
async function packageDir(pkg: string): Promise<string> {
  try {
    return dirname(require.resolve(`${pkg}/package.json`));
  } catch {
    let dir = dirname(require.resolve(pkg));
    for (;;) {
      try {
        const manifest = JSON.parse(await readFile(resolve(dir, 'package.json'), 'utf8'));
        if (manifest.name === pkg) return dir;
      } catch {
        // no package.json at this level; keep climbing
      }
      const parent = dirname(dir);
      if (parent === dir) throw new Error(`Cannot find the package folder for ${pkg}`);
      dir = parent;
    }
  }
}

await copyFile(
  resolve(webRoot, 'src/fonts/OFL-FiraSansCondensed.txt'),
  resolve(output, 'notices', 'fira-sans-condensed-OFL.txt'),
);
for (const pkg of [
  'react',
  'react-dom',
  'astronomy-engine',
  '@fontsource/barlow',
  '@fontsource/barlow-condensed',
  '@fontsource/ibm-plex-mono',
]) {
  const dir = await packageDir(pkg);
  const files = await readdir(dir);
  const licence = files.find((name) => /^(license|licence|ofl)(\.|$)/i.test(name));
  const target = resolve(
    output,
    'notices',
    `${pkg.replaceAll('/', '-').replace('@', '')}-LICENSE.txt`,
  );
  if (licence) {
    await copyFile(resolve(dir, licence), target);
    continue;
  }
  // Some packages (astronomy-engine) publish no licence file, only a field in
  // package.json. Record exactly what they declare rather than inventing text.
  const manifest = JSON.parse(await readFile(resolve(dir, 'package.json'), 'utf8'));
  if (!manifest.license) throw new Error(`Missing licence: ${pkg}`);
  await writeFile(
    target,
    `${pkg} ${manifest.version} is distributed under the ${manifest.license} licence, as declared in its package.json.\n` +
      `The package ships no licence file; the full text is in its repository: ${manifest.homepage ?? manifest.repository?.url ?? 'see npm'}.\n` +
      (manifest.author
        ? `Author: ${typeof manifest.author === 'string' ? manifest.author : manifest.author.name}.\n`
        : ''),
  );
}
await writeFile(
  resolve(output, 'notices/glyphs.txt'),
  'The zodiac and seven visible graha glyphs are Telllu Astrological Symbols, used under the licence purchased for Jade. Rahu, Ketu and the lagna marker were drawn for Jade. This package grants no new redistribution licence for the Telllu glyphs. See the project NOTICE.md.\n',
);
const files = (await readdir(output)).filter((name) => name !== 'manifest.json').sort();
await writeFile(
  resolve(output, 'manifest.json'),
  JSON.stringify(
    {
      format: 'jade.visual-assets.v1',
      referenceBirthJd: birthJd,
      initialCursorJd: todayJd,
      frame,
      houseSystem: 'whole_sign',
      dashaYear: 'julian',
      provider: provider.id,
      precisionClass: provider.precisionClass,
      fictionalEventAnnotations: true,
      regeneration: 'pnpm assets:visual',
      files,
    },
    null,
    2,
  ) + '\n',
);
process.stdout.write(`Created ${files.length} asset entries in ${output}\n`);

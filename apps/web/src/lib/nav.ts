/**
 * The map of Jade — one source of truth for where everything lives.
 *
 * Before this file, navigation was a ten-item array in `Shell.tsx` and every
 * other route was reachable only by typing its URL or by finding a sentence
 * that happened to link to it. Three of the newest surfaces — the instrument,
 * the plain reading, the event search — were effectively invisible.
 *
 * The shape of the answer is that Jade has two different kinds of surface, and
 * flattening them into one menu is what made the menu unreadable:
 *
 * - **Sections** are places you go: your week, your people, the sky, the
 *   library, your practice. They do not depend on which chart is open.
 * - **Lenses** are ways of looking at one subject: the sheet, the houses, the
 *   instrument, the reading, that person's timing. A lens is meaningless
 *   without a subject, so lenses belong to the subject bar, not the menu.
 *
 * So the menu is five words wide and stays that way, the second row changes
 * with the section, and the lenses appear next to the name of the person they
 * are lenses on.
 *
 * This module is pure data plus two resolvers. It holds no JSX so that both the
 * server chrome and the reachability test can read it, and so that adding a
 * route is a one-line edit in one file rather than an archaeology exercise.
 */

export type NavItem = {
  readonly href: string;
  readonly label: string;
  /** What this surface answers. Shown on /map, and used as the title tooltip. */
  readonly blurb: string;
  /** Renders on the public site's chrome rather than the app's. */
  readonly leavesApp?: boolean;
};

export type NavSection = {
  readonly id: string;
  readonly label: string;
  /** Where the primary menu word goes. */
  readonly href: string;
  readonly blurb: string;
  /**
   * Path prefixes that make this section current. Listed explicitly rather
   * than derived from `href`, because a section owns routes that do not sit
   * under its own path — `/houses` and `/wheel` are People, not roots.
   */
  readonly match: readonly string[];
  readonly items: readonly NavItem[];
};

/** The five words in the masthead, in order. */
export const SECTIONS: readonly NavSection[] = [
  {
    id: 'today',
    label: 'Today',
    href: '/home',
    blurb: 'Your week, your own chart, and where the sky is right now.',
    match: ['/home', '/dashboard'],
    items: [],
  },
  {
    id: 'people',
    label: 'People',
    href: '/people',
    blurb: 'Everyone you keep charts for, and the ways of comparing them.',
    match: ['/people', '/relationships', '/houses', '/wheel', '/read'],
    items: [
      {
        href: '/people',
        label: 'All people',
        blurb: 'The client book. Search, filter, and open a chart.',
      },
      {
        href: '/relationships',
        label: 'Pairs',
        blurb: 'Two charts read against each other — aṣṭakūṭa, overlays, and the pair report.',
      },
      {
        href: '/houses',
        label: 'Compare houses',
        blurb:
          'The same house across several people at once: its sign, its lord, and what sits in it.',
      },
      {
        href: '/wheel',
        label: 'Compare wheels',
        blurb: 'One wheel, with a second chart or a library figure overlaid on it.',
      },
      {
        href: '/read',
        label: 'Plain readings',
        blurb: 'The same charts said in plain English, house by house, with the workings behind.',
      },
    ],
  },
  {
    id: 'sky',
    label: 'Sky',
    href: '/timing',
    blurb: 'Time and transits — for one person, or for the sky on its own.',
    match: ['/timing'],
    items: [
      {
        href: '/timing',
        label: 'Periods',
        blurb: 'Vimśottarī periods with the transits that fall inside each one.',
      },
      {
        href: '/timing/search',
        label: 'Event search',
        blurb: 'Find the dates when several sky conditions are true at once.',
      },
      {
        href: '/timing/sky',
        label: 'Sky now',
        blurb: 'Where every graha is today, and which of your people it lands on.',
      },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    href: '/library',
    blurb: 'Public charts to study and to overlay on your own.',
    match: ['/library', '/charts'],
    items: [
      {
        href: '/library',
        label: 'All figures',
        blurb: 'Every public chart in Jade, with its Rodden rating — and overlayable on your own.',
      },
      {
        href: '/charts',
        label: 'Public pages',
        blurb: 'The same records as public, indexable pages, with the full source note.',
        leavesApp: true,
      },
      {
        href: '/learn',
        label: 'Learn',
        blurb: 'The grahas, the signs and the twelve houses, one page each.',
        leavesApp: true,
      },
      {
        href: '/glossary',
        label: 'Glossary',
        blurb: 'Every term Jade uses, in IAST and in plain spelling.',
        leavesApp: true,
      },
    ],
  },
  {
    id: 'practice',
    label: 'Practice',
    href: '/sessions',
    blurb: 'Consultations and everything you have written down.',
    match: ['/sessions', '/notes'],
    items: [
      {
        href: '/sessions',
        label: 'Sessions',
        blurb: 'Consultations, with prep sheets and follow-ups.',
      },
      {
        href: '/notes',
        label: 'Notes',
        blurb: 'Every note you have written, searchable, anchored to what it was about.',
      },
    ],
  },
];

/**
 * The account corner — right-aligned, and not one of the five.
 *
 * Settings is here rather than in the menu because it is not a place you work;
 * it is where you go once and then rarely. Keeping it out of the five is what
 * buys the five their width.
 */
export const ACCOUNT: NavSection = {
  id: 'account',
  label: 'Settings',
  href: '/settings',
  blurb: 'Ayanāṁśa, node type, house system, theme, plan and data.',
  match: ['/settings', '/upgrade', '/map', '/spike', '/legacy'],
  items: [
    {
      href: '/settings',
      label: 'Settings',
      blurb: 'The settings profile every chart is cast against, stated explicitly.',
    },
    {
      href: '/upgrade',
      label: 'Plan',
      blurb: 'What your plan includes and what the next one adds.',
    },
    {
      href: '/map',
      label: 'Everything in Jade',
      blurb: 'Every surface in the app on one page, with what each one answers.',
    },
  ],
};

/**
 * The ways of looking at one subject.
 *
 * Ordered as a practitioner moves: the sheet first because it is the reference,
 * then the two readings of it, then the instrument for exploring, then time,
 * then the things you produce (a report) or correct (rectification).
 *
 * `/timing` takes the subject as a query parameter rather than a path segment,
 * which is why this returns hrefs rather than suffixes.
 */
export function subjectLenses(id: string): readonly NavItem[] {
  return [
    {
      href: `/people/${id}`,
      label: 'Sheet',
      blurb: 'The full chart: pañcāṅga, vargas, yogas, daśās, aṣṭakavarga, lords.',
    },
    {
      href: `/people/${id}/houses`,
      label: 'Houses',
      blurb: 'The twelve houses one card each — sign, lord, occupants, aspects.',
    },
    {
      href: `/read/${id}`,
      label: 'Reading',
      blurb: 'The same chart in plain English, with every placement behind a tap.',
    },
    {
      href: `/people/${id}/instrument`,
      label: 'Instrument',
      blurb: 'Nakṣatra ring, graphic ephemeris, aṣṭakavarga and the daśā timeline on one cursor.',
    },
    {
      href: `/timing?person=${id}`,
      label: 'Timing',
      blurb: 'This person’s periods, with the transits that fall inside them.',
    },
    {
      href: `/people/${id}/report`,
      label: 'Report',
      blurb: 'A printable report of this chart, with or without your notes.',
    },
    {
      href: `/people/${id}/rectify`,
      label: 'Rectify',
      blurb: 'Test candidate birth times against events that already happened.',
    },
  ];
}

/**
 * Routes that are deliberately not in the menu, and why.
 *
 * The reachability test reads this list, so a route added without a home has to
 * be argued for here rather than quietly disappearing. Paths use `:param` for
 * dynamic segments.
 */
export const UNLINKED: ReadonlyArray<{ route: string; why: string }> = [
  { route: '/sign-in', why: 'Reached when there is no session; the chrome does not exist yet.' },
  { route: '/dashboard', why: 'Redirect to /home, kept for old bookmarks.' },
  { route: '/people/new', why: 'The primary action on /people, not a destination in the menu.' },
  { route: '/people/:id/edit', why: 'An action on one person, offered on that person’s page.' },
  { route: '/sessions/new', why: 'The primary action on /sessions.' },
  { route: '/sessions/:id', why: 'A row on /sessions.' },
  { route: '/sessions/:id/prep', why: 'Opened from the session it prepares.' },
  { route: '/relationships/:id', why: 'A row on /relationships.' },
  { route: '/relationships/:id/report', why: 'Opened from the pair it reports on.' },
  { route: '/legacy', why: 'The v0 prototype, kept for comparison. Labs only.' },
  { route: '/spike/sphere', why: 'Behind JADE_SPIKES=1 and not accessible yet. Labs only.' },
];

/**
 * The host prefix the reading mode is served from — `middleware.ts`'s
 * READING_HOST, repeated here because this module must not import middleware.
 */
const READING_HOST = 'read.';

/**
 * A link from the reading host back into the workbench.
 *
 * The reading mode is served from read.jadeapp.co, and the middleware rewrites
 * every path on that host that does not already begin with /read into the
 * reading group. So a plain `/people/abc` link rendered on the reading host
 * becomes `/read/people/abc`, which is a 404 — and it is a 404 that only exists
 * in production, where the two hosts differ, which is the worst kind.
 *
 * Crossing back is therefore an absolute URL. The app's origin is derived by
 * dropping the `read.` prefix rather than configured, so it cannot be forgotten
 * in an environment; NEXT_PUBLIC_APP_ORIGIN overrides it where the two hosts
 * are not related that way.
 *
 * On the app's own host this returns the path untouched, so ordinary client-side
 * navigation is unaffected.
 */
export function workbenchHref(path: string, host?: string | null): string {
  if (!host || !host.startsWith(READING_HOST)) return path;
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? `https://${host.slice(READING_HOST.length)}`;
  return `${origin}${path}`;
}

/** Strip the query and any trailing slash, so matching is about the path alone. */
function pathOf(href: string): string {
  const path = href.split('?')[0] ?? href;
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * Which of the five (or the account corner) owns this path.
 *
 * Longest prefix wins, so `/people` does not claim a path that a more specific
 * section has listed. Returns undefined on the marketing site and on /sign-in,
 * where there is no app chrome to highlight.
 */
export function sectionFor(pathname: string): NavSection | undefined {
  const path = pathOf(pathname);
  let best: NavSection | undefined;
  let bestLength = 0;
  for (const section of [...SECTIONS, ACCOUNT]) {
    for (const prefix of section.match) {
      const hit = path === prefix || path.startsWith(`${prefix}/`);
      if (hit && prefix.length > bestLength) {
        best = section;
        bestLength = prefix.length;
      }
    }
  }
  return best;
}

/**
 * Whether a tier-two or lens link is the page you are on.
 *
 * Exact path equality rather than a prefix, because these rows contain nested
 * pairs — `/timing` beside `/timing/search`, `/people/:id` beside
 * `/people/:id/houses` — and a prefix test lights up both.
 */
export function isCurrent(pathname: string, href: string): boolean {
  return pathOf(pathname) === pathOf(href);
}

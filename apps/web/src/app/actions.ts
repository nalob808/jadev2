'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createRelationship,
  createSubjectWithBirthEvent,
  deleteRelationship,
  exportSubject,
  hardDeleteSubject,
  softDeleteSubject,
  getSubject,
  updateSettingsProfile,
  updateSubject,
  updatePrimaryBirthEvent,
  setHomeZone,
  createLifeEvent,
  deleteLifeEvent,
  setLifeEventEnabled,
  createNote,
  updateNote,
  deleteNote,
  getNote,
  recordUpgradeIntent,
} from '@jade/db';
import {
  isValidZone,
  localMeanTimeOffset,
  manualOffset,
  resolveOffset,
  toUtcMillis,
  type LocalDateTime,
} from '@jade/atlas';
import {
  isAnchorKind,
  isImplementedChartStyle,
  isImplementedHouseSystem,
  isLifeEventKind,
} from '@jade/astro';
import { getDatabase } from '@/lib/db';
import { requireSession, signInDev, signOut } from '@/lib/auth';
import { getPlan, requireCapability, requireRoomFor } from '@/lib/entitlements';
import { isKnownPlan } from '@/lib/plans';

/**
 * Create a person and their birth moment.
 *
 * Everything about time resolution is explicit here, and anything uncertain is
 * recorded rather than smoothed over: which offset was used, where it came
 * from, and whether the wall clock was ambiguous.
 */
export async function addPerson(formData: FormData): Promise<void> {
  const session = await requireSession();

  // Before any parsing. Validating a form the workspace is not allowed to
  // submit, and only then refusing it, wastes the reader's typing — and if the
  // form happened to be valid it would leave them staring at a wall with no
  // idea which of the two problems they had.
  await requireRoomFor(session.workspaceId, 'people');

  const read = (key: string): string => String(formData.get(key) ?? '').trim();
  const fail = (message: string): never =>
    redirect(`/people/new?error=${encodeURIComponent(message)}`);

  const displayName = read('displayName');
  if (!displayName) fail('A name is required.');

  const date = read('date');
  const time = read('time') || '12:00';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('Enter the birth date.');

  const placeName = read('placeName');
  const latitude = Number(read('latitude'));
  const longitude = Number(read('longitude'));
  const timezoneId = read('timezoneId');
  if (!placeName || Number.isNaN(latitude) || Number.isNaN(longitude) || !timezoneId) {
    fail('Choose a birthplace from the list, or enter coordinates and a time zone.');
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    fail('Those coordinates are out of range — latitude ±90, longitude ±180.');
  }

  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const [hour, minute] = time.split(':').map(Number) as [number, number];
  const local: LocalDateTime = { year, month, day, hour, minute, second: 0 };

  const offsetChoice = read('offsetMode') || 'tzdb';
  const resolved =
    offsetChoice === 'lmt'
      ? localMeanTimeOffset(longitude, timezoneId)
      : offsetChoice === 'manual'
        ? manualOffset(Number(read('manualOffsetMinutes')) || 0, timezoneId)
        : resolveOffset(local, timezoneId);

  const created = await createSubjectWithBirthEvent(getDatabase(), session.workspaceId, {
    subject: {
      displayName,
      relationship: (read('relationship') || 'other') as 'other',
      createdBy: session.userId,
    },
    birthEvent: {
      label: 'birth',
      localDatetime: `${date}T${time.length === 5 ? `${time}:00` : time}`,
      utcDatetime: new Date(toUtcMillis(local, resolved.offsetMinutes)),
      utcOffsetMinutes: resolved.offsetMinutes,
      offsetSource: resolved.source,
      offsetAmbiguous: resolved.ambiguous,
      offsetNote: resolved.note ?? null,
      timeAccuracy: (read('timeAccuracy') || 'exact') as 'exact',
      placeName,
      latitude,
      longitude,
      elevationM: 0,
      timezoneId,
      sourceNote: read('sourceNote') || null,
    },
  });

  revalidatePath('/people');
  redirect(`/people/${created.subject.id}`);
}

/**
 * Correct a person's details.
 *
 * Birth data is the most consequential thing in the app and the most commonly
 * mistyped — a time misread off a certificate, the wrong Springfield picked
 * from the list. Until now the only remedy was delete and re-enter, which took
 * every note written against that chart with it.
 *
 * Time resolution is redone from scratch rather than patched, because the
 * pieces are not independent: a new place means a new zone, a new zone means a
 * new offset, and a new offset means a different instant for the same wall
 * clock. Carrying over the old offset "because only the city changed" is the
 * exact bug this recomputation exists to prevent.
 *
 * The cached chart is left alone deliberately. Its key is a hash of the birth
 * moment, the lens and the astro version, so a corrected time is simply a
 * different key and a cache miss — the old row stays valid for the moment it
 * actually describes, and nothing has to be invalidated by hand.
 */
export async function editPerson(formData: FormData): Promise<void> {
  const session = await requireSession();
  const read = (key: string): string => String(formData.get(key) ?? '').trim();
  const id = read('id');
  if (!id) throw new Error('No person to edit.');

  // Annotated on the variable so TypeScript narrows control flow past it —
  // see the note in `updateSettings` for why the arrow's return type alone
  // is not enough.
  const fail: (message: string) => never = (message) =>
    redirect(`/people/${id}/edit?error=${encodeURIComponent(message)}`);

  const displayName = read('displayName');
  if (!displayName) fail('A name is required.');

  const date = read('date');
  const time = read('time') || '12:00';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('Enter the birth date.');

  const placeName = read('placeName');
  const latitude = Number(read('latitude'));
  const longitude = Number(read('longitude'));
  const timezoneId = read('timezoneId');
  if (!placeName || Number.isNaN(latitude) || Number.isNaN(longitude) || !timezoneId) {
    fail('Choose a birthplace from the list, or enter coordinates and a time zone.');
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    fail('Those coordinates are out of range — latitude ±90, longitude ±180.');
  }

  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const [hour, minute] = time.split(':').map(Number) as [number, number];
  const local: LocalDateTime = { year, month, day, hour, minute, second: 0 };

  const offsetChoice = read('offsetMode') || 'tzdb';
  const resolved =
    offsetChoice === 'lmt'
      ? localMeanTimeOffset(longitude, timezoneId)
      : offsetChoice === 'manual'
        ? manualOffset(Number(read('manualOffsetMinutes')) || 0, timezoneId)
        : resolveOffset(local, timezoneId);

  await updateSubject(getDatabase(), session.workspaceId, id, {
    displayName,
    relationship: (read('relationship') || 'other') as 'other',
  });

  await updatePrimaryBirthEvent(getDatabase(), session.workspaceId, id, {
    localDatetime: `${date}T${time.length === 5 ? `${time}:00` : time}`,
    utcDatetime: new Date(toUtcMillis(local, resolved.offsetMinutes)),
    utcOffsetMinutes: resolved.offsetMinutes,
    offsetSource: resolved.source,
    offsetAmbiguous: resolved.ambiguous,
    offsetNote: resolved.note ?? null,
    timeAccuracy: (read('timeAccuracy') || 'exact') as 'exact',
    placeName,
    latitude,
    longitude,
    timezoneId,
    sourceNote: read('sourceNote') || null,
  });

  revalidatePath('/people');
  revalidatePath(`/people/${id}`);
  revalidatePath('/relationships');
  revalidatePath('/home');
  redirect(`/people/${id}?saved=1`);
}

/**
 * Record a life event for rectification.
 *
 * The date is stored as characters, not parsed into an instant. A client says
 * "March 1997"; turning that into a timestamp would invent a day, an hour and a
 * time zone that nobody reported, and the whole discipline of this feature is
 * refusing to manufacture precision.
 */
export async function addLifeEvent(formData: FormData): Promise<void> {
  const session = await requireSession();
  await requireCapability(session.workspaceId, 'rectification');
  const read = (key: string): string => String(formData.get(key) ?? '').trim();
  const subjectId = read('subjectId');
  const back = `/people/${subjectId}/rectify`;

  const fail: (message: string) => never = (message) =>
    redirect(`${back}?error=${encodeURIComponent(message)}`);

  const kind = read('kind');
  if (!isLifeEventKind(kind)) fail('Choose what kind of event this was.');

  const occurredOn = read('occurredOn');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) fail('Enter the date the event happened.');

  const precisionRaw = read('precision');
  const precision =
    precisionRaw === 'month' || precisionRaw === 'year' ? precisionRaw : ('day' as const);

  const created = await createLifeEvent(getDatabase(), session.workspaceId, {
    subjectId,
    kind,
    occurredOn,
    precision,
    note: read('note') || null,
    createdBy: session.userId,
  });

  revalidatePath(back);
  // Redirect to a *different* URL than the one submitted from, carrying the new
  // row's id. Redirecting back to the identical path is a soft navigation that
  // React can satisfy without remounting the client subtree, which leaves the
  // submit button stuck reading "Adding…" — and then a second event cannot be
  // added at all without a manual reload. A changing query string makes it a
  // real navigation, and the id is worth having anyway.
  redirect(`${back}?added=${created.id}`);
}

/**
 * Include or exclude one event from the sweep.
 *
 * Reads the current value and flips it rather than trusting the form, so a
 * stale page cannot re-enable something by submitting what it saw earlier.
 */
export async function toggleLifeEvent(formData: FormData): Promise<void> {
  const session = await requireSession();
  await requireCapability(session.workspaceId, 'rectification');
  const id = String(formData.get('id') ?? '');
  const subjectId = String(formData.get('subjectId') ?? '');
  const enabled = String(formData.get('enabled') ?? '') === 'true';

  await setLifeEventEnabled(getDatabase(), session.workspaceId, id, !enabled);
  revalidatePath(`/people/${subjectId}/rectify`);
  redirect(`/people/${subjectId}/rectify`);
}

export async function removeLifeEvent(formData: FormData): Promise<void> {
  const session = await requireSession();
  await requireCapability(session.workspaceId, 'rectification');
  const id = String(formData.get('id') ?? '');
  const subjectId = String(formData.get('subjectId') ?? '');

  await deleteLifeEvent(getDatabase(), session.workspaceId, id);
  revalidatePath(`/people/${subjectId}/rectify`);
  redirect(`/people/${subjectId}/rectify`);
}

/**
 * Adopt a rectified time as the person's birth event.
 *
 * Deliberately overwrites the primary event and records why in `sourceNote`.
 * A rectified time that does not say it is rectified is the worst outcome
 * here: a year later nobody remembers whether the ascendant came from a
 * certificate or from a sweep, and the two deserve very different confidence.
 */
export async function adoptRectifiedTime(formData: FormData): Promise<void> {
  const session = await requireSession();
  await requireCapability(session.workspaceId, 'rectification');
  const read = (key: string): string => String(formData.get(key) ?? '').trim();
  const subjectId = read('subjectId');

  const record = await getSubject(getDatabase(), session.workspaceId, subjectId);
  if (!record?.birthEvent) redirect(`/people/${subjectId}`);

  const localTime = read('localTime');
  if (!/^\d{2}:\d{2}$/.test(localTime)) {
    redirect(`/people/${subjectId}/rectify?error=${encodeURIComponent('That is not a time.')}`);
  }

  const event = record.birthEvent;
  const datePart = event.localDatetime.split('T')[0]!;
  const [year, month, day] = datePart.split('-').map(Number) as [number, number, number];
  const [hour, minute] = localTime.split(':').map(Number) as [number, number];
  const local: LocalDateTime = { year, month, day, hour, minute, second: 0 };

  const resolved = resolveOffset(local, event.timezoneId);

  await updatePrimaryBirthEvent(getDatabase(), session.workspaceId, subjectId, {
    localDatetime: `${datePart}T${localTime}:00`,
    utcDatetime: new Date(toUtcMillis(local, resolved.offsetMinutes)),
    utcOffsetMinutes: resolved.offsetMinutes,
    offsetSource: resolved.source,
    offsetAmbiguous: resolved.ambiguous,
    offsetNote: resolved.note ?? null,
    // The provenance is the point. "exact" would be a lie about a sweep.
    timeAccuracy: 'min5',
    sourceNote: `Rectified in Jade against ${read('eventCount') || 'recorded'} life events on ${read('today') || 'a sweep'}`,
  });

  revalidatePath(`/people/${subjectId}`);
  revalidatePath(`/people/${subjectId}/rectify`);
  redirect(`/people/${subjectId}?saved=1`);
}

export async function removePerson(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(formData.get('id'));
  const permanent = formData.get('permanent') === 'on';
  if (permanent) {
    await hardDeleteSubject(getDatabase(), session.workspaceId, id);
  } else {
    await softDeleteSubject(getDatabase(), session.workspaceId, id);
  }
  revalidatePath('/people');
  redirect('/people');
}

export async function downloadPerson(formData: FormData): Promise<void> {
  // Never gated. Constitution item 4 — export is available on every tier,
  // and there is no capability key that could turn it off.
  const session = await requireSession();
  const id = String(formData.get('id'));
  await exportSubject(getDatabase(), session.workspaceId, id);
  redirect(`/api/people/${id}/export`);
}

export async function addRelationship(formData: FormData): Promise<void> {
  const session = await requireSession();
  await requireCapability(session.workspaceId, 'relationships');
  const a = String(formData.get('subjectAId') ?? '');
  const b = String(formData.get('subjectBId') ?? '');
  if (!a || !b) throw new Error('Choose two people.');
  if (a === b) throw new Error('Choose two different people.');

  const relationship = await createRelationship(getDatabase(), {
    workspaceId: session.workspaceId,
    subjectAId: a,
    subjectBId: b,
    kind: (formData.get('kind') as 'partner' | undefined) ?? 'partner',
    createdBy: session.userId,
  });
  revalidatePath('/relationships');
  redirect(`/relationships/${relationship.id}`);
}

export async function removeRelationship(formData: FormData): Promise<void> {
  const session = await requireSession();
  await deleteRelationship(getDatabase(), {
    workspaceId: session.workspaceId,
    id: String(formData.get('id')),
  });
  revalidatePath('/relationships');
  redirect('/relationships');
}

/**
 * Save the workspace's astrological lens.
 *
 * Two rules are enforced here rather than trusted from the form.
 *
 * Every value is validated against what the calculation core can actually
 * compute. The `house_system` enum in Postgres accepts `sripati` and
 * `placidus`, and `houseOf` throws on both — so an unvalidated write succeeds,
 * and the failure surfaces later as a crash on a chart page, for a setting
 * that appeared to save cleanly. A form is not a boundary; this is.
 *
 * And a custom ayanāṁśa must arrive with a number. Falling back to Lahiri when
 * the field is blank would be a silent default in the one place the project
 * constitution says there can never be one — the chart would be computed in a
 * frame nobody chose and the UI would report the frame they did.
 */
export async function updateSettings(formData: FormData): Promise<void> {
  const session = await requireSession();
  const profileId = String(formData.get('profileId') ?? '');
  if (!profileId) throw new Error('No settings profile to update.');

  const read = (key: string): string => String(formData.get(key) ?? '').trim();
  // The annotation is on the *variable*, not just the arrow's return type.
  // TypeScript only uses a `never` return to narrow control flow when the
  // signature is declared this way — without it, the compiler does not know
  // that `fail(...)` ends the branch, and every check below stops narrowing.
  const fail: (message: string) => never = (message) =>
    redirect(`/settings?error=${encodeURIComponent(message)}`);

  const houseSystem = read('houseSystem');
  if (!isImplementedHouseSystem(houseSystem)) {
    fail(`${houseSystem || 'That house system'} is not implemented yet.`);
  }

  const chartStyle = read('chartStyle');
  if (!isImplementedChartStyle(chartStyle)) {
    fail(`${chartStyle || 'That chart style'} is not implemented yet.`);
  }

  const ayanamsa = read('ayanamsa');
  let customAyanamsaAtJ2000: number | null = null;
  if (ayanamsa === 'custom') {
    const raw = read('customAyanamsaAtJ2000');
    const value = Number(raw);
    if (!raw || Number.isNaN(value)) {
      fail('A custom ayanāṁśa needs its value at J2000, in degrees.');
    }
    if (value < 0 || value > 360) {
      fail('A custom ayanāṁśa must be between 0 and 360 degrees.');
    }
    customAyanamsaAtJ2000 = value;
  }

  // The wall clock, which is not part of the lens and is stored separately.
  // An empty value clears it back to "unset" — which the UI renders as a
  // banner saying dates are in UTC, rather than quietly picking a zone.
  const homeZone = read('homeZoneId');
  if (homeZone && !isValidZone(homeZone)) {
    fail(`${homeZone} is not a time zone this system recognises.`);
  }
  await setHomeZone(getDatabase(), session.workspaceId, homeZone || null);

  await updateSettingsProfile(getDatabase(), session.workspaceId, profileId, {
    name: read('name') || 'Default',
    ayanamsa: ayanamsa as 'lahiri',
    customAyanamsaAtJ2000,
    nodeType: read('nodeType') === 'true' ? 'true' : 'mean',
    houseSystem,
    positionBasis: read('positionBasis') === 'true' ? 'true' : 'apparent',
    chartStyle,
    includeOuters: formData.get('includeOuters') === 'on',
  });

  // Every chart page reads the profile and every page reads the clock, so
  // they are all stale now.
  revalidatePath('/people');
  revalidatePath('/relationships');
  revalidatePath('/home');
  redirect('/settings?saved=1');
}

// ---------------------------------------------------------------------------
// Notes

/**
 * Tags, from one comma-separated field.
 *
 * Lower-cased and de-duplicated so "Yoga", "yoga" and "yoga " are one tag
 * rather than three that each match a third of the notes — the failure mode
 * that makes a tag filter useless within a month of real use.
 */
function readTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 12);
}

/**
 * Where a note came from, for the redirect afterwards.
 *
 * Notes are written from three places — a person's page, the notes index, and
 * a filtered view of the index — and landing somewhere else after saving loses
 * the reader's place. The form carries its own return path.
 */
function safeReturn(raw: string): string {
  // Only same-site paths. An absolute URL here would be an open redirect.
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/notes';
}

export async function addNote(formData: FormData): Promise<void> {
  const session = await requireSession();
  await requireRoomFor(session.workspaceId, 'notes');
  const read = (key: string): string => String(formData.get(key) ?? '').trim();
  const back = safeReturn(read('returnTo'));

  const body = read('body');
  if (!body) redirect(`${back}${back.includes('?') ? '&' : '?'}noteError=Write something first.`);

  const kindRaw = read('anchorKind') || 'chart';
  const kind = isAnchorKind(kindRaw) ? kindRaw : 'chart';
  const key = read('anchorKey');

  // The database has the same rule as a CHECK constraint. Enforcing it here
  // too means the person gets a sentence rather than a 500.
  if (kind !== 'chart' && !key) {
    redirect(`${back}${back.includes('?') ? '&' : '?'}noteError=Choose what to attach this to.`);
  }

  const subjectId = read('subjectId');

  await createNote(getDatabase(), session.workspaceId, {
    subjectId: subjectId || null,
    anchorKind: kind,
    anchorKey: kind === 'chart' ? null : key,
    anchorLabel: read('anchorLabel') || null,
    body,
    tags: readTags(read('tags')),
    createdBy: session.userId,
  });

  revalidatePath('/notes');
  if (subjectId) revalidatePath(`/people/${subjectId}`);
  redirect(back);
}

export async function editNote(formData: FormData): Promise<void> {
  const session = await requireSession();
  const read = (key: string): string => String(formData.get(key) ?? '').trim();
  const back = safeReturn(read('returnTo'));
  const id = read('id');

  const body = read('body');
  if (!body) redirect(`${back}${back.includes('?') ? '&' : '?'}noteError=A note cannot be empty.`);

  const existing = await getNote(getDatabase(), session.workspaceId, id);
  if (!existing) redirect(back);

  await updateNote(getDatabase(), session.workspaceId, id, {
    body,
    tags: readTags(read('tags')),
  });

  revalidatePath('/notes');
  if (existing.subjectId) revalidatePath(`/people/${existing.subjectId}`);
  redirect(back);
}

/**
 * Pin or unpin.
 *
 * Reads the current value and flips it rather than taking the desired state
 * from the form, so a stale page cannot un-pin something by submitting the
 * value it saw ten minutes ago.
 */
export async function toggleNotePin(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(formData.get('id') ?? '');
  const back = safeReturn(String(formData.get('returnTo') ?? ''));

  const existing = await getNote(getDatabase(), session.workspaceId, id);
  if (existing) {
    await updateNote(getDatabase(), session.workspaceId, id, { pinned: !existing.pinned });
    revalidatePath('/notes');
    if (existing.subjectId) revalidatePath(`/people/${existing.subjectId}`);
  }
  redirect(back);
}

export async function removeNote(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = String(formData.get('id') ?? '');
  const back = safeReturn(String(formData.get('returnTo') ?? ''));

  const existing = await getNote(getDatabase(), session.workspaceId, id);
  await deleteNote(getDatabase(), session.workspaceId, id);

  revalidatePath('/notes');
  if (existing?.subjectId) revalidatePath(`/people/${existing.subjectId}`);
  redirect(back);
}

export async function devSignIn(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return;
  await signInDev(email);
  // The dashboard, not the list: signing in should answer "what is happening"
  // before it asks "who do you want to look at".
  redirect('/home');
}

export async function devSignOut(): Promise<void> {
  await signOut();
  redirect('/');
}

/**
 * Record that somebody wanted a tier they were not on.
 *
 * Writes one row and redirects back to the wall with `noted=1`. No card, no
 * charge, no external service — and the redirect rather than a client-side
 * confirmation means the page cannot get stuck showing a spinner if anything
 * downstream is slow.
 *
 * The tier names are validated against the matrix before they are stored.
 * They arrive from hidden form fields, so they are user input like any other,
 * and unvalidated strings in this table would poison the one number this
 * feature exists to produce.
 */
export async function recordInterest(formData: FormData): Promise<void> {
  const session = await requireSession();
  const read = (key: string): string => String(formData.get(key) ?? '').trim();

  const wantedPlan = read('wantedPlan');
  const fromPlan = read('fromPlan');
  if (!isKnownPlan(wantedPlan) || !isKnownPlan(fromPlan)) redirect('/upgrade');

  // The tier the *database* says, not the tier the form says. A form field is
  // a claim; only the column is a fact, and recording a claim would let a
  // crafted post inflate the numbers this table exists to inform decisions on.
  const actual = await getPlan(session.workspaceId);

  const capability = read('capability') || null;
  const counted = read('counted') || null;

  await recordUpgradeIntent(getDatabase(), session.workspaceId, {
    fromPlan: actual.id,
    wantedPlan,
    capability,
    counted,
    createdBy: session.userId,
  });

  const back = new URLSearchParams({ noted: '1' });
  if (capability) back.set('need', capability);
  if (counted) back.set('full', counted);
  redirect(`/upgrade?${back.toString()}`);
}

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
  updateSettingsProfile,
} from '@jade/db';
import {
  localMeanTimeOffset,
  manualOffset,
  resolveOffset,
  toUtcMillis,
  type LocalDateTime,
} from '@jade/atlas';
import { isImplementedChartStyle, isImplementedHouseSystem } from '@jade/astro';
import { getDatabase } from '@/lib/db';
import { requireSession, signInDev, signOut } from '@/lib/auth';

/**
 * Create a person and their birth moment.
 *
 * Everything about time resolution is explicit here, and anything uncertain is
 * recorded rather than smoothed over: which offset was used, where it came
 * from, and whether the wall clock was ambiguous.
 */
export async function addPerson(formData: FormData): Promise<void> {
  const session = await requireSession();
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
  const session = await requireSession();
  const id = String(formData.get('id'));
  await exportSubject(getDatabase(), session.workspaceId, id);
  redirect(`/api/people/${id}/export`);
}

export async function addRelationship(formData: FormData): Promise<void> {
  const session = await requireSession();
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

  // Every chart page reads this profile, so they are all stale now.
  revalidatePath('/people');
  revalidatePath('/relationships');
  redirect('/settings?saved=1');
}

export async function devSignIn(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return;
  await signInDev(email);
  redirect('/people');
}

export async function devSignOut(): Promise<void> {
  await signOut();
  redirect('/');
}

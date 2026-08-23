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
} from '@jade/db';
import {
  localMeanTimeOffset,
  manualOffset,
  resolveOffset,
  toUtcMillis,
  type LocalDateTime,
} from '@jade/atlas';
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

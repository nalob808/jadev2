import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { PersonForm } from '@/components/PersonForm';
import { Kicker, Panel, Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function NewPersonPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  const { error } = await searchParams;

  return (
    <Shell email={session.email}>
      <div className="mb-6">
        <Kicker>New</Kicker>
        <h1 className="font-display text-4xl">Add a person</h1>
      </div>
      <Panel className="max-w-xl">
        <PersonForm error={error} />
      </Panel>
    </Shell>
  );
}

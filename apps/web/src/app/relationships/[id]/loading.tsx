import { PersonSkeleton } from '@/components/Skeleton';

// A relationship page leads with the overlay wheel, so it has the same shape
// as a person page: one square, then panels.
export default function Loading(): React.ReactElement {
  return <PersonSkeleton />;
}

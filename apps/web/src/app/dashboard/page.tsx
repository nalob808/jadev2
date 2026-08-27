import { redirect } from 'next/navigation';

/**
 * The page moved to /home.
 *
 * Kept as a redirect rather than deleted: this was the sign-in destination for
 * every session in the wild, so it is in bookmarks and in the back button. A
 * 404 here would look like the app losing someone's home page.
 */
export default function DashboardRedirect(): never {
  redirect('/home');
}

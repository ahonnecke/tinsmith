import { redirect } from 'next/navigation';

/** Redirect /estimate to / — the estimate wizard is now the homepage. */
export default function EstimateRedirect() {
  redirect('/');
}

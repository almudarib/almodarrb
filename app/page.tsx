import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { DASHBOARD_PATH, LOGIN_PATH } from '@/lib/paths';

export default async function Page() {
  const s = await getSession();
  if (s) {
    redirect(DASHBOARD_PATH);
  }
  redirect(LOGIN_PATH);
}

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { DASHBOARD_PATH, LOGIN_PATH } from '@/lib/paths';

async function AuthRedirect() {
  const s = await getSession();
  if (s) {
    redirect(DASHBOARD_PATH);
  }
  redirect(LOGIN_PATH);
  return null;
}

export default function Page() {
  return <Suspense fallback={null}><AuthRedirect /></Suspense>;
}

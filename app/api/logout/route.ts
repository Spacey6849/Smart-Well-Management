import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
export async function POST() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('ecw_session')?.value;
  const adminToken = cookieStore.get('ecw_admin_session')?.value;
  if (sessionToken) await query('DELETE FROM sessions WHERE token=?', [sessionToken]);
  if (adminToken) await query('DELETE FROM sessions WHERE token=?', [adminToken]);
  const res = NextResponse.json({ ok: true });
  if (sessionToken) res.cookies.set('ecw_session', '', { path: '/', maxAge: 0 });
  if (adminToken) res.cookies.set('ecw_admin_session', '', { path: '/', maxAge: 0 });
  return res;
}

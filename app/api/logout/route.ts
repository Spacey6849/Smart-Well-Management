export const runtime = 'nodejs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('ecw_session')?.value;
  const adminToken = cookieStore.get('ecw_admin_session')?.value;
  const sb = supabaseServer();
  try {
    if (sessionToken) await sb.from('sessions').delete().eq('token', sessionToken);
    if (adminToken) await sb.from('sessions').delete().eq('token', adminToken);
  } catch (e) {
    console.warn('Logout deletion error', e);
  }
  const res = NextResponse.json({ ok: true });
  if (sessionToken) res.cookies.set('ecw_session', '', { path: '/', maxAge: 0 });
  if (adminToken) res.cookies.set('ecw_admin_session', '', { path: '/', maxAge: 0 });
  return res;
}

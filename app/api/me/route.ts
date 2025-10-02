export const runtime = 'nodejs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
  if (!token) return NextResponse.json({ user: null });
  const sb = supabaseServer();
  const nowIso = new Date().toISOString();
  const { data: sess, error: sessErr } = await sb
    .from('sessions')
    .select('user_id,expires_at')
    .eq('token', token)
    .gt('expires_at', nowIso)
    .limit(1);
  if (sessErr) {
    console.error('Session query error', sessErr);
    return NextResponse.json({ user: null });
  }
  if (!sess || !sess.length) return NextResponse.json({ user: null });
  const userId = sess[0].user_id;

  const { data: userRows } = await sb
    .from('users')
    .select('id,email,username,full_name,phone,panchayat_name,location,created_at')
    .eq('id', userId)
    .limit(1);
  if (userRows && userRows.length) {
    return NextResponse.json({ user: userRows[0] });
  }
  const { data: adminRows } = await sb
    .from('admin_accounts')
    .select('id,email,username,created_at')
    .eq('id', userId)
    .limit(1);
  if (adminRows && adminRows.length) {
    const a = adminRows[0];
    return NextResponse.json({ user: { ...a, full_name: null, phone: null, panchayat_name: null, location: null } });
  }
  return NextResponse.json({ user: null });
}

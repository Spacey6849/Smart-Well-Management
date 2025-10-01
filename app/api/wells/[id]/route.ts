import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
<<<<<<< HEAD
import { query } from '@/lib/db';
=======
import { getSupabase } from '@/lib/supabase/client';
>>>>>>> origin/main

async function getSessionContext() {
  const cookieStore = cookies();
  const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
  if (!token) return { userId: null, isAdmin: false };
<<<<<<< HEAD
  const rows = await query<any>('SELECT user_id FROM sessions WHERE token=? AND expires_at>NOW() LIMIT 1', [token]);
  if (!rows.length) return { userId: null, isAdmin: false };
  const userId = rows[0].user_id as string;
  let isAdmin = false;
  try {
    const adminCheck = await query<any>('SELECT id FROM admin_accounts WHERE id=? LIMIT 1', [userId]);
    isAdmin = adminCheck.length > 0;
=======
  const supabase = getSupabase();
  const { data: sess } = await supabase
    .from('sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .limit(1)
    .maybeSingle();
  if (!sess || new Date((sess as any).expires_at) <= new Date()) return { userId: null, isAdmin: false };
  const userId = (sess as any).user_id as string;
  let isAdmin = false;
  try {
    const supabase = getSupabase();
    const { data: admin } = await supabase.from('admin_accounts').select('id').eq('id', userId).limit(1).maybeSingle();
    isAdmin = !!admin;
>>>>>>> origin/main
  } catch {}
  return { userId, isAdmin };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, isAdmin } = await getSessionContext();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
<<<<<<< HEAD
=======
    const supabase = getSupabase();
>>>>>>> origin/main
    const body = await req.json().catch(() => ({}));
    const name = (body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    // Ownership check for non-admins
<<<<<<< HEAD
    if (!isAdmin) {
      const own = await query<any>('SELECT id FROM user_wells WHERE id=? AND user_id=? LIMIT 1', [params.id, userId]);
      if (!own.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      await query('UPDATE user_wells SET name=? WHERE id=? AND user_id=?', [name, params.id, userId]);
    } else {
      await query('UPDATE user_wells SET name=? WHERE id=?', [name, params.id]);
=======
    
    if (!isAdmin) {
      const { data: own } = await supabase.from('user_wells').select('id').eq('id', params.id).eq('user_id', userId).limit(1);
      if (!own || own.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      await supabase.from('user_wells').update({ name }).eq('id', params.id).eq('user_id', userId);
    } else {
      await supabase.from('user_wells').update({ name }).eq('id', params.id);
>>>>>>> origin/main
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Rename failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, isAdmin } = await getSessionContext();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
<<<<<<< HEAD
    if (!isAdmin) {
      await query('DELETE FROM user_wells WHERE id=? AND user_id=?', [params.id, userId]);
    } else {
      await query('DELETE FROM user_wells WHERE id=?', [params.id]);
=======
    const supabase = getSupabase();
    
    if (!isAdmin) {
      await supabase.from('user_wells').delete().eq('id', params.id).eq('user_id', userId);
    } else {
      await supabase.from('user_wells').delete().eq('id', params.id);
>>>>>>> origin/main
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

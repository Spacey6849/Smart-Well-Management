import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase-server';

async function getSessionContext() {
  const cookieStore = cookies();
  const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
  if (!token) return { userId: null, isAdmin: false };
  const sb = supabaseServer();
  const nowIso = new Date().toISOString();
  try {
    const { data: sess } = await sb.from('sessions').select('user_id,expires_at').eq('token', token).gt('expires_at', nowIso).limit(1);
    if (!sess || !sess.length) return { userId: null, isAdmin: false };
    const userId = sess[0].user_id as string;
    const { data: adminCheck } = await sb.from('admin_accounts').select('id').eq('id', userId).limit(1);
    return { userId, isAdmin: !!(adminCheck && adminCheck.length) };
  } catch {
    return { userId: null, isAdmin: false };
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, isAdmin } = await getSessionContext();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const name = (body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const sb = supabaseServer();
    if (!isAdmin) {
      // Ensure ownership
      const { data: own } = await sb.from('user_wells').select('id').eq('id', params.id).eq('user_id', userId).limit(1);
      if (!own || !own.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { error: upErr } = await sb.from('user_wells').update({ name }).eq('id', params.id).eq('user_id', userId);
      if (upErr) throw upErr;
    } else {
      const { error: upErr } = await sb.from('user_wells').update({ name }).eq('id', params.id);
      if (upErr) throw upErr;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Rename failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, isAdmin } = await getSessionContext();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const sb = supabaseServer();
    if (!isAdmin) {
      const { error: delErr } = await sb.from('user_wells').delete().eq('id', params.id).eq('user_id', userId);
      if (delErr) throw delErr;
    } else {
      const { error: delErr } = await sb.from('user_wells').delete().eq('id', params.id);
      if (delErr) throw delErr;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

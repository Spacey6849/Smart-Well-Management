import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase-server';
export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
  if (!token) {
    return NextResponse.json({ wells: [] });
  }
  const sb = supabaseServer();
  const nowIso = new Date().toISOString();
  const { data: sess } = await sb
    .from('sessions')
    .select('user_id,expires_at')
    .eq('token', token)
    .gt('expires_at', nowIso)
    .limit(1);
  if (!sess || !sess.length) return NextResponse.json({ wells: [] });
  const userId = sess[0].user_id;
  const { data: adminCheck } = await sb.from('admin_accounts').select('id').eq('id', userId).limit(1);
  const isAdmin = !!(adminCheck && adminCheck.length);

  // Fetch wells (basic). For metrics we can issue a separate latest metrics query per well or a view later.
  const wellsQuery = sb
    .from('user_wells')
    .select('id,user_id,name,panchayat_name,lat,lng,status,created_at');
  if (!isAdmin) wellsQuery.eq('user_id', userId);
  const { data: wells, error } = await wellsQuery.order('created_at', { ascending: true });
  if (error) {
    console.error('Wells select error', error);
    return NextResponse.json({ wells: [] });
  }
  return NextResponse.json({ wells: wells || [] });
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const sb = supabaseServer();
    const nowIso = new Date().toISOString();
    const { data: sess, error: sessErr } = await sb
      .from('sessions')
      .select('user_id,expires_at')
      .eq('token', token)
      .gt('expires_at', nowIso)
      .limit(1);
    if (sessErr) return NextResponse.json({ error: 'Session lookup failed' }, { status: 500 });
    if (!sess || !sess.length) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    const sessionUserId = sess[0].user_id;
    let actingAsUserId = sessionUserId;
    const { data: adminCheck } = await sb.from('admin_accounts').select('id').eq('id', sessionUserId).limit(1);
    const isAdmin = !!(adminCheck && adminCheck.length);
    const body = await req.json();
    const wells = Array.isArray(body.wells) ? body.wells : [];
    if (isAdmin && body.user_id) {
      actingAsUserId = body.user_id; // allow admin to specify target user
    }
    if (!wells.length) return NextResponse.json({ ok: true, count: 0 });
    for (const w of wells) {
      try {
        await sb.from('user_wells').upsert({
          id: w.id,
          user_id: actingAsUserId,
          name: w.name,
          panchayat_name: w.panchayat_name || null,
          lat: w.location?.lat ?? null,
          lng: w.location?.lng ?? null,
          status: w.status || 'active'
        });
      } catch (e) {
        console.warn('Well upsert error', e);
      }
    }
    return NextResponse.json({ ok: true, count: wells.length });
  } catch (e) {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}

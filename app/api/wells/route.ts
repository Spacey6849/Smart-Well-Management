import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
  if (!token) {
    return NextResponse.json({ wells: [] });
  }
  const rows = await query<any>('SELECT user_id FROM sessions WHERE token=? AND expires_at>NOW() LIMIT 1', [token]);
  if (!rows.length) return NextResponse.json({ wells: [] });
  const userId = rows[0].user_id;
  // Determine if this session belongs to an admin (user_id matches an admin_accounts id)
  let isAdmin = false;
  try {
    const adminCheck = await query<any>('SELECT id FROM admin_accounts WHERE id=? LIMIT 1', [userId]);
    isAdmin = adminCheck.length > 0;
  } catch {}
  try {
    const baseSelect = `SELECT w.id,w.user_id,w.name,w.panchayat_name,w.lat,w.lng,w.status,u.phone,u.location,
       wm.ph, wm.tds, wm.temperature, wm.water_level, wm.ts AS last_ts
       FROM user_wells w
       LEFT JOIN users u ON u.id = w.user_id
       LEFT JOIN (
         SELECT m1.well_id, m1.ph, m1.tds, m1.temperature, m1.water_level, m1.ts
         FROM well_metrics m1
         JOIN (
           SELECT well_id, MAX(ts) AS max_ts FROM well_metrics GROUP BY well_id
         ) m2 ON m1.well_id = m2.well_id AND m1.ts = m2.max_ts
       ) wm ON wm.well_id = w.id`;
    const wells = isAdmin
      ? await query<any>(`${baseSelect} ORDER BY w.created_at ASC`)
      : await query<any>(`${baseSelect} WHERE w.user_id=? ORDER BY w.created_at ASC`, [userId]);
    return NextResponse.json({ wells });
  } catch (e) {
    return NextResponse.json({ wells: [] });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const rows = await query<any>('SELECT user_id FROM sessions WHERE token=? AND expires_at>NOW() LIMIT 1', [token]);
    if (!rows.length) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    const sessionUserId = rows[0].user_id;
    let actingAsUserId = sessionUserId;
    let isAdmin = false;
    try {
      const adminCheck = await query<any>('SELECT id FROM admin_accounts WHERE id=? LIMIT 1', [sessionUserId]);
      isAdmin = adminCheck.length > 0;
    } catch {}
    const body = await req.json();
    const wells = Array.isArray(body.wells) ? body.wells : [];
    if (isAdmin && body.user_id) {
      actingAsUserId = body.user_id; // allow admin to specify target user
    }
    if (!wells.length) return NextResponse.json({ ok: true, count: 0 });
    for (const w of wells) {
      try {
        await query('REPLACE INTO user_wells (id,user_id,name,panchayat_name,lat,lng,status) VALUES (?,?,?,?,?,?,?)', [w.id, actingAsUserId, w.name, w.panchayat_name || null, w.location?.lat, w.location?.lng, w.status || 'active']);
      } catch (e) {
        // ignore individual errors
      }
    }
    return NextResponse.json({ ok: true, count: wells.length });
  } catch (e) {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}

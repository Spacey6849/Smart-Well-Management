import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

// GET /api/wells/[id]/metrics -> last 24h of metrics points for a well (owned by user or any if admin)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const wellId = params.id;
  if (!wellId) return NextResponse.json({ metrics: [] });
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
    if (!token) return NextResponse.json({ metrics: [] }, { status: 200 }); // treat as no data for guests
    const sess = await query<any>('SELECT user_id FROM sessions WHERE token=? AND expires_at>NOW() LIMIT 1', [token]);
    if (!sess.length) return NextResponse.json({ metrics: [] }, { status: 200 });
    const userId = sess[0].user_id;
    let isAdmin = false;
    try {
      const adminCheck = await query<any>('SELECT id FROM admin_accounts WHERE id=? LIMIT 1', [userId]);
      isAdmin = adminCheck.length > 0;
    } catch {}
    // Ownership check (skip if admin)
    if (!isAdmin) {
      const own = await query<any>('SELECT user_id FROM user_wells WHERE id=? LIMIT 1', [wellId]);
      if (!own.length || own[0].user_id !== userId) {
        return NextResponse.json({ metrics: [] }, { status: 200 });
      }
    }
    const rows = await query<any>(
      `SELECT ph, tds, temperature, water_level, ts
       FROM well_metrics
       WHERE well_id=? AND ts >= (NOW() - INTERVAL 24 HOUR)
       ORDER BY ts ASC`,
      [wellId]
    );
    const metrics = rows.map(r => ({
      ph: r.ph === null ? null : Number(r.ph),
      tds: r.tds === null ? null : Number(r.tds),
      temperature: r.temperature === null ? null : Number(r.temperature),
      waterLevel: r.water_level === null ? null : Number(r.water_level),
      timestamp: r.ts
    }));
    return NextResponse.json({ metrics });
  } catch (e) {
    return NextResponse.json({ metrics: [] }, { status: 200 });
  }
}

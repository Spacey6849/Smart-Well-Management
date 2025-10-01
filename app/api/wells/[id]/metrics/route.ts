import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
<<<<<<< HEAD
import { query } from '@/lib/db';
=======
import { getSupabase } from '@/lib/supabase/client';
>>>>>>> origin/main

// GET /api/wells/[id]/metrics -> last 24h of metrics points for a well (owned by user or any if admin)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
<<<<<<< HEAD
=======
  const supabase = getSupabase();
>>>>>>> origin/main
  const wellId = params.id;
  if (!wellId) return NextResponse.json({ metrics: [] });
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
    if (!token) return NextResponse.json({ metrics: [] }, { status: 200 }); // treat as no data for guests
<<<<<<< HEAD
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
=======
    
    const { data: sess } = await supabase
      .from('sessions')
      .select('user_id, expires_at')
      .eq('token', token)
      .limit(1)
      .maybeSingle();
    if (!sess || new Date((sess as any).expires_at) <= new Date()) return NextResponse.json({ metrics: [] }, { status: 200 });
    const userId = (sess as any).user_id as string;
    let isAdmin = false;
    try {
      const { data: admin } = await supabase.from('admin_accounts').select('id').eq('id', userId).limit(1).maybeSingle();
      isAdmin = !!admin;
    } catch {}
    // Ownership check (skip if admin)
    if (!isAdmin) {
      const { data: own } = await supabase.from('user_wells').select('user_id').eq('id', wellId).limit(1).maybeSingle();
      if (!own || (own as any).user_id !== userId) {
        return NextResponse.json({ metrics: [] }, { status: 200 });
      }
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: rows } = await supabase
      .from('well_metrics')
      .select('ph,tds,temperature,water_level,ts')
      .eq('well_id', wellId)
      .gte('ts', since)
      .order('ts', { ascending: true });
    const metrics = (rows || []).map(r => ({
>>>>>>> origin/main
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

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase-server';

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
    const sb = supabaseServer();
    const nowIso = new Date().toISOString();
    const { data: sess } = await sb
      .from('sessions')
      .select('user_id,expires_at')
      .eq('token', token)
      .gt('expires_at', nowIso)
      .limit(1);
    if (!sess || !sess.length) return NextResponse.json({ metrics: [] }, { status: 200 });
    const userId = sess[0].user_id as string;
    const { data: adminCheck } = await sb.from('admin_accounts').select('id').eq('id', userId).limit(1);
    const isAdmin = !!(adminCheck && adminCheck.length);
    if (!isAdmin) {
      const { data: own } = await sb.from('user_wells').select('user_id').eq('id', wellId).limit(1);
      if (!own || !own.length || own[0].user_id !== userId) {
        return NextResponse.json({ metrics: [] }, { status: 200 });
      }
    }
    const { data: rows } = await sb
      .from('well_metrics')
      .select('ph,tds,temperature,water_level,turbidity,ts')
      .eq('well_id', wellId)
      .gte('ts', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('ts', { ascending: true });
    const metrics = (rows || []).map(r => ({
      ph: r.ph === null ? null : Number(r.ph),
      tds: r.tds === null ? null : Number(r.tds),
      temperature: r.temperature === null ? null : Number(r.temperature),
      waterLevel: r.water_level === null ? null : Number(r.water_level),
      turbidity: (r as any).turbidity === null || (r as any).turbidity === undefined ? null : Number((r as any).turbidity),
      timestamp: r.ts
    }));
    return NextResponse.json({ metrics });
  } catch (e) {
    return NextResponse.json({ metrics: [] }, { status: 200 });
  }
}

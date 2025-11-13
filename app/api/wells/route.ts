export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase-server';
import { sendWellStatusAlertEmail } from '@/lib/mailer';
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
    .select('id,user_id,name,panchayat_name,village_name,lat,lng,status,created_at, users:users!inner (phone,location)');
  if (!isAdmin) wellsQuery.eq('user_id', userId);
  const { data: wells, error } = await wellsQuery.order('created_at', { ascending: true });
  if (error) {
    console.error('Wells select error', error);
    return NextResponse.json({ wells: [] });
  }

  // Fetch latest metrics for each well
  const wellIds = (wells || []).map(w => w.id);
  const metricsMap: Record<string, any> = {};
  if (wellIds.length > 0) {
    // Get latest metric per well by ordering by ts DESC and taking first per well_id
    // For efficiency with many wells, we fetch all recent metrics and reduce in-memory
    const { data: metrics } = await sb
      .from('well_metrics')
      .select('well_id,ph,tds,temperature,water_level,turbidity,ts,well_health')
      .in('well_id', wellIds)
      .order('ts', { ascending: false })
      .limit(wellIds.length * 2); // generous limit to ensure we get latest per well
    
    if (metrics) {
      // Keep only the latest metric per well_id
      for (const m of metrics) {
        const wid = m.well_id as string;
        if (!metricsMap[wid]) metricsMap[wid] = m;
      }
    }
  }

  const normalized = (wells || []).map(w => {
    // Supabase returns joined table as array when using alias if multiple possible rows; we expect at most one
    const userRow = Array.isArray((w as any).users) ? (w as any).users[0] : (w as any).users;
    const latestMetric = metricsMap[w.id as string] || null;
    // Inactivity rule: if no metrics in last 2 hours, mark as offline
    const lastTs = latestMetric?.ts ? new Date(latestMetric.ts as string) : null;
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const isOffline = !lastTs || (nowMs - lastTs.getTime() > twoHoursMs);
    const effectiveStatus = isOffline ? 'offline' : (w.status || 'active');
    return {
      id: w.id,
      user_id: w.user_id,
      name: w.name,
      panchayat_name: w.panchayat_name,
      village_name: (w as any).village_name || userRow?.location || null,
      lat: w.lat,
      lng: w.lng,
      status: effectiveStatus,
      created_at: w.created_at,
      contact_phone: userRow?.phone || null,
      latest_metric: latestMetric
    };
  });
  return NextResponse.json({ wells: normalized });
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
  // Accept either { wells: [...] } bulk format OR single well fields directly.
  const incomingWells = Array.isArray(body.wells) ? body.wells : (body.name ? [body] : []);
    if (isAdmin && body.user_id) {
      actingAsUserId = body.user_id; // allow admin to specify target user
    }
    if (!incomingWells.length) return NextResponse.json({ ok: true, count: 0 });
    // Fetch acting user's location (fallback village)
    let ownerLoc: string | null = null;
    try {
      const { data: ownerRows } = await sb.from('users').select('location').eq('id', actingAsUserId).limit(1);
      ownerLoc = ownerRows && ownerRows.length ? ownerRows[0].location : null;
    } catch {}
    for (const w of incomingWells) {
      try {
        const lat = w.location?.lat ?? w.lat ?? null;
        const lng = w.location?.lng ?? w.lng ?? null;
        const newStatus = (w.status || 'active') as string;
        let previousStatus: string | null = null;
        // Fetch existing status to avoid duplicate alert emails
        if (w.id) {
          try {
            const { data: existingRows } = await sb.from('user_wells').select('status,user_id').eq('id', w.id).limit(1);
            if (existingRows && existingRows.length) {
              previousStatus = existingRows[0].status as string;
            }
          } catch {}
        }
        const { error: upErr } = await sb.from('user_wells').upsert({
          id: w.id,
          user_id: actingAsUserId,
          name: w.name,
          panchayat_name: w.panchayat_name || w.panchayatName || null,
            village_name: w.village_name || w.village || ownerLoc || null,
          lat,
          lng,
          status: newStatus
        });
        if (upErr) {
          console.warn('Well upsert error', upErr);
          continue;
        }
        // Trigger email alert if status is warning/critical and changed OR new
        if ((newStatus === 'warning' || newStatus === 'critical') && previousStatus !== newStatus) {
          // Get owner email & optional phone / location for context
          try {
            const { data: ownerRows } = await sb.from('users').select('email,phone,location').eq('id', actingAsUserId).limit(1);
            const owner = ownerRows && ownerRows.length ? ownerRows[0] : null;
            if (owner?.email) {
              await sendWellStatusAlertEmail({
                to: owner.email,
                well: {
                  id: w.id,
                  name: w.name,
                  status: newStatus as 'warning' | 'critical',
                  panchayat_name: w.panchayat_name || w.panchayatName || null,
                  village_name: w.village_name || w.village || ownerLoc || null,
                  lat: lat ?? null,
                  lng: lng ?? null
                },
                metrics: {
                  ph: w.data?.ph ?? null,
                  tds: w.data?.tds ?? null,
                  temperature: w.data?.temperature ?? null,
                  waterLevel: w.data?.waterLevel ?? null,
                  recordedAt: w.data?.lastUpdated || new Date().toISOString()
                },
                previousStatus
              });
            }
          } catch (mailErr) {
            console.warn('Well alert email send failed', mailErr);
          }
        }
      } catch (e) {
        console.warn('Well upsert general error', e);
      }
    }
    return NextResponse.json({ ok: true, count: incomingWells.length });
  } catch (e) {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}

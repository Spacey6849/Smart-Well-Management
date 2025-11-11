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
      .select('*')
      .eq('well_id', wellId)
      .gte('ts', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('ts', { ascending: true });
    const metrics = (rows || []).map(r => ({
      id: r.id,
      ph: r.ph === null ? null : Number(r.ph),
      tds: r.tds === null ? null : Number(r.tds),
      temperature: r.temperature === null ? null : Number(r.temperature),
      waterLevel: r.water_level === null ? null : Number(r.water_level),
      turbidity: r.turbidity === null || r.turbidity === undefined ? null : Number(r.turbidity),
      conductivity: (r as any).conductivity === null ? null : Number((r as any).conductivity),
      dissolvedOxygen: (r as any).dissolved_oxygen === null ? null : Number((r as any).dissolved_oxygen),
      hardness: (r as any).hardness === null ? null : Number((r as any).hardness),
      chloride: (r as any).chloride === null ? null : Number((r as any).chloride),
      fluoride: (r as any).fluoride === null ? null : Number((r as any).fluoride),
      nitrate: (r as any).nitrate === null ? null : Number((r as any).nitrate),
      sulfate: (r as any).sulfate === null ? null : Number((r as any).sulfate),
      iron: (r as any).iron === null ? null : Number((r as any).iron),
      manganese: (r as any).manganese === null ? null : Number((r as any).manganese),
      arsenic: (r as any).arsenic === null ? null : Number((r as any).arsenic),
      lead: (r as any).lead === null ? null : Number((r as any).lead),
      wellHealth: r.well_health,
      source: (r as any).source || 'unknown',
      notes: (r as any).notes || null,
      timestamp: r.ts
    }));
    return NextResponse.json({ metrics });
  } catch (e) {
    console.error('Error fetching metrics:', e);
    return NextResponse.json({ metrics: [] }, { status: 200 });
  }
}

async function getSessionContext() {
  const cookieStore = cookies();
  const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
  if (!token) return { userId: null, isAdmin: false };
  const sb = supabaseServer();
  const nowIso = new Date().toISOString();
  try {
    const { data: sess } = await sb
      .from('sessions')
      .select('user_id,expires_at')
      .eq('token', token)
      .gt('expires_at', nowIso)
      .limit(1);
    if (!sess || !sess.length) return { userId: null, isAdmin: false };
    const userId = sess[0].user_id as string;
    const { data: adminCheck } = await sb.from('admin_accounts').select('id').eq('id', userId).limit(1);
    return { userId, isAdmin: !!(adminCheck && adminCheck.length) };
  } catch {
    return { userId: null, isAdmin: false };
  }
}

// POST /api/wells/[id]/metrics -> Add new metric reading
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const wellId = params.id;
  if (!wellId) {
    return NextResponse.json({ error: 'Well ID required' }, { status: 400 });
  }

  try {
    const { userId, isAdmin } = await getSessionContext();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = supabaseServer();

    // Check ownership unless admin
    if (!isAdmin) {
      const { data: own } = await sb
        .from('user_wells')
        .select('user_id,name')
        .eq('id', wellId)
        .limit(1);
      if (!own || !own.length || own[0].user_id !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await req.json();

    // Validate and prepare metric data
    const metricData: any = {
      well_id: wellId,
      ph: body.ph !== undefined && body.ph !== null ? Number(body.ph) : null,
      tds: body.tds !== undefined && body.tds !== null ? Number(body.tds) : null,
      temperature: body.temperature !== undefined && body.temperature !== null ? Number(body.temperature) : null,
      water_level: body.waterLevel !== undefined && body.waterLevel !== null ? Number(body.waterLevel) : null,
      turbidity: body.turbidity !== undefined && body.turbidity !== null ? Number(body.turbidity) : null,
      conductivity: body.conductivity !== undefined && body.conductivity !== null ? Number(body.conductivity) : null,
      dissolved_oxygen: body.dissolvedOxygen !== undefined && body.dissolvedOxygen !== null ? Number(body.dissolvedOxygen) : null,
      hardness: body.hardness !== undefined && body.hardness !== null ? Number(body.hardness) : null,
      chloride: body.chloride !== undefined && body.chloride !== null ? Number(body.chloride) : null,
      fluoride: body.fluoride !== undefined && body.fluoride !== null ? Number(body.fluoride) : null,
      nitrate: body.nitrate !== undefined && body.nitrate !== null ? Number(body.nitrate) : null,
      sulfate: body.sulfate !== undefined && body.sulfate !== null ? Number(body.sulfate) : null,
      iron: body.iron !== undefined && body.iron !== null ? Number(body.iron) : null,
      manganese: body.manganese !== undefined && body.manganese !== null ? Number(body.manganese) : null,
      arsenic: body.arsenic !== undefined && body.arsenic !== null ? Number(body.arsenic) : null,
      lead: body.lead !== undefined && body.lead !== null ? Number(body.lead) : null,
      source: body.source || 'manual',
      notes: body.notes || null,
      ts: body.timestamp || new Date().toISOString()
    };

    // Calculate well health based on metrics
    const wellHealth = calculateWellHealth(metricData);
    metricData.well_health = wellHealth;

    // Get well name for the metric
    const { data: wellData } = await sb
      .from('user_wells')
      .select('name')
      .eq('id', wellId)
      .limit(1);
    
    if (wellData && wellData.length > 0) {
      metricData.well_name = wellData[0].name;
    }

    // Insert metric
    const { data: inserted, error: insertError } = await sb
      .from('well_metrics')
      .insert(metricData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting metric:', insertError);
      return NextResponse.json({ error: 'Failed to save metric' }, { status: 500 });
    }

    // Update well status based on health
    if (wellHealth === 'critical' || wellHealth === 'warning') {
      await sb
        .from('user_wells')
        .update({ status: wellHealth })
        .eq('id', wellId);
    } else if (wellHealth === 'healthy') {
      await sb
        .from('user_wells')
        .update({ status: 'active' })
        .eq('id', wellId);
    }

    return NextResponse.json({ 
      ok: true, 
      metric: {
        id: inserted.id,
        wellHealth: inserted.well_health,
        timestamp: inserted.ts
      }
    });
  } catch (e) {
    console.error('Error creating metric:', e);
    return NextResponse.json({ error: 'Failed to save metric' }, { status: 500 });
  }
}

// PUT /api/wells/[id]/metrics -> Bulk update/insert metrics
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const wellId = params.id;
  if (!wellId) {
    return NextResponse.json({ error: 'Well ID required' }, { status: 400 });
  }

  try {
    const { userId, isAdmin } = await getSessionContext();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sb = supabaseServer();

    // Check ownership unless admin
    if (!isAdmin) {
      const { data: own } = await sb
        .from('user_wells')
        .select('user_id,name')
        .eq('id', wellId)
        .limit(1);
      if (!own || !own.length || own[0].user_id !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await req.json();
    const metrics = Array.isArray(body.metrics) ? body.metrics : [body];

    if (metrics.length === 0) {
      return NextResponse.json({ error: 'No metrics provided' }, { status: 400 });
    }

    // Get well name
    const { data: wellData } = await sb
      .from('user_wells')
      .select('name')
      .eq('id', wellId)
      .limit(1);
    const wellName = wellData && wellData.length > 0 ? wellData[0].name : null;

    const preparedMetrics = metrics.map((metric: any) => {
      const metricData: any = {
        well_id: wellId,
        well_name: wellName,
        ph: metric.ph !== undefined && metric.ph !== null ? Number(metric.ph) : null,
        tds: metric.tds !== undefined && metric.tds !== null ? Number(metric.tds) : null,
        temperature: metric.temperature !== undefined && metric.temperature !== null ? Number(metric.temperature) : null,
        water_level: metric.waterLevel !== undefined && metric.waterLevel !== null ? Number(metric.waterLevel) : null,
        turbidity: metric.turbidity !== undefined && metric.turbidity !== null ? Number(metric.turbidity) : null,
        conductivity: metric.conductivity !== undefined && metric.conductivity !== null ? Number(metric.conductivity) : null,
        dissolved_oxygen: metric.dissolvedOxygen !== undefined && metric.dissolvedOxygen !== null ? Number(metric.dissolvedOxygen) : null,
        hardness: metric.hardness !== undefined && metric.hardness !== null ? Number(metric.hardness) : null,
        chloride: metric.chloride !== undefined && metric.chloride !== null ? Number(metric.chloride) : null,
        fluoride: metric.fluoride !== undefined && metric.fluoride !== null ? Number(metric.fluoride) : null,
        nitrate: metric.nitrate !== undefined && metric.nitrate !== null ? Number(metric.nitrate) : null,
        sulfate: metric.sulfate !== undefined && metric.sulfate !== null ? Number(metric.sulfate) : null,
        iron: metric.iron !== undefined && metric.iron !== null ? Number(metric.iron) : null,
        manganese: metric.manganese !== undefined && metric.manganese !== null ? Number(metric.manganese) : null,
        arsenic: metric.arsenic !== undefined && metric.arsenic !== null ? Number(metric.arsenic) : null,
        lead: metric.lead !== undefined && metric.lead !== null ? Number(metric.lead) : null,
        source: metric.source || 'bulk_import',
        notes: metric.notes || null,
        ts: metric.timestamp || new Date().toISOString()
      };

      // Calculate well health
      metricData.well_health = calculateWellHealth(metricData);
      return metricData;
    });

    // Insert all metrics
    const { error: insertError } = await sb
      .from('well_metrics')
      .insert(preparedMetrics);

    if (insertError) {
      console.error('Error bulk inserting metrics:', insertError);
      return NextResponse.json({ error: 'Failed to save metrics' }, { status: 500 });
    }

    // Update well status based on latest metric health
    const latestHealth = preparedMetrics[preparedMetrics.length - 1].well_health;
    if (latestHealth === 'critical' || latestHealth === 'warning') {
      await sb
        .from('user_wells')
        .update({ status: latestHealth })
        .eq('id', wellId);
    } else if (latestHealth === 'healthy') {
      await sb
        .from('user_wells')
        .update({ status: 'active' })
        .eq('id', wellId);
    }

    return NextResponse.json({ 
      ok: true, 
      count: preparedMetrics.length,
      latestHealth
    });
  } catch (e) {
    console.error('Error bulk creating metrics:', e);
    return NextResponse.json({ error: 'Failed to save metrics' }, { status: 500 });
  }
}

// Helper function to calculate well health based on metrics
function calculateWellHealth(metric: any): 'healthy' | 'warning' | 'critical' {
  const issues: string[] = [];
  
  // pH: Ideal 6.5-8.5, Warning <6 or >9, Critical <5.5 or >9.5
  if (metric.ph !== null) {
    if (metric.ph < 5.5 || metric.ph > 9.5) issues.push('critical:ph');
    else if (metric.ph < 6.0 || metric.ph > 9.0) issues.push('warning:ph');
  }
  
  // TDS: Ideal <500, Warning 500-1000, Critical >1000
  if (metric.tds !== null) {
    if (metric.tds > 1000) issues.push('critical:tds');
    else if (metric.tds > 500) issues.push('warning:tds');
  }
  
  // Turbidity: Ideal <5 NTU, Warning 5-10, Critical >10
  if (metric.turbidity !== null) {
    if (metric.turbidity > 10) issues.push('critical:turbidity');
    else if (metric.turbidity > 5) issues.push('warning:turbidity');
  }
  
  // Temperature: Warning if <10 or >30, Critical if <5 or >35
  if (metric.temperature !== null) {
    if (metric.temperature < 5 || metric.temperature > 35) issues.push('critical:temperature');
    else if (metric.temperature < 10 || metric.temperature > 30) issues.push('warning:temperature');
  }
  
  // Nitrate: Warning >10 mg/L, Critical >50 mg/L
  if (metric.nitrate !== null) {
    if (metric.nitrate > 50) issues.push('critical:nitrate');
    else if (metric.nitrate > 10) issues.push('warning:nitrate');
  }
  
  // Fluoride: Warning >1.5 mg/L, Critical >2.5 mg/L
  if (metric.fluoride !== null) {
    if (metric.fluoride > 2.5) issues.push('critical:fluoride');
    else if (metric.fluoride > 1.5) issues.push('warning:fluoride');
  }

  // Arsenic: Warning >0.01 mg/L, Critical >0.05 mg/L (WHO guideline is 0.01)
  if (metric.arsenic !== null) {
    if (metric.arsenic > 0.05) issues.push('critical:arsenic');
    else if (metric.arsenic > 0.01) issues.push('warning:arsenic');
  }

  // Lead: Warning >0.01 mg/L, Critical >0.015 mg/L
  if (metric.lead !== null) {
    if (metric.lead > 0.015) issues.push('critical:lead');
    else if (metric.lead > 0.01) issues.push('warning:lead');
  }

  // Iron: Warning >0.3 mg/L, Critical >1 mg/L
  if (metric.iron !== null) {
    if (metric.iron > 1) issues.push('critical:iron');
    else if (metric.iron > 0.3) issues.push('warning:iron');
  }
  
  // Check for critical issues first
  if (issues.some(i => i.startsWith('critical'))) {
    return 'critical';
  }
  
  // Then check for warnings
  if (issues.some(i => i.startsWith('warning'))) {
    return 'warning';
  }
  
  return 'healthy';
}

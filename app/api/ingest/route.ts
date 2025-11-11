import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

type MetricInput = {
  well_id?: string;
  wellId?: string;
  well_name?: string;
  ph?: number | string | null;
  tds?: number | string | null;
  temperature?: number | string | null;
  water_level?: number | string | null;
  waterLevel?: number | string | null;
  turbidity?: number | string | null;
  conductivity?: number | string | null;
  dissolvedOxygen?: number | string | null;
  dissolved_oxygen?: number | string | null;
  hardness?: number | string | null;
  chloride?: number | string | null;
  fluoride?: number | string | null;
  nitrate?: number | string | null;
  sulfate?: number | string | null;
  iron?: number | string | null;
  manganese?: number | string | null;
  arsenic?: number | string | null;
  lead?: number | string | null;
  source?: string | null;
  notes?: string | null;
  timestamp?: string | null;
};

function toNum(v: any) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function calculateWellHealth(metric: any): 'healthy' | 'warning' | 'critical' {
  const issues: string[] = [];
  if (metric.ph !== null) {
    if (metric.ph < 5.5 || metric.ph > 9.5) issues.push('critical:ph');
    else if (metric.ph < 6.0 || metric.ph > 9.0) issues.push('warning:ph');
  }
  if (metric.tds !== null) {
    if (metric.tds > 1000) issues.push('critical:tds');
    else if (metric.tds > 500) issues.push('warning:tds');
  }
  if (metric.turbidity !== null) {
    if (metric.turbidity > 10) issues.push('critical:turbidity');
    else if (metric.turbidity > 5) issues.push('warning:turbidity');
  }
  if (metric.temperature !== null) {
    if (metric.temperature < 5 || metric.temperature > 35) issues.push('critical:temperature');
    else if (metric.temperature < 10 || metric.temperature > 30) issues.push('warning:temperature');
  }
  if (metric.nitrate !== null) {
    if (metric.nitrate > 50) issues.push('critical:nitrate');
    else if (metric.nitrate > 10) issues.push('warning:nitrate');
  }
  if (metric.fluoride !== null) {
    if (metric.fluoride > 2.5) issues.push('critical:fluoride');
    else if (metric.fluoride > 1.5) issues.push('warning:fluoride');
  }
  if (metric.arsenic !== null) {
    if (metric.arsenic > 0.05) issues.push('critical:arsenic');
    else if (metric.arsenic > 0.01) issues.push('warning:arsenic');
  }
  if (metric.lead !== null) {
    if (metric.lead > 0.015) issues.push('critical:lead');
    else if (metric.lead > 0.01) issues.push('warning:lead');
  }
  if (metric.iron !== null) {
    if (metric.iron > 1) issues.push('critical:iron');
    else if (metric.iron > 0.3) issues.push('warning:iron');
  }
  if (issues.some(i => i.startsWith('critical'))) return 'critical';
  if (issues.some(i => i.startsWith('warning'))) return 'warning';
  return 'healthy';
}

export async function POST(req: Request) {
  // Simple header-based device auth
  const configured = process.env.DEVICE_INGEST_KEY || '';
  const provided = req.headers.get('x-ecw-device-key') || req.headers.get('x-device-key') || '';
  if (!configured) {
    return NextResponse.json({ error: 'Server not configured (DEVICE_INGEST_KEY missing)' }, { status: 500 });
  }
  if (provided !== configured) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as MetricInput;
    const wellId = body.well_id || body.wellId;
    if (!wellId) return NextResponse.json({ error: 'well_id required' }, { status: 400 });

    const sb = supabaseServer();

    // Prepare data
    const metricData: any = {
      well_id: wellId,
      ph: toNum(body.ph),
      tds: toNum(body.tds),
      temperature: toNum(body.temperature),
      water_level: body.water_level !== undefined ? toNum(body.water_level) : toNum(body.waterLevel),
      turbidity: toNum(body.turbidity),
      conductivity: toNum(body.conductivity),
      dissolved_oxygen: body.dissolved_oxygen !== undefined ? toNum(body.dissolved_oxygen) : toNum(body.dissolvedOxygen),
      hardness: toNum(body.hardness),
      chloride: toNum(body.chloride),
      fluoride: toNum(body.fluoride),
      nitrate: toNum(body.nitrate),
      sulfate: toNum(body.sulfate),
      iron: toNum(body.iron),
      manganese: toNum(body.manganese),
      arsenic: toNum(body.arsenic),
      lead: toNum(body.lead),
      source: body.source || 'device',
      notes: body.notes || null,
      ts: body.timestamp || new Date().toISOString(),
    };

    // Calculate health
    metricData.well_health = calculateWellHealth(metricData);

    // Fill in well_name if provided or fetch
    if (body.well_name) {
      metricData.well_name = body.well_name;
    } else {
      const { data: wellData } = await sb
        .from('user_wells')
        .select('name')
        .eq('id', wellId)
        .limit(1);
      if (wellData && wellData.length) {
        metricData.well_name = wellData[0].name;
      }
    }

    const { error: insertError } = await sb.from('well_metrics').insert(metricData);
    if (insertError) {
      console.error('Ingest insert error', insertError);
      return NextResponse.json({ error: 'Failed to save metric' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Ingest error', e);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

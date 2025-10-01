import { NextRequest } from 'next/server';
// Force dynamic execution & disable caching to avoid static optimization error when using request.url and streaming
export const dynamic = 'force-dynamic';
export const revalidate = 0;
<<<<<<< HEAD
export const fetchCache = 'no-store';
export const runtime = 'nodejs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
=======
export const fetchCache = 'only-no-store';
export const runtime = 'nodejs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase/client';
>>>>>>> origin/main

// Expected table structure (create in Supabase):
// Table: chat_messages
// Columns: id (uuid, pk, default uuid_generate_v4()), role (text), content (text), created_at (timestamptz default now())

export async function POST(req: NextRequest) {
  try {
<<<<<<< HEAD
  // Ensure chat_messages has needed polymorphic linkage columns (runtime safe add)
  await ensureChatColumns();
=======
  const supabase = getSupabase();
  // Ensure chat_messages has needed polymorphic linkage columns (runtime safe add)
  // Supabase schema should already include chat_messages with columns: role, content, username, response, created_at
>>>>>>> origin/main
  const url = new URL(req.url);
  const isStream = url.searchParams.get('stream') === '1';
    const body = await req.json();
  const messages = (body.messages as { role: string; content: string }[] | undefined) || [];
  // Legacy-style: rely mainly on provided conversation (front-end should send recent history)
  const lastUser = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

    // Identify session (user vs admin) with backward compatibility (sessions may lack admin_id column)
    const cookieStore = cookies();
    const userSession = cookieStore.get('ecw_session')?.value;
    const adminSession = cookieStore.get('ecw_admin_session')?.value;
<<<<<<< HEAD
    const sessionCols = await getSessionColumns();
    const hasAdminIdCol = sessionCols.has('admin_id');
=======
  const hasAdminIdCol = false; // sessions table in Supabase uses user_id only
>>>>>>> origin/main
  let userId: string | null = null;
  let adminId: string | null = null;
  if (adminSession) {
      if (hasAdminIdCol) {
<<<<<<< HEAD
        const rows = await query('SELECT admin_id FROM sessions WHERE token = ? LIMIT 1', [adminSession]);
        if (rows.length && rows[0].admin_id) adminId = rows[0].admin_id;
      } else {
        // Fallback: use user_id and verify it belongs to admin_accounts
        const rows = await query('SELECT user_id FROM sessions WHERE token = ? LIMIT 1', [adminSession]);
        if (rows.length && rows[0].user_id) {
          const aid = rows[0].user_id;
            const a = await query('SELECT id FROM admin_accounts WHERE id = ? LIMIT 1', [aid]);
            if (a.length) adminId = aid; else userId = aid; // mis-issued cookie? treat as user
=======
        // Not supported in current schema
      } else {
        
        const { data: s } = await supabase.from('sessions').select('user_id').eq('token', adminSession).limit(1).maybeSingle();
        if (s?.user_id) {
          const aid = s.user_id as string;
          const { data: a } = await supabase.from('admin_accounts').select('id').eq('id', aid).limit(1).maybeSingle();
          if (a) adminId = aid; else userId = aid;
>>>>>>> origin/main
        }
      }
    }
    if (!adminId && userSession) {
<<<<<<< HEAD
      const rows = await query('SELECT user_id FROM sessions WHERE token = ? LIMIT 1', [userSession]);
      if (rows.length && rows[0].user_id) {
        const uid = rows[0].user_id;
=======
      
      const { data: s } = await supabase.from('sessions').select('user_id').eq('token', userSession).limit(1).maybeSingle();
      if (s?.user_id) {
        const uid = s.user_id as string;
>>>>>>> origin/main
        if (hasAdminIdCol) {
          // standard path: ensure it's not an admin row accidentally
          userId = uid;
        } else {
          // If sessions lacks admin_id we must ensure uid is not an admin id
<<<<<<< HEAD
          const a = await query('SELECT id FROM admin_accounts WHERE id = ? LIMIT 1', [uid]);
          if (a.length) adminId = uid; else userId = uid;
=======
          const { data: a } = await supabase.from('admin_accounts').select('id').eq('id', uid).limit(1).maybeSingle();
          if (a) adminId = uid; else userId = uid;
>>>>>>> origin/main
        }
      }
    }

    // Build wells + latest metric snapshot.
    // Admin: all wells. Panchayat user: all wells sharing any panchayat_name the user owns.
    let wells: any[] = [];
<<<<<<< HEAD
    if (adminId) {
      wells = await query(`SELECT w.id, w.user_id, w.name, w.panchayat_name, w.status, w.lat, w.lng,
              u.username, u.email, u.phone, u.location
            FROM user_wells w LEFT JOIN users u ON u.id = w.user_id ORDER BY w.id`);
    } else if (userId) {
      const pRows = await query<{ panchayat_name: string }>('SELECT DISTINCT panchayat_name FROM user_wells WHERE user_id = ? AND panchayat_name IS NOT NULL', [userId]);
      const panchayats = pRows.map(r => r.panchayat_name).filter(Boolean);
      if (panchayats.length) {
        const placeholders = panchayats.map(()=>'?').join(',');
   wells = await query(`SELECT w.id, w.user_id, w.name, w.panchayat_name, w.status, w.lat, w.lng,
            u.phone, u.location
          FROM user_wells w LEFT JOIN users u ON u.id = w.user_id
          WHERE w.panchayat_name IN (${placeholders}) ORDER BY w.id`, panchayats);
      } else {
   // fallback to only the user's own wells if no panchayat_name set
   wells = await query(`SELECT w.id, w.user_id, w.name, w.panchayat_name, w.status, w.lat, w.lng,
            u.phone, u.location
          FROM user_wells w LEFT JOIN users u ON u.id = w.user_id
          WHERE w.user_id = ? ORDER BY w.id`, [userId]);
=======
    
    if (adminId) {
      const { data } = await supabase
        .from('user_wells')
        .select('id,user_id,name,panchayat_name,status,lat,lng, users(username,email,phone,location)')
        .order('id', { ascending: true });
      wells = (data || []).map((w:any) => ({ ...w, ...w.users }));
    } else if (userId) {
      const { data: pRows } = await supabase
        .from('user_wells')
        .select('panchayat_name')
        .eq('user_id', userId)
        .not('panchayat_name', 'is', null);
      const panchayats = Array.from(new Set((pRows || []).map(r => r.panchayat_name).filter(Boolean)));
      if (panchayats.length) {
        const { data } = await supabase
          .from('user_wells')
          .select('id,user_id,name,panchayat_name,status,lat,lng, users(phone,location)')
          .in('panchayat_name', panchayats)
          .order('id', { ascending: true });
        wells = (data || []).map((w:any) => ({ ...w, ...w.users }));
      } else {
        const { data } = await supabase
          .from('user_wells')
          .select('id,user_id,name,panchayat_name,status,lat,lng, users(phone,location)')
          .eq('user_id', userId)
          .order('id', { ascending: true });
        wells = (data || []).map((w:any) => ({ ...w, ...w.users }));
>>>>>>> origin/main
      }
    }

    // Get latest metrics per well (limit recent rows then reduce in JS for portability across MySQL versions)
    const wellIds = wells.map(w => w.id);
<<<<<<< HEAD
    let metricsByWell: Record<number, any> = {};
    if (wellIds.length) {
      const placeholders = wellIds.map(()=>'?').join(',');
  const metricRows = await query(`SELECT id, well_id, ph, tds, temperature, water_level, ts, well_name FROM well_metrics WHERE well_id IN (${placeholders}) ORDER BY ts DESC LIMIT 1000`, wellIds);
      for (const row of metricRows as any[]) {
=======
    let metricsByWell: Record<string, any> = {};
    if (wellIds.length) {
      const { data: metricRows } = await supabase
        .from('well_metrics')
        .select('id, well_id, ph, tds, temperature, water_level, ts, well_name')
        .in('well_id', wellIds)
        .order('ts', { ascending: false })
        .limit(1000);
      for (const row of (metricRows || []) as any[]) {
>>>>>>> origin/main
        if (!metricsByWell[row.well_id]) metricsByWell[row.well_id] = row; // first is latest due to DESC
      }
    }

    // Build a concise well snapshot only if the user asks about wells/metrics
    const needsWellContext = /well|metric|ph|tds|water|temperature|level|panchayat/i.test(lastUser || '') && wells.length;
    let structuredBlock = '';
    if (needsWellContext) {
      const wellSections: string[] = [];
      for (const w of wells) {
        const m = metricsByWell[w.id];
        const wellName = w.name || 'Unknown Well';
        if (!m) { wellSections.push(`${wellName}\n(No data)`); continue; }
        const village = (w as any).location || '—'; // user location (village)
        const phone = (w as any).phone || '—';
        const section = [
          `Well Name: ${wellName}`,
          `Village name: ${village}`,
          `Panchayat Name: ${w.panchayat_name || '—'}`,
          `Contact Number: ${phone}`,
          `TDS: ${m.tds != null ? m.tds + ' ppm' : '—'}`,
          `Temp: ${m.temperature != null ? Number(m.temperature).toFixed(1) + '°C' : '—'}`,
          `Water Level: ${m.water_level != null ? Number(m.water_level).toFixed(2) + ' m' : '—'}`,
          `pH Level: ${m.ph != null ? Number(m.ph).toFixed(2) : '—'}`
        ].join('\n');
        wellSections.push(section);
      }
      structuredBlock = wellSections.join('\n\n');
    }

    // Resolve a human-readable username (for new schema). If both admin & user present, admin wins.
    let currentUsername: string | null = null;
    if (adminId) {
      try {
<<<<<<< HEAD
        const a = await query<any>('SELECT username FROM admin_accounts WHERE id = ? LIMIT 1', [adminId]);
        currentUsername = a.length ? (a[0].username || 'Admin') : 'Admin';
      } catch { currentUsername = 'Admin'; }
    } else if (userId) {
      try {
        const u = await query<any>('SELECT username FROM users WHERE id = ? LIMIT 1', [userId]);
        currentUsername = u.length ? (u[0].username || 'User') : 'User';
=======
        const { data: a } = await supabase.from('admin_accounts').select('username').eq('id', adminId).limit(1).maybeSingle();
        currentUsername = a?.username || 'Admin';
      } catch { currentUsername = 'Admin'; }
    } else if (userId) {
      try {
        const { data: u } = await supabase.from('users').select('username').eq('id', userId).limit(1).maybeSingle();
        currentUsername = u?.username || 'User';
>>>>>>> origin/main
      } catch { currentUsername = 'User'; }
    }

    let insertedUserMessageId: number | null = null;
    if (lastUser) {
<<<<<<< HEAD
      insertedUserMessageId = await insertChatMessage('user', lastUser, userId, adminId, currentUsername);
    }
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
=======
  insertedUserMessageId = await insertChatMessage(supabase, 'user', lastUser, userId, adminId, currentUsername);
    }
  const apiKey = process.env['GEMINI_API_KEY'] || process.env['NEXT_PUBLIC_GEMINI_API_KEY'] || '';
>>>>>>> origin/main
    if (!apiKey) {
      return new Response('AI model key not configured (set GEMINI_API_KEY in .env.local then restart).', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    if (!lastUser) {
      return new Response('No user message.', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
<<<<<<< HEAD
    // Model fallback list: user-specified first, then known stable defaults
    const requestedModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const candidateModels = Array.from(new Set([
      requestedModel,
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ]));
=======
    // Require model from env to avoid embedding model literals in code
    const requestedModel = process.env['GEMINI_MODEL'] || '';
    if (!requestedModel) {
      return new Response('AI model not configured (set GEMINI_MODEL).', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    const candidateModels = [requestedModel];
>>>>>>> origin/main
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      let model: any = null;
      let chosenModel = '';
      let lastErr: any = null;
      for (const m of candidateModels) {
        try {
          model = genAI.getGenerativeModel({ model: m });
          // simple probe: attempt empty generation with safety; skip heavy content
          chosenModel = m;
          break;
        } catch (e:any) {
          lastErr = e;
          console.error('[chat] model init failed', m, e.message);
        }
      }
      if (!model) {
        return new Response('All Gemini model candidates failed to init: ' + (lastErr?.message || 'unknown'), { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      const systemPreamble = adminId
        ? 'You are EcoWell, an admin groundwater assistant. Respond concisely. If wells are mentioned, reference only the provided structured snapshot lines (verbatim) before analysis. ALWAYS format any metrics so that each appears on its own line in the form: TDS:, Temp:, Water Level:, pH Level:. If the user asks which well is critical, use any well_health values (if present) or infer based on abnormal metrics (e.g., very high TDS >1000 ppm, extreme pH <6.5 or >8.5, low water_level trend) and clearly label the critical wells. If asked for prediction of next cleaning, estimate using trends (e.g., rising TDS slope, declining water level) and state it is an estimate.'
        : 'You are EcoWell, a groundwater assistant. Respond directly without an opening greeting. ALWAYS format metrics with one per line using labels: TDS:, Temp:, Water Level:, pH Level:. When the user asks for critical wells, evaluate well_health (if provided) or infer from thresholds (TDS >1000 ppm, pH out of 6.5-8.5 range, rapid water_level drop). Provide a short ordered list of wells from most to least critical with reasons. For predictive cleaning time, estimate in days/weeks using simple extrapolation of provided metrics and note uncertainty.';
      const convoLines = messages.slice(-25).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`);
  const debugFlag = url.searchParams.get('debug') === '1';
  const prompt = [
        systemPreamble,
        convoLines.length ? 'Conversation so far:\n' + convoLines.join('\n') : '',
  needsWellContext && structuredBlock ? 'Structured Well Snapshot (Latest):\n' + structuredBlock : '',
        'User: ' + lastUser
      ].filter(Boolean).join('\n\n');
      // --- Special intent handling BEFORE model call (critical wells on map) ---
  if (/(any|which)\s+wells?.*(are\s+)?critical.*map\??/i.test(lastUser)) {
        // Classify critical wells using latest metrics we have.
        const critical: {name:string; reasons:string[]; metrics:any}[] = [];
        const evaluated: {name:string; metrics:any}[] = [];
        for (const w of wells) {
          const m = metricsByWell[w.id];
          const name = w.name || 'Well ' + w.id;
          if (!m) { evaluated.push({ name, metrics: null }); continue; }
          const reasons: string[] = [];
          if (m.tds != null && Number(m.tds) > 1000) reasons.push(`High TDS (${m.tds} ppm)`);
            const phVal = m.ph != null ? Number(m.ph) : null;
          if (phVal != null && (phVal < 6.5 || phVal > 8.5)) reasons.push(`Abnormal pH (${phVal.toFixed(2)})`);
          if (m.water_level != null && Number(m.water_level) < 2) reasons.push(`Low water level (${Number(m.water_level).toFixed(2)} m)`);
          if (reasons.length) critical.push({ name, reasons, metrics: m });
          evaluated.push({ name, metrics: m });
        }
        let answer: string;
        if (!wells.length) {
          answer = 'No wells are available to evaluate.';
        } else if (!critical.length) {
          answer = `No critical wells detected among ${evaluated.length} wells evaluated.`;
        } else {
          const lines: string[] = [];
          lines.push(`Critical Wells (${critical.length} of ${evaluated.length} evaluated):`);
          critical.forEach((c, idx) => {
            lines.push(`${idx + 1}. ${c.name}`);
            lines.push(`   Reasons: ${c.reasons.join('; ')}`);
            const m = c.metrics;
            lines.push(`   TDS: ${m.tds != null ? m.tds + ' ppm' : '—'}`);
            lines.push(`   Temp: ${m.temperature != null ? Number(m.temperature).toFixed(1) + '°C' : '—'}`);
            lines.push(`   Water Level: ${m.water_level != null ? Number(m.water_level).toFixed(2) + ' m' : '—'}`);
            lines.push(`   pH Level: ${m.ph != null ? Number(m.ph).toFixed(2) : '—'}`);
          });
          lines.push('Thresholds used: TDS >1000 ppm, pH <6.5 or >8.5, Water Level <2 m.');
          answer = lines.join('\n');
        }
        const formatted = neatFormat(answer);
<<<<<<< HEAD
        const cols = await getChatColumns();
        if (insertedUserMessageId && cols.has('response')) {
          await query('UPDATE chat_messages SET response=? WHERE id=?', [formatted, insertedUserMessageId]);
        } else {
          await insertChatMessage('assistant', formatted, userId, adminId, null);
=======
        
        if (insertedUserMessageId) {
          await supabase.from('chat_messages').update({ response: formatted }).eq('id', insertedUserMessageId);
        } else {
          await insertChatMessage(supabase, 'assistant', formatted, userId, adminId, null);
>>>>>>> origin/main
        }
        return new Response(formatted, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }

      if (isStream) {
        const streamingResult = await model.generateContentStream({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
        const encoder = new TextEncoder();
        let fullText = '';
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of streamingResult.stream) {
                const text = chunk.text();
                if (text) { fullText += text; controller.enqueue(encoder.encode(text)); }
              }
              if (fullText.trim()) {
                fullText = neatFormat(fullText);
<<<<<<< HEAD
                // If we have a user message id and response column, update that row; else fallback insert assistant row
                const cols = await getChatColumns();
                if (insertedUserMessageId && cols.has('response')) {
                  await query('UPDATE chat_messages SET response=? WHERE id=?', [fullText, insertedUserMessageId]);
                } else {
                  await insertChatMessage('assistant', fullText, userId, adminId, null);
=======
                
                if (insertedUserMessageId) {
                  await supabase.from('chat_messages').update({ response: fullText }).eq('id', insertedUserMessageId);
                } else {
                  await insertChatMessage(supabase, 'assistant', fullText, userId, adminId, null);
>>>>>>> origin/main
                }
              }
              controller.close();
            } catch (e:any) {
              controller.enqueue(encoder.encode('[error:' + (e.message||'stream error') + ']'));
              controller.close();
            }
          }
        });
        return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      } else {
        const result = await model.generateContent(prompt);
  let replyText = result.response.text() || 'No reply.';
  const final = debugFlag ? `[model:${chosenModel}]\n` + replyText : replyText;
<<<<<<< HEAD
  const cols = await getChatColumns();
  const neat = neatFormat(final);
  if (insertedUserMessageId && cols.has('response')) {
    await query('UPDATE chat_messages SET response=? WHERE id=?', [neat, insertedUserMessageId]);
  } else {
  await insertChatMessage('assistant', neat, userId, adminId, null);
=======
  const neat = neatFormat(final);
  
  if (insertedUserMessageId) {
    await supabase.from('chat_messages').update({ response: neat }).eq('id', insertedUserMessageId);
  } else {
    await insertChatMessage(supabase, 'assistant', neat, userId, adminId, null);
>>>>>>> origin/main
  }
  return new Response(neat, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    } catch (err:any) {
      return new Response('Model error: ' + (err.message||'unknown'), { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  } catch (e: any) {
    return new Response('Error: ' + (e.message || 'Unexpected error'), { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

// Fetch recent chat history (GET /api/chat?limit=50)
export async function GET(req: NextRequest) {
  try {
<<<<<<< HEAD
  await ensureChatColumns();
=======
    const supabase = getSupabase();
>>>>>>> origin/main
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 200);
    const cookieStore = cookies();
    const userSession = cookieStore.get('ecw_session')?.value;
    const adminSession = cookieStore.get('ecw_admin_session')?.value;
  let userId: string | null = null;
  let adminId: string | null = null;
<<<<<<< HEAD
    const sessionCols = await getSessionColumns();
    const hasAdminIdCol = sessionCols.has('admin_id');
    if (adminSession) {
      if (hasAdminIdCol) {
        const rows = await query('SELECT admin_id FROM sessions WHERE token = ? LIMIT 1', [adminSession]);
        if (rows.length && rows[0].admin_id) adminId = rows[0].admin_id;
      } else {
        const rows = await query('SELECT user_id FROM sessions WHERE token = ? LIMIT 1', [adminSession]);
        if (rows.length && rows[0].user_id) {
          const aid = rows[0].user_id;
          const a = await query('SELECT id FROM admin_accounts WHERE id = ? LIMIT 1', [aid]);
          if (a.length) adminId = aid; else userId = aid;
        }
      }
    }
    if (!adminId && userSession) {
      const rows = await query('SELECT user_id FROM sessions WHERE token = ? LIMIT 1', [userSession]);
      if (rows.length && rows[0].user_id) {
        const uid = rows[0].user_id;
        const a = hasAdminIdCol ? [] : await query('SELECT id FROM admin_accounts WHERE id = ? LIMIT 1', [uid]);
        if (!hasAdminIdCol && a.length) adminId = uid; else userId = uid;
      }
    }
    let rows;
    const chatCols = await getChatColumns();
  const selectCols = ['id','role','content','created_at'];
    if (chatCols.has('response')) selectCols.push('response');
  if (chatCols.has('username')) selectCols.push('username');
  if (chatCols.has('user_id')) selectCols.push('user_id'); // legacy
  if (chatCols.has('admin_id')) selectCols.push('admin_id'); // legacy
    // Determine current username for filtering (new schema) while retaining legacy id-based filtering
    let currentUsername: string | null = null;
    if (adminId) {
      try { const a = await query<any>('SELECT username FROM admin_accounts WHERE id=? LIMIT 1',[adminId]); currentUsername = a[0]?.username || 'Admin'; } catch {}
    } else if (userId) {
      try { const u = await query<any>('SELECT username FROM users WHERE id=? LIMIT 1',[userId]); currentUsername = u[0]?.username || null; } catch {}
    }
    if (chatCols.has('username') && currentUsername) {
      rows = await query(`SELECT ${selectCols.join(', ')} FROM chat_messages WHERE username = ? ORDER BY created_at ASC LIMIT ?`, [currentUsername, limit]);
    } else if (adminId) {
      rows = await query(`SELECT ${selectCols.join(', ')} FROM chat_messages ORDER BY created_at ASC LIMIT ?`, [limit]);
    } else if (userId) {
      if (chatCols.has('user_id')) {
        rows = await query(`SELECT ${selectCols.join(', ')} FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT ?`, [userId, limit]);
      } else {
        rows = await query(`SELECT ${selectCols.join(', ')} FROM chat_messages ORDER BY created_at ASC LIMIT ?`, [limit]);
      }
    } else {
      return new Response(JSON.stringify({ messages: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // Derive displayRole: 'assistant' if role=assistant OR response is not null but role=user, else 'panchayat' or 'admin'
    const enriched = rows.map((r:any) => {
  let displayRole = r.role === 'assistant' ? 'assistant' : 'user';
      return { ...r, displayRole };
    });
  return new Response(JSON.stringify({ messages: enriched }), { status: 200, headers: { 'Content-Type': 'application/json' } });
=======
    const hasAdminIdCol = false;
    if (adminSession) {
      
      const { data: s } = await supabase.from('sessions').select('user_id').eq('token', adminSession).limit(1).maybeSingle();
      if (s?.user_id) {
        const aid = s.user_id as string;
        const { data: a } = await supabase.from('admin_accounts').select('id').eq('id', aid).limit(1).maybeSingle();
        if (a) adminId = aid; else userId = aid;
      }
    }
    if (!adminId && userSession) {
      
      const { data: s } = await supabase.from('sessions').select('user_id').eq('token', userSession).limit(1).maybeSingle();
      if (s?.user_id) {
        const uid = s.user_id as string;
        const { data: a } = hasAdminIdCol ? { data: null } : await supabase.from('admin_accounts').select('id').eq('id', uid).limit(1).maybeSingle();
        if (!hasAdminIdCol && a) adminId = uid; else userId = uid;
      }
    }
  let rows;
  const selectCols = ['id','role','content','created_at','response','username'];
  
  // Determine current username for filtering (new schema) while retaining legacy id-based filtering
    let currentUsername: string | null = null;
    if (adminId) {
      try { const { data: a } = await supabase.from('admin_accounts').select('username').eq('id', adminId).limit(1).maybeSingle(); currentUsername = a?.username || 'Admin'; } catch {}
    } else if (userId) {
      try { const { data: u } = await supabase.from('users').select('username').eq('id', userId).limit(1).maybeSingle(); currentUsername = u?.username || null; } catch {}
    }
    if (currentUsername) {
      const { data } = await supabase
        .from('chat_messages')
        .select(selectCols.join(','))
        .eq('username', currentUsername)
        .order('created_at', { ascending: true })
        .limit(limit);
      rows = data || [];
    } else if (adminId) {
      const { data } = await supabase
        .from('chat_messages')
        .select(selectCols.join(','))
        .order('created_at', { ascending: true })
        .limit(limit);
      rows = data || [];
    } else if (userId) {
      const { data } = await supabase
        .from('chat_messages')
        .select(selectCols.join(','))
        .order('created_at', { ascending: true })
        .limit(limit);
      rows = data || [];
    } else {
      return new Response(JSON.stringify({ messages: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // Expand history: for any row that has a stored assistant response, emit two messages
    // 1) the original user (or assistant) message
    // 2) an assistant message with the saved response
    // This preserves order by created_at while ensuring the UI receives both sides.
    const expanded: any[] = [];
    for (const r of rows as any[]) {
      const base = { id: r.id, role: r.role, content: r.content, created_at: r.created_at, username: r.username };
      // Push the base message
      expanded.push({ ...base, displayRole: r.role === 'assistant' ? 'assistant' : 'user' });
      // If there's a response associated with this message, push it as a separate assistant entry
      if (r.response && String(r.response).trim()) {
        expanded.push({
          id: `${r.id}-resp`,
          role: 'assistant',
          content: r.response,
          created_at: r.created_at,
          username: r.username,
          displayRole: 'assistant'
        });
      }
    }
    return new Response(JSON.stringify({ messages: expanded }), { status: 200, headers: { 'Content-Type': 'application/json' } });
>>>>>>> origin/main
  } catch (e: any) {
  return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// --- helpers ---
<<<<<<< HEAD
async function ensureChatColumns() {
  try {
    // Ensure table exists (migration 006 should create it). If not, abort silently.
    const cols = await query<any>('SHOW COLUMNS FROM chat_messages');
    const have = new Set(cols.map(c => c.Field));
  await addColumnIfMissing(have, 'username', 'VARCHAR(100) NULL', 'content');
  await addColumnIfMissing(have, 'response', 'TEXT NULL', have.has('username') ? 'username' : 'content');
  } catch (e:any) {
    // SHOW COLUMNS failed (table absent) – leave to migration
    console.warn('[ensureChatColumns] could not inspect table:', e.message || e);
  }
}

async function addColumnIfMissing(have: Set<string>, columnName: string, definition: string, after?: string) {
  if (have.has(columnName)) return;
  try {
    const chk = await query<any>('SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', ['chat_messages', columnName]);
    if (chk[0].cnt > 0) { have.add(columnName); return; }
    const alter = after ?
      `ALTER TABLE chat_messages ADD COLUMN ${columnName} ${definition} AFTER ${after}` :
      `ALTER TABLE chat_messages ADD COLUMN ${columnName} ${definition}`;
    await query(alter);
    have.add(columnName);
  } catch (e:any) {
    console.warn('[ensureChatColumns] failed to add', columnName, e.message || e);
  }
}

async function getChatColumns(): Promise<Set<string>> {
  try {
    const rows = await query<any>('SHOW COLUMNS FROM chat_messages');
    return new Set(rows.map(r => r.Field));
  } catch { return new Set(); }
}

async function insertChatMessage(role: string, content: string, userId: string | null, adminId: string | null, username: string | null): Promise<number | null> {
  const cols = await getChatColumns();
  if (cols.has('username')) {
    const res = await query<any>('INSERT INTO chat_messages (role, content, username) VALUES (?,?,?)', [role, content, username]);
    return (res as any).insertId || null;
  }
  // legacy fallbacks
  const haveUser = cols.has('user_id');
  const haveAdmin = cols.has('admin_id');
  if (haveUser && haveAdmin) {
    const res = await query<any>('INSERT INTO chat_messages (role, content, user_id, admin_id) VALUES (?,?,?,?)', [role, content, userId, adminId]);
    return (res as any).insertId || null;
  } else if (haveUser) {
    const res = await query<any>('INSERT INTO chat_messages (role, content, user_id) VALUES (?,?,?)', [role, content, userId]);
    return (res as any).insertId || null;
  } else {
    const res = await query<any>('INSERT INTO chat_messages (role, content) VALUES (?,?)', [role, content]);
    return (res as any).insertId || null;
  }
}

async function getSessionColumns(): Promise<Set<string>> {
  try {
    const rows = await query<any>('SHOW COLUMNS FROM sessions');
    return new Set(rows.map(r => r.Field));
  } catch { return new Set(); }
}
=======
async function insertChatMessage(supabase: ReturnType<typeof getSupabase>, role: string, content: string, _userId: string | null, _adminId: string | null, username: string | null): Promise<number | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ role, content, username })
    .select('id')
    .maybeSingle();
  if (error) return null;
  return (data as any)?.id ?? null;
}

async function getSessionColumns(): Promise<Set<string>> { return new Set(); }
>>>>>>> origin/main

// Lightweight formatting helper to ensure each metric label starts on its own line.
function neatFormat(text: string): string {
  if (!text) return text;
  // Insert newline before metric labels if not already at line start
  const pattern = /(\s+)(TDS:|Temp:|Temperature:|Water Level:|pH Level:|pH:)/g;
  let out = text.replace(pattern, '\n$2');
  // Collapse extra spaces around newlines
  out = out.replace(/\n{2,}/g, '\n\n');
  return out.trim();
}

// Fallback responder removed: model responses only.
export const runtime = 'nodejs'; // ensure Node runtime (not edge) for crypto & env access
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID, createHash } from 'crypto';
import { supabaseServer } from '@/lib/supabase-server';
import { validateSupabaseEnv, redactedEnvSnapshot } from '@/lib/env-guard';

function sessionToken(): string {
  return createHash('sha256').update(randomUUID() + Date.now().toString()).digest('hex');
}

export async function POST(req: NextRequest) {
  // Validate env first – helps distinguish config vs credential errors
  const envReport = validateSupabaseEnv();
  if (!envReport.ok) {
    return NextResponse.json({
      error: 'Server misconfiguration – missing Supabase env vars',
      missing: envReport.missing
    }, { status: 500 });
  }
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    let sb;
    try {
      sb = supabaseServer();
      // tiny probe to catch invalid key earlier (select 1 style) – lightweight metadata request
      const probe = await sb.from('users').select('id').limit(1);
      if (probe.error && /invalid api key/i.test(probe.error.message)) {
        console.error('[login] probe invalid api key', probe.error, redactedEnvSnapshot());
        return NextResponse.json({ error: 'Backend Supabase key invalid – check server env (SERVICE role key)' }, { status: 500 });
      }
    } catch (e) {
      console.error('[login] Failed to create Supabase client', e, redactedEnvSnapshot());
      return NextResponse.json({ error: 'Auth service unavailable' }, { status: 500 });
    }

    const isEmail = identifier.includes('@');
    const { data: users, error: selErr } = await sb
      .from('users')
      .select('id,password_hash,email_verified')
      .eq(isEmail ? 'email' : 'username', identifier.toLowerCase())
      .limit(1);

    if (selErr) {
      // Supabase will return a PostgREST error; we surface a generic message but log details
      console.error('[login] User select error', selErr, redactedEnvSnapshot());
      if ((selErr as any)?.message?.toLowerCase().includes('invalid api key')) {
        return NextResponse.json({ error: 'Backend Supabase key invalid – check server env (SERVICE role key)' }, { status: 500 });
      }
      throw selErr;
    }
    if (!users || !users.length) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[0] as any;
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    if (user.email_verified === false || user.email_verified === 0) {
      return NextResponse.json({ error: 'Email not verified' }, { status: 403 });
    }

    const token = sessionToken();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    const { error: insErr } = await sb.from('sessions').insert({
      id: randomUUID(),
      user_id: user.id,
      token,
      expires_at: expires
    });
    if (insErr) {
      console.error('[login] Session insert error', insErr);
      if ((insErr as any)?.message?.toLowerCase().includes('invalid api key')) {
        return NextResponse.json({ error: 'Backend Supabase key invalid – check server env (SERVICE role key)' }, { status: 500 });
      }
      throw insErr;
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set('ecw_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(expires)
    });
    return res;
  } catch (e) {
    console.error('Login error', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { query } from '@/lib/db';
import { createHash, randomUUID } from 'crypto';
import { sendVerificationEmail } from '@/lib/mailer';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    // Ensure verification columns exist (in case migration not yet applied)
    try {
      const cols: any[] = await query("SHOW COLUMNS FROM users LIKE 'email_verification_token'");
      if (!cols.length) {
        await query("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 0, ADD COLUMN email_verification_token CHAR(64) NULL, ADD COLUMN email_verification_sent_at DATETIME NULL");
      }
    } catch (e) {
      console.warn('Could not ensure verification columns', e);
    }
=======
import { createHash, randomUUID } from 'crypto';
import { sendVerificationEmail } from '@/lib/mailer';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Helpers to safely read env values and delay client creation until request time
const stripQuotes = (v?: string | null) => (v || '').trim().replace(/^['"]|['"]$/g, '');
const stripInlineComment = (v: string) => v.replace(/\s+#.*$/, '');

export async function POST(req: NextRequest) {
  try {
  // Bracket access avoids build-time inlining of env into server bundle
  const SUPABASE_URL = stripQuotes((process.env as Record<string, string | undefined>)["NEXT_PUBLIC_SUPABASE_URL"]);
    const SUPABASE_SERVICE_ROLE_KEY = stripInlineComment(stripQuotes(process.env.SUPABASE_SERVICE_ROLE_KEY));
    if (!SUPABASE_URL) {
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL (server env). Update .env.local and restart.' }, { status: 500 });
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY (server env). Update .env.local and restart.' }, { status: 500 });
    }
    const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'ecowell-app/signup-route' } }
    });

>>>>>>> origin/main
    const { email, password, username, full_name, phone, panchayat_name, location } = await req.json();
    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
<<<<<<< HEAD
    const existing = await query('SELECT id FROM users WHERE email=? OR username=? LIMIT 1', [email.toLowerCase(), username.toLowerCase()]);
    if ((existing as any[]).length) {
=======
    
    const { data: existsByEmail, error: emailErr } = await sbAdmin.from('users').select('id').eq('email', email.toLowerCase()).limit(1);
    if (emailErr?.message?.toLowerCase()?.includes('api key')) {
      return NextResponse.json({ error: 'Supabase rejected the API key (service_role). Please update SUPABASE_SERVICE_ROLE_KEY and restart.' }, { status: 500 });
    }
    const { data: existsByUsername, error: userErr } = await sbAdmin.from('users').select('id').eq('username', username.toLowerCase()).limit(1);
    if (userErr?.message?.toLowerCase()?.includes('api key')) {
      return NextResponse.json({ error: 'Supabase rejected the API key (service_role). Please update SUPABASE_SERVICE_ROLE_KEY and restart.' }, { status: 500 });
    }
    if ((existsByEmail?.length || 0) > 0 || (existsByUsername?.length || 0) > 0) {
>>>>>>> origin/main
      return NextResponse.json({ error: 'Email or username already exists' }, { status: 409 });
    }
    const hash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    const verifyToken = createHash('sha256').update(randomUUID() + Date.now().toString()).digest('hex');
<<<<<<< HEAD
    try {
      await query(
        'INSERT INTO users (id,email,username,full_name,phone,panchayat_name,location,password_hash,email_verification_token,email_verification_sent_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())',
        [id, email.toLowerCase(), username.toLowerCase(), full_name || null, phone || null, panchayat_name || null, location || null, hash, verifyToken]
      );
    } catch (err: any) {
      if (err?.code === 'ER_BAD_FIELD_ERROR') {
        // Fallback: insert without verification columns (will allow immediate login)
        await query(
          'INSERT INTO users (id,email,username,full_name,phone,panchayat_name,location,password_hash,email_verified) VALUES (?,?,?,?,?,?,?,?,1)',
          [id, email.toLowerCase(), username.toLowerCase(), full_name || null, phone || null, panchayat_name || null, location || null, hash]
        );
        return NextResponse.json({ ok: true, verification_skipped: true });
      }
      throw err;
=======
    const { error: insertErr, status: insertStatus } = await sbAdmin.from('users').insert({
      id,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      full_name: full_name || null,
      phone: phone || null,
      panchayat_name: panchayat_name || null,
      location: location || null,
      password_hash: hash,
      email_verification_token: verifyToken,
      email_verification_sent_at: new Date().toISOString(),
      email_verified: false
    });
    if (insertErr) {
      console.error('Supabase insert failed', { status: insertStatus, error: insertErr });
      if (insertStatus === 401 || insertErr.message?.toLowerCase()?.includes('api key')) {
        return NextResponse.json({ error: 'Invalid Supabase API key. Replace SUPABASE_SERVICE_ROLE_KEY with a fresh key from Supabase → Settings → API, then restart the dev server.' }, { status: 500 });
      }
      throw insertErr;
>>>>>>> origin/main
    }
    try {
      await sendVerificationEmail(email.toLowerCase(), verifyToken);
    } catch (e) {
      console.warn('Failed to send verification email', e);
    }
    return NextResponse.json({ ok: true, verification_sent: true });
  } catch (e: any) {
    console.error('Signup error', e);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}

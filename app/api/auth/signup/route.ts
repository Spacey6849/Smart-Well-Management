export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { sendVerificationEmail } from '@/lib/mailer';
import bcrypt from 'bcryptjs';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    // (Supabase) columns assumed to exist; skip dynamic ALTERs.
    const { email, password, username, full_name, phone, panchayat_name, location } = await req.json();
    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const sb = supabaseServer();
    const lowerEmail = email.toLowerCase();
    const lowerUsername = username.toLowerCase();
    const { data: byEmail, error: emailErr } = await sb.from('users').select('id').eq('email', lowerEmail).limit(1);
    if (emailErr) throw emailErr;
    const { data: byUser, error: userErr } = await sb.from('users').select('id').eq('username', lowerUsername).limit(1);
    if (userErr) throw userErr;
    if ((byEmail && byEmail.length) || (byUser && byUser.length)) {
      return NextResponse.json({ error: 'Email or username already exists' }, { status: 409 });
    }
    const hash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    const verifyToken = createHash('sha256').update(randomUUID() + Date.now().toString()).digest('hex');
    const { error: insErr } = await sb.from('users').insert({
      id,
      email: lowerEmail,
      username: lowerUsername,
      full_name: full_name || null,
      phone: phone || null,
      panchayat_name: panchayat_name || null,
      location: location || null,
      password_hash: hash,
      email_verification_token: verifyToken,
      email_verification_sent_at: new Date().toISOString(),
      email_verified: false
    });
    if (insErr) throw insErr;
    try { await sendVerificationEmail(lowerEmail, verifyToken); } catch (e) { console.warn('Failed to send verification email', e); }
    return NextResponse.json({ ok: true, verification_sent: true });
  } catch (e: any) {
    console.error('Signup error', e);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}

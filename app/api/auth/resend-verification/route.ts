export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createHash, randomUUID } from 'crypto';
import { sendVerificationEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    const rows: any[] = await query('SELECT id,email_verified FROM users WHERE email=? LIMIT 1', [email.toLowerCase()]);
    if (!rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const user = rows[0];
    if (user.email_verified) return NextResponse.json({ ok: true, already_verified: true });
    const token = createHash('sha256').update(randomUUID() + Date.now().toString()).digest('hex');
    await query('UPDATE users SET email_verification_token=?, email_verification_sent_at=NOW() WHERE id=?', [token, user.id]);
    try { await sendVerificationEmail(email.toLowerCase(), token); } catch (e) { console.warn('Resend email failed', e); }
    return NextResponse.json({ ok: true, resent: true });
  } catch (e) {
    console.error('Resend verification error', e);
    return NextResponse.json({ error: 'Resend failed' }, { status: 500 });
  }
}
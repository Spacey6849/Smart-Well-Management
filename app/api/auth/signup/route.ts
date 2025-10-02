export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
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
    const { email, password, username, full_name, phone, panchayat_name, location } = await req.json();
    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const existing = await query('SELECT id FROM users WHERE email=? OR username=? LIMIT 1', [email.toLowerCase(), username.toLowerCase()]);
    if ((existing as any[]).length) {
      return NextResponse.json({ error: 'Email or username already exists' }, { status: 409 });
    }
    const hash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    const verifyToken = createHash('sha256').update(randomUUID() + Date.now().toString()).digest('hex');
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

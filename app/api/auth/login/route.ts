import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID, createHash } from 'crypto';

function sessionToken(): string {
  return createHash('sha256').update(randomUUID() + Date.now().toString()).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });

    const isEmail = identifier.includes('@');
    let rows: any[];
    try {
      rows = await query<any>(
        `SELECT id,password_hash,email_verified FROM users WHERE ${isEmail ? 'email' : 'username'} = ? LIMIT 1`,
        [identifier.toLowerCase()]
      );
    } catch (e: any) {
      if (e?.code === 'ER_BAD_FIELD_ERROR') {
        rows = await query<any>(
          `SELECT id,password_hash FROM users WHERE ${isEmail ? 'email' : 'username'} = ? LIMIT 1`,
          [identifier.toLowerCase()]
        );
      } else throw e;
    }
    if (!rows.length) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    if ('email_verified' in user && user.email_verified === 0) return NextResponse.json({ error: 'Email not verified' }, { status: 403 });

    const token = sessionToken();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await query('INSERT INTO sessions (id,user_id,token,expires_at) VALUES (UUID(),?,?,?)', [user.id, token, expires]);

    const res = NextResponse.json({ ok: true });
    res.cookies.set('ecw_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires
    });
    return res;
  } catch (e) {
    console.error('Login error', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}

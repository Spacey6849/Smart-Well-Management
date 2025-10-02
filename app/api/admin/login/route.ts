import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID, createHash } from 'crypto';

function token(): string {
  return createHash('sha256').update(randomUUID() + Date.now().toString()).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    const rows = await query<any>(
      'SELECT id,password_hash FROM admin_accounts WHERE LOWER(username)=? OR LOWER(email)=? LIMIT 1',
      [username.toLowerCase(), username.toLowerCase()]
    );
    if (!rows.length) return NextResponse.json({ error: 'Invalid admin credentials (not found)' }, { status: 401 });
    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return NextResponse.json({ error: 'Invalid admin credentials (password mismatch)' }, { status: 401 });
    const t = token();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 12);
    await query('INSERT INTO sessions (id,user_id,token,expires_at) VALUES (UUID(),?,?,?)', [admin.id, t, expires]);
    const res = NextResponse.json({ ok: true, admin: true });
    res.cookies.set('ecw_admin_session', t, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires
    });
    return res;
  } catch (e) {
    console.error('Admin login error', e);
    return NextResponse.json({ error: 'Admin auth failed' }, { status: 500 });
  }
}

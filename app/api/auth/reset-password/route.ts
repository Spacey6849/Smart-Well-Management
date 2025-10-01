import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Helper copied pattern (session parsing) from login logic assumptions.
async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get('session_token')?.value || null;
  if (!token) return null;
  const rows = await query<any>('SELECT * FROM sessions WHERE token = ? LIMIT 1', [token]);
  if (!rows.length) return null;
  const s = rows[0];
  // Determine user type
  if (s.user_id) {
    const u = await query<any>('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1', [s.user_id]);
    if (!u.length) return null;
    return { type: 'user' as const, id: u[0].id, password_hash: u[0].password_hash };
  } else if (s.admin_id) {
    const a = await query<any>('SELECT id, password_hash FROM admin_accounts WHERE id = ? LIMIT 1', [s.admin_id]);
    if (!a.length) return null;
    return { type: 'admin' as const, id: a[0].id, password_hash: a[0].password_hash };
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { oldPassword, newPassword, confirmPassword } = await req.json();
    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password too short (min 8)' }, { status: 400 });
    }

    const ok = await bcrypt.compare(oldPassword, session.password_hash);
    if (!ok) return NextResponse.json({ error: 'Old password incorrect' }, { status: 400 });

    const newHash = await bcrypt.hash(newPassword, 11);
    if (session.type === 'user') {
      await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, session.id]);
    } else {
      await query('UPDATE admin_accounts SET password_hash = ? WHERE id = ?', [newHash, session.id]);
    }
    // Optionally rotate session token for security
    try {
      const newToken = crypto.randomBytes(32).toString('hex');
      await query('UPDATE sessions SET token = ? WHERE token = ?', [newToken, (cookies().get('session_token')?.value || '')]);
      cookies().set('session_token', newToken, { httpOnly: true, path: '/', sameSite: 'lax' });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', detail: e?.message }, { status: 500 });
  }
}

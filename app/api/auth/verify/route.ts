export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
export async function GET(req: NextRequest) {
  const wantsJson = req.headers.get('accept')?.includes('application/json');
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    if (wantsJson) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    return NextResponse.redirect(new URL('/auth?mode=login&verify_error=missing', req.nextUrl.origin));
  }
  const rows: any[] = await query('SELECT id,email_verified FROM users WHERE email_verification_token=? LIMIT 1', [token]);
  if (!rows.length) {
    if (wantsJson) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    return NextResponse.redirect(new URL('/auth?mode=login&verify_error=invalid', req.nextUrl.origin));
  }
  const user = rows[0];
  if (user.email_verified) {
    if (wantsJson) return NextResponse.json({ ok: true, already_verified: true });
    return NextResponse.redirect(new URL('/auth?mode=login&verified=already', req.nextUrl.origin));
  }
  await query('UPDATE users SET email_verified=1,email_verification_token=NULL WHERE id=?', [user.id]);
  if (wantsJson) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL('/auth?mode=login&verified=1', req.nextUrl.origin));
}

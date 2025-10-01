import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { full_name, panchayat_name, location, phone } = body;
    const cookieStore = cookies();
    const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    // Resolve user id
    const u = await query<any>('SELECT user_id FROM sessions WHERE token=? AND expires_at>NOW() LIMIT 1', [token]);
    if (!u.length) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    const userId = u[0].user_id;
    await query('UPDATE users SET full_name=?, panchayat_name=?, location=?, phone=? WHERE id=?', [full_name || null, panchayat_name || null, location || null, phone || null, userId]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Profile update error', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

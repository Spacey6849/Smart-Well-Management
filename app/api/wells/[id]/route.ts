import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

async function getSessionContext() {
  const cookieStore = cookies();
  const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
  if (!token) return { userId: null, isAdmin: false };
  const rows = await query<any>('SELECT user_id FROM sessions WHERE token=? AND expires_at>NOW() LIMIT 1', [token]);
  if (!rows.length) return { userId: null, isAdmin: false };
  const userId = rows[0].user_id as string;
  let isAdmin = false;
  try {
    const adminCheck = await query<any>('SELECT id FROM admin_accounts WHERE id=? LIMIT 1', [userId]);
    isAdmin = adminCheck.length > 0;
  } catch {}
  return { userId, isAdmin };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
  const { userId, isAdmin } = await getSessionContext();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const name = (body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    // Ownership check for non-admins
    if (!isAdmin) {
      const own = await query<any>('SELECT id FROM user_wells WHERE id=? AND user_id=? LIMIT 1', [params.id, userId]);
      if (!own.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      await query('UPDATE user_wells SET name=? WHERE id=? AND user_id=?', [name, params.id, userId]);
    } else {
      await query('UPDATE user_wells SET name=? WHERE id=?', [name, params.id]);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Rename failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, isAdmin } = await getSessionContext();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!isAdmin) {
      await query('DELETE FROM user_wells WHERE id=? AND user_id=?', [params.id, userId]);
    } else {
      await query('DELETE FROM user_wells WHERE id=?', [params.id]);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

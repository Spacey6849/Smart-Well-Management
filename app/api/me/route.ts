import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
  if (!token) return NextResponse.json({ user: null });
  // Attempt user lookup
  const users = await query<any>("SELECT u.id,u.email,u.username,u.full_name,u.phone,u.panchayat_name,u.location, DATE_FORMAT(u.created_at,'%Y-%m-%dT%H:%i:%sZ') as created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at > NOW() LIMIT 1", [token]);
  if (users.length) return NextResponse.json({ user: users[0] });
  // Fallback admin lookup
  const admins = await query<any>("SELECT a.id,a.email,a.username,NULL as full_name,NULL as phone,NULL as panchayat_name,NULL as location, DATE_FORMAT(a.created_at,'%Y-%m-%dT%H:%i:%sZ') as created_at FROM sessions s JOIN admin_accounts a ON a.id=s.user_id WHERE s.token=? AND s.expires_at > NOW() LIMIT 1", [token]);
  if (admins.length) return NextResponse.json({ user: admins[0] });
  return NextResponse.json({ user: null });
}

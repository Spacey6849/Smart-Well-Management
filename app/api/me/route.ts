import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
<<<<<<< HEAD
import { query } from '@/lib/db';
=======
import { getSupabase } from '@/lib/supabase/client';
>>>>>>> origin/main

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('ecw_session')?.value || cookieStore.get('ecw_admin_session')?.value;
  if (!token) return NextResponse.json({ user: null });
<<<<<<< HEAD
  // join with users and admin_accounts (union) - simplest: try users then admin
  const users = await query<any>("SELECT u.id,u.email,u.username,u.full_name,u.phone,u.panchayat_name,u.location, DATE_FORMAT(u.created_at,'%Y-%m-%dT%H:%i:%sZ') as created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at > NOW() LIMIT 1", [token]);
  if (users.length) return NextResponse.json({ user: users[0] });
  const admins = await query<any>("SELECT a.id,a.email,a.username,NULL as full_name,NULL as phone,NULL as panchayat_name,NULL as location, DATE_FORMAT(a.created_at,'%Y-%m-%dT%H:%i:%sZ') as created_at FROM sessions s JOIN admin_accounts a ON a.id=s.user_id WHERE s.token=? AND s.expires_at > NOW() LIMIT 1", [token]);
  if (admins.length) return NextResponse.json({ user: admins[0] });
=======
  const supabase = getSupabase();
  const { data: sess, error: sessErr } = await supabase
    .from('sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .limit(1)
    .maybeSingle();
  if (sessErr) return NextResponse.json({ user: null });
  if (!sess) return NextResponse.json({ user: null });
  if (new Date(sess.expires_at) <= new Date()) return NextResponse.json({ user: null });
  const userId = (sess as any).user_id as string;
  // Try normal user first
  const { data: user } = await supabase
    .from('users')
    .select('id,email,username,full_name,phone,panchayat_name,location,created_at')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();
  if (user) return NextResponse.json({ user });
  // Fallback to admin
  const { data: admin } = await supabase
    .from('admin_accounts')
    .select('id,email,username,created_at')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();
  if (admin) return NextResponse.json({ user: { ...admin, full_name: null, phone: null, panchayat_name: null, location: null } });
>>>>>>> origin/main
  return NextResponse.json({ user: null });
}

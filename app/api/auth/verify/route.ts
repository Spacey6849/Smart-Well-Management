export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
// Keep a POST endpoint (JSON) and a GET endpoint (redirect-friendly) for verification flexibility.
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    const sb = supabaseServer();
    const { data: rows, error } = await sb
      .from('users')
      .select('id')
      .eq('email_verification_token', token)
      .limit(1);
    if (error) return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    if (!rows || !rows.length) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    const { error: updErr } = await sb
      .from('users')
      .update({ email_verified: true, email_verification_token: null })
      .eq('id', rows[0].id);
    if (updErr) return NextResponse.json({ error: 'Verification update failed' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Verify error', e);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
export async function GET(req: NextRequest) {
  const wantsJson = req.headers.get('accept')?.includes('application/json');
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    if (wantsJson) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    return NextResponse.redirect(new URL('/auth?mode=login&verify_error=missing', req.nextUrl.origin));
  }
  const sb = supabaseServer();
  const { data: rows, error } = await sb
    .from('users')
    .select('id,email_verified')
    .eq('email_verification_token', token)
    .limit(1);
  if (error) {
    console.error('Verify select error', error);
  }
  if (!rows || !rows.length) {
    if (wantsJson) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    return NextResponse.redirect(new URL('/auth?mode=login&verify_error=invalid', req.nextUrl.origin));
  }
  const user = rows[0];
  if (user.email_verified) {
    if (wantsJson) return NextResponse.json({ ok: true, already_verified: true });
    return NextResponse.redirect(new URL('/auth?mode=login&verified=already', req.nextUrl.origin));
  }
  const { error: updErr } = await sb
    .from('users')
    .update({ email_verified: true, email_verification_token: null })
    .eq('id', user.id);
  if (updErr) console.error('Verify update error', updErr);
  if (wantsJson) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL('/auth?mode=login&verified=1', req.nextUrl.origin));
}

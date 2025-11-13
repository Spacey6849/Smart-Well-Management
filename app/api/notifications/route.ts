import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';
import { supabaseServer } from '@/lib/supabase-server';

// Simple notifications feed derived from latest assistant replies and recent system events.
// If you later add a dedicated table (e.g., public.notifications), update this to read from it instead.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 100);
    const sb = supabaseServer();

    // If a dedicated notifications table exists, prefer that.
    const { data: notifTable } = await sb
      .from('notifications' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    if (Array.isArray(notifTable)) {
      const { data } = await sb
        .from('notifications' as any)
        .select('id,title,body,type,created_at,meta')
        .order('created_at', { ascending: false })
        .limit(limit);
      return new Response(JSON.stringify({ notifications: data || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Fallback: synthesize notifications from recent assistant messages
    const { data: recent } = await sb
      .from('chat_messages')
      .select('id,response,content,username,created_at')
      .order('created_at', { ascending: false })
      .limit(limit * 2);
    const items = (recent || [])
      .map((r: any) => {
        const text: string = r.response || r.content || '';
        if (!text) return null;
        // crude type inference
        const type = /critical|alert|warning|high\s+tds|unsafe/i.test(text) ? 'alert' : 'info';
        const title = type === 'alert' ? 'Health Alert' : 'Update';
        const body = text.length > 280 ? text.slice(0, 277) + '…' : text;
        return { id: r.id, title, body, type, created_at: r.created_at, username: r.username };
      })
      .filter(Boolean)
      .slice(0, limit);
    return new Response(JSON.stringify({ notifications: items }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

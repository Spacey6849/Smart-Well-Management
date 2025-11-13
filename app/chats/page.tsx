"use client";
import { useEffect, useState } from 'react';

type ChatRow = { id: string; role: string; content: string | null; response: string | null; username?: string; created_at?: string };

export default function ChatsPage() {
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const username = typeof window !== 'undefined' ? (localStorage.getItem('ecw_username') || 'Guest') : 'Guest';

  async function refresh() {
    try {
      setError(null);
      const r = await fetch(`/api/chat?limit=50&username=${encodeURIComponent(username)}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setMessages(j.messages || []);
    } catch (e:any) {
      setError(e.message || 'Failed to load chats');
    }
  }

  async function send() {
    const content = input.trim();
    if (!content) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content }] })
      });
      const txt = await r.text();
      if (!r.ok) throw new Error(txt || 'Failed to send');
      setInput('');
      await refresh();
    } catch (e:any) {
      setError(e.message || 'Failed to send');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Chats</h1>
      {error && <div className="rounded border border-red-300 bg-red-50 text-red-700 p-3">{error}</div>}
      <div className="rounded border p-4 h-[50vh] overflow-auto space-y-3">
        {messages.length === 0 ? (
          <div className="text-gray-500">No conversations yet</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm">
              <div className="font-medium">{m.role === 'assistant' ? 'Assistant' : 'You'}</div>
              <div className="whitespace-pre-wrap">{m.response || m.content}</div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 border rounded px-3 py-2" placeholder="Type a message" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter') send(); }} />
        <button onClick={send} disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Send</button>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from 'react';

type Notif = { id: string; title: string; body: string; type?: string; created_at?: string };

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const r = await fetch('/api/notifications?limit=30', { cache: 'no-store' });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setItems(j.notifications || []);
    } catch (e:any) {
      setError(e.message || 'Failed to fetch notification logs');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Notifications</h1>
      {error && <div className="rounded border border-red-300 bg-red-50 text-red-700 p-3">Failed to fetch notification logs</div>}
      <div className="rounded border divide-y">
        {items.length === 0 ? (
          <div className="p-6 text-gray-500">No notifications yet</div>
        ) : (
          items.map(n => (
            <div key={n.id} className="p-4">
              <div className="text-sm text-gray-500">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
              <div className="font-medium">{n.title}</div>
              <div className="text-sm whitespace-pre-wrap">{n.body}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

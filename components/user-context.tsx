"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// Using Supabase-backed session (/api/me) for user data
interface BasicUser { id: string; email: string; username: string; full_name?: string | null; phone?: string | null; panchayat_name?: string | null; location?: string | null; created_at?: string; }

type UserRole = 'admin' | 'panchayat' | null;
interface UserContextValue {
  user: BasicUser | null;
  loading: boolean;
  role: UserRole;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<UserContextValue | undefined>(undefined);

export function useUser() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BasicUser | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const computeRole = (u: BasicUser | null): UserRole => {
  if (!u) return null;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mosesrodrigues10@gmail.com';
  if (adminEmail && u.email === adminEmail) return 'admin';
    return 'panchayat';
  };

  const refresh = async () => {
    try {
      const r = await fetch('/api/me', { cache: 'no-store' });
      if (!r.ok) { setUser(null); setRole(null); return; }
      const data = await r.json();
      const u: BasicUser | null = data.user || null;
      setUser(u);
      setRole(computeRole(u));
    } catch {
      setUser(null); setRole(null);
    }
  };

  const signOut = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    await refresh();
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store' });
        const data = r.ok ? await r.json() : { user: null };
        const u: BasicUser | null = data.user || null;
        if (mounted) { setUser(u); setRole(computeRole(u)); setLoading(false); }
      } catch {
        if (mounted) { setUser(null); setRole(null); setLoading(false); }
      }
    })();
    // Optional: periodic background refresh (client only) for session expiry updates
    const interval = setInterval(() => { refresh().catch(()=>{}); }, 5 * 60 * 1000);
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
  <Ctx.Provider value={{ user, loading, role, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

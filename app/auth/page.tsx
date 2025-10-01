"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from 'next-themes';
import { useRouter, useSearchParams } from "next/navigation";
import 'leaflet/dist/leaflet.css';

// We instantiate Leaflet manually because we disable interaction; dynamic import helps tree-shaking
// but here we can access it via global import (Leaflet CSS already imported).

export default function AuthPage() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialMode = (searchParams.get("mode") as "login" | "signup" | null) || "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Initialize Leaflet map only once client-side
  useEffect(() => {
    (async () => {
      if (!mapRef.current || (mapRef.current as any)._mapInited) return;
      const L = await import('leaflet');
      const map = L.map(mapRef.current!, {
        attributionControl: false,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      }).setView([20, 0], 2.2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      (mapRef.current as any)._mapInited = true;
    })();
  }, []);

  const switchMode = (next: "login" | "signup") => {
    if (next === mode) return;
    setMode(next);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", next);
    router.replace(url.pathname + "?" + url.searchParams.toString(), { scroll: false });
    // focus first field after animation
    setTimeout(() => {
      const id = next === 'login' ? 'login-email' : 'signup-name';
      const el = document.getElementById(id) as HTMLInputElement | null;
      el?.focus();
    }, 180);
  };

  // Keep state in sync if user changes query manually (back/forward buttons)
  useEffect(() => {
    const qp = (searchParams.get("mode") as "login" | "signup" | null) || "login";
    if (qp !== mode) setMode(qp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
  <div className={`relative min-h-screen w-full overflow-hidden font-sans ${isDark ? 'text-white' : 'text-gray-900'}`}>
      {/* Map Background */}
      <div ref={mapRef} className="absolute inset-0 -z-20" />
      {/* Overlays / gradient noise for depth */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(0,200,255,0.18),transparent_60%),radial-gradient(circle_at_85%_75%,rgba(0,255,200,0.15),transparent_55%)]" />
  <div className={`absolute inset-0 -z-10 ${isDark ? 'bg-[linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.7))]' : 'bg-[linear-gradient(rgba(255,255,255,0.75),rgba(240,244,248,0.85))]'}`} />

      <main className="min-h-screen px-4 sm:px-5 pb-10 sm:pb-14 flex flex-col overflow-y-auto sm:pt-14">
        {/* Mobile spacer to offset fixed nav (approx 60px total) */}
        <div className="h-[60px] sm:hidden shrink-0" aria-hidden />
        <section
          className={`relative w-full max-w-md mt-2 sm:mt-0 backdrop-blur-xl rounded-3xl border px-5 py-7 sm:px-9 sm:py-9 overflow-hidden shadow-[0_8px_42px_-6px_rgba(0,0,0,0.55)] ${isDark ? 'border-white/15 bg-white/10' : 'border-gray-200 bg-white/80'} `}
          aria-label="Authentication"
        >
          <header className="relative mb-8 text-center">
            <h1 className={`text-3xl font-bold tracking-tight ${isDark ? '' : 'text-gray-900'}`}>
              {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
            </h1>
            <p className={`mt-2 text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
              {mode === 'login' ? 'Sign in to continue your journey.' : 'Join us and explore the world.'}
            </p>
          </header>

          <div className="relative min-h-[320px]">
            {/* Login Form */}
            <form
              onSubmit={(e) => { e.preventDefault(); alert('Login (demo)'); }}
              className={`space-y-5 transition-opacity duration-300 ${mode === 'login' ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}`}
              autoComplete="on"
            >
              <div>
                <label htmlFor="login-email" className={`block text-[13px] font-medium mb-1.5 ${isDark ? 'text-white/75' : 'text-gray-600'}`}>Email Address</label>
                <input id="login-email" type="email" required placeholder="you@example.com" className={`block w-full rounded-xl focus:ring-0 text-sm px-4 py-3 outline-none transition ${isDark ? 'bg-white/10 border border-white/25 focus:border-blue-400/70 placeholder-white/40' : 'bg-white border border-gray-300 focus:border-blue-500/60 placeholder-gray-400 text-gray-800'}`} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className={`block text-[13px] font-medium ${isDark ? 'text-white/75' : 'text-gray-600'}`}>Password</label>
                  <a href="#" className={`text-[11px] font-medium transition ${isDark ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-500'}`}>Forgot?</a>
                </div>
                <input id="login-password" type="password" required placeholder="••••••••" className={`block w-full rounded-xl focus:ring-0 text-sm px-4 py-3 outline-none transition ${isDark ? 'bg-white/10 border border-white/25 focus:border-blue-400/70 placeholder-white/40' : 'bg-white border border-gray-300 focus:border-blue-500/60 placeholder-gray-400 text-gray-800'}`} />
              </div>
              <button type="submit" className={`w-full inline-flex justify-center items-center gap-2 rounded-xl text-sm font-medium tracking-wide text-white px-5 py-3 transition focus-visible:outline-none focus-visible:ring-2 shadow-lg ${isDark ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 focus-visible:ring-blue-300/60 shadow-blue-900/30' : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 focus-visible:ring-blue-400/50 shadow-blue-500/30'}`}>Log In</button>
              <p className={`text-center text-[13px] ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Don&apos;t have an account? <button type="button" onClick={()=>switchMode('signup')} className={`font-medium underline-offset-4 hover:underline transition ${isDark ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-500'}`}>Sign up</button></p>
            </form>

            {/* Signup Form */}
            <form
              onSubmit={(e) => { e.preventDefault(); const pw = (document.getElementById('signup-password') as HTMLInputElement)?.value; const cf = (document.getElementById('signup-confirm') as HTMLInputElement)?.value; if (pw !== cf) { alert('Passwords do not match.'); return;} alert('Account created (demo)'); switchMode('login'); }}
              className={`transition-opacity duration-300 ${mode === 'signup' ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}`}
              autoComplete="on"
            >
              <div className={`text-[11px] font-semibold tracking-wide mb-4 ${isDark ? 'text-white/55' : 'text-gray-500'}`}>REGISTERING AS PANCHAYAT</div>
              <div className="grid gap-5 max-h-[calc(100vh-22rem)] sm:max-h-none overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                <div>
                  <label htmlFor="signup-name" className={`block text-[13px] font-medium mb-1.5 ${isDark ? 'text-white/75' : 'text-gray-600'}`}>Full Name</label>
                  <input id="signup-name" type="text" required placeholder="John Doe" className={`block w-full rounded-xl focus:ring-0 text-sm px-4 py-3 outline-none transition ${isDark ? 'bg-white/10 border border-white/20 focus:border-emerald-400/70 placeholder-white/40' : 'bg-white border border-gray-300 focus:border-emerald-500/60 placeholder-gray-400 text-gray-800'}`} />
                </div>
                <div>
                  <label htmlFor="signup-username" className={`block text-[13px] font-medium mb-1.5 ${isDark ? 'text-white/75' : 'text-gray-600'}`}>Username</label>
                  <input id="signup-username" type="text" required placeholder="unique name" className={`block w-full rounded-xl focus:ring-0 text-sm px-4 py-3 outline-none transition ${isDark ? 'bg-white/10 border border-white/20 focus:border-emerald-400/70 placeholder-white/40' : 'bg-white border border-gray-300 focus:border-emerald-500/60 placeholder-gray-400 text-gray-800'}`} />
                </div>
                <div>
                  <label htmlFor="signup-panchayat" className={`block text-[13px] font-medium mb-1.5 ${isDark ? 'text-white/75' : 'text-gray-600'}`}>Panchayat Name</label>
                  <input id="signup-panchayat" type="text" required placeholder="Greenfield Panchayat" className={`block w-full rounded-xl focus:ring-0 text-sm px-4 py-3 outline-none transition ${isDark ? 'bg-white/10 border border-white/20 focus:border-emerald-400/70 placeholder-white/40' : 'bg-white border border-gray-300 focus:border-emerald-500/60 placeholder-gray-400 text-gray-800'}`} />
                </div>
                <div>
                  <label htmlFor="signup-location" className={`block text-[13px] font-medium mb-1.5 ${isDark ? 'text-white/75' : 'text-gray-600'}`}>Location</label>
                  <input id="signup-location" type="text" required placeholder="District / State" className={`block w-full rounded-xl focus:ring-0 text-sm px-4 py-3 outline-none transition ${isDark ? 'bg-white/10 border border-white/20 focus:border-emerald-400/70 placeholder-white/40' : 'bg-white border border-gray-300 focus:border-emerald-500/60 placeholder-gray-400 text-gray-800'}`} />
                </div>
                <div>
                  <label htmlFor="signup-email" className={`block text-[13px] font-medium mb-1.5 ${isDark ? 'text-white/75' : 'text-gray-600'}`}>Email Address</label>
                  <input id="signup-email" type="email" required placeholder="you@example.com" className={`block w-full rounded-xl focus:ring-0 text-sm px-4 py-3 outline-none transition ${isDark ? 'bg-white/10 border border-white/20 focus:border-emerald-400/70 placeholder-white/40' : 'bg-white border border-gray-300 focus:border-emerald-500/60 placeholder-gray-400 text-gray-800'}`} />
                </div>
                <div>
                  <label htmlFor="signup-phone" className={`block text-[13px] font-medium mb-1.5 ${isDark ? 'text-white/75' : 'text-gray-600'}`}>Phone Number</label>
                  <input id="signup-phone" type="tel" required placeholder="+1 555 123 4567" className={`block w-full rounded-xl focus:ring-0 text-sm px-4 py-3 outline-none transition ${isDark ? 'bg-white/10 border border-white/20 focus:border-emerald-400/70 placeholder-white/40' : 'bg-white border border-gray-300 focus:border-emerald-500/60 placeholder-gray-400 text-gray-800'}`} />
                </div>
                <div>
                  <label htmlFor="signup-password" className={`block text-[13px] font-medium mb-1.5 ${isDark ? 'text-white/75' : 'text-gray-600'}`}>Password</label>
                  <input id="signup-password" type="password" required placeholder="••••••••" className={`block w-full rounded-xl focus:ring-0 text-sm px-4 py-3 outline-none transition ${isDark ? 'bg-white/10 border border-white/20 focus:border-emerald-400/70 placeholder-white/40' : 'bg-white border border-gray-300 focus:border-emerald-500/60 placeholder-gray-400 text-gray-800'}`} />
                </div>
                <div>
                  <label htmlFor="signup-confirm" className={`block text-[13px] font-medium mb-1.5 ${isDark ? 'text-white/75' : 'text-gray-600'}`}>Confirm Password</label>
                  <input id="signup-confirm" type="password" required placeholder="••••••••" className={`block w-full rounded-xl focus:ring-0 text-sm px-4 py-3 outline-none transition ${isDark ? 'bg-white/10 border border-white/20 focus:border-emerald-400/70 placeholder-white/40' : 'bg-white border border-gray-300 focus:border-emerald-500/60 placeholder-gray-400 text-gray-800'}`} />
                </div>
                <button type="submit" className={`mt-2 w-full inline-flex justify-center items-center gap-2 rounded-xl text-sm font-medium tracking-wide text-white px-5 py-3 transition focus-visible:outline-none focus-visible:ring-2 shadow-lg ${isDark ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 focus-visible:ring-emerald-300/60 shadow-emerald-900/30' : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 focus-visible:ring-emerald-400/50 shadow-emerald-500/30'}`}>Sign Up</button>
                <p className={`text-center text-[13px] mb-3 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Already have an account? <button type="button" onClick={()=>switchMode('login')} className={`font-medium underline-offset-4 hover:underline transition ${isDark ? 'text-emerald-300 hover:text-emerald-200' : 'text-emerald-600 hover:text-emerald-500'}`}>Log in</button></p>
              </div>
            </form>
          </div>

          <footer className={`mt-8 pt-6 border-t text-[11px] tracking-wide ${isDark ? 'border-white/10 text-white/45' : 'border-gray-200 text-gray-500'}`}>
            Protected by modern encryption. By continuing you agree to our terms.
          </footer>
        </section>
      </main>
    </div>
  );
}

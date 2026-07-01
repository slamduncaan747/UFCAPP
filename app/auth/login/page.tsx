'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();
  const [pending, setPending] = useState<'apple' | 'google' | null>(null);

  async function signIn(provider: 'apple' | 'google') {
    if (pending) return;
    setPending(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    // On success the browser redirects away; only reset if it failed to start.
    if (error) setPending(null);
  }

  return (
    <div className="fixed inset-0 bg-[#030303] flex flex-col items-center justify-center px-8 pt-[env(safe-area-inset-top)]">
      {/* Wordmark */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-white leading-none">
          UFC
        </h1>
        <h2 className="text-4xl font-black uppercase tracking-tighter text-zinc-600 leading-none -mt-1">
          Fantasy
        </h2>
        <div className="w-16 h-0.5 bg-zinc-800 mx-auto mt-4" />
      </div>

      {/* SSO Buttons */}
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => signIn('apple')}
          disabled={pending !== null}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-black text-[13px] uppercase tracking-widest rounded-xl py-4 active:scale-[0.98] transition-transform min-h-[52px] disabled:opacity-60 disabled:active:scale-100"
        >
          {pending === 'apple' ? (
            <span className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.24 1.31-2.22 3.91.03 3.1 2.72 4.13 2.75 4.14-.03.07-.43 1.47-1.38 2.57M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
          )}
          {pending === 'apple' ? 'Redirecting…' : 'Continue with Apple'}
        </button>

        <button
          onClick={() => signIn('google')}
          disabled={pending !== null}
          className="w-full flex items-center justify-center gap-3 bg-zinc-900 border-2 border-zinc-800 text-white font-black text-[13px] uppercase tracking-widest rounded-xl py-4 active:scale-[0.98] transition-transform min-h-[52px] disabled:opacity-60 disabled:active:scale-100"
        >
          {pending === 'google' ? (
            <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          {pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
        </button>
      </div>

    </div>
  );
}

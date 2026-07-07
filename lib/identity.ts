'use client';

// ─── Local "who am I" identity ───────────────────────────────────────────────
// Authentication has been removed. Instead of an OAuth session, a player just
// picks who they are once and we remember that choice in a cookie. The stored
// value is a league_memberships.user_id (a profiles.id), matching how every
// query filters rows: `.eq('user_id', getUserId())`.
//
// A cookie (rather than localStorage) is used so the middleware in proxy.ts can
// read the same identity server-side to gate routes.

const COOKIE = 'ufc_user_id';

export function getUserId(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)ufc_user_id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setUserId(id: string) {
  // Persist for a year; path=/ so middleware + every route can read it.
  document.cookie = `${COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
}

export function clearUserId() {
  document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
}

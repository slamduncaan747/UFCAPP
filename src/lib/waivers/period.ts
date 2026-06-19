/** Date (YYYY-MM-DD, UTC) of the Monday these claims will be processed on. */
export function currentWaiverPeriod(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const delta = (1 - d.getUTCDay() + 7) % 7; // 0 if today is Monday, else days until Monday
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

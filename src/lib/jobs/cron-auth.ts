/**
 * Cron requests are authorized two ways:
 *  - Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET` when a
 *    CRON_SECRET env var is set. (Vercel Cron cannot send custom headers.)
 *  - Manual/internal callers may send `x-cron-secret: $CRON_SECRET`.
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-cron-secret") === secret) return true;
  return false;
}

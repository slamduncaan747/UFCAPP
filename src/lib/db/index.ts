import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For migrations & one-off scripts: pooling must be off
const migrationClient = postgres(connectionString, { max: 1 });
export const migrationDb = drizzle(migrationClient, { schema });

// For serverless / route handlers. On Vercel the function freezes between
// invocations; an idle pooled socket can be dropped server-side and then throw
// "Failed query" the next time it's reused. These options recycle connections
// so we don't hold a stale one, and `prepare: false` keeps us compatible with
// transaction-mode poolers (Supavisor/PgBouncer).
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,          // close a connection after 20s idle
  max_lifetime: 60 * 30,     // recycle connections every 30 min
  connect_timeout: 15,
  prepare: false,
});
export const db = drizzle(queryClient, { schema });

// Errors that mean "the connection died" — safe to retry on a fresh socket.
const CONNECTION_ERROR =
  /CONNECTION_|ECONNRESET|EPIPE|ETIMEDOUT|Connection terminated|terminating connection|connection closed|write after end|socket hang up|CONNECT_TIMEOUT|read ECONNRESET/i;

function looksLikeConnectionError(err: any): boolean {
  const parts = [
    err?.code, err?.message,
    err?.cause?.code, err?.cause?.message,
    err?.cause?.cause?.code, err?.cause?.cause?.message,
  ].filter(Boolean).join(" ");
  return CONNECTION_ERROR.test(parts);
}

/**
 * Runs a query and retries a couple times if the failure is a dropped
 * connection (the first query after a serverless freeze). Real SQL errors
 * (constraints, syntax, etc.) are re-thrown immediately — never masked.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!looksLikeConnectionError(err)) throw err;
      await new Promise((r) => setTimeout(r, 60 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export * from "./schema";

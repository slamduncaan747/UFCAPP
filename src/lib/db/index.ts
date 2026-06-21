import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For migrations & one-off scripts: pooling must be off
const migrationClient = postgres(connectionString, { max: 1 });
export const migrationDb = drizzle(migrationClient, { schema });

function makeClient() {
  // On Vercel the function freezes between invocations and a pooled socket can
  // be dropped server-side. idle_timeout/max_lifetime recycle connections and
  // prepare:false keeps us compatible with transaction-mode poolers.
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 15,
    prepare: false,
    onnotice: () => {},
  });
}

let queryClient = makeClient();
let inner = drizzle(queryClient, { schema });

// Recreate the pool after a dead-connection error so the *next* query opens a
// genuinely fresh socket. The old client is left to idle-timeout itself so we
// never cut off a query running on another concurrent request.
function resetDbClient() {
  queryClient = makeClient();
  inner = drizzle(queryClient, { schema });
}

// Stable proxy: every importer always talks to the current drizzle instance,
// even after a reset. Methods are bound so `this` resolves correctly.
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_t, prop) {
    const v = (inner as any)[prop];
    return typeof v === "function" ? v.bind(inner) : v;
  },
});

// Errors that mean "the connection died" — safe to retry on a fresh socket.
const CONNECTION_ERROR =
  /CONNECTION_|ECONNRESET|EPIPE|ETIMEDOUT|ENOTFOUND|EHOSTUNREACH|Connection ?terminated|terminating connection|connection closed|server closed|write after end|socket hang up|CONNECT_TIMEOUT|connection ended|timeout expired|fetch failed/i;

function isConnectionError(err: any): boolean {
  let e = err;
  for (let depth = 0; e && depth < 6; depth++) {
    const code = e.code != null ? String(e.code) : "";
    if (CONNECTION_ERROR.test(code) || CONNECTION_ERROR.test(String(e.message ?? ""))) return true;
    e = e.cause;
  }
  return false;
}

/**
 * Runs a query, retrying on dropped-connection errors (the first query after a
 * serverless freeze). On each connection failure we recreate the pool and back
 * off, so a later attempt lands on a fresh socket. Real SQL errors (constraints,
 * syntax, etc.) are re-thrown immediately — never masked.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  const delays = [120, 350, 800, 1500, 2500];
  let lastErr: any;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isConnectionError(err)) throw err;
      resetDbClient();
      await new Promise((r) => setTimeout(r, delays[Math.min(attempt, delays.length - 1)]));
    }
  }
  throw lastErr;
}

export * from "./schema";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For migrations & one-off scripts: pooling must be off
const migrationClient = postgres(connectionString, { max: 1 });
export const migrationDb = drizzle(migrationClient, { schema });

// For serverless / route handlers: use a pool-compatible connection
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

export * from "./schema";

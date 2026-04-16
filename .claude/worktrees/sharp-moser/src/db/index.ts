import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/meowsliver";

declare global {
  var __meowsliverPool: Pool | undefined;
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

const globalForDb = globalThis as typeof globalThis & {
  __meowsliverPool?: Pool;
};

export const pool =
  globalForDb.__meowsliverPool ??
  new Pool({
    connectionString: getDatabaseUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__meowsliverPool = pool;
}

export const db = drizzle(pool, { schema });

export type Database = typeof db;

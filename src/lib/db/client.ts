import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/lib/db/schema";

function createDatabase(client: ReturnType<typeof postgres>) {
  return drizzle(client, { schema });
}

type Database = ReturnType<typeof createDatabase>;

declare global {
  var __clubSql: ReturnType<typeof postgres> | undefined;
  var __clubDb: Database | undefined;
}

export function hasDatabaseConnection() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabase() {
  if (!hasDatabaseConnection()) {
    return null;
  }

  if (!global.__clubSql || !global.__clubDb) {
    global.__clubSql = postgres(process.env.DATABASE_URL!, {
      prepare: false,
      max: process.env.NODE_ENV === "production" ? 5 : 1,
    });
    global.__clubDb = createDatabase(global.__clubSql);
  }

  return global.__clubDb;
}

export function requireDatabase() {
  const db = getDatabase();
  if (!db) {
    throw new Error("DATABASE_URL sozlanmagan. Remote PostgreSQL ulanishini kiriting.");
  }

  return db;
}

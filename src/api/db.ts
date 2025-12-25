import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { existsSync, mkdirSync } from "fs";

// Use environment variable for database path, or resolve relative to project root
const dbPath = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : resolve(process.cwd(), "drizzle", "db.sqlite");
const dbDir = dirname(dbPath);

// Ensure the directory exists before creating the client
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const client = createClient({
  url: `file:${dbPath}`,
});

export const db = drizzle(client);

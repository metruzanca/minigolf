import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, "../../drizzle/db.sqlite");

const client = createClient({
  url: `file:${dbPath}`,
});

export const db = drizzle(client);

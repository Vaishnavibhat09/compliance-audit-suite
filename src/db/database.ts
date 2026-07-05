import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { settings } from "../config/settings";
import { createLogger } from "../utils/logger";

const logger = createLogger("database");

fs.mkdirSync(path.dirname(settings.databasePath), { recursive: true });

export const db = new Database(settings.databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate(): void {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
  logger.info("Schema is up to date");
}

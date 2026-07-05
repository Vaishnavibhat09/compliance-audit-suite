import path from "path";
import dotenv from "dotenv";

dotenv.config();

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value.trim().toLowerCase() === "true";
}

const storageRoot = path.resolve(process.cwd(), process.env.STORAGE_ROOT || "./storage");

export const settings = {
  port: Number(process.env.PORT || 4000),
  databasePath: path.resolve(
    process.cwd(),
    process.env.DATABASE_PATH || "./storage/audit-suite.db"
  ),
  storage: {
    root: storageRoot,
    uploads: path.join(storageRoot, "uploads"),
    blueprints: path.join(storageRoot, "blueprints"),
    screenshots: path.join(storageRoot, "screenshots"),
    extracted: path.join(storageRoot, "extracted"),
    reports: path.join(storageRoot, "reports"),
    bundles: path.join(storageRoot, "bundles"),
  },
  defaults: {
    targetUrl:
      process.env.DEFAULT_TARGET_URL ||
      "https://white-cliff-0bca3ed00.1.azurestaticapps.net",
    loginEmail: process.env.DEFAULT_LOGIN_EMAIL || "",
    loginPassword: process.env.DEFAULT_LOGIN_PASSWORD || "",
    aiProvider: (process.env.DEFAULT_AI_PROVIDER || "groq") as
      | "groq"
      | "openai"
      | "gemini",
    aiModel: process.env.DEFAULT_AI_MODEL || "llama-3.3-70b-versatile",
  },
  browser: {
    headless: readBool(process.env.HEADLESS_BROWSER, true),
  },
  apiKeys: {
    groq: process.env.GROQ_API_KEY || "",
    openai: process.env.OPENAI_API_KEY || "",
    gemini: process.env.GEMINI_API_KEY || "",
  },
};

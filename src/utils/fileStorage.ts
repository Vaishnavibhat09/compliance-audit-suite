import fs from "fs";
import path from "path";

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export function writeBinary(filePath: string, buffer: Buffer): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, buffer);
}

export function fileToBase64(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath).toString("base64");
}

export function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

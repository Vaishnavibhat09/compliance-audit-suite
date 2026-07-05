import { v4 as uuidv4 } from "uuid";

export function newId(prefix: string): string {
  return `${prefix}_${uuidv4().replace(/-/g, "").slice(0, 20)}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

import type { FolderColor } from "@/components/FolderTree";

const ASSET_NAMES = new Set([
  "public",
  "assets",
  "fonts",
  "images",
  "icons",
  "static",
  "media",
]);
const DATA_NAMES = new Set([
  "prisma",
  "migrations",
  "db",
  "database",
  "schema",
  "sql",
]);

export function colorForFolder(name: string, isRoot: boolean): FolderColor {
  if (isRoot) return "blue";
  if (name.startsWith(".")) return "amber";
  if (ASSET_NAMES.has(name)) return "yellow";
  if (DATA_NAMES.has(name)) return "green";
  return "blue";
}

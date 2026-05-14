import "server-only";

import { readdir } from "node:fs/promises";
import { join } from "node:path";

import type { FolderColor, FolderNode } from "@/components/FolderTree";
import { MAX_DEPTH, MAX_ENTRIES, SKIP_DIRS } from "@/infrastructure/localScan/scanLimits";

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

function colorForFolder(name: string, isRoot: boolean): FolderColor {
  if (isRoot) return "blue";
  if (name.startsWith(".")) return "amber";
  if (ASSET_NAMES.has(name)) return "yellow";
  if (DATA_NAMES.has(name)) return "green";
  return "blue";
}

export async function scanLocalFolderTree(absPath: string): Promise<FolderNode[] | null> {
  if (!absPath.startsWith("/")) return null;
  try {
    const counter = { count: 0 };
    return await scan(absPath, 0, counter);
  } catch {
    return null;
  }
}

async function scan(
  dirPath: string,
  depth: number,
  counter: { count: number },
): Promise<FolderNode[]> {
  if (depth > MAX_DEPTH || counter.count > MAX_ENTRIES) return [];

  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const tree: FolderNode[] = [];
  for (const entry of entries) {
    counter.count += 1;
    if (counter.count > MAX_ENTRIES) break;
    if (SKIP_DIRS.has(entry.name)) continue;
    if (!entry.isDirectory()) continue; // 파일은 트리에서 제외

    const children = await scan(join(dirPath, entry.name), depth + 1, counter);
    tree.push({
      name: entry.name,
      color: colorForFolder(entry.name, false),
      children,
    });
  }

  tree.sort((a, b) => a.name.localeCompare(b.name));
  return tree;
}

import "server-only";

import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { FolderFile } from "@/domain/agent/types";

const PROJECTS_ROOT = join(homedir(), ".claude", "projects");

export async function loadClaudeProjectFiles(encodedPath: string): Promise<FolderFile[]> {
  if (encodedPath.includes("/") || encodedPath.includes("..") || encodedPath.startsWith(".")) {
    throw new Error("invalid encodedPath");
  }
  const dir = join(PROJECTS_ROOT, encodedPath);
  const files = await readdir(dir);
  return files
    .filter((f) => f.toLowerCase().endsWith(".jsonl"))
    .map((name) => ({
      relativePath: name,
      readText: () => readFile(join(dir, name), "utf8"),
    }));
}

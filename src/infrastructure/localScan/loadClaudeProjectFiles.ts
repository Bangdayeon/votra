import "server-only";

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { FolderFile } from "@/domain/agent/types";

import type { ClaudeProjectSource } from "./discoverClaudeProjects";

const PROJECTS_ROOT = join(homedir(), ".claude", "projects");

export async function loadClaudeProjectFiles(
  sources: ClaudeProjectSource[],
): Promise<FolderFile[]> {
  const files: FolderFile[] = [];
  for (const src of sources) {
    if (!isSafeSegment(src.folder) || !isSafeFile(src.file)) {
      throw new Error("invalid source");
    }
    const full = join(PROJECTS_ROOT, src.folder, src.file);
    files.push({
      relativePath: `${src.folder}/${src.file}`,
      readText: () => readFile(full, "utf8"),
    });
  }
  return files;
}

function isSafeSegment(s: string): boolean {
  return !s.includes("/") && !s.includes("..") && !s.startsWith(".");
}

function isSafeFile(s: string): boolean {
  return !s.includes("/") && !s.includes("..") && s.toLowerCase().endsWith(".jsonl");
}

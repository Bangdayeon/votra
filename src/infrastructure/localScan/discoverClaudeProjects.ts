import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type DiscoveredClaudeProject = {
  /** 폴더명 (예: "-Users-bibi-code-my-app") — load 시 키로 사용 */
  encodedPath: string;
  /** jsonl 의 cwd 필드에서 복원한 실제 경로 (없으면 encodedPath) */
  displayPath: string;
  /** 파일명만 추출한 간단한 이름 (예: "my-app") */
  shortName: string;
  sessionCount: number;
  /** 가장 최근 jsonl 의 mtime (정렬용) */
  lastModifiedMs: number;
};

const PROJECTS_ROOT = join(homedir(), ".claude", "projects");

export async function discoverClaudeProjects(): Promise<DiscoveredClaudeProject[]> {
  let entries;
  try {
    entries = await readdir(PROJECTS_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: DiscoveredClaudeProject[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(PROJECTS_ROOT, entry.name);
    const item = await inspectProject(entry.name, dir);
    if (item) results.push(item);
  }

  results.sort((a, b) => b.lastModifiedMs - a.lastModifiedMs);
  return results;
}

async function inspectProject(
  encodedPath: string,
  dir: string,
): Promise<DiscoveredClaudeProject | null> {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }
  const sessions = files.filter((f) => f.toLowerCase().endsWith(".jsonl"));
  if (sessions.length === 0) return null;

  let lastModifiedMs = 0;
  for (const f of sessions) {
    try {
      const s = await stat(join(dir, f));
      if (s.mtimeMs > lastModifiedMs) lastModifiedMs = s.mtimeMs;
    } catch {
      /* ignore */
    }
  }

  const cwd = await extractCwd(join(dir, sessions[0]));
  const displayPath = cwd ?? encodedPath;
  const shortName = displayPath.split("/").filter(Boolean).pop() ?? encodedPath;

  return {
    encodedPath,
    displayPath,
    shortName,
    sessionCount: sessions.length,
    lastModifiedMs,
  };
}

async function extractCwd(filePath: string): Promise<string | null> {
  try {
    const text = await readFile(filePath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed.cwd === "string") return parsed.cwd;
      } catch {
        /* keep going */
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

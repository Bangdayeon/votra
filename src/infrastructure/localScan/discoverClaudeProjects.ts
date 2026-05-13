import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type ClaudeProjectSource = {
  /** ~/.claude/projects/ 아래의 폴더명 (슬러그) */
  folder: string;
  /** 폴더 안의 jsonl 파일명 */
  file: string;
};

export type DiscoveredClaudeProject = {
  /** React key / 식별자. cwd 가 있으면 cwd, 없으면 폴더 슬러그. */
  key: string;
  /** 표시용 절대 경로. jsonl 의 cwd 필드 우선, 없으면 폴더 슬러그. */
  displayPath: string;
  /** displayPath 의 마지막 세그먼트. */
  shortName: string;
  sessionCount: number;
  lastModifiedMs: number;
  /** 이 프로젝트에 속하는 jsonl 들 — loader 가 그대로 읽어요. */
  sources: ClaudeProjectSource[];
};

const PROJECTS_ROOT = join(homedir(), ".claude", "projects");

type Bucket = {
  key: string;
  displayPath: string;
  lastModifiedMs: number;
  sources: ClaudeProjectSource[];
};

export async function discoverClaudeProjects(): Promise<DiscoveredClaudeProject[]> {
  let entries;
  try {
    entries = await readdir(PROJECTS_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }

  const buckets = new Map<string, Bucket>();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folder = entry.name;
    const dir = join(PROJECTS_ROOT, folder);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.toLowerCase().endsWith(".jsonl")) continue;
      const fullPath = join(dir, file);
      const [cwd, mtimeMs] = await Promise.all([
        extractCwd(fullPath),
        statMtime(fullPath),
      ]);
      const key = cwd ?? folder;
      const displayPath = cwd ?? folder;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.sources.push({ folder, file });
        if (mtimeMs > bucket.lastModifiedMs) bucket.lastModifiedMs = mtimeMs;
      } else {
        buckets.set(key, {
          key,
          displayPath,
          lastModifiedMs: mtimeMs,
          sources: [{ folder, file }],
        });
      }
    }
  }

  const results: DiscoveredClaudeProject[] = [];
  for (const b of buckets.values()) {
    const shortName = b.displayPath.split("/").filter(Boolean).pop() ?? b.key;
    results.push({
      key: b.key,
      displayPath: b.displayPath,
      shortName,
      sessionCount: b.sources.length,
      lastModifiedMs: b.lastModifiedMs,
      sources: b.sources,
    });
  }

  results.sort((a, b) => b.lastModifiedMs - a.lastModifiedMs);
  return results;
}

async function statMtime(filePath: string): Promise<number> {
  try {
    const s = await stat(filePath);
    return s.mtimeMs;
  } catch {
    return 0;
  }
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

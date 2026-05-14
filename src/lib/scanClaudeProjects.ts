"use client";

import type { DiscoveredClaudeProject } from "@/infrastructure/localScan/discoverClaudeProjects";

export type ScannedClaudeProject = DiscoveredClaudeProject & {
  /** 제출 시 read 할 파일 핸들 (key === project.key) */
  fileHandles: { relativePath: string; file: File }[];
};

type Bucket = {
  key: string;
  displayPath: string;
  lastModifiedMs: number;
  fileHandles: { relativePath: string; file: File }[];
  sources: { folder: string; file: string }[];
};

export async function scanClaudeProjects(
  root: FileSystemDirectoryHandle,
): Promise<ScannedClaudeProject[]> {
  const buckets = new Map<string, Bucket>();
  const folderEntries = (
    root as unknown as {
      entries: () => AsyncIterable<[string, FileSystemHandle]>;
    }
  ).entries();

  for await (const [folderName, folderHandle] of folderEntries) {
    if (folderHandle.kind !== "directory") continue;
    const fileEntries = (
      folderHandle as unknown as {
        entries: () => AsyncIterable<[string, FileSystemHandle]>;
      }
    ).entries();

    for await (const [fileName, fileHandle] of fileEntries) {
      if (fileHandle.kind !== "file") continue;
      if (!fileName.toLowerCase().endsWith(".jsonl")) continue;
      const file = await (fileHandle as FileSystemFileHandle).getFile();
      const cwd = await extractCwdFromFile(file);
      const key = cwd ?? folderName;
      const displayPath = cwd ?? folderName;
      const relativePath = `${folderName}/${fileName}`;
      const entry = { relativePath, file };
      const source = { folder: folderName, file: fileName };

      const bucket = buckets.get(key);
      if (bucket) {
        bucket.fileHandles.push(entry);
        bucket.sources.push(source);
        if (file.lastModified > bucket.lastModifiedMs)
          bucket.lastModifiedMs = file.lastModified;
      } else {
        buckets.set(key, {
          key,
          displayPath,
          lastModifiedMs: file.lastModified,
          fileHandles: [entry],
          sources: [source],
        });
      }
    }
  }

  const results: ScannedClaudeProject[] = [];
  for (const b of buckets.values()) {
    const shortName = b.displayPath.split("/").filter(Boolean).pop() ?? b.key;
    results.push({
      key: b.key,
      displayPath: b.displayPath,
      shortName,
      sessionCount: b.fileHandles.length,
      lastModifiedMs: b.lastModifiedMs,
      sources: b.sources,
      fileHandles: b.fileHandles,
    });
  }

  results.sort((a, b) => b.lastModifiedMs - a.lastModifiedMs);
  return results;
}

async function extractCwdFromFile(file: File): Promise<string | null> {
  const text = await file.text();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as { cwd?: unknown };
      if (typeof parsed.cwd === "string") return parsed.cwd;
    } catch {
      /* keep going */
    }
  }
  return null;
}

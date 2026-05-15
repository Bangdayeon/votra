"use client";

import type { FolderNode } from "@/shared/folder/types";
import { colorForFolder } from "@/lib/colorForFolder";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  ".cache",
  "dist",
  "build",
  "out",
  "coverage",
  ".vercel",
]);

export async function scanFolderTree(
  handle: FileSystemDirectoryHandle,
  basePath = "",
): Promise<FolderNode[]> {
  const tree: FolderNode[] = [];
  const entries = (
    handle as unknown as {
      entries: () => AsyncIterable<[string, FileSystemHandle]>;
    }
  ).entries();

  for await (const [name, child] of entries) {
    if (SKIP_DIRS.has(name)) continue;
    if (child.kind !== "directory") continue;
    const childPath = basePath ? `${basePath}/${name}` : name;
    const sub = await scanFolderTree(
      child as FileSystemDirectoryHandle,
      childPath,
    );
    tree.push({ name, color: colorForFolder(name, false), children: sub });
  }
  tree.sort((a, b) => a.name.localeCompare(b.name));
  return tree;
}

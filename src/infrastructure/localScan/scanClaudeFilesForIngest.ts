import "server-only";

import type { ClaudeFileInput } from "@/application/ports/claudeFileRepository";
import { discoverClaudeFiles } from "@/infrastructure/localScan/discoverClaudeFiles";
import { readClaudeFile } from "@/infrastructure/localScan/readClaudeFile";

export async function scanClaudeFilesForIngest(
  cwd: string,
): Promise<ClaudeFileInput[]> {
  const discovered = await discoverClaudeFiles(cwd);
  const files: ClaudeFileInput[] = [];
  for (const d of discovered) {
    const file = await readClaudeFile(d.absPath);
    if (!file) continue;
    files.push({
      kind: d.kind,
      scope: d.scope,
      absPath: d.absPath,
      displayPath: d.displayPath,
      content: file.content,
      mtime: file.mtime,
    });
  }
  return files;
}

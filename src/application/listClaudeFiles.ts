import { gradeFromScore } from "@/domain/claudeFiles/gradeFromScore";
import { scoreClaudeFile } from "@/domain/claudeFiles/scoreClaudeFile";
import type { ClaudeFileRecord } from "@/domain/claudeFiles/types";
import { discoverClaudeFiles } from "@/infrastructure/localScan/discoverClaudeFiles";
import { readClaudeFile } from "@/infrastructure/localScan/readClaudeFile";

export async function listClaudeFiles(
  cwd?: string,
): Promise<ClaudeFileRecord[]> {
  const discovered = await discoverClaudeFiles(cwd);
  const records: ClaudeFileRecord[] = [];
  for (const d of discovered) {
    const file = await readClaudeFile(d.absPath);
    if (!file) continue;
    const score = scoreClaudeFile(file.content, d.kind, file.mtime);
    records.push({
      absPath: d.absPath,
      displayPath: d.displayPath,
      kind: d.kind,
      scope: d.scope,
      contentLength: file.content.length,
      mtime: file.mtime,
      score,
      grade: gradeFromScore(score.total),
    });
  }
  return records;
}

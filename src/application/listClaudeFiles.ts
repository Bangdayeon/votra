import type { ClaudeFileRepository } from "@/application/ports/claudeFileRepository";
import { gradeFromScore } from "@/domain/claudeFiles/gradeFromScore";
import { scoreClaudeFile } from "@/domain/claudeFiles/scoreClaudeFile";
import type { ClaudeFileRecord } from "@/domain/claudeFiles/types";

export async function listClaudeFiles(
  projectId: string,
  deps: { claudeFiles: ClaudeFileRepository },
): Promise<ClaudeFileRecord[]> {
  const rows = await deps.claudeFiles.findByProject(projectId);
  const now = Date.now();
  return rows.map((r) => {
    const score = scoreClaudeFile(r.content, r.kind, r.mtime, now);
    return {
      absPath: r.absPath,
      displayPath: r.displayPath,
      kind: r.kind,
      scope: r.scope,
      contentLength: r.content.length,
      mtime: r.mtime,
      score,
      grade: gradeFromScore(score.total),
    };
  });
}

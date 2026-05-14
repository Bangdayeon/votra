"use server";

import { listClaudeFiles } from "@/application/listClaudeFiles";
import type { ClaudeFileRecord } from "@/domain/claudeFiles/types";

export async function listClaudeFilesAction(
  cwd?: string,
): Promise<ClaudeFileRecord[]> {
  return listClaudeFiles(cwd);
}

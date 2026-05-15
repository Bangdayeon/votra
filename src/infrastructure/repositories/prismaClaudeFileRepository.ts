import "server-only";

import type {
  ClaudeFileInput,
  ClaudeFileRepository,
  ClaudeFileRow,
} from "@/application/ports/claudeFileRepository";
import type {
  ClaudeFileKind,
  ClaudeFileScope,
} from "@/domain/claudeFiles/types";
import { prisma } from "@/infrastructure/db/prisma";

export const prismaClaudeFileRepository: ClaudeFileRepository = {
  findByProject: async (projectId) => {
    const rows = await prisma.claudeFile.findMany({
      where: { projectId },
      orderBy: { absPath: "asc" },
    });
    return rows.map(
      (r): ClaudeFileRow => ({
        kind: r.kind as ClaudeFileKind,
        scope: r.scope as ClaudeFileScope,
        absPath: r.absPath,
        displayPath: r.displayPath,
        content: r.content,
        mtime: Number(r.mtimeMs),
      }),
    );
  },

  replaceAll: async (projectId, files) => {
    await prisma.$transaction(async (tx) => {
      await tx.claudeFile.deleteMany({ where: { projectId } });
      if (files.length === 0) return;
      await tx.claudeFile.createMany({
        data: files.map((f) => toCreateData(projectId, f)),
      });
    });
  },
};

function toCreateData(projectId: string, f: ClaudeFileInput) {
  return {
    projectId,
    kind: f.kind,
    scope: f.scope,
    absPath: f.absPath,
    displayPath: f.displayPath,
    content: f.content,
    mtimeMs: BigInt(Math.trunc(f.mtime)),
  };
}

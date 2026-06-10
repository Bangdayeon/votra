"use server";

import type { MemoryContextRecord } from "@/application/ports/memoryContextRepository";
import type { NextTask } from "@/application/ports/projectAiNextTaskRepository";
import { recallThoughts } from "@/application/recallThoughts";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { geminiEmbeddingClient } from "@/infrastructure/llm/geminiEmbeddingClient";
import { prismaMemoryContextRepository } from "@/infrastructure/repositories/prismaMemoryContextRepository";
import { prismaProjectAiNextTaskRepository } from "@/infrastructure/repositories/prismaProjectAiNextTaskRepository";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export type BriefPreviewDecision = {
  seq: number;
  title: string;
  keyDecisions: string[];
};

export type BriefPreviewData = {
  context: MemoryContextRecord | null;
  inProgressTasks: Array<{ seq: number; title: string }>;
  recentKeyDecisions: BriefPreviewDecision[];
  recommendedTasks: NextTask[];
};

export async function getBriefPreviewAction(projectId: string): Promise<BriefPreviewData> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const [context, inProgressRaw, doneRaw, nextTask] = await Promise.all([
    prismaMemoryContextRepository.findByProject(projectId),
    prismaTaskRepository.listByFilter({ projectId, status: "IN_PROGRESS", limit: 10 }),
    prismaTaskRepository.listByFilter({ projectId, status: "DONE", limit: 20 }),
    prismaProjectAiNextTaskRepository.findByProject(projectId),
  ]);

  const dateSorted = doneRaw
    .filter((t) => t.keyDecisions.length > 0)
    .sort((a, b) => {
      const ta = a.doneAt ? new Date(a.doneAt).getTime() : 0;
      const tb = b.doneAt ? new Date(b.doneAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 3)
    .map(({ seq, title, keyDecisions }) => ({ seq, title, keyDecisions }));

  let recentKeyDecisions = dateSorted;
  if (inProgressRaw.length > 0) {
    const query = inProgressRaw.map((t) => t.title).join(", ");
    const recalled = await recallThoughts(
      { query, projectId, userId: guard.userId, limit: 10 },
      { tasks: prismaTaskRepository, embedding: geminiEmbeddingClient },
    );
    const hits = recalled.ok
      ? recalled.value.filter((t) => t.keyDecisions.length > 0).slice(0, 3).map(({ seq, title, keyDecisions }) => ({ seq, title, keyDecisions }))
      : [];
    if (hits.length > 0) recentKeyDecisions = hits;
  }

  return {
    context,
    inProgressTasks: inProgressRaw.map(({ seq, title }) => ({ seq, title })),
    recentKeyDecisions,
    recommendedTasks: nextTask ? nextTask.tasks.slice(0, 3) : [],
  };
}

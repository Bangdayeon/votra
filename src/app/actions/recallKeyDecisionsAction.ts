"use server";

import { recallThoughts } from "@/application/recallThoughts";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { geminiEmbeddingClient } from "@/infrastructure/llm/geminiEmbeddingClient";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

import type { KeyDecisionRecord } from "./getProjectKeyDecisionsAction";

export async function recallKeyDecisionsAction(
  projectId: string,
  query: string,
): Promise<KeyDecisionRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const result = await recallThoughts(
    { query, projectId, userId: guard.userId, limit: 20 },
    { tasks: prismaTaskRepository, embedding: geminiEmbeddingClient },
  );

  if (!result.ok) throw new Error(result.error);

  return result.value
    .filter((t) => t.keyDecisions.length > 0)
    .map(({ seq, title, keyDecisions, doneAt }) => ({ seq, title, keyDecisions, doneAt }));
}

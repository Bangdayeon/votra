"use server";

import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export type KeyDecisionRecord = {
  seq: number;
  title: string;
  keyDecisions: string[];
  doneAt: Date | null;
};

export type KeyDecisionsResult = {
  decisions: KeyDecisionRecord[];
  totalDecisionCount: number;
};

export async function getProjectKeyDecisionsAction(projectId: string): Promise<KeyDecisionsResult> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const tasks = await prismaTaskRepository.listByFilter({ projectId, status: "DONE", limit: 200 });

  const withDecisions = tasks
    .filter((t) => t.keyDecisions.length > 0)
    .sort((a, b) => {
      const ta = a.doneAt ? new Date(a.doneAt).getTime() : 0;
      const tb = b.doneAt ? new Date(b.doneAt).getTime() : 0;
      return tb - ta;
    });

  const totalDecisionCount = withDecisions.reduce((acc, t) => acc + t.keyDecisions.length, 0);

  return {
    decisions: withDecisions
      .slice(0, 30)
      .map(({ seq, title, keyDecisions, doneAt }) => ({ seq, title, keyDecisions, doneAt })),
    totalDecisionCount,
  };
}

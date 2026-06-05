"use server";

import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaTaskRepository } from "@/infrastructure/repositories/prismaTaskRepository";

export type KeyDecisionRecord = {
  seq: number;
  title: string;
  keyDecisions: string[];
  doneAt: Date | null;
};

export async function getProjectKeyDecisionsAction(projectId: string): Promise<KeyDecisionRecord[]> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  const tasks = await prismaTaskRepository.listByFilter({ projectId, status: "DONE", limit: 100 });

  return tasks
    .filter((t) => t.keyDecisions.length > 0)
    .sort((a, b) => {
      const ta = a.doneAt ? new Date(a.doneAt).getTime() : 0;
      const tb = b.doneAt ? new Date(b.doneAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 30)
    .map(({ seq, title, keyDecisions, doneAt }) => ({ seq, title, keyDecisions, doneAt }));
}

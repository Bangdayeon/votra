"use server";

import { unstable_cache } from "next/cache";

import { agentContextFlowDiagnosisTag } from "@/app/actions/projectMetricsTag";
import {
  getCachedAgentContextFlowDiagnosis,
  type CachedAgentContextFlowDiagnosis,
} from "@/application/getCachedAgentContextFlowDiagnosis";
import { assertProjectMember } from "@/infrastructure/auth/assertProjectMember";
import { prismaAgentContextFlowDiagnosisRepository } from "@/infrastructure/repositories/prismaAgentContextFlowDiagnosisRepository";

function makeCachedFetch(projectId: string) {
  return unstable_cache(
    () =>
      getCachedAgentContextFlowDiagnosis(projectId, {
        diagnoses: prismaAgentContextFlowDiagnosisRepository,
      }),
    ["agent-context-flow-diagnosis", projectId],
    { tags: [agentContextFlowDiagnosisTag(projectId)] },
  );
}

export async function getAgentContextFlowDiagnosisAction(
  projectId: string,
): Promise<CachedAgentContextFlowDiagnosis> {
  const guard = await assertProjectMember(projectId);
  if (!guard.ok) throw new Error(guard.error);

  return makeCachedFetch(projectId)();
}

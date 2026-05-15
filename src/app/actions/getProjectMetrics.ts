"use server";

import {
  getProjectMetrics,
  type ProjectMetrics,
} from "@/application/getProjectMetrics";
import { assertOwnedProject } from "@/infrastructure/auth/assertOwnedProject";
import { prismaSessionRepository } from "@/infrastructure/repositories/prismaSessionRepository";

export async function getProjectMetricsAction(
  projectId: string,
): Promise<ProjectMetrics> {
  const guard = await assertOwnedProject(projectId);
  if (!guard.ok) throw new Error(guard.error);
  return getProjectMetrics(projectId, { sessions: prismaSessionRepository });
}

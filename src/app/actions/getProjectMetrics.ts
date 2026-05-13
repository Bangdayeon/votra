"use server";

import {
  getProjectMetrics,
  type ProjectMetrics,
} from "@/application/getProjectMetrics";
import { prismaSessionRepository } from "@/infrastructure/repositories/prismaSessionRepository";

export async function getProjectMetricsAction(
  projectId: string,
): Promise<ProjectMetrics> {
  return getProjectMetrics(projectId, { sessions: prismaSessionRepository });
}

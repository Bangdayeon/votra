"use server";

import {
  getProjectMetrics as getProjectMetricsImpl,
  type ProjectMetrics,
} from "@/application/getProjectMetrics";

export async function getProjectMetricsAction(
  projectId: string,
): Promise<ProjectMetrics> {
  return getProjectMetricsImpl(projectId);
}

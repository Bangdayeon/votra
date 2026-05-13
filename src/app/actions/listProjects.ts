"use server";

import { listProjects as listProjectsImpl } from "@/application/listProjects";
import type { ProjectListItem } from "@/application/listProjects";

export async function listProjectsAction(): Promise<ProjectListItem[]> {
  return listProjectsImpl();
}

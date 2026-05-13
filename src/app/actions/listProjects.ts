"use server";

import {
  listProjects as listProjectsImpl,
  type ProjectListItem,
} from "@/application/listProjects";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export async function listProjectsAction(): Promise<ProjectListItem[]> {
  return listProjectsImpl({ projects: prismaProjectRepository });
}

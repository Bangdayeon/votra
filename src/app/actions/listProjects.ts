"use server";

import {
  listProjects as listProjectsImpl,
  type ProjectListItem,
} from "@/application/listProjects";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export async function listProjectsAction(): Promise<ProjectListItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return listProjectsImpl(
    { ownerId: user.id },
    { projects: prismaProjectRepository },
  );
}

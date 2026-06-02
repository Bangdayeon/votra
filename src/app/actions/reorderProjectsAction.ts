"use server";

import { revalidatePath } from "next/cache";

import { reorderProjects } from "@/application/reorderProjects";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export async function reorderProjectsAction(orderedIds: string[]): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("인증이 필요합니다.");
  const result = await reorderProjects(
    { userId: user.id, orderedIds },
    { projects: prismaProjectRepository },
  );
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/");
}

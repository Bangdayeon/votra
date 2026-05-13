"use server";

import { revalidatePath } from "next/cache";

import {
  updateProject,
  type UpdateProjectInput,
} from "@/application/updateProject";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export type UpdateProjectResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateProjectAction(
  input: UpdateProjectInput,
): Promise<UpdateProjectResult> {
  try {
    await updateProject(input, { projects: prismaProjectRepository });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "수정 실패",
    };
  }
}

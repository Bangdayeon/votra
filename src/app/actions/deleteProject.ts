"use server";

import { revalidatePath } from "next/cache";

import { deleteProject } from "@/application/deleteProject";
import { assertOwnedProject } from "@/infrastructure/auth/assertOwnedProject";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export type DeleteProjectResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteProjectAction(id: string): Promise<DeleteProjectResult> {
  const guard = await assertOwnedProject(id);
  if (!guard.ok) return { ok: false, error: guard.error };

  try {
    await deleteProject(id, { projects: prismaProjectRepository });
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "삭제 실패" };
  }
}

"use server";

import { revalidatePath } from "next/cache";

import { deleteProject as deleteProjectImpl } from "@/application/deleteProject";

export type DeleteProjectResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteProjectAction(id: string): Promise<DeleteProjectResult> {
  try {
    await deleteProjectImpl(id);
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "삭제 실패" };
  }
}

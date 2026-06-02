"use server";

import { revalidatePath } from "next/cache";

import { setProjectFavorite } from "@/application/setProjectFavorite";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prismaProjectRepository } from "@/infrastructure/repositories/prismaProjectRepository";

export async function setProjectFavoriteAction(
  id: string,
  isFavorite: boolean,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("인증이 필요합니다.");
  const result = await setProjectFavorite(
    { userId: user.id, id, isFavorite },
    { projects: prismaProjectRepository },
  );
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/");
}

"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prisma } from "@/infrastructure/db/prisma";
import {
  isProfileColor,
  isProfileImage,
} from "@/domain/user/profileAppearance";

export type UpdateProfileAppearanceInput =
  | { kind: "color"; value: string }
  | { kind: "image"; value: string };

export async function updateProfileAppearanceAction(
  input: UpdateProfileAppearanceInput,
): Promise<{ ok: true } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요해요." };

  if (input.kind === "color") {
    if (!isProfileColor(input.value)) return { error: "올바른 색상이 아니에요." };
    await prisma.user.update({
      where: { id: user.id },
      data: { profileColor: input.value },
    });
  } else {
    if (!isProfileImage(input.value)) return { error: "올바른 이미지가 아니에요." };
    await prisma.user.update({
      where: { id: user.id },
      data: { profileImage: input.value },
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

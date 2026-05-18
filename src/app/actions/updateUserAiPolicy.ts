"use server";

import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { prisma } from "@/infrastructure/db/prisma";

const TEXT_MAX = 8000;
const FILE_NAME_MAX = 255;
const FILE_CONTENT_MAX = 512 * 1024;

export type UpdateUserAiPolicyInput = {
  text: string;
  /** null: 파일 제거. undefined: 파일 변경 없음. 객체: 새 파일로 교체. */
  file?: { name: string; content: string } | null;
};

export async function updateUserAiPolicyAction(
  input: UpdateUserAiPolicyInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  if (typeof input.text !== "string") {
    return { ok: false, error: "정책 본문은 문자열이어야 해요." };
  }
  if (input.text.length > TEXT_MAX) {
    return { ok: false, error: `정책 본문은 ${TEXT_MAX}자를 넘을 수 없어요.` };
  }

  const data: {
    aiPolicyText: string;
    aiPolicyFileName?: string | null;
    aiPolicyFileContent?: string | null;
  } = { aiPolicyText: input.text };

  if (input.file === null) {
    data.aiPolicyFileName = null;
    data.aiPolicyFileContent = null;
  } else if (input.file !== undefined) {
    if (
      typeof input.file.name !== "string" ||
      typeof input.file.content !== "string"
    ) {
      return { ok: false, error: "파일 정보가 올바르지 않아요." };
    }
    if (input.file.name.length === 0 || input.file.name.length > FILE_NAME_MAX) {
      return { ok: false, error: "파일명이 올바르지 않아요." };
    }
    if (input.file.content.length > FILE_CONTENT_MAX) {
      return { ok: false, error: "파일 용량이 너무 커요. (최대 512KB)" };
    }
    data.aiPolicyFileName = input.file.name;
    data.aiPolicyFileContent = input.file.content;
  }

  await prisma.user.update({ where: { id: user.id }, data });
  return { ok: true };
}

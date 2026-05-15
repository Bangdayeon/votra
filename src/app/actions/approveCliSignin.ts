"use server";

import { redirect } from "next/navigation";

import { issueApiKeyForCli } from "@/application/issueApiKeyForCli";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";
import { isLocalhostCallback } from "@/shared/lib/isLocalhostCallback";

export type ApproveCliSigninState = { error?: string };

export async function approveCliSigninAction(
  _prev: ApproveCliSigninState,
  formData: FormData,
): Promise<ApproveCliSigninState> {
  const callback = String(formData.get("callback") ?? "");
  const state = String(formData.get("state") ?? "");

  if (!callback || !state) {
    return { error: "콜백 정보가 없어요. CLI 에서 다시 시도해 주세요." };
  }
  if (!isLocalhostCallback(callback)) {
    return { error: "콜백 URL 이 localhost 가 아니에요." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "세션이 만료됐어요. 다시 로그인해 주세요." };
  }

  const token = await issueApiKeyForCli({
    userId: user.id,
    name: "votra CLI",
  });

  const url = new URL(callback);
  url.searchParams.set("token", token);
  url.searchParams.set("state", state);
  if (user.email) url.searchParams.set("email", user.email);
  redirect(url.toString());
}

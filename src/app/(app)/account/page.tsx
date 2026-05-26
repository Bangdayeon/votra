import type { Metadata } from "next";
import { Suspense } from "react";

import { getUserAiPolicyAction } from "@/app/actions/getUserAiPolicy";
import { AccountSettingsPage } from "@/app/(app)/account/AccountSettingsPage";

export const metadata: Metadata = { title: "계정 설정" };

export default async function AccountPage() {
  const res = await getUserAiPolicyAction();
  const initialPolicy = res.ok
    ? res.policy
    : { aiSpecGuideline: "", aiSpecFileName: null };
  return (
    <Suspense>
      <AccountSettingsPage initialPolicy={initialPolicy} />
    </Suspense>
  );
}

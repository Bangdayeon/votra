import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountSettingsPage } from "@/app/(app)/account/AccountSettingsPage";

export const metadata: Metadata = { title: "계정 설정" };

export default async function AccountPage() {
  return (
    <Suspense>
      <AccountSettingsPage />
    </Suspense>
  );
}

import type { Metadata } from "next";

import { SettingsPageClient } from "@/app/(app)/settings/SettingsPageClient";

export const metadata: Metadata = { title: "설정" };

export default function SettingsPage() {
  return <SettingsPageClient />;
}

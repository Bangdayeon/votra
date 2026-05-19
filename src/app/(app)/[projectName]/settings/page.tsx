"use client";

import { useParams } from "next/navigation";

import { SettingsPageClient } from "@/app/(app)/settings/SettingsPageClient";

export default function ProjectSettingsPage() {
  const params = useParams<{ projectName: string }>();
  let slug = params.projectName;
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // 원본 사용
  }
  return <SettingsPageClient slug={slug} />;
}

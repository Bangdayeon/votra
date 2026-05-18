import type { Metadata } from "next";

import { ProjectPageClient } from "@/app/(app)/[projectName]/ProjectPageClient";

type Params = { projectName: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { projectName } = await params;
  let title = projectName;
  try {
    title = decodeURIComponent(projectName);
  } catch {
    // 디코딩 실패 시 원본 사용
  }
  return { title };
}

export default function ProjectPage() {
  return <ProjectPageClient />;
}

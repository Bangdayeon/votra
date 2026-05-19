"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { BranchTab } from "@/components/branch/BranchTab";
import { OverviewTab } from "@/components/overview/OverviewTab";
import { useProjects } from "@/components/project/ProjectsContext";

type Tab = "main" | "manage" | "history";

function parseTab(value: string | null): Tab {
  if (value === "manage") return "manage";
  if (value === "history") return "history";
  return "main";
}

export function ProjectPageClient() {
  const params = useParams<{ projectName: string }>();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const slug = decodeSlug(params.projectName);
  const { projects } = useProjects();
  const project = useMemo(
    () => projects.find((p) => p.name === slug) ?? null,
    [projects, slug],
  );

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center px-8 py-6 text-sm text-muted-foreground">
        프로젝트를 찾을 수 없어요.
      </div>
    );
  }

  if (tab === "manage") {
    return (
      <div className="px-8 py-6">
        <BranchTab selected={project} />
      </div>
    );
  }

  if (tab === "history") {
    return (
      <div className="flex h-full items-center justify-center px-8 py-6 text-sm text-muted-foreground">
        히스토리 기능을 준비 중이에요.
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <OverviewTab selected={project} />
    </div>
  );
}

function decodeSlug(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

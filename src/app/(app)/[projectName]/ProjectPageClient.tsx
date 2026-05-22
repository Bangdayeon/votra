"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { AgentContextFlowCard } from "@/components/claude-files/AgentContextFlowCard";
import { ClaudeFilesCard } from "@/components/claude-files/ClaudeFilesCard";
import { HistoryTab } from "@/components/history/HistoryTab";
import { OverviewTab } from "@/components/overview/OverviewTab";
import { useProjects } from "@/components/project/ProjectsContext";
import { TeamTab } from "@/components/team/TeamTab";
import { useProjectEvents } from "@/hooks/useProjectEvents";

type Tab = "main" | "manage" | "history" | "team";

function parseTab(value: string | null): Tab {
  if (value === "manage") return "manage";
  if (value === "history") return "history";
  if (value === "team") return "team";
  return "main";
}

export function ProjectPageClient() {
  const params = useParams<{ projectName: string }>();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const slug = decodeSlug(params.projectName);
  const { projects, refresh } = useProjects();
  const project = useMemo(
    () => projects.find((p) => p.name === slug) ?? null,
    [projects, slug],
  );

  useProjectEvents(project?.id ?? "", refresh);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center px-8 py-6 text-sm text-muted-foreground">
        프로젝트를 찾을 수 없어요.
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <div className={tab === "main" ? undefined : "hidden"}>
        <OverviewTab selected={project} />
      </div>
      <div className={tab === "manage" ? undefined : "hidden"}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <ClaudeFilesCard selected={project} />
          <AgentContextFlowCard selected={project} />
        </div>
      </div>
      <div className={tab === "history" ? undefined : "hidden"}>
        <HistoryTab selected={project} />
      </div>
      <div className={tab === "team" ? undefined : "hidden"}>
        <TeamTab selected={project} />
      </div>
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

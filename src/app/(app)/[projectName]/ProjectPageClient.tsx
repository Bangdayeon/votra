"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import type { CachedAgentContextFlowDiagnosis } from "@/application/getCachedAgentContextFlowDiagnosis";
import type { CachedProjectAiSummary } from "@/application/getCachedProjectAiSummary";
import type { CachedProjectNextTasks } from "@/application/getCachedProjectNextTasks";
import type { ListClaudeFilesResult } from "@/application/listClaudeFiles";
import type { ProjectMemberRow } from "@/app/actions/getProjectMembers";
import type { TaskRecord } from "@/app/actions/getProjectTasks";
import { AgentContextFlowCard } from "@/components/claude-files/AgentContextFlowCard";
import { ClaudeFilesCard } from "@/components/claude-files/ClaudeFilesCard";
import { TasksTab } from "@/components/memory/TasksTab";
import { OverviewTab } from "@/components/overview/OverviewTab";
import { useProjects } from "@/components/project/ProjectsContext";
import { TeamTab } from "@/components/team/TeamTab";
import type { PolicyRule } from "@/domain/policy/types";
import { useProjectEvents } from "@/hooks/useProjectEvents";
import { cn } from "@/lib/utils";

export type ProjectPageInitialData = {
  overview: {
    aiSummary: CachedProjectAiSummary;
    nextTasks: CachedProjectNextTasks;
  };
  manage: {
    files: ListClaudeFilesResult;
    rules: PolicyRule[];
    diagnosis: CachedAgentContextFlowDiagnosis;
  };
  tasks: TaskRecord[];
  team: {
    members: ProjectMemberRow[];
    currentUserId: string;
  };
};

type Tab = "main" | "manage" | "tasks" | "team";

function parseTab(value: string | null): Tab {
  if (value === "manage") return "manage";
  if (value === "tasks") return "tasks";
  if (value === "team") return "team";
  return "main";
}

export function ProjectPageClient({
  initialData,
}: {
  initialData: ProjectPageInitialData | null;
}) {
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

  // 방문한 탭을 hidden으로 유지 — 탭 전환 시 재마운트 없음
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<Tab>>(
    () => new Set([tab]),
  );
  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center px-8 py-6 text-sm text-muted-foreground">
        프로젝트를 찾을 수 없어요.
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      {visitedTabs.has("main") && (
        <div className={cn(tab !== "main" && "hidden")}>
          <OverviewTab selected={project} initialOverview={initialData?.overview} />
        </div>
      )}
      {visitedTabs.has("manage") && (
        <div className={cn(tab !== "manage" && "hidden")}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <ClaudeFilesCard selected={project} initialManage={initialData?.manage} />
            <AgentContextFlowCard
              selected={project}
              initialDiagnosis={initialData?.manage.diagnosis}
            />
          </div>
        </div>
      )}
      {visitedTabs.has("tasks") && (
        <div className={cn(tab !== "tasks" && "hidden")}>
          <TasksTab selected={project} initialTasks={initialData?.tasks} />
        </div>
      )}
      {visitedTabs.has("team") && (
        <div className={cn(tab !== "team" && "hidden")}>
          <TeamTab selected={project} initialTeam={initialData?.team} />
        </div>
      )}
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

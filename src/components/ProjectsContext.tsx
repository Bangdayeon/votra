"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";

import { listProjectsAction } from "@/app/actions/listProjects";
import type { FolderNode } from "@/components/FolderTree";

export type Project = {
  id: string;
  name: string;
  agent?: string;
  image?: string;
  description?: string;
  /** 폴더 트리 — Prisma `Project.structure` JSON 의 `tree` 와 같은 형식 (현재는 undefined) */
  structure?: FolderNode[];
};

type ProjectsCtx = {
  projects: Project[];
  selectedId: string | null;
  selected: Project | null;
  refreshing: boolean;
  select: (id: string) => void;
  refresh: () => void;
};

const ProjectsContext = createContext<ProjectsCtx | null>(null);

export function useProjects(): ProjectsCtx {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error("useProjects must be used inside <ProjectsProvider>");
  }
  return ctx;
}

export function ProjectsProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: Project[];
}) {
  const [projects, setProjects] = useState<Project[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [refreshing, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const fresh = await listProjectsAction();
      setProjects(fresh);
      if (!fresh.some((p) => p.id === selectedId)) {
        setSelectedId(fresh[0]?.id ?? null);
      }
    });
  }, [selectedId]);

  const value = useMemo<ProjectsCtx>(() => {
    const selected = projects.find((p) => p.id === selectedId) ?? null;
    return {
      projects,
      selectedId,
      selected,
      refreshing,
      select: setSelectedId,
      refresh,
    };
  }, [projects, selectedId, refreshing, refresh]);

  return (
    <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
  );
}

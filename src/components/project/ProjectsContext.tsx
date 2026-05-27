"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";

import { listProjectsAction } from "@/app/actions/listProjects";
import type { FolderNode } from "@/shared/folder/types";

export type Project = {
  id: string;
  name: string;
  agent?: string;
  image?: string;
  description?: string;
  /** 폴더 트리 — Prisma `Project.structure` JSON 의 `tree` 와 같은 형식 (현재는 undefined) */
  structure?: FolderNode[];
  /** 로컬 폴더 절대경로 (예: "/Users/bibi/votra") — 파일 경로 표시 prefix */
  cwd?: string;
  isOwner?: boolean;
  /** CLI 가 마지막으로 세션을 업로드한 시각 (ISO 8601) */
  lastCliSyncAt?: string;
};

type ProjectsCtx = {
  projects: Project[];
  selectedId: string | null;
  selected: Project | null;
  refreshing: boolean;
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

export function projectHref(name: string): string {
  return `/${encodeURIComponent(name)}`;
}

export function ProjectsProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: Project[];
}) {
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>(initial);
  const [refreshing, startTransition] = useTransition();

  const selected = useMemo<Project | null>(() => {
    const slug = firstPathSegment(pathname);
    if (!slug) return null;
    return projects.find((p) => p.name === slug) ?? null;
  }, [pathname, projects]);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const fresh = await listProjectsAction();
      setProjects(fresh);
    });
  }, []);

  const value = useMemo<ProjectsCtx>(
    () => ({
      projects,
      selectedId: selected?.id ?? null,
      selected,
      refreshing,
      refresh,
    }),
    [projects, selected, refreshing, refresh],
  );

  return (
    <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
  );
}

function firstPathSegment(pathname: string | null): string | null {
  if (!pathname) return null;
  const idx = pathname.indexOf("/", 1);
  const raw = idx === -1 ? pathname.slice(1) : pathname.slice(1, idx);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

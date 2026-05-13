"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { FolderNode } from "@/components/FolderTree";

export type Project = {
  id: string;
  name: string;
  agent?: "claude" | "gpt" | "gemini" | string;
  image?: string;
  description?: string;
  /** 폴더 트리 — Prisma `Project.structure` JSON 의 `tree` 와 같은 형식 */
  structure?: FolderNode[];
};

type ProjectsCtx = {
  projects: Project[];
  selectedId: string | null;
  selected: Project | null;
  select: (id: string) => void;
};

const ProjectsContext = createContext<ProjectsCtx | null>(null);

export function useProjects(): ProjectsCtx {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error("useProjects must be used inside <ProjectsProvider>");
  }
  return ctx;
}

const SAMPLE_TREE_A: FolderNode[] = [
  { name: ".agents", color: "amber" },
  { name: ".axhub", color: "amber" },
  { name: ".claude", color: "amber" },
  { name: ".next", color: "amber" },
  { name: "node_modules", color: "gray" },
  {
    name: "prisma",
    color: "green",
    children: [{ name: "migrations", color: "green" }],
  },
  {
    name: "public",
    color: "yellow",
    children: [
      { name: "fonts", color: "yellow" },
      { name: "images", color: "yellow" },
    ],
  },
  {
    name: "src",
    color: "blue",
    children: [
      { name: "app", color: "blue" },
      { name: "application", color: "blue" },
      { name: "assets", color: "blue", children: [{ name: "icons", color: "yellow" }] },
      { name: "components", color: "blue" },
      { name: "domain", color: "blue" },
      { name: "hooks", color: "blue" },
      { name: "infrastructure", color: "blue" },
      { name: "lib", color: "blue" },
      { name: "shared", color: "blue" },
      { name: "styles", color: "blue" },
      { name: "types", color: "blue" },
    ],
  },
];

const INITIAL_PROJECTS: Project[] = [
  { id: "a", name: "프로젝트 A", agent: "claude", structure: SAMPLE_TREE_A },
  { id: "b", name: "프로젝트 B", agent: "gpt" },
  { id: "c", name: "프로젝트 C", agent: "gemini" },
];

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects] = useState<Project[]>(INITIAL_PROJECTS);
  const [selectedId, setSelectedId] = useState<string | null>(
    INITIAL_PROJECTS[0]?.id ?? null,
  );

  const value = useMemo<ProjectsCtx>(() => {
    const selected = projects.find((p) => p.id === selectedId) ?? null;
    return {
      projects,
      selectedId,
      selected,
      select: setSelectedId,
    };
  }, [projects, selectedId]);

  return (
    <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
  );
}

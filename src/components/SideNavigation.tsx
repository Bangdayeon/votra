"use client";

import Image from "next/image";
import { CircleUserRound, Plus } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  color: string;
};

const PROJECTS: Project[] = [
  { id: "a", name: "프로젝트 A", color: "#F38B7B" },
  { id: "b", name: "프로젝트 B", color: "#7BC67E" },
  { id: "c", name: "프로젝트 C", color: "#7BA6E0" },
];

export function SideNavigation() {
  const [selectedId, setSelectedId] = useState<string>("a");

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <Image
          src="/assets/images/logo.svg"
          alt="votra logo"
          width={40}
          height={40}
          priority
        />
        <span className="text-xl font-bold leading-none">
          <span className="text-foreground">vo</span>
          <span className="text-primary">tra</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
        >
          <Plus className="size-4" />
          프로젝트 추가
        </button>

        <ul className="mt-1 space-y-1">
          {PROJECTS.map((project) => {
            const selected = project.id === selectedId;
            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors",
                    selected
                      ? "bg-primary/15 font-semibold text-primary"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                    aria-hidden
                  />
                  {project.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <CircleUserRound className="size-7 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-sm">user name</span>
      </div>
    </aside>
  );
}

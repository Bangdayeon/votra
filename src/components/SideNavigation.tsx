"use client";

import Image from "next/image";
import { CircleUserRound, Plus } from "lucide-react";
import { useState } from "react";

import { SideNavMenuItem } from "@/components/SideNavMenuItem";
import { Button } from "@/components/ui/button";

type Project = {
  id: string;
  name: string;
  image?: string;
};

const PROJECTS: Project[] = [
  { id: "a", name: "프로젝트 A" },
  { id: "b", name: "프로젝트 B" },
  { id: "c", name: "프로젝트 C" },
];

export function SideNavigation() {
  const [selectedId, setSelectedId] = useState<string>("a");

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <Image
          src="/assets/images/logo.svg"
          alt="votra logo"
          width={32}
          height={32}
          priority
        />
        <span className="text-xl font-medium leading-none">
          <span className="text-foreground">vo</span>
          <span className="text-primary">tra</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start rounded-full px-3 py-2 text-sm font-normal text-muted-foreground"
        >
          <Plus className="size-4" />
          프로젝트 추가
        </Button>

        <ul className="mt-1 space-y-1">
          {PROJECTS.map((project) => (
            <li key={project.id}>
              <SideNavMenuItem
                title={project.name}
                image={project.image}
                selected={project.id === selectedId}
                onClick={() => setSelectedId(project.id)}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <CircleUserRound className="size-7 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-sm">user name</span>
      </div>
    </aside>
  );
}

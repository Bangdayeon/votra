"use client";

import Image from "next/image";
import { Icon } from "./Icon";
import {
  CircleUserRound,
  Plus,
} from "lucide-react";

import { useProjects } from "@/components/ProjectsContext";
import { SideNavMenuItem } from "@/components/SideNavMenuItem";
import { useSidebar } from "@/components/SidebarContext";
import { Button } from "@/components/ui/button";

export function SideNavigation() {
  const { open, toggle } = useSidebar();
  const { projects, selectedId, select } = useProjects();

  if (!open) {
    return (
      <aside className="group flex h-screen w-full flex-col overflow-hidden border-r border-border bg-background">
        <div className="relative flex items-center justify-center border-b border-border px-4 py-4">
          <Image
            src="/assets/images/logo.svg"
            alt="votra logo"
            width={32}
            height={32}
            priority
            className="transition-opacity group-hover:opacity-0"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="사이드바 열기"
            className="absolute opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Icon icon="IC_Sidenav" />
          </Button>
        </div>

        <ul className="flex flex-1 flex-col items-center gap-2 overflow-y-auto py-3">
          {projects.map((project) => (
            <li key={project.id}>
              <SideNavMenuItem
                title={project.name}
                image={project.image}
                selected={project.id === selectedId}
                onClick={() => select(project.id)}
                compact
              />
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-center border-t border-border py-3">
          <CircleUserRound
            className="size-7 text-muted-foreground"
            strokeWidth={1.5}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-screen w-full shrink-0 flex-col overflow-hidden border-r border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label="사이드바 닫기"
        >
          <Icon icon="IC_Sidenav" />
        </Button>
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
          {projects.map((project) => (
            <li key={project.id}>
              <SideNavMenuItem
                title={project.name}
                image={project.image}
                selected={project.id === selectedId}
                onClick={() => select(project.id)}
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

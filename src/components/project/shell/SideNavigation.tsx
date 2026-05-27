"use client";

import Image from "next/image";
import { useState } from "react";

import { AddProjectDialog } from "@/components/project/AddProjectDialog";
import { Icon } from "@/components/common/Icon";
import { DeleteProjectConfirmDialog } from "@/components/project/DeleteProjectConfirmDialog";
import { EditProjectDialog } from "@/components/project/EditProjectDialog";
import {
  projectHref,
  useProjects,
  type Project,
} from "@/components/project/ProjectsContext";
import { SideNavMenuItem } from "@/components/project/shell/SideNavMenuItem";
import { useSidebar } from "@/components/project/shell/SidebarContext";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/project/shell/UserMenu";

export function SideNavigation() {
  const { open, toggle } = useSidebar();
  const { projects, selectedId, refresh } = useProjects();
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(
    null,
  );

  if (!open) {
    return (
      <aside className="group flex h-screen w-full flex-col overflow-hidden border-r border-border bg-background">
        <div className="relative flex items-center justify-center px-4 py-4">
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

        <ul className="custom-scrollbar flex flex-1 flex-col items-center gap-2 overflow-y-auto py-3">
          {projects.map((project) => (
            <li key={project.id} className="flex pl-2.5 justify-center">
              <SideNavMenuItem
                title={project.name}
                image={project.image}
                selected={project.id === selectedId}
                href={projectHref(project.name)}
                compact
              />
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-center border-t border-border py-3">
          <UserMenu compact />
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="flex h-screen w-full shrink-0 flex-col overflow-hidden border-r border-border bg-background">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
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

        <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-3">
          <AddProjectDialog onAdded={refresh} />

          <ul className="mt-1 space-y-1">
            {projects.map((project) => (
              <li key={project.id} className="group">
                <SideNavMenuItem
                  title={project.name}
                  image={project.image}
                  selected={project.id === selectedId}
                  href={projectHref(project.name)}
                  onEdit={project.isOwner ? () => setEditing(project) : undefined}
                  onDelete={project.isOwner ? () => setDeleting({ id: project.id, name: project.name }) : undefined}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-border px-4 py-3">
          <UserMenu />
        </div>
      </aside>

      <EditProjectDialog
        project={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
      <DeleteProjectConfirmDialog
        project={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={refresh}
      />
    </>
  );
}

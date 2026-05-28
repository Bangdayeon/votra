"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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
  const { open, toggle, mobileOpen, closeMobile } = useSidebar();
  const { projects, selectedId, refresh } = useProjects();

  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(
    null,
  );

  const asideRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const aside = asideRef.current;

    if (!mobileOpen) {
      aside?.setAttribute("inert", "");
      triggerRef.current?.focus();
      return;
    }

    aside?.removeAttribute("inert");
    triggerRef.current = document.activeElement as HTMLElement;

    if (!aside) return;

    const getFocusable = () =>
      Array.from(
        aside.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    getFocusable()[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeMobile();
        return;
      }
      if (e.key !== "Tab") return;

      const elements = getFocusable();
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, closeMobile]);

  return (
    <>
      {/* 데스크탑 사이드바 (sm 이상에서만 표시) — 접힌 상태 */}
      {!open && (
        <aside className="group hidden sm:flex h-screen w-full flex-col overflow-hidden border-r border-border bg-background">
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
      )}

      {/* 데스크탑 사이드바 (sm 이상에서만 표시) — 펼친 상태 */}
      {open && (
        <aside className="hidden sm:flex h-screen w-full shrink-0 flex-col overflow-hidden border-r border-border bg-background">
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
      )}

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

      {/* 모바일 오버레이 메뉴 (sm 미만에서만 표시) */}
      <div className={`fixed inset-0 z-50 sm:hidden ${mobileOpen ? "" : "pointer-events-none"}`}>
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closeMobile}
          />
          <aside
            ref={asideRef}
            role="dialog"
            aria-modal="true"
            aria-label="내비게이션 메뉴"
            className={`absolute inset-y-0 left-0 flex w-64 flex-col overflow-hidden border-r border-border bg-background transition-transform duration-300 ease-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
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
                onClick={closeMobile}
                aria-label="메뉴 닫기"
              >
                <Icon icon="IC_Sidenav" />
              </Button>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-3">
              <AddProjectDialog onAdded={refresh} />

              <ul className="mt-1 space-y-1">
                {projects.map((project) => (
                  <li key={project.id} className="group" onClick={closeMobile}>
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
        </div>
    </>
  );
}

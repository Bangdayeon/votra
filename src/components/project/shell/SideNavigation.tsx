"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { reorderProjectsAction } from "@/app/actions/reorderProjectsAction";
import { setProjectFavoriteAction } from "@/app/actions/setProjectFavoriteAction";
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

function isDummy(id: string) {
  return id.startsWith("__dummy_");
}

// ── SortableProjectItem ────────────────────────────────────────────────────────

type SortableItemProps = {
  project: Project;
  selected: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onFavorite: () => void;
  onUnfavorite: () => void;
  onMobileClose?: () => void;
};

function SortableProjectItem({
  project,
  selected,
  onEdit,
  onDelete,
  onFavorite,
  onUnfavorite,
  onMobileClose,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: project.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // DragOverlay 가 시각을 담당하므로 원본은 숨김
      className={isDragging ? "invisible" : ""}
      {...listeners}
      {...attributes}
      onClick={onMobileClose}
    >
      <SideNavMenuItem
        title={project.name}
        image={project.image}
        selected={selected}
        href={isDummy(project.id) ? undefined : projectHref(project.name)}
        isFavorite={project.isFavorite}
        onEdit={onEdit}
        onDelete={onDelete}
        onFavorite={project.isFavorite ? undefined : onFavorite}
        onUnfavorite={project.isFavorite ? onUnfavorite : undefined}
      />
    </div>
  );
}

// ── ProjectLists ───────────────────────────────────────────────────────────────
// 별도 컴포넌트: useId()가 tree position 기준 stable ID → SSR hydration 불일치 방지
// DragOverlay + 단일 SortableContext → 섹션 간 드래그 시 아이템 사라짐 방지
// onDragOver → 실시간 섹션 이동(로컬만), onDragEnd → 서버 저장

type ProjectListsProps = {
  favoriteProjects: Project[];
  regularProjects: Project[];
  hasFavorites: boolean;
  selectedId: string | null;
  dividerPct: number;
  onDividerMouseDown: (e: React.MouseEvent) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  /** 팝오버 메뉴에서 즐겨찾기 토글 (로컬 + 서버 저장) */
  onFavoriteToggle: (id: string, isFavorite: boolean) => void;
  /** 드래그 중 섹션 이동 감지 시 로컬 상태만 업데이트 */
  onLocalFavoriteToggle: (id: string, isFavorite: boolean) => void;
  /** 드래그 완료 시 저장 처리 */
  onDragEndSave: (activeId: string, overId: string, originalIsFavorite: boolean) => void;
  onMobileClose?: () => void;
};

function ProjectLists({
  favoriteProjects,
  regularProjects,
  hasFavorites,
  selectedId,
  dividerPct,
  onDividerMouseDown,
  onEdit,
  onDelete,
  onFavoriteToggle,
  onLocalFavoriteToggle,
  onDragEndSave,
  onMobileClose,
}: ProjectListsProps) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragStartFavoriteRef = useRef<boolean | null>(null);

  const allItems = [...favoriteProjects, ...regularProjects];
  const activeProject = activeId ? allItems.find((p) => p.id === activeId) ?? null : null;

  function handleDragStart({ active }: DragStartEvent) {
    const id = active.id as string;
    setActiveId(id);
    dragStartFavoriteRef.current = allItems.find((p) => p.id === id)?.isFavorite ?? null;
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;
    const activeProj = allItems.find((p) => p.id === active.id);
    const overProj = allItems.find((p) => p.id === over.id);
    if (!activeProj || !overProj) return;
    // 섹션이 달라지면 즉시 로컬 상태 업데이트(시각 반영) — 서버 저장은 onDragEnd에서
    if (activeProj.isFavorite !== overProj.isFavorite) {
      onLocalFavoriteToggle(activeProj.id, overProj.isFavorite);
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const originalFavorite = dragStartFavoriteRef.current ?? false;
    setActiveId(null);
    dragStartFavoriteRef.current = null;
    if (!over || active.id === over.id) return;
    onDragEndSave(active.id as string, over.id as string, originalFavorite);
  }

  function renderItems(projects: Project[]) {
    return projects.map((project) => (
      <li key={project.id} className="group">
        <SortableProjectItem
          project={project}
          selected={project.id === selectedId}
          onEdit={
            project.isOwner && !isDummy(project.id) ? () => onEdit(project) : undefined
          }
          onDelete={
            project.isOwner && !isDummy(project.id) ? () => onDelete(project) : undefined
          }
          onFavorite={() => onFavoriteToggle(project.id, true)}
          onUnfavorite={() => onFavoriteToggle(project.id, false)}
          onMobileClose={onMobileClose}
        />
      </li>
    ));
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* 단일 SortableContext: 전체 아이템 → 섹션 간 transform 정상 동작 */}
        <SortableContext
          items={allItems.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {hasFavorites ? (
            <>
              <div
                style={{ flex: `${dividerPct} 1 0`, minHeight: 60 }}
                className="overflow-y-auto custom-scrollbar px-2"
              >
                <p className="sticky top-0 z-10 bg-background py-1 px-1 text-xs font-medium text-muted-foreground">
                  즐겨찾기
                </p>
                <ul className="space-y-1">{renderItems(favoriteProjects)}</ul>
              </div>

              <div
                className="group flex h-3 shrink-0 cursor-row-resize items-center justify-center border-t border-border hover:bg-primary/5 transition-colors"
                onMouseDown={onDividerMouseDown}
              >
                <GripHorizontal className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div
                style={{ flex: `${100 - dividerPct} 1 0`, minHeight: 60 }}
                className="overflow-y-auto custom-scrollbar px-2 pb-3"
              >
                <ul className="space-y-1">{renderItems(regularProjects)}</ul>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3">
              <ul className="mt-1 space-y-1">{renderItems(regularProjects)}</ul>
            </div>
          )}
        </SortableContext>

        {/* DragOverlay: 드래그 중 아이템을 portal로 렌더링 → overflow clip 없이 항상 보임 */}
        <DragOverlay>
          {activeProject ? (
            <div className="rounded-full shadow-lg bg-background border border-border/60 opacity-95">
              <SideNavMenuItem
                title={activeProject.name}
                image={activeProject.image}
                selected={false}
                isFavorite={activeProject.isFavorite}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── SideNavigation ─────────────────────────────────────────────────────────────

export function SideNavigation() {
  const { open, toggle, mobileOpen, closeMobile } = useSidebar();
  const { projects, selectedId, refresh } = useProjects();

  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [dividerPct, setDividerPct] = useState(40);

  useEffect(() => {
    const saved = localStorage.getItem("sidenav-divider-pct");
    const parsed = saved ? parseFloat(saved) : NaN;
    if (!isNaN(parsed)) setDividerPct(Math.max(15, Math.min(80, parsed)));
  }, []);
  const [localProjects, _setLocalProjects] = useState<Project[]>(projects);
  const localProjectsRef = useRef(localProjects);
  function setLocalProjects(updater: React.SetStateAction<Project[]>) {
    _setLocalProjects((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localProjectsRef.current = next;
      return next;
    });
  }

  const asideRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  const favoriteProjects = localProjects.filter((p) => p.isFavorite);
  const regularProjects = localProjects.filter((p) => !p.isFavorite);
  const hasFavorites = favoriteProjects.length > 0;

  // 팝오버 메뉴: 로컬 + 서버 저장
  function handleFavoriteToggle(id: string, isFavorite: boolean) {
    setLocalProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite } : p)),
    );
    if (!isDummy(id)) {
      void setProjectFavoriteAction(id, isFavorite).catch(() => refresh());
    }
  }

  // 드래그 중 섹션 이동: 로컬만 (서버 저장 없음)
  function handleLocalFavoriteToggle(id: string, isFavorite: boolean) {
    setLocalProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite } : p)),
    );
  }

  // 드래그 완료: 재정렬 + 섹션 변경 저장
  function handleDragEndSave(
    activeId: string,
    overId: string,
    originalIsFavorite: boolean,
  ) {
    // localProjectsRef.current: onDragOver의 setLocalProjects가 React 커밋 전이어도 항상 최신값
    const current = localProjectsRef.current;
    const activeProject = current.find((p) => p.id === activeId);
    const overProject = current.find((p) => p.id === overId);
    if (!activeProject || !overProject) return;

    const currentIsFavorite = activeProject.isFavorite;
    const sectionChanged = currentIsFavorite !== originalIsFavorite;

    const section = currentIsFavorite
      ? current.filter((p) => p.isFavorite)
      : current.filter((p) => !p.isFavorite);

    const oldIdx = section.findIndex((p) => p.id === activeId);
    const newIdx = section.findIndex((p) => p.id === overId);

    // over가 같은 섹션에 없는 경우 (예외 처리)
    if (newIdx === -1) {
      if (sectionChanged && !isDummy(activeId)) {
        void setProjectFavoriteAction(activeId, currentIsFavorite).catch(() => refresh());
      }
      return;
    }

    const reordered = oldIdx !== -1 ? arrayMove(section, oldIdx, newIdx) : section;
    const currentFavs = current.filter((p) => p.isFavorite);
    const currentRegs = current.filter((p) => !p.isFavorite);
    const newFavs = currentIsFavorite ? reordered : currentFavs;
    const newRegs = currentIsFavorite ? currentRegs : reordered;
    setLocalProjects([...newFavs, ...newRegs]);

    const realIds = reordered.filter((p) => !isDummy(p.id)).map((p) => p.id);

    if (sectionChanged && !isDummy(activeId)) {
      void setProjectFavoriteAction(activeId, currentIsFavorite)
        .then(() => (realIds.length > 0 ? reorderProjectsAction(realIds) : Promise.resolve()))
        .catch(() => refresh());
    } else if (!sectionChanged && realIds.length > 0) {
      void reorderProjectsAction(realIds).catch(() => refresh());
    }
  }

  function handleDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;
    function onMove(ev: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      const clamped = Math.max(15, Math.min(80, ((ev.clientY - rect.top) / rect.height) * 100));
      setDividerPct(clamped);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // mouseup 시점 dividerPct를 저장 (state는 stale closure → DOM 기준으로 재계산)
      const rect = container!.getBoundingClientRect();
      // 저장 시점 pct는 onMove에서 이미 state에 반영됐으므로 setState 콜백으로 읽음
      setDividerPct((prev) => {
        localStorage.setItem("sidenav-divider-pct", String(prev));
        return prev;
      });
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const sharedListProps: Omit<ProjectListsProps, "onMobileClose"> = {
    favoriteProjects,
    regularProjects,
    hasFavorites,
    selectedId,
    dividerPct,
    onDividerMouseDown: handleDividerMouseDown,
    onEdit: setEditing,
    onDelete: (p) => setDeleting({ id: p.id, name: p.name }),
    onFavoriteToggle: handleFavoriteToggle,
    onLocalFavoriteToggle: handleLocalFavoriteToggle,
    onDragEndSave: handleDragEndSave,
  };

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
      if (e.key === "Escape") { closeMobile(); return; }
      if (e.key !== "Tab") return;
      const elements = getFocusable();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, closeMobile]);

  return (
    <>
      {/* 데스크탑 사이드바 — 접힌 상태 */}
      {!open && (
        <aside className="group hidden sm:flex h-screen w-full flex-col overflow-hidden border-r border-border bg-background">
          <div className="relative flex items-center justify-center px-4 py-4">
            <Image
              src="/assets/images/logo.png"
              alt="Haema logo"
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
            {localProjects.map((project) => (
              <li key={project.id} className="flex justify-center">
                <SideNavMenuItem
                  title={project.name}
                  image={project.image}
                  selected={project.id === selectedId}
                  href={isDummy(project.id) ? undefined : projectHref(project.name)}
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

      {/* 데스크탑 사이드바 — 펼친 상태 */}
      {open && (
        <aside className="hidden sm:flex h-screen w-full shrink-0 flex-col overflow-hidden border-r border-border bg-background">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/images/logo.png"
                alt="Haema logo"
                width={32}
                height={32}
                priority
              />
              <span className="text-xl font-medium leading-none">
                <span className="text-foreground">hae</span>
                <span className="text-primary">ma</span>
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

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="shrink-0 px-2 pt-3 pb-1">
              <AddProjectDialog onAdded={refresh} />
            </div>
            <ProjectLists {...sharedListProps} />
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

      {/* 모바일 오버레이 메뉴 */}
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
                src="/assets/images/logo.png"
                alt="Haema logo"
                width={32}
                height={32}
                priority
              />
              <span className="text-xl font-medium leading-none">
                <span className="text-foreground">hae</span>
                <span className="text-primary">ma</span>
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

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="shrink-0 px-2 pt-3 pb-1">
              <AddProjectDialog onAdded={refresh} />
            </div>
            <ProjectLists {...sharedListProps} onMobileClose={closeMobile} />
          </div>

          <div className="border-t border-border px-4 py-3">
            <UserMenu />
          </div>
        </aside>
      </div>
    </>
  );
}

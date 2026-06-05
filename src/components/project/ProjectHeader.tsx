"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Bot, Brain, CheckSquare, ChevronRight, LayoutGrid, Layers, Plug2, Settings, Sparkles, Trash2, Users } from "lucide-react";

import { useProjects } from "@/components/project/ProjectsContext";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "홈", key: "overview", icon: LayoutGrid },
  { label: "태스크", key: "tasks", icon: CheckSquare },
  { label: "툴", key: "tools", icon: Sparkles },
  { label: "스킬", key: "skills", icon: BookOpen },
  { label: "브레인", key: "brain", icon: Brain },
  { label: "팀작업", key: "team", icon: Users },
] as const;

type Tab = "overview" | "manage" | "tasks" | "tools" | "skills" | "brain" | "team";

const SETTINGS_TABS = [
  { label: "전체", key: "all", icon: Layers },
  { label: "홈", key: "overview", icon: LayoutGrid },
  { label: "통합", key: "integrations", icon: Plug2 },
] as const;

type SettingsTab = "all" | "overview" | "integrations" | "ai-management";

function parseTab(value: string | null): Tab {
  if (value === "manage") return "manage";
  if (value === "tasks") return "tasks";
  if (value === "tools") return "tools";
  if (value === "skills") return "skills";
  if (value === "brain") return "brain";
  if (value === "team") return "team";
  return "overview";
}

function parseSettingsTab(value: string | null): SettingsTab {
  if (value === "overview") return "overview";
  if (value === "integrations") return "integrations";
  if (value === "ai-management") return "ai-management";
  return "all";
}

function formatCliSyncDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const dDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowDay.getTime() - dDay.getTime()) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (diffDays === 0) return `오늘 ${time} 업데이트`;
  if (diffDays === 1) return `어제 ${time} 업데이트`;
  if (diffDays < 7) return `${diffDays}일 전 업데이트`;
  return `${date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 업데이트`;
}

const PALETTE = [
  "#F38B7B",
  "#7BC67E",
  "#7BA6E0",
  "#E0B97B",
  "#B07BE0",
  "#E07BB6",
  "#7BE0D4",
];

function colorFromTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

function tabHref(projectName: string, key: Tab): string {
  if (key === "overview") return `/${projectName}`;
  return `/${projectName}?tab=${key}`;
}


function settingsTabHref(projectName: string, key: SettingsTab): string {
  if (key === "all") return `/${projectName}/settings`;
  return `/${projectName}/settings?tab=${key}`;
}

export function ProjectHeader() {
  const params = useParams<{ projectName: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { projects } = useProjects();

  const slug = useMemo(() => {
    try {
      return decodeURIComponent(params.projectName);
    } catch {
      return params.projectName;
    }
  }, [params.projectName]);

  const project = useMemo(
    () => projects.find((p) => p.name === slug) ?? null,
    [projects, slug],
  );

  const isSettings = pathname.endsWith("/settings");
  const isTrash = pathname.endsWith("/trash");
  const isMemory = pathname.endsWith("/memory");
  const activeKey: Tab | null = isSettings ? null : parseTab(searchParams.get("tab"));
  const settingsActiveKey: SettingsTab = isSettings
    ? parseSettingsTab(searchParams.get("tab"))
    : "all";
  const currentActiveKey = isSettings ? settingsActiveKey : activeKey;

  const title = project?.name ?? slug;
  const avatarColor = colorFromTitle(title);

  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    if (!currentActiveKey) {
      setIndicator((prev) => ({ ...prev, width: 0 }));
      return;
    }
    const el = tabRefs.current.get(currentActiveKey);
    if (el && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      setIndicator({
        left: tabRect.left - navRect.left,
        width: tabRect.width,
        ready: true,
      });
    }
  }, [currentActiveKey]);

  return (
    <header className={cn(
      "sticky top-0 z-10 shrink-0 border-b border-border bg-background px-6 pt-4",
      (isTrash || isMemory) && "pb-4",
    )}>
      {/* 프로젝트 아바타 + 이름 + 설정 */}
      <div className={cn("flex items-center gap-3", !(isTrash || isMemory) && "mb-3")}>
        <Link href={`/${params.projectName}`} className="flex shrink-0">
          {project?.image ? (
            <Image
              src={project.image}
              alt={title}
              width={36}
              height={36}
              className="size-9 rounded-xl object-cover"
            />
          ) : (
            <span
              className="flex size-9 items-center justify-center rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: avatarColor }}
            >
              {title[0]?.toUpperCase()}
            </span>
          )}
        </Link>
        <Link
          href={`/${params.projectName}`}
          className="truncate text-xl font-semibold"
        >
          {title}
        </Link>
        {!isSettings && !isTrash && !isMemory && project?.description && (
          <span className="hidden sm:inline shrink-0 text-xs text-gray-500">
            {project.description}
          </span>
        )}
        {!isSettings && !isTrash && !isMemory && project?.lastCliSyncAt && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatCliSyncDate(project.lastCliSyncAt)}
          </span>
        )}
        {(isSettings || isTrash || isMemory) && (
          <>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-xl font-semibold">
              {isSettings ? "설정" : isTrash ? "휴지통" : "장기 기억"}
            </span>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Link
            href={`/${params.projectName}/settings`}
            className={cn(
              "rounded-md p-1.5 transition-colors text-muted-foreground hover:text-foreground",
              (isSettings || isTrash || isMemory) && "opacity-0 pointer-events-none",
            )}
            aria-label="설정"
          >
            <Settings className="size-4" />
          </Link>
          <Link
            href={`/${params.projectName}/trash`}
            className={cn(
              "rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground",
              (isSettings || isTrash || isMemory) && "opacity-0 pointer-events-none",
            )}
            aria-label="휴지통"
          >
            <Trash2 className="size-4" />
          </Link>
        </div>
      </div>

      {/* 탭 */}
      {!isTrash && !isMemory && <nav ref={navRef} className="relative flex items-end gap-1">
        {isSettings
          ? SETTINGS_TABS.map(({ label, key, icon: TabIcon }) => {
              const active = settingsActiveKey === key;
              return (
                <Link
                  key={key}
                  href={settingsTabHref(params.projectName, key)}
                  ref={(el) => {
                    if (el) tabRefs.current.set(key, el);
                    else tabRefs.current.delete(key);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-2 text-xs sm:px-3 sm:text-sm transition-colors",
                    active
                      ? "font-medium text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <TabIcon className="size-3.5 sm:size-4 shrink-0" />
                  {label}
                </Link>
              );
            })
          : TABS.map(({ label, key, icon: TabIcon }) => {
              const active = activeKey === key;
              return (
                <Link
                  key={key}
                  href={tabHref(params.projectName, key)}
                  ref={(el) => {
                    if (el) tabRefs.current.set(key, el);
                    else tabRefs.current.delete(key);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-2 text-xs sm:px-3 sm:text-sm transition-colors",
                    active
                      ? "font-medium text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <TabIcon className="size-3.5 sm:size-4 shrink-0" />
                  {label}
                </Link>
              );
            })}

        {/* 슬라이딩 인디케이터 */}
        <div
          className="absolute bottom-0 h-0.5 bg-primary transition-all duration-200 ease-out"
          style={{
            left: indicator.left,
            width: indicator.width,
            opacity: indicator.ready ? 1 : 0,
          }}
        />
      </nav>}
    </header>
  );
}

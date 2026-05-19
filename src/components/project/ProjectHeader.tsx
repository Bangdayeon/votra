"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Clock, LayoutGrid, Settings } from "lucide-react";

import { useProjects } from "@/components/project/ProjectsContext";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "메인", key: "main", icon: LayoutGrid },
  { label: "AI 작업 관리", key: "manage", icon: Bot },
  { label: "히스토리", key: "history", icon: Clock },
] as const;

type Tab = "main" | "manage" | "history";

function parseTab(value: string | null): Tab {
  if (value === "manage") return "manage";
  if (value === "history") return "history";
  return "main";
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
  if (key === "main") return `/${projectName}`;
  return `/${projectName}?tab=${key}`;
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
  const activeKey: Tab | null = isSettings ? null : parseTab(searchParams.get("tab"));
  const title = project?.name ?? slug;
  const avatarColor = colorFromTitle(title);

  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useEffect(() => {
    if (!activeKey) {
      setIndicator((prev) => ({ ...prev, width: 0 }));
      return;
    }
    const el = tabRefs.current.get(activeKey);
    if (el && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      setIndicator({
        left: tabRect.left - navRect.left,
        width: tabRect.width,
        ready: true,
      });
    }
  }, [activeKey]);

  return (
    <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-[#F7F6F3] px-6 pt-4">
      {/* 프로젝트 아바타 + 이름 + 설정 */}
      <div className="flex items-center gap-3 mb-3">
        {project?.image ? (
          <Image
            src={project.image}
            alt={title}
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {title[0]?.toUpperCase()}
          </span>
        )}
        <span className="truncate text-xl font-semibold">{title}</span>

        <Link
          href={`/${params.projectName}/settings`}
          className={cn(
            "ml-auto rounded-md p-1.5 transition-colors",
            isSettings
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="설정"
        >
          <Settings className="size-4" />
        </Link>
      </div>

      {/* 탭 */}
      <nav ref={navRef} className="relative flex items-end gap-1">
        {TABS.map(({ label, key, icon: TabIcon }) => {
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
                "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors",
                active
                  ? "font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <TabIcon className="size-4 shrink-0" />
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
      </nav>
    </header>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Icon } from "@/components/common/Icon";
import { useProjects } from "@/components/project/ProjectsContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "메인", key: "main" },
  { label: "관리", key: "manage" },
  { label: "히스토리", key: "history" },
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

export function ProjectHeader() {
  const params = useParams<{ projectName: string }>();
  const pathname = usePathname();
  const router = useRouter();
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
  const activeKey = isSettings ? null : parseTab(searchParams.get("tab"));
  const title = project?.name ?? slug;

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-border bg-white px-6">
      <div className="flex min-w-0 items-center gap-2">
        {project?.image ? (
          <Image
            src={project.image}
            alt={title}
            width={28}
            height={28}
            className="size-7 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            className="size-7 shrink-0 rounded-full"
            style={{ backgroundColor: colorFromTitle(title) }}
          />
        )}
        <span className="truncate text-sm font-medium">{title}</span>
      </div>

      <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
        {TABS.map(({ label, key }) => (
          <Link
            key={key}
            href={key === "main" ? `/${params.projectName}` : `/${params.projectName}?tab=${key}`}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm transition-colors",
              activeKey === key
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${params.projectName}/settings`)}
          aria-label="설정"
        >
          <Icon icon="IC_Settings" size="lg" />
        </Button>
      </div>
    </header>
  );
}

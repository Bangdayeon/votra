"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { BranchTab } from "@/components/branch/BranchTab";
import { OverviewTab } from "@/components/overview/OverviewTab";
import { useProjects } from "@/components/project/ProjectsContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabValue = "overview" | "branch";

const DEFAULT_TAB: TabValue = "overview";

export default function ProjectPage() {
  const params = useParams<{ projectName: string }>();
  const slug = decodeSlug(params.projectName);
  const { projects } = useProjects();
  const project = useMemo(
    () => projects.find((p) => p.name === slug) ?? null,
    [projects, slug],
  );

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const handleTabChange = useCallback(
    (next: string) => {
      const value = parseTab(next);
      const sp = new URLSearchParams(searchParams.toString());
      if (value === DEFAULT_TAB) {
        sp.delete("tab");
      } else {
        sp.set("tab", value);
      }
      const query = sp.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center px-8 py-6 text-sm text-muted-foreground">
        프로젝트를 찾을 수 없어요.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-8 py-6">
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col gap-6"
      >
        <TabsList className="border-b border-[#C5C5C5]">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="branch">브랜치</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="min-h-0 flex-1 pb-10">
          <OverviewTab selected={project} />
        </TabsContent>

        <TabsContent value="branch" className="min-h-0 flex-1">
          <BranchTab selected={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function decodeSlug(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseTab(value: string | null): TabValue {
  return value === "branch" ? "branch" : "overview";
}

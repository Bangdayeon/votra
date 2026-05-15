"use client";

import { BranchTab } from "@/components/branch/BranchTab";
import { OverviewTab } from "@/components/overview/OverviewTab";
import { useProjects } from "@/components/project/ProjectsContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  const { selected } = useProjects();

  if (!selected) {
    return (
      <div className="flex flex-col gap-2 h-full items-center justify-center px-8 py-6 text-sm text-muted-foreground">
        <p>아직 등록된 프로젝트가 없어요.</p>
        <p>프로젝트 추가 버튼을 눌러 프로젝트를 추가해주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-8 py-6">
      <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col gap-6">
        <TabsList className="border-b border-[#C5C5C5]">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="branch">브랜치</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="min-h-0 flex-1 pb-10">
          <OverviewTab selected={selected} />
        </TabsContent>

        <TabsContent value="branch" className="min-h-0 flex-1">
          <BranchTab selected={selected} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

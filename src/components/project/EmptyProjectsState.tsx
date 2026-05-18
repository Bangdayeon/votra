"use client";

import { Plus } from "lucide-react";

import { AddProjectDialog } from "@/components/project/AddProjectDialog";
import { useProjects } from "@/components/project/ProjectsContext";
import { Button } from "@/components/ui/button";

export function EmptyProjectsState() {
  const { refresh } = useProjects();

  return (
    <div className="flex flex-col gap-2 h-full items-center justify-center px-8 py-6 text-sm text-muted-foreground">
      <p>아직 등록된 프로젝트가 없어요.</p>
      <p>프로젝트 추가 버튼을 눌러 프로젝트를 추가해주세요.</p>
      <AddProjectDialog onAdded={refresh}>
        <Button type="button" variant="outline" className="mt-2">
          <Plus className="size-4" />
          프로젝트 추가
        </Button>
      </AddProjectDialog>
    </div>
  );
}

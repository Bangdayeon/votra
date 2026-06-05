"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { getMemoryContextAction, type MemoryContextRecord } from "@/app/actions/getMemoryContextAction";
import { MemoryInsightFeed } from "@/components/memory/MemoryInsightFeed";
import type { Project } from "@/components/project/ProjectsContext";
import { Skeleton } from "@/components/ui/skeleton";

export function BrainTab({ selected }: { selected: Project }) {
  const [context, setContext] = useState<MemoryContextRecord | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getMemoryContextAction(selected.id)
      .then((c) => { if (!cancelled) setContext(c); })
      .catch(() => { if (!cancelled) setContext(null); });
    return () => { cancelled = true; };
  }, [selected.id]);

  return (
    <div className="flex flex-col gap-4">
      <MemoryInsightFeed projectId={selected.id} />

      {context === undefined ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : context ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">축적된 프로젝트 맥락</p>
            <span className="text-[10px] text-muted-foreground">v{context.version}</span>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {context.content}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-sm text-muted-foreground">
          <Sparkles className="size-6 opacity-30" strokeWidth={1.5} />
          <p>아직 축적된 맥락이 없어요.</p>
          <p className="text-xs">태스크를 완료하면 AI가 자동으로 프로젝트 맥락을 학습해요.</p>
        </div>
      )}
    </div>
  );
}

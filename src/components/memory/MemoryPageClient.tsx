"use client";

import {
  BookOpen,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { MemoryInsightFeed } from "@/components/memory/MemoryInsightFeed";
import type { MemoryContextRecord } from "@/application/ports/memoryContextRepository";
import type { MemoryReflectionRecord } from "@/domain/memory/memoryTierTypes";

export function MemoryPageClient({
  projectId,
  projectName,
  initialReflections,
  initialContext,
}: {
  projectId: string;
  projectName: string;
  initialReflections: MemoryReflectionRecord[];
  initialContext: MemoryContextRecord | null;
}) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/${encodeURIComponent(projectName)}?tab=tasks`}
          className="flex items-center gap-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <BookOpen className="size-4 shrink-0 text-muted-foreground" />
        <h2 className="text-base font-semibold">장기 기억</h2>
      </div>

      <div className="flex flex-col gap-4">
        <MemoryInsightFeed projectId={projectId} initialReflections={initialReflections} />

        {initialContext ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">축적된 프로젝트 맥락</p>
              <span className="text-[10px] text-muted-foreground">v{initialContext.version}</span>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {initialContext.content}
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
    </div>
  );
}

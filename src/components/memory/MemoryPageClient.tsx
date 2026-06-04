"use client";

import {
  BookOpen,
  ChevronLeft,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { MemoryInsightFeed } from "@/components/memory/MemoryInsightFeed";
import type { MemoryContextRecord } from "@/application/ports/memoryContextRepository";
import type { MemoryReflectionRecord } from "@/domain/memory/memoryTierTypes";
import type { ProjectCustomSkillRecord } from "@/domain/memory/types";
import { cn } from "@/lib/utils";

type Tab = "context" | "skills";

function SkillCard({ skill }: { skill: ProjectCustomSkillRecord }) {
  const [expanded, setExpanded] = useState(false);
  const isHook = !!skill.hookEvent;
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{skill.name}</p>
          <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isHook && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              훅 {skill.hookEvent}
            </span>
          )}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {skill.folder}
          </span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-2">
          {isHook && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">훅 대상:</span>{" "}
              <code className="rounded bg-muted px-1 py-0.5">{skill.hookMatcher}</code>
              {" "}툴 호출 시 실행
            </p>
          )}
          {skill.patternSummary && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">패턴 근거:</span> {skill.patternSummary}
            </p>
          )}
          {isHook && skill.hookScript ? (
            <pre className="whitespace-pre-wrap text-xs text-foreground/80 font-mono leading-relaxed rounded-lg bg-muted p-3">
              {skill.hookScript}
            </pre>
          ) : (
            <pre className="whitespace-pre-wrap text-xs text-foreground/80 font-mono leading-relaxed">
              {skill.content}
            </pre>
          )}
          {isHook && (
            <p className="text-[10px] text-muted-foreground">
              Claude Code에서 <code className="rounded bg-muted px-1">apply_hooks</code> 툴을 실행하면 로컬에 등록돼요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function MemoryPageClient({
  projectId,
  projectName,
  initialReflections,
  initialContext,
  initialSkills,
}: {
  projectId: string;
  projectName: string;
  initialReflections: MemoryReflectionRecord[];
  initialContext: MemoryContextRecord | null;
  initialSkills: ProjectCustomSkillRecord[];
}) {
  const [tab, setTab] = useState<Tab>("context");

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "context", label: "프로젝트 맥락", icon: <Sparkles className="size-3.5" /> },
    { id: "skills", label: "SOP 스킬", icon: <Wrench className="size-3.5" />, count: initialSkills.length },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* 헤더 */}
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

      {/* 탭 바 */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px]",
                tab === t.id
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                  : "bg-muted-foreground/20 text-muted-foreground",
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 프로젝트 맥락 탭 */}
      {tab === "context" && (
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
      )}

      {/* SOP 스킬 탭 */}
      {tab === "skills" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">자동 추출된 SOP 스킬</p>
          {initialSkills.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-sm text-muted-foreground">
              <Wrench className="size-7 opacity-30" strokeWidth={1.5} />
              <p>아직 추출된 SOP 스킬이 없어요.</p>
              <p className="text-xs">동일한 작업 패턴이 3회 이상 반복되면 자동으로 생성돼요.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {initialSkills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import {
  BookOpen,
  Brain,
  ChevronLeft,
  Loader2,
  Pin,
  PinOff,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { pinTaskAction } from "@/app/actions/pinTaskAction";
import { MemoryInsightFeed } from "@/components/memory/MemoryInsightFeed";
import type { MemoryContextRecord } from "@/application/ports/memoryContextRepository";
import type { MemoryReflectionRecord } from "@/domain/memory/memoryTierTypes";
import type { ProjectCustomSkillRecord, TaskRecord, TaskStatusValue } from "@/domain/memory/types";
import { getTaskPriorityLevel } from "@/domain/memory/getTaskPriorityLevel";
import { cn } from "@/lib/utils";

type Tab = "context" | "skills" | "tasks";

const STATUS_LABEL: Record<TaskStatusValue, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행 중",
  DONE: "완료",
  CANCELLED: "취소",
};

const STATUS_STYLE: Record<TaskStatusValue, string> = {
  PENDING: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DONE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-muted text-muted-foreground line-through",
};

const PRIORITY_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "Low", 2: "Medium", 3: "High", 4: "Critical",
};
const PRIORITY_STYLE: Record<1 | 2 | 3 | 4, string> = {
  1: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  3: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  4: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function LongTermTaskRow({
  task,
  projectId,
  onUpdated,
}: {
  task: TaskRecord;
  projectId: string;
  onUpdated: (t: TaskRecord) => void;
}) {
  const [loading, setLoading] = useState(false);
  const priorityLevel = getTaskPriorityLevel(task.priority);

  async function handleTogglePin(e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(true);
    try {
      await pinTaskAction(projectId, task.id, !task.isPinned);
      onUpdated({ ...task, isPinned: !task.isPinned });
      toast.success(task.isPinned ? "고정을 해제했어요." : "장기 기억으로 고정했어요.");
    } catch {
      toast.error("처리 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {task.isPinned && (
            <Pin className="size-3 shrink-0 text-violet-500" />
          )}
          <span className="text-sm font-medium truncate">{task.title}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", STATUS_STYLE[task.status])}>
            {STATUS_LABEL[task.status]}
          </span>
          {priorityLevel > 0 && (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", PRIORITY_STYLE[priorityLevel as 1 | 2 | 3 | 4])}>
              {PRIORITY_LABEL[priorityLevel as 1 | 2 | 3 | 4]}
            </span>
          )}
          {!task.isPinned && (
            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              자동 승격
            </span>
          )}
        </div>
      </div>
      <button
        onClick={handleTogglePin}
        disabled={loading}
        className="shrink-0 flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {loading
          ? <Loader2 className="size-3.5 animate-spin" />
          : task.isPinned
            ? <><PinOff className="size-3.5" />고정 해제</>
            : <><Pin className="size-3.5" />고정</>
        }
      </button>
    </div>
  );
}

function SkillCard({ skill }: { skill: ProjectCustomSkillRecord }) {
  const [expanded, setExpanded] = useState(false);
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
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {skill.folder}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {skill.patternSummary && (
            <p className="mb-2 text-[11px] text-muted-foreground">
              <span className="font-medium">패턴 근거:</span> {skill.patternSummary}
            </p>
          )}
          <pre className="whitespace-pre-wrap text-xs text-foreground/80 font-mono leading-relaxed">
            {skill.content}
          </pre>
        </div>
      )}
    </div>
  );
}

export function MemoryPageClient({
  projectId,
  projectName,
  initialTasks,
  initialReflections,
  initialContext,
  initialSkills,
}: {
  projectId: string;
  projectName: string;
  initialTasks: TaskRecord[];
  initialReflections: MemoryReflectionRecord[];
  initialContext: MemoryContextRecord | null;
  initialSkills: ProjectCustomSkillRecord[];
}) {
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks);
  const [tab, setTab] = useState<Tab>("context");

  function handleUpdated(updated: TaskRecord) {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  }

  const pinned = tasks.filter((t) => t.isPinned);
  const autoPinned = tasks.filter((t) => !t.isPinned);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "context", label: "프로젝트 맥락", icon: <Sparkles className="size-3.5" /> },
    { id: "skills", label: "SOP 스킬", icon: <Wrench className="size-3.5" />, count: initialSkills.length },
    { id: "tasks", label: "장기 기억 태스크", icon: <Brain className="size-3.5" />, count: tasks.length },
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
          {/* AI 분석 피드 */}
          <MemoryInsightFeed projectId={projectId} initialReflections={initialReflections} />

          {/* 축적된 맥락 */}
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

      {/* 장기 기억 태스크 탭 */}
      {tab === "tasks" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">장기 기억 태스크</p>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-sm text-muted-foreground">
              <Brain className="size-7 opacity-30" strokeWidth={1.5} />
              <p>아직 장기 기억으로 저장된 태스크가 없어요.</p>
              <p className="text-xs">중요한 태스크를 고정하거나, 자주 접근하면 자동으로 승격돼요.</p>
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-muted-foreground pl-1">📌 고정됨</p>
                  {pinned.map((task) => (
                    <LongTermTaskRow key={task.id} task={task} projectId={projectId} onUpdated={handleUpdated} />
                  ))}
                </div>
              )}
              {autoPinned.length > 0 && (
                <div className="flex flex-col gap-2">
                  {pinned.length > 0 && <p className="text-[11px] text-muted-foreground pl-1 mt-1">✦ 자동 승격</p>}
                  {autoPinned.map((task) => (
                    <LongTermTaskRow key={task.id} task={task} projectId={projectId} onUpdated={handleUpdated} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { Brain, Cpu, Loader2, Tag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getProjectSessionLogsAction, type SessionLogRecord } from "@/app/actions/getProjectSessionLogs";
import { getProjectThoughtsAction, type ThoughtRecord } from "@/app/actions/getProjectThoughts";
import type { Project } from "@/components/project/ProjectsContext";
import { useProjectEvents } from "@/hooks/useProjectEvents";
import { cn } from "@/lib/utils";

const AI_TOOL_LABELS: Record<string, string> = {
  claude: "Claude",
  cursor: "Cursor",
  gemini: "Gemini",
  codex: "Codex",
  unknown: "AI",
};

function SessionCard({ log }: { log: SessionLogRecord }) {
  const label = AI_TOOL_LABELS[log.aiTool] ?? log.aiTool;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          <Cpu className="size-3" />
          {label}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(log.createdAt).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{log.summary}</p>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ThoughtCard({ thought }: { thought: ThoughtRecord }) {
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <p className="text-sm leading-relaxed">{thought.content}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{formatDate(thought.createdAt)}</span>
        {thought.tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            <Tag className="size-2.5" />
            {tag}
          </span>
        ))}
      </div>
    </li>
  );
}

export function MemoryTab({ selected }: { selected: Project }) {
  const [thoughts, setThoughts] = useState<ThoughtRecord[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const loadThoughts = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    getProjectThoughtsAction(selected.id, 50)
      .then((t) => { if (!cancelled) setThoughts(t); })
      .catch((e: unknown) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "메모리를 불러오지 못했어요.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    getProjectSessionLogsAction(selected.id, 20)
      .then((s) => { if (!cancelled) setSessionLogs(s); })
      .catch(() => { /* 세션 로그 실패는 무시 */ });
    return () => { cancelled = true; };
  }, [selected.id]);

  useEffect(() => { return loadThoughts(); }, [loadThoughts]);
  useProjectEvents(selected.id, loadThoughts);

  const allTags = Array.from(new Set(thoughts.flatMap((t) => t.tags))).sort();
  const filtered = tagFilter ? thoughts.filter((t) => t.tags.includes(tagFilter)) : thoughts;

  return (
    <div className="flex flex-col gap-4">
      {/* 세션 로그 */}
      {(loading || sessionLogs.length > 0) && (
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="mb-4 border-b border-border pb-4">
            <h2 className="text-base font-semibold">세션 로그</h2>
            {!loading && (
              <p className="text-xs text-muted-foreground">{sessionLogs.length}개의 세션</p>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessionLogs.map((log) => (
                <SessionCard key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 메모리 (thoughts) */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4 flex items-start justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">메모리</h2>
            {!loading && (
              <p className="text-xs text-muted-foreground">{thoughts.length}개의 기억</p>
            )}
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1 max-w-[60%]">
              <button
                onClick={() => setTagFilter(null)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                  tagFilter === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                전체
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                    tagFilter === tag
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
            <Brain className="size-8 opacity-40" strokeWidth={1.5} />
            <p>{tagFilter ? "해당 태그의 메모리가 없어요." : "AI가 저장한 메모리가 없어요."}</p>
            <p className="text-xs">AI 도구에서 <code className="rounded bg-muted px-1 py-0.5">remember</code> 툴로 저장해요.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((thought) => (
              <ThoughtCard key={thought.id} thought={thought} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

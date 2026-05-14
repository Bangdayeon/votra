"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { listClaudeFilesAction } from "@/app/actions/listClaudeFiles";
import { Card } from "@/components/Card";
import { ClaudeFilesTree } from "@/components/ClaudeFilesTree";
import type { Project } from "@/components/ProjectsContext";
import type { ClaudeFileRecord } from "@/domain/claudeFiles/types";

export function ClaudeFilesCard({ selected }: { selected: Project }) {
  const [records, setRecords] = useState<ClaudeFileRecord[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listClaudeFilesAction(selected.cwd)
      .then((r) => {
        if (!cancelled) setRecords(r);
      })
      .catch(() => {
        if (!cancelled) setRecords(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected.id, selected.cwd]);

  return (
    <Card className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">
          AI 동작에 영향을 주는 파일들
        </h3>
        <span className="text-[10px] text-muted-foreground">
          정적 분석 기반 근사 점수
        </span>
      </div>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          파일 스캔 중…
        </div>
      )}

      {!loading && records && records.length > 0 && (
        <div className="mt-3">
          <ClaudeFilesTree records={records} cwd={selected.cwd} />
        </div>
      )}

      {!loading && records && records.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          AI 영향 파일을 찾지 못했어요.
        </p>
      )}

      {!loading && !records && (
        <p className="mt-2 text-sm text-muted-foreground">
          파일을 불러오지 못했어요.
        </p>
      )}
    </Card>
  );
}

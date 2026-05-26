"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getAgentContextFlowDiagnosisAction } from "@/app/actions/getAgentContextFlowDiagnosis";
import { refreshAgentContextFlowDiagnosisAction } from "@/app/actions/refreshAgentContextFlowDiagnosis";
import type { CachedAgentContextFlowDiagnosis } from "@/application/getCachedAgentContextFlowDiagnosis";
import { Card } from "@/components/common/Card";
import { CardRefreshHeader } from "@/components/common/CardRefreshHeader";
import { InlineMarkdown } from "@/components/common/InlineMarkdown";
import type { Project } from "@/components/project/ProjectsContext";
import { useRefreshWithToast } from "@/hooks/useRefreshWithToast";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; data: CachedAgentContextFlowDiagnosis };

export function AgentContextFlowCard({
  selected,
  initialDiagnosis,
}: {
  selected: Project;
  initialDiagnosis?: CachedAgentContextFlowDiagnosis;
}) {
  const [state, setState] = useState<State>(() =>
    initialDiagnosis !== undefined
      ? { kind: "ready", data: initialDiagnosis }
      : { kind: "loading" },
  );
  const { refreshing, run: runRefresh } = useRefreshWithToast();

  const skipFirstFetch = useRef(initialDiagnosis !== undefined);

  useEffect(() => {
    if (skipFirstFetch.current) { skipFirstFetch.current = false; return; }
    let cancelled = false;
    setState({ kind: "loading" });
    getAgentContextFlowDiagnosisAction(selected.id)
      .then((data) => {
        if (!cancelled) setState({ kind: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [selected.id]);

  const onRefresh = useCallback(
    () =>
      runRefresh(() => refreshAgentContextFlowDiagnosisAction(selected.id), {
        onSuccess: (result) => setState({ kind: "ready", data: result }),
        successMessage: "진단이 완료됐어요.",
        defaultErrorMessage: "진단 중 오류가 발생했어요.",
      }),
    [selected.id, runRefresh],
  );

  const refreshedAt =
    state.kind === "ready" && state.data ? state.data.refreshedAt : null;

  return (
    <Card className="flex flex-1 flex-col gap-0">
      <CardRefreshHeader
        title="🩺 AI 지시 문서 흐름 진단"
        refreshedAt={refreshedAt}
        loading={state.kind === "loading"}
        refreshing={refreshing}
        onRefresh={selected.isOwner ? onRefresh : undefined}
      />

      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        팀·프로젝트 정책 기준으로 지시 문서 구조와 정책 준수 여부를 진단해요.
      </p>

      <div className="mt-4">
        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        )}

        {state.kind === "error" && (
          <p className="text-sm text-muted-foreground">
            진단 결과를 불러오지 못했어요.
          </p>
        )}

        {state.kind === "ready" && !state.data && (
          <p className="text-sm text-muted-foreground">
            아직 진단된 내용이 없어요. 새로고침 버튼을 눌러 시작해 주세요.
          </p>
        )}

        {state.kind === "ready" && state.data && (
          <DiagnosisResult text={state.data.result} />
        )}
      </div>
    </Card>
  );
}

function DiagnosisResult({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // 코드 블록 (```context 또는 ```)
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 닫는 ```
      blocks.push(
        <pre
          key={key++}
          className="custom-scrollbar my-1 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words"
        >
          {codeLines.join("\n")}
        </pre>,
      );
      continue;
    }

    // 섹션 헤더 (이모지로 시작하는 줄)
    if (/^[🩺💬]/.test(line.trim())) {
      blocks.push(
        <h4 key={key++} className="mt-4 mb-2 text-sm font-semibold first:mt-0">
          {line.trim()}
        </h4>,
      );
      i++;
      continue;
    }

    // 불릿 항목 (* 로 시작)
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      const content = line.trim().slice(2);
      blocks.push(
        <div key={key++} className="mb-2 flex gap-2 text-sm leading-relaxed">
          <span className="mt-0.5 shrink-0 text-muted-foreground">•</span>
          <span>
            <InlineMarkdown text={content} />
          </span>
        </div>,
      );
      i++;
      continue;
    }

    // 일반 텍스트
    blocks.push(
      <p key={key++} className="mb-1 text-sm leading-relaxed text-foreground">
        <InlineMarkdown text={line.trim()} />
      </p>,
    );
    i++;
  }

  return <div className="flex flex-col">{blocks}</div>;
}

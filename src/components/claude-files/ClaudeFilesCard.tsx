"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { listClaudeFilesAction } from "@/app/actions/listClaudeFiles";
import { listPolicyRulesAction } from "@/app/actions/listPolicyRules";
import { reevaluateErrorClaudeFilesAction } from "@/app/actions/reevaluateErrorClaudeFiles";
import { Card } from "@/components/common/Card";
import { CardRefreshHeader } from "@/components/common/CardRefreshHeader";
import { ClaudeFilesTree } from "@/components/claude-files/ClaudeFilesTree";
import type { Project } from "@/components/project/ProjectsContext";
import type {
  ClaudeFileRecord,
  EvaluationCriteria,
} from "@/domain/claudeFiles/types";
import type { PolicyRule } from "@/domain/policy/types";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | {
      kind: "ready";
      records: ClaudeFileRecord[];
      criteria: EvaluationCriteria;
      rules: PolicyRule[];
    };

export function ClaudeFilesCard({ selected }: { selected: Project }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    Promise.all([listClaudeFilesAction(selected.id), listPolicyRulesAction()])
      .then(([files, rules]) => {
        if (!cancelled)
          setState({
            kind: "ready",
            records: files.records,
            criteria: files.criteria,
            rules,
          });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [selected.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reevaluateErrorClaudeFilesAction(selected.id);
      const [files, rules] = await Promise.all([
        listClaudeFilesAction(selected.id),
        listPolicyRulesAction(),
      ]);
      setState({
        kind: "ready",
        records: files.records,
        criteria: files.criteria,
        rules,
      });
    } catch {
      setState({ kind: "error" });
    } finally {
      setRefreshing(false);
    }
  }, [selected.id]);

  const lastEvaluatedAt =
    state.kind === "ready" ? latestEvaluatedAt(state.records) : null;

  return (
    <Card className="custom-scrollbar flex min-h-120 flex-1 flex-col overflow-y-auto">
      <CardRefreshHeader
        title="AI 지시 문서"
        refreshedAt={lastEvaluatedAt}
        loading={state.kind === "loading"}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        프로젝트 및 전체 정책 기준으로 평가하고 있어요.
      </p>

      {state.kind === "loading" && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          파일 스캔 중…
        </div>
      )}

      {state.kind === "ready" && state.records.length > 0 && (
        <div className="mt-3">
          <ClaudeFilesTree
            records={state.records}
            cwd={selected.cwd}
            rules={state.rules}
          />
        </div>
      )}

      {state.kind === "ready" && state.records.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          AI 영향 파일을 찾지 못했어요.
        </p>
      )}

      {state.kind === "error" && (
        <p className="mt-2 text-sm text-muted-foreground">
          파일을 불러오지 못했어요.
        </p>
      )}
    </Card>
  );
}

function latestEvaluatedAt(records: ClaudeFileRecord[]): number | null {
  let max = 0;
  for (const r of records) {
    const ev = r.evaluation;
    if (ev.status === "DONE" || ev.status === "ERROR") {
      if (ev.evaluatedAt > max) max = ev.evaluatedAt;
    }
  }
  return max > 0 ? max : null;
}


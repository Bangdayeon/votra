"use client";

import {
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AgentCommandBox } from "@/components/common/AgentCommandBox";
import { ClaudeFileSeverityBadge } from "@/components/claude-files/ClaudeFileSeverityBadge";
import type {
  ClaudeFileRecord,
  ClaudeFileScope,
} from "@/domain/claudeFiles/types";
import { sanitizeGeminiErrorMessage } from "@/domain/llm/errorMessages";
import type { PolicyRule } from "@/domain/policy/types";
import { cn } from "@/lib/utils";

const ROW = "flex w-full items-center gap-1 rounded px-1 py-0.5 text-sm hover:bg-accent";
const INDENT_PX = 14;

const SCOPE_LABEL: Record<ClaudeFileScope, string> = {
  global: "전역",
  "project-root": "프로젝트 루트",
  subdir: "서브 디렉토리",
};

type TreeNode = {
  name: string;
  record?: ClaudeFileRecord;
  children: TreeNode[];
};

type ScopeGroup = {
  scope: ClaudeFileScope;
  hint?: string;
  nodes: TreeNode[];
  fileCount: number;
};

export function ClaudeFilesTree({
  records,
  cwd,
  rules,
  onReeval,
}: {
  records: ClaudeFileRecord[];
  cwd?: string;
  rules: PolicyRule[];
  onReeval?: (absPath: string) => Promise<void>;
}) {
  const groups = useMemo(() => buildGroups(records, cwd), [records, cwd]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  return (
    <ul className="select-none">
      {groups.map((g) => (
        <ScopeBlock
          key={g.scope}
          group={g}
          rules={rules}
          selectedPath={selectedPath}
          onSelect={(p) => setSelectedPath((cur) => (cur === p ? null : p))}
          onReeval={onReeval}
        />
      ))}
    </ul>
  );
}

function ScopeBlock({
  group,
  rules,
  selectedPath,
  onSelect,
  onReeval,
}: {
  group: ScopeGroup;
  rules: PolicyRule[];
  selectedPath: string | null;
  onSelect: (p: string) => void;
  onReeval?: (absPath: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(ROW, "font-medium")}
      >
        <Chevron className="size-3 shrink-0 text-muted-foreground" />
        <span className="text-foreground">{SCOPE_LABEL[group.scope]}</span>
        {group.hint && (
          <span className="text-xs text-muted-foreground truncate">
            {group.hint}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {group.fileCount}개
        </span>
      </button>
      {open && (
        <ul>
          {group.nodes.length === 0 ? (
            <li
              className="text-xs text-muted-foreground"
              style={{ paddingLeft: INDENT_PX + 4 }}
            >
              파일 없음
            </li>
          ) : (
            group.nodes.map((node, i) => (
              <TreeItem
                key={`${node.name}-${i}`}
                node={node}
                depth={1}
                rules={rules}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onReeval={onReeval}
              />
            ))
          )}
        </ul>
      )}
    </li>
  );
}

function TreeItem({
  node,
  depth,
  rules,
  selectedPath,
  onSelect,
  onReeval,
}: {
  node: TreeNode;
  depth: number;
  rules: PolicyRule[];
  selectedPath: string | null;
  onSelect: (p: string) => void;
  onReeval?: (absPath: string) => Promise<void>;
}) {
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(true);
  const [reevalLoading, setReevalLoading] = useState(false);
  const isFile = !!node.record;
  const isSelected = isFile && selectedPath === node.record!.absPath;

  const Chevron = open ? ChevronDown : ChevronRight;
  const Icon = isFile ? FileText : open && hasChildren ? FolderOpen : Folder;
  const iconColor = isFile ? "text-muted-foreground" : "text-sky-500";

  const handleReeval = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.record || reevalLoading || !onReeval) return;
    setReevalLoading(true);
    try {
      await onReeval(node.record.absPath);
      toast.success("재평가가 완료됐습니다.");
    } catch {
      toast.error("재평가에 실패했습니다.");
    } finally {
      setReevalLoading(false);
    }
  };

  return (
    <li>
      {isFile ? (
        <div
          className={cn(
            "flex w-full items-center rounded pr-1 text-sm hover:bg-accent",
            isSelected && "bg-accent",
          )}
          style={{ paddingLeft: depth * INDENT_PX + 4 }}
        >
          <button
            type="button"
            onClick={() => onSelect(node.record!.absPath)}
            className="flex min-w-0 flex-1 items-center gap-1 py-0.5"
          >
            <span className="w-3 shrink-0" />
            <Icon className={cn("size-4 shrink-0", iconColor)} />
            <span className="truncate text-foreground">{node.name}</span>
            <ClaudeFileSeverityBadge evaluation={node.record!.evaluation} />
          </button>
          {onReeval && (
            <button
              type="button"
              onClick={handleReeval}
              disabled={reevalLoading}
              title="재평가"
              className="ml-1 shrink-0 cursor-pointer rounded border border-[#E4E2DD] px-1.5 py-1 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
            >
              {reevalLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (hasChildren) setOpen((v) => !v);
          }}
          className={cn(ROW)}
          style={{ paddingLeft: depth * INDENT_PX + 4 }}
        >
          {hasChildren ? (
            <Chevron className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <Icon className={cn("size-4 shrink-0", iconColor)} />
          <span className="truncate text-foreground">{node.name}</span>
        </button>
      )}

      {isFile && isSelected && (
        <ScoreBreakdown
          record={node.record!}
          rules={rules}
          indentPx={depth * INDENT_PX + INDENT_PX + 4}
        />
      )}

      {hasChildren && open && (
        <ul>
          {node.children.map((c, i) => (
            <TreeItem
              key={`${c.name}-${i}`}
              node={c}
              depth={depth + 1}
              rules={rules}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onReeval={onReeval}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

type RuleStatus = "good" | "warning" | "problem";

function getRuleStatus(score: number | undefined, maxPoints: number): RuleStatus {
  if (score === undefined) return "warning";
  if (score >= maxPoints) return "good";
  if (score === 0) return "problem";
  return "warning";
}

function ScoreBreakdown({
  record,
  rules,
  indentPx,
}: {
  record: ClaudeFileRecord;
  rules: PolicyRule[];
  indentPx: number;
}) {
  const ev = record.evaluation;
  const mtimeText = formatMtime(record.mtime);
  const reason = readReason(ev);
  const scoreByKey: Record<string, number> | null =
    ev.status === "DONE" ? ev.scores : null;
  const suggestionsByKey: Record<string, string> =
    ev.status === "DONE" ? (ev.suggestions ?? {}) : {};
  const violation =
    ev.status === "DONE" ? ev.globalPolicyViolation : null;

  const classified = rules.map((r) => ({
    rule: r,
    status: getRuleStatus(scoreByKey?.[r.key], r.maxPoints),
    suggestion: suggestionsByKey[r.key] ?? null,
  }));
  const problems = classified.filter((c) => c.status === "problem");
  const warnings = classified.filter((c) => c.status === "warning");
  const goods = classified.filter((c) => c.status === "good");
  const allGood = problems.length === 0 && warnings.length === 0 && scoreByKey !== null;

  return (
    <div
      className="mt-1 mb-2 rounded border border-border/50 bg-muted/30 p-2 text-xs"
      style={{ marginLeft: indentPx }}
    >
      {violation && <GlobalPolicyViolationCallout violation={violation} />}

      <div className="mb-1 text-[10px] text-muted-foreground truncate">
        {record.absPath}
      </div>

      <p className="mb-2 text-[11px] leading-snug text-foreground">{reason}</p>

      {allGood ? (
        <p className="text-[11px] text-emerald-600">✅ 문서 상태를 확인했습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {problems.map(({ rule, suggestion }) => (
            <li key={rule.key} className="text-[11px] leading-snug">
              <span className="mr-1">❌</span>
              <span className="font-medium text-foreground">{rule.label}</span>
              <span className="text-muted-foreground">: {suggestion ?? rule.description}</span>
            </li>
          ))}
          {warnings.map(({ rule, suggestion }) => (
            <li key={rule.key} className="text-[11px] leading-snug">
              <span className="mr-1">⚠️</span>
              <span className="font-medium text-foreground">{rule.label}</span>
              <span className="text-muted-foreground">: {suggestion ?? rule.description}</span>
            </li>
          ))}
        </ul>
      )}

      {!allGood && goods.length > 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          ✓ {goods.map((c) => c.rule.label).join(" · ")}
        </p>
      )}

      <div className="mt-2 text-[10px] text-muted-foreground">
        수정 시각: {mtimeText}
      </div>
    </div>
  );
}

function GlobalPolicyViolationCallout({
  violation,
}: {
  violation: { problem: string; agentCommand: string };
}) {
  return (
    <div className="mb-2 flex flex-col gap-2 rounded border border-rose-200 bg-rose-50 p-2">
      <div className="flex items-start gap-2 text-rose-700">
        <AlertOctagon className="mt-[1px] size-3.5 shrink-0" />
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wide">
            전체 정책 위반
          </span>
          <p className="text-[12px] leading-snug">{violation.problem}</p>
        </div>
      </div>
      <AgentCommandBox command={violation.agentCommand} />
    </div>
  );
}

function readReason(ev: ClaudeFileRecord["evaluation"]): string {
  switch (ev.status) {
    case "PENDING":
    case "LOADING":
      return "평가가 아직 완료되지 않았습니다.";
    case "ERROR":
      return `평가 중 오류가 발생했습니다. ${sanitizeGeminiErrorMessage(ev.errorMessage)}`;
    case "DONE":
      return ev.reason || "평가 결과 설명이 없습니다.";
  }
}

function formatMtime(mtime: number): string {
  const d = new Date(mtime);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd}, ${hh}:${min}`;
}

function buildGroups(records: ClaudeFileRecord[], cwd?: string): ScopeGroup[] {
  const byScope: Record<ClaudeFileScope, ClaudeFileRecord[]> = {
    global: [],
    "project-root": [],
    subdir: [],
  };
  for (const r of records) byScope[r.scope].push(r);

  return [
    makeGroup("global", byScope.global, "~/.claude"),
    makeGroup("project-root", byScope["project-root"], cwd),
    makeGroup("subdir", byScope.subdir),
  ];
}

function makeGroup(
  scope: ClaudeFileScope,
  list: ClaudeFileRecord[],
  hint?: string,
): ScopeGroup {
  return {
    scope,
    hint,
    nodes: scope === "project-root" ? toFlatNodes(list) : toTreeNodes(list, scope),
    fileCount: list.length,
  };
}

function toFlatNodes(list: ClaudeFileRecord[]): TreeNode[] {
  return list
    .slice()
    .sort((a, b) => a.displayPath.localeCompare(b.displayPath))
    .map((r) => ({ name: r.displayPath, record: r, children: [] }));
}

function toTreeNodes(
  list: ClaudeFileRecord[],
  scope: ClaudeFileScope,
): TreeNode[] {
  const root: TreeNode = { name: "", children: [] };
  for (const r of list) {
    const segments = stripScopePrefix(r.displayPath, scope).split("/").filter(Boolean);
    let cur = root;
    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];
      const isLeaf = i === segments.length - 1;
      let next = cur.children.find((c) => c.name === seg && !c.record);
      if (isLeaf) {
        cur.children.push({ name: seg, record: r, children: [] });
      } else {
        if (!next) {
          next = { name: seg, children: [] };
          cur.children.push(next);
        }
        cur = next;
      }
    }
  }
  sortTree(root);
  return root.children;
}

function stripScopePrefix(displayPath: string, scope: ClaudeFileScope): string {
  if (scope === "global" && displayPath.startsWith("~/.claude/")) {
    return displayPath.slice("~/.claude/".length);
  }
  return displayPath;
}

function sortTree(node: TreeNode): void {
  node.children.sort((a, b) => {
    const aLeaf = !!a.record;
    const bLeaf = !!b.record;
    if (aLeaf !== bLeaf) return aLeaf ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  for (const c of node.children) sortTree(c);
}

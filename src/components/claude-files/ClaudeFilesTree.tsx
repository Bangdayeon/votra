"use client";

import {
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ClaudeFileSeverityBadge } from "@/components/claude-files/ClaudeFileSeverityBadge";
import type {
  ClaudeFileRecord,
  ClaudeFileScope,
} from "@/domain/claudeFiles/types";
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
  /** path segment name 또는 파일명 */
  name: string;
  /** 파일 노드면 record, 폴더면 undefined */
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
}: {
  records: ClaudeFileRecord[];
  cwd?: string;
  rules: PolicyRule[];
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
}: {
  group: ScopeGroup;
  rules: PolicyRule[];
  selectedPath: string | null;
  onSelect: (p: string) => void;
}) {
  const [open, setOpen] = useState(group.scope !== "subdir");
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
}: {
  node: TreeNode;
  depth: number;
  rules: PolicyRule[];
  selectedPath: string | null;
  onSelect: (p: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(true);
  const isFile = !!node.record;
  const isSelected = isFile && selectedPath === node.record!.absPath;

  const Chevron = open ? ChevronDown : ChevronRight;
  const Icon = isFile ? FileText : open && hasChildren ? FolderOpen : Folder;
  const iconColor = isFile ? "text-muted-foreground" : "text-sky-500";

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (isFile) onSelect(node.record!.absPath);
          else if (hasChildren) setOpen((v) => !v);
        }}
        className={cn(ROW, isSelected && "bg-accent")}
        style={{ paddingLeft: depth * INDENT_PX + 4 }}
      >
        {hasChildren && !isFile ? (
          <Chevron className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon className={cn("size-4 shrink-0", iconColor)} />
        <span className="truncate text-foreground">{node.name}</span>
        {isFile && (
          <ClaudeFileSeverityBadge evaluation={node.record!.evaluation} />
        )}
      </button>

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
            />
          ))}
        </ul>
      )}
    </li>
  );
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
  const mtimeText = new Date(record.mtime).toLocaleString();
  const reason = readReason(ev);
  const scoreByKey: Record<string, number> | null =
    ev.status === "DONE" ? ev.scores : null;
  const violation =
    ev.status === "DONE" ? ev.globalPolicyViolation : null;

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

      <ul className="flex flex-col gap-1">
        {rules.map((r) => {
          const value = scoreByKey?.[r.key];
          return (
            <li key={r.key} className="flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{r.label}</span>
                <span className="font-mono tabular-nums">
                  {value ?? "—"}
                  <span className="text-muted-foreground">/{r.maxPoints}</span>
                </span>
              </div>
              <span className="text-[10px] leading-snug text-muted-foreground">
                {r.description}
              </span>
            </li>
          );
        })}
      </ul>
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
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(violation.agentCommand);
      toast.success("명령어를 복사했어요.");
    } catch {
      toast.error("복사하지 못했어요.");
    }
  };

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
      <div className="flex items-start gap-2 rounded border border-rose-200 bg-white p-2 font-mono text-[11px] leading-snug">
        <p className="flex-1 whitespace-pre-wrap break-words text-foreground">
          {violation.agentCommand}
        </p>
        <button
          type="button"
          onClick={onCopy}
          aria-label="명령어 복사"
          title="복사"
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ClipboardCopy className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function readReason(ev: ClaudeFileRecord["evaluation"]): string {
  switch (ev.status) {
    case "PENDING":
    case "LOADING":
      return "평가가 아직 완료되지 않았어요.";
    case "ERROR":
      return `평가 중 오류가 났어요. ${ev.errorMessage}`;
    case "DONE":
      return ev.reason || "평가 결과 설명이 없어요.";
  }
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
    if (aLeaf !== bLeaf) return aLeaf ? 1 : -1; // 폴더 먼저
    return a.name.localeCompare(b.name);
  });
  for (const c of node.children) sortTree(c);
}

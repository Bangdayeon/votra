"use client";

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ClaudeFileGradeBadge } from "@/components/claude-files/ClaudeFileGradeBadge";
import type {
  ClaudeFileRecord,
  ClaudeFileScope,
} from "@/domain/claudeFiles/types";
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
}: {
  records: ClaudeFileRecord[];
  cwd?: string;
}) {
  const groups = useMemo(() => buildGroups(records, cwd), [records, cwd]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  return (
    <ul className="select-none">
      {groups.map((g) => (
        <ScopeBlock
          key={g.scope}
          group={g}
          selectedPath={selectedPath}
          onSelect={(p) => setSelectedPath((cur) => (cur === p ? null : p))}
        />
      ))}
    </ul>
  );
}

function ScopeBlock({
  group,
  selectedPath,
  onSelect,
}: {
  group: ScopeGroup;
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
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
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
          <ClaudeFileGradeBadge
            grade={node.record!.grade}
            total={node.record!.score.total}
          />
        )}
      </button>

      {isFile && isSelected && (
        <ScoreBreakdown
          record={node.record!}
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
  indentPx,
}: {
  record: ClaudeFileRecord;
  indentPx: number;
}) {
  const s = record.score;
  const rows: Array<[string, number, number]> = [
    ["명령어/워크플로", s.commands, 20],
    ["아키텍처 명료성", s.architecture, 20],
    ["숨겨진 패턴", s.patterns, 15],
    ["간결성", s.conciseness, 15],
    ["최신성", s.currency, 15],
    ["실행 가능성", s.actionability, 15],
  ];
  const mtimeText = new Date(record.mtime).toLocaleString();

  return (
    <div
      className="mt-1 mb-2 rounded border border-border/50 bg-muted/30 p-2 text-xs"
      style={{ marginLeft: indentPx }}
    >
      <div className="mb-1 text-[10px] text-muted-foreground truncate">
        {record.absPath}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {rows.map(([label, value, max]) => (
          <li key={label} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground truncate">{label}</span>
            <span className="font-mono tabular-nums">
              {value}
              <span className="text-muted-foreground">/{max}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1 text-[10px] text-muted-foreground">
        수정 시각: {mtimeText}
      </div>
    </div>
  );
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

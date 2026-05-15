"use client";

import {
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  AiActionKind,
  AiActionNode,
  PromptBranch,
} from "@/application/getSessionPromptBranches";
import type { FileEditChange } from "@/domain/session/deriveFileEdits";
import type { SessionStatus } from "@/domain/session/scoreSession";
import { formatUserCommand } from "@/shared/lib/formatUserCommand";

const STATUS_COLOR: Record<SessionStatus, string> = {
  green: "#7AC74F",
  yellow: "#FFD93D",
  red: "#FF5252",
};

const ACTION_COLOR: Record<AiActionKind, string> = {
  TOOL_CALL: "#5B9BD5",
  FILE_EDIT: "#A78BFA",
  ASSISTANT: "#9CA3AF",
  ERROR: "#FF5252",
};

const ACTION_LABEL: Record<AiActionKind, string> = {
  TOOL_CALL: "도구 호출",
  FILE_EDIT: "파일 편집",
  ASSISTANT: "응답",
  ERROR: "에러",
};

const PROMPT_SIZE = 14;
const PROMPT_BORDER = 4;
const STROKE_WIDTH = 4;
const PROMPT_ROW_HEIGHT = 50;
const PROMPT_Y = (PROMPT_ROW_HEIGHT - PROMPT_SIZE) / 2;

const HANDLE_STYLE = {
  opacity: 0,
  width: 1,
  height: 1,
  border: "none",
  background: "transparent",
  pointerEvents: "none" as const,
} as const;

type PromptNodeData = {
  branch: PromptBranch;
  selected: boolean;
};
type PromptNodeType = Node<PromptNodeData, "prompt">;

function PromptNode({ data }: NodeProps<PromptNodeType>) {
  const color = STATUS_COLOR[data.branch.status];
  return (
    <div
      className="rounded-full"
      style={{
        width: PROMPT_SIZE,
        height: PROMPT_SIZE,
        backgroundColor: data.selected ? color : "var(--background)",
        border: `${PROMPT_BORDER}px solid ${color}`,
        boxSizing: "border-box",
        cursor: "pointer",
        boxShadow: data.selected ? `0 0 0 1px ${color}` : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={HANDLE_STYLE}
      />
    </div>
  );
}

type GradientEdgeData = { fromColor: string; toColor: string };
type GradientEdgeType = Edge<GradientEdgeData, "gradient">;

function GradientEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<GradientEdgeType>) {
  const gradId = `prompt-grad-${id}`;
  const fromColor = data?.fromColor ?? "#999";
  const toColor = data?.toColor ?? "#999";
  const half = PROMPT_SIZE / 2;
  const sx = sourceX - half;
  const tx = targetX + half;
  return (
    <>
      <defs>
        <linearGradient
          id={gradId}
          x1={sx}
          y1={sourceY}
          x2={tx}
          y2={targetY}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={fromColor} />
          <stop offset="100%" stopColor={toColor} />
        </linearGradient>
      </defs>
      <path
        d={`M ${sx} ${sourceY} L ${tx} ${targetY}`}
        stroke={`url(#${gradId})`}
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
    </>
  );
}

const nodeTypes: NodeTypes = { prompt: PromptNode };
const edgeTypes: EdgeTypes = { gradient: GradientEdge };

/** AiActionNode tree 를 DFS pre-order 로 평탄화 (children 순서 유지). */
function flattenTree(roots: AiActionNode[]): AiActionNode[] {
  const out: AiActionNode[] = [];
  const visit = (n: AiActionNode) => {
    out.push(n);
    for (const c of n.children) visit(c);
  };
  for (const r of roots) visit(r);
  return out;
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** 연속 TOOL_CALL 을 하나의 토글로 묶는 최소 개수. */
const TOOL_RUN_MIN = 2;

type ChatItem =
  | { kind: "single"; action: AiActionNode }
  | { kind: "tool-run"; id: string; actions: AiActionNode[] };

/** flatActions 에서 연속된 TOOL_CALL (>=TOOL_RUN_MIN) 를 한 묶음으로 그룹. */
function groupActions(flat: AiActionNode[]): ChatItem[] {
  const items: ChatItem[] = [];
  let i = 0;
  while (i < flat.length) {
    if (flat[i].kind === "TOOL_CALL") {
      let j = i + 1;
      while (j < flat.length && flat[j].kind === "TOOL_CALL") j++;
      const run = flat.slice(i, j);
      if (run.length >= TOOL_RUN_MIN) {
        items.push({ kind: "tool-run", id: `run:${run[0].id}`, actions: run });
      } else {
        items.push({ kind: "single", action: run[0] });
      }
      i = j;
    } else {
      items.push({ kind: "single", action: flat[i] });
      i++;
    }
  }
  return items;
}

function readStr(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

const SUMMARY_CAP = 200;

/**
 * toolName + toolInput → "어떤 동작을 했는지" 한 줄 요약.
 * 알 수 있는 의미 있는 값이 없으면 null.
 */
function summarizeToolAction(
  toolName: string,
  input: unknown,
): string | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  let summary: string | null = null;
  switch (toolName) {
    case "Bash":
    case "BashOutput":
      summary = readStr(obj, "command");
      break;
    case "Read":
    case "Write":
    case "Edit":
    case "MultiEdit":
      summary = readStr(obj, "file_path");
      break;
    case "NotebookEdit":
      summary = readStr(obj, "notebook_path") ?? readStr(obj, "file_path");
      break;
    case "Glob":
      summary = readStr(obj, "pattern");
      break;
    case "Grep": {
      const pattern = readStr(obj, "pattern");
      const path = readStr(obj, "path");
      summary = pattern && path ? `${pattern}  @ ${path}` : (pattern ?? path);
      break;
    }
    case "WebFetch":
      summary = readStr(obj, "url");
      break;
    case "WebSearch":
      summary = readStr(obj, "query");
      break;
    case "Task":
    case "Agent":
      summary = readStr(obj, "description") ?? readStr(obj, "prompt");
      break;
    case "Skill":
      summary = readStr(obj, "skill");
      break;
    case "KillShell":
      summary = readStr(obj, "shell_id");
      break;
  }

  if (!summary) {
    // 알려지지 않은 도구는 흔한 키 순서로 fallback.
    for (const k of [
      "command",
      "file_path",
      "path",
      "pattern",
      "query",
      "url",
      "description",
    ]) {
      const v = readStr(obj, k);
      if (v) {
        summary = v;
        break;
      }
    }
  }

  if (!summary) return null;
  // 한 줄로 보기 위해 개행은 공백으로, 너무 길면 잘라냄.
  const oneLine = summary.replace(/\s+/g, " ").trim();
  if (!oneLine) return null;
  return oneLine.length > SUMMARY_CAP
    ? `${oneLine.slice(0, SUMMARY_CAP - 1)}…`
    : oneLine;
}

/** TOOL_CALL toolInput 을 토글에 보여줄 문자열로. 비어있으면 null. */
function formatToolInput(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input === "string") return input.trim() || null;
  try {
    const s = JSON.stringify(input, null, 2);
    return s && s !== "{}" && s !== "[]" ? s : null;
  } catch {
    return null;
  }
}

function CodePane({
  text,
  tint,
}: {
  text: string;
  tint: "before" | "after";
}) {
  const lines = text.length === 0 ? [""] : text.split("\n");
  const bg =
    tint === "before"
      ? "bg-[#FF5252]/8 text-[#7a1a1a] dark:text-[#ffb4b4]"
      : "bg-[#7AC74F]/10 text-[#1f4a13] dark:text-[#b9eaa1]";
  return (
    <div className={`overflow-auto ${bg} font-mono text-[11px] leading-[1.55]`}>
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="w-8 shrink-0 select-none border-r border-border/40 px-1 text-right text-[10px] text-muted-foreground">
            {i + 1}
          </span>
          <span className="whitespace-pre px-2">{line || " "}</span>
        </div>
      ))}
    </div>
  );
}

function FileEditDiff({ edits }: { edits: FileEditChange[] }) {
  return (
    <div className="mt-1.5 flex flex-col gap-2">
      {edits.map((edit, idx) => (
        <div
          key={idx}
          className="overflow-hidden rounded-md border border-border"
        >
          {edits.length > 1 && (
            <div className="border-b border-border bg-muted/50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              edit {idx + 1}
            </div>
          )}
          <div className="grid grid-cols-2 divide-x divide-border">
            <CodePane text={edit.before} tint="before" />
            <CodePane text={edit.after} tint="after" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 단일 action 카드 본문 (라벨 + 시간 + 텍스트 + TOOL_CALL 의 동작 토글).
 * 단독 action 행과 tool-run 내부 child 양쪽에서 동일한 모양으로 사용.
 */
function renderActionCard(
  a: AiActionNode,
  expandedToolIds: Set<string>,
  toggleToolExpanded: (id: string) => void,
) {
  const color = ACTION_COLOR[a.kind];
  const toolInputText =
    a.kind === "TOOL_CALL" ? formatToolInput(a.toolInput) : null;
  const toolSummary =
    a.kind === "TOOL_CALL" ? summarizeToolAction(a.label, a.toolInput) : null;
  const fileEdits =
    a.kind === "FILE_EDIT" && a.fileEdits && a.fileEdits.length > 0
      ? a.fileEdits
      : null;
  const errorDetail =
    a.kind === "ERROR" && a.errorDetail ? a.errorDetail : null;
  const isExpanded = expandedToolIds.has(a.id);
  return (
    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 text-sm">
      <div className="mb-0.5 flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span style={{ color }}>{ACTION_LABEL[a.kind]}</span>
        <span className="normal-case tracking-normal text-muted-foreground">
          {formatTime(a.occurredAt)}
        </span>
      </div>
      {a.kind === "TOOL_CALL" && toolSummary ? (
        <p className="whitespace-pre-wrap break-all leading-relaxed">
          <span
            className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium"
            style={{ color }}
          >
            {a.label}
          </span>
          <span className="font-mono text-[12px] text-foreground">
            {toolSummary}
          </span>
        </p>
      ) : (
        <p
          className={`whitespace-pre-wrap break-all leading-relaxed ${
            a.isError ? "text-[#FF5252]" : ""
          }`}
        >
          {a.label}
        </p>
      )}
      {toolInputText && (
        <>
          <button
            type="button"
            onClick={() => toggleToolExpanded(a.id)}
            aria-expanded={isExpanded}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            <span
              aria-hidden
              className="inline-block transition-transform"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              ▸
            </span>
            {isExpanded ? "동작 접기" : "동작 보기"}
          </button>
          {isExpanded && (
            <pre className="mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/60 px-2.5 py-2 text-[11px] leading-relaxed text-foreground">
              {toolInputText}
            </pre>
          )}
        </>
      )}
      {fileEdits && (
        <>
          <button
            type="button"
            onClick={() => toggleToolExpanded(a.id)}
            aria-expanded={isExpanded}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            <span
              aria-hidden
              className="inline-block transition-transform"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              ▸
            </span>
            {isExpanded ? "변경 접기" : "변경 보기"}
          </button>
          {isExpanded && <FileEditDiff edits={fileEdits} />}
        </>
      )}
      {errorDetail && (
        <>
          <button
            type="button"
            onClick={() => toggleToolExpanded(a.id)}
            aria-expanded={isExpanded}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[#FF5252] transition hover:opacity-80"
          >
            <span
              aria-hidden
              className="inline-block transition-transform"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              ▸
            </span>
            {isExpanded ? "에러 상세 접기" : "에러 상세 보기"}
          </button>
          {isExpanded && (
            <pre className="mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md border border-[#FF5252]/30 bg-[#FF5252]/8 px-2.5 py-2 text-[11px] leading-relaxed text-[#7a1a1a] dark:text-[#ffb4b4]">
              {errorDetail}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

export function SessionDetailGraph({
  branches,
}: {
  branches: PromptBranch[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [width, setWidth] = useState(800);
  const [selectedId, setSelectedId] = useState<string | null>(
    branches[0]?.id ?? null,
  );
  const [topVisibleId, setTopVisibleId] = useState<string | null>(null);
  const [expandedToolIds, setExpandedToolIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedRunIds, setExpandedRunIds] = useState<Set<string>>(
    () => new Set(),
  );
  const pendingScrollIdRef = useRef<string | null>(null);

  useEffect(() => {
    setSelectedId(branches[0]?.id ?? null);
  }, [branches]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const obs = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedId) ?? null,
    [branches, selectedId],
  );

  const flatActions = useMemo(
    () => (selectedBranch ? flattenTree(selectedBranch.actions) : []),
    [selectedBranch],
  );

  const chatItems = useMemo(() => groupActions(flatActions), [flatActions]);

  /** action id → 속한 tool-run group id (없으면 단독). */
  const actionToRunId = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of chatItems) {
      if (item.kind !== "tool-run") continue;
      for (const a of item.actions) map.set(a.id, item.id);
    }
    return map;
  }, [chatItems]);

  // branch 가 바뀌면 채팅 맨 위로 + ref map 초기화
  useEffect(() => {
    messageRefs.current = new Map();
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = 0;
  }, [selectedId]);

  const updateTopVisible = useCallback(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    const cTop = container.getBoundingClientRect().top;
    let topId: string | null = null;
    for (const a of flatActions) {
      const el = messageRefs.current.get(a.id);
      if (!el) continue;
      if (el.getBoundingClientRect().top - cTop <= 1) {
        topId = a.id;
      } else {
        break;
      }
    }
    if (!topId && flatActions.length > 0) topId = flatActions[0].id;
    setTopVisibleId(topId);
  }, [flatActions]);

  // flatActions 가 갈리면 다음 paint 후에 위치 재계산
  useEffect(() => {
    const raf = requestAnimationFrame(updateTopVisible);
    return () => cancelAnimationFrame(raf);
  }, [updateTopVisible]);

  const { nodes, edges } = useMemo(() => {
    const nodes: PromptNodeType[] = [];
    const edges: GradientEdgeType[] = [];
    if (branches.length === 0) return { nodes, edges };

    const usable = Math.max(0, width - PROMPT_SIZE - 8);
    const step = branches.length > 1 ? usable / (branches.length - 1) : 0;
    branches.forEach((b, i) => {
      nodes.push({
        id: b.id,
        type: "prompt",
        position: { x: 4 + i * step, y: PROMPT_Y },
        data: { branch: b, selected: b.id === selectedId },
        draggable: false,
      });
    });
    for (let i = 0; i < branches.length - 1; i++) {
      edges.push({
        id: `pe-${branches[i].id}-${branches[i + 1].id}`,
        source: branches[i].id,
        target: branches[i + 1].id,
        type: "gradient",
        data: {
          fromColor: STATUS_COLOR[branches[i].status],
          toColor: STATUS_COLOR[branches[i + 1].status],
        },
      });
    }
    return { nodes, edges };
  }, [branches, width, selectedId]);

  const handlePromptClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      setSelectedId(node.id);
    },
    [],
  );

  const scrollToActionEl = useCallback((id: string) => {
    const el = messageRefs.current.get(id);
    const container = chatScrollRef.current;
    if (!el || !container) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    container.scrollTop += eRect.top - cRect.top;
  }, []);

  const handleActionClick = useCallback(
    (id: string) => {
      if (messageRefs.current.has(id)) {
        scrollToActionEl(id);
        return;
      }
      // 접힌 run 내부의 action → run 펼친 뒤 다음 paint 에 스크롤.
      const runId = actionToRunId.get(id);
      if (!runId) return;
      pendingScrollIdRef.current = id;
      setExpandedRunIds((prev) => {
        if (prev.has(runId)) return prev;
        const next = new Set(prev);
        next.add(runId);
        return next;
      });
    },
    [actionToRunId, scrollToActionEl],
  );

  const setMessageRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) messageRefs.current.set(id, el);
      else messageRefs.current.delete(id);
    },
    [],
  );

  const toggleToolExpanded = useCallback((id: string) => {
    setExpandedToolIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleRunExpanded = useCallback((id: string) => {
    setExpandedRunIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // 새 branch 로 이동하면 펼쳐둔 토글은 모두 닫음.
  useEffect(() => {
    setExpandedToolIds(new Set());
    setExpandedRunIds(new Set());
  }, [selectedId]);

  // run 을 펼친 뒤 대기 중인 action 으로 스크롤.
  useEffect(() => {
    const id = pendingScrollIdRef.current;
    if (!id) return;
    const raf = requestAnimationFrame(() => {
      scrollToActionEl(id);
      pendingScrollIdRef.current = null;
    });
    return () => cancelAnimationFrame(raf);
  }, [expandedRunIds, scrollToActionEl]);

  if (branches.length === 0) {
    return (
      <p className="py-3 text-sm text-muted-foreground">
        이 세션에는 사용자 명령이 없어요.
      </p>
    );
  }

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      <div
        style={{ height: PROMPT_ROW_HEIGHT }}
        className="w-full shrink-0 [&_.react-flow__node]:cursor-pointer [&_.react-flow__pane]:cursor-default [&_.react-flow__handle]:!cursor-pointer [&_.react-flow__handle]:!pointer-events-none"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={handlePromptClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnDrag={false}
          panOnScroll={false}
          minZoom={1}
          maxZoom={1}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
        />
      </div>

      {selectedBranch && (
        <div className="flex min-h-0 flex-1 gap-4 pt-2">
          {/* 좌측: AI 노드 세로 column */}
          <div className="shrink-0 overflow-y-auto py-2 pl-2 pr-1">
            {flatActions.length === 0 ? (
              <div className="size-3 rounded-full bg-border" />
            ) : (
              <ol className="relative ml-1 space-y-3 border-l-2 border-border pl-4">
                {flatActions.map((a) => (
                  <li key={a.id} className="relative">
                    <button
                      type="button"
                      onClick={() => handleActionClick(a.id)}
                      title={`${ACTION_LABEL[a.kind]} — ${a.label}`}
                      className={`block rounded-full transition hover:scale-125 ${
                        a.id === topVisibleId ? "size-3.5" : "size-3"
                      }`}
                      style={{
                        backgroundColor: ACTION_COLOR[a.kind],
                        position: "absolute",
                        left: a.id === topVisibleId ? -23 : -22,
                        top: a.id === topVisibleId ? -1 : 0,
                        boxShadow:
                          a.id === topVisibleId
                            ? "0 0 0 2px var(--foreground)"
                            : undefined,
                      }}
                      aria-label={`${ACTION_LABEL[a.kind]} ${a.label}`}
                    />
                    <div className="h-3" />
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* 우측: 채팅 */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 pb-3 pt-1">
              <div className="ml-auto w-full max-w-3xl rounded-2xl rounded-tr-sm border border-border bg-muted/60 px-4 py-3 text-sm text-foreground shadow-sm">
                <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>유저 명령</span>
                  <span className="normal-case tracking-normal">
                    {formatDateTime(selectedBranch.occurredAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {formatUserCommand(selectedBranch.title)}
                </p>
              </div>
            </div>

            <div
              ref={chatScrollRef}
              onScroll={updateTopVisible}
              className="min-h-0 flex-1 overflow-y-auto pr-1"
            >
              {chatItems.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  이 명령에 따른 AI 작업이 없어요.
                </p>
              ) : (
                <div className="flex flex-col gap-2 pb-2">
                  {chatItems.map((item) => {
                    if (item.kind === "single") {
                      const a = item.action;
                      return (
                        <div
                          key={a.id}
                          ref={setMessageRef(a.id)}
                          className="flex items-start gap-3"
                        >
                          <div
                            className="mt-2 size-3 shrink-0 rounded-full"
                            style={{ backgroundColor: ACTION_COLOR[a.kind] }}
                          />
                          {renderActionCard(
                            a,
                            expandedToolIds,
                            toggleToolExpanded,
                          )}
                        </div>
                      );
                    }
                    const isRunExpanded = expandedRunIds.has(item.id);
                    const first = item.actions[0];
                    const last = item.actions[item.actions.length - 1];
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3"
                      >
                        <div
                          className="mt-2 size-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor: ACTION_COLOR.TOOL_CALL,
                          }}
                        />
                        <div
                          ref={
                            isRunExpanded ? undefined : setMessageRef(first.id)
                          }
                          className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 text-sm"
                        >
                          <button
                            type="button"
                            onClick={() => toggleRunExpanded(item.id)}
                            aria-expanded={isRunExpanded}
                            className="flex w-full items-center gap-2 text-left"
                          >
                            <span
                              aria-hidden
                              className="inline-block transition-transform"
                              style={{
                                transform: isRunExpanded
                                  ? "rotate(90deg)"
                                  : "rotate(0deg)",
                              }}
                            >
                              ▸
                            </span>
                            <span
                              className="text-[10px] font-medium uppercase tracking-wide"
                              style={{ color: ACTION_COLOR.TOOL_CALL }}
                            >
                              {ACTION_LABEL.TOOL_CALL}
                            </span>
                            <span className="flex-1 text-foreground">
                              도구 사용 {item.actions.length}회
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatTime(first.occurredAt)}
                              {first.occurredAt.getTime() !==
                              last.occurredAt.getTime()
                                ? `–${formatTime(last.occurredAt)}`
                                : ""}
                            </span>
                          </button>
                          {isRunExpanded && (
                            <div className="mt-2 flex flex-col gap-2 border-l-2 border-border/60 pl-3">
                              {item.actions.map((a) => (
                                <div key={a.id} ref={setMessageRef(a.id)}>
                                  {renderActionCard(
                                    a,
                                    expandedToolIds,
                                    toggleToolExpanded,
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

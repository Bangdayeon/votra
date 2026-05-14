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
import type { SessionStatus } from "@/domain/session/scoreSession";

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

const PROMPT_SIZE = 22;
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

  // branch 가 바뀌면 채팅 맨 위로 + ref map 초기화
  useEffect(() => {
    messageRefs.current = new Map();
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = 0;
  }, [selectedId]);

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

  const handleActionClick = useCallback((id: string) => {
    const el = messageRefs.current.get(id);
    const container = chatScrollRef.current;
    if (!el || !container) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    container.scrollTop += eRect.top - cRect.top;
  }, []);

  const setMessageRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) messageRefs.current.set(id, el);
      else messageRefs.current.delete(id);
    },
    [],
  );

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
                      className="block size-3 rounded-full transition hover:scale-125"
                      style={{
                        backgroundColor: ACTION_COLOR[a.kind],
                        position: "absolute",
                        left: -22,
                        top: 0,
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
                  {selectedBranch.title}
                </p>
              </div>
            </div>

            <div
              ref={chatScrollRef}
              className="min-h-0 flex-1 overflow-y-auto pr-1"
            >
              {flatActions.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  이 명령에 따른 AI 작업이 없어요.
                </p>
              ) : (
                <div className="flex flex-col gap-2 pb-2">
                  {flatActions.map((a) => {
                    const color = ACTION_COLOR[a.kind];
                    return (
                      <div
                        key={a.id}
                        ref={setMessageRef(a.id)}
                        className="flex items-start gap-3"
                      >
                        <div
                          className="mt-2 size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 text-sm">
                          <div className="mb-0.5 flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            <span style={{ color }}>
                              {ACTION_LABEL[a.kind]}
                            </span>
                            <span className="normal-case tracking-normal text-muted-foreground">
                              {formatTime(a.occurredAt)}
                            </span>
                          </div>
                          <p
                            className={`whitespace-pre-wrap break-all leading-relaxed ${
                              a.isError ? "text-[#FF5252]" : ""
                            }`}
                          >
                            {a.label}
                          </p>
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

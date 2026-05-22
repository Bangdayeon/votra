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

import type { BranchNode } from "@/application/getProjectBranchNodes";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SessionStatus } from "@/domain/session/scoreSession";

const STATUS_COLOR: Record<SessionStatus, string> = {
  green: "#7AC74F",
  yellow: "#FFD93D",
  red: "#FF5252",
};

const NODE_SIZE = 14;
const NODE_BORDER = 4;
const STROKE_WIDTH = 4;
const GRAPH_HEIGHT = 60;
const NODE_Y = (GRAPH_HEIGHT - NODE_SIZE) / 2;

const HANDLE_STYLE = {
  opacity: 0,
  width: 1,
  height: 1,
  border: "none",
  background: "transparent",
  pointerEvents: "none" as const,
  cursor: "pointer",
} as const;

type CircleNodeData = {
  status: SessionStatus;
  filled: boolean;
  branch: BranchNode;
  cwd: string | undefined;
};
type CircleNodeType = Node<CircleNodeData, "circle">;

function CircleNode({ data }: NodeProps<CircleNodeType>) {
  const color = STATUS_COLOR[data.status];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="rounded-full"
          style={{
            width: NODE_SIZE,
            height: NODE_SIZE,
            backgroundColor: data.filled ? color : "var(--background)",
            border: `${NODE_BORDER}px solid ${color}`,
            boxSizing: "border-box",
            cursor: "pointer",
            boxShadow: data.filled ? `0 0 0 1px ${color}` : undefined,
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
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-xs rounded-xl border border-border bg-card p-4 text-left text-card-foreground shadow-lg"
      >
        <BranchTooltipBody branch={data.branch} cwd={data.cwd} />
      </TooltipContent>
    </Tooltip>
  );
}

const FILE_PREVIEW_LIMIT = 3;

// 절대경로 (`/Users/bibi/votra/src/...`) → 프로젝트 cwd 이하 (`src/...`) 만.
// cwd 가 없거나 path 가 cwd 로 시작하지 않으면 원본 그대로.
function trimToProjectPath(path: string, cwd: string | undefined): string {
  if (!cwd) return path;
  const normalized = cwd.endsWith("/") ? cwd : `${cwd}/`;
  if (path.startsWith(normalized)) return path.slice(normalized.length);
  if (path === cwd) return "";
  return path;
}

function BranchTooltipBody({
  branch,
  cwd,
}: {
  branch: BranchNode;
  cwd: string | undefined;
}) {
  const previewFiles = branch.editedFiles.slice(0, FILE_PREVIEW_LIMIT);
  const moreCount = branch.editedFiles.length - previewFiles.length;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{branch.title}</p>
      <p className="text-xs text-muted-foreground">
        {branch.source === "CLAUDE"
          ? formatModel(branch.model)
          : formatAgent(branch.source)}{" "}
        · {formatDuration(branch.durationSec)} ·{" "}
        {formatTokens(branch.totalTokens)} tokens
      </p>
      {branch.editedFiles.length > 0 && (
        <div className="mt-1 border-t border-border pt-2">
          <p className="text-xs font-medium">수정 파일</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {previewFiles.map((p) => (
              <li key={p} className="break-all">
                · {trimToProjectPath(p, cwd)}
              </li>
            ))}
          </ul>
          {moreCount > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              + {moreCount}개 파일
            </p>
          )}
        </div>
      )}
      {branch.errors.length > 0 && (
        <div className="mt-1 border-t border-border pt-2">
          <p className="text-xs font-medium">에러</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {branch.errors.map((e) => (
              <li key={e.errorType}>
                · {e.errorType} {e.count}건
              </li>
            ))}
          </ul>
        </div>
      )}
      {branch.startedAt && (
        <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
          {formatStartedAt(branch.startedAt)}
        </p>
      )}
    </div>
  );
}

function formatAgent(source: string): string {
  const map: Record<string, string> = {
    ANTIGRAVITY: "Antigravity",
    GEMINI: "Gemini",
    CURSOR: "Cursor",
    CODEX: "Codex",
  };
  return map[source] ?? source;
}

// "claude-opus-4-7" → "Claude Opus 4.7"
function formatModel(raw: string): string {
  if (!raw) return "unknown";
  const parts = raw.split("-");
  return parts
    .map((p) =>
      /^\d/.test(p)
        ? p.replace(/(\d+)$/, "$1")
        : p.charAt(0).toUpperCase() + p.slice(1),
    )
    .join(" ")
    .replace(/(\d+) (\d+)/, "$1.$2");
}

function formatDuration(sec: number): string {
  if (sec <= 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatStartedAt(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${yyyy}.${mm}.${dd}. ${ampm} ${h12}:${min}`;
}

function formatTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000)
    return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
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
  const gradId = `branch-grad-${id}`;
  const fromColor = data?.fromColor ?? "#999";
  const toColor = data?.toColor ?? "#999";

  const half = NODE_SIZE / 2;
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

const nodeTypes: NodeTypes = { circle: CircleNode };
const edgeTypes: EdgeTypes = { gradient: GradientEdge };

export function BranchGraph({
  nodes: branchNodes,
  cwd,
  onSelect,
  selectedSessionId,
}: {
  nodes: BranchNode[];
  cwd?: string;
  onSelect?: (id: string) => void;
  selectedSessionId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [selectedId, setSelectedId] = useState<string | null>(
    branchNodes[branchNodes.length - 1]?.id ?? null,
  );

  // prop 이 갈리면 마지막 노드로 재선택 + 부모에 알림
  useEffect(() => {
    const next = branchNodes[branchNodes.length - 1]?.id ?? null;
    setSelectedId(next);
    if (next) onSelect?.(next);
  }, [branchNodes, onSelect]);

  // 외부에서 세션 ID 를 지정하면 해당 노드를 선택
  useEffect(() => {
    if (!selectedSessionId) return;
    const exists = branchNodes.some((n) => n.id === selectedSessionId);
    if (!exists) return;
    setSelectedId(selectedSessionId);
    onSelect?.(selectedSessionId);
  }, [selectedSessionId, branchNodes, onSelect]);

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

  const { nodes, edges } = useMemo(() => {
    const nodes: CircleNodeType[] = [];
    const edges: GradientEdgeType[] = [];
    if (branchNodes.length === 0) return { nodes, edges };

    const usable = Math.max(0, width - NODE_SIZE - 8);
    const step = branchNodes.length > 1 ? usable / (branchNodes.length - 1) : 0;

    branchNodes.forEach((branch, i) => {
      nodes.push({
        id: branch.id,
        type: "circle",
        position: { x: 4 + i * step, y: NODE_Y },
        data: {
          status: branch.status,
          filled: branch.id === selectedId,
          branch,
          cwd,
        },
        draggable: false,
      });
    });

    for (let i = 0; i < branchNodes.length - 1; i++) {
      edges.push({
        id: `e-${branchNodes[i].id}-${branchNodes[i + 1].id}`,
        source: branchNodes[i].id,
        target: branchNodes[i + 1].id,
        type: "gradient",
        data: {
          fromColor: STATUS_COLOR[branchNodes[i].status],
          toColor: STATUS_COLOR[branchNodes[i + 1].status],
        },
      });
    }
    return { nodes, edges };
  }, [branchNodes, width, selectedId, cwd]);

  const handleNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      setSelectedId(node.id);
      onSelect?.(node.id);
    },
    [onSelect],
  );

  return (
    <div
      ref={containerRef}
      style={{ height: GRAPH_HEIGHT }}
      className="w-full [&_.react-flow__node]:cursor-pointer [&_.react-flow__pane]:cursor-default [&_.react-flow__handle]:!cursor-pointer [&_.react-flow__handle]:!pointer-events-none"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
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
  );
}

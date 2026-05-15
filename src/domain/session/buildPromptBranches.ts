import type { SessionEventRow } from "@/application/ports/sessionRepository";
import {
  deriveFileEdits,
  type FileEditChange,
} from "@/domain/session/deriveFileEdits";
import type { SessionStatus } from "@/domain/session/scoreSession";

export type AiActionKind = "TOOL_CALL" | "FILE_EDIT" | "ASSISTANT" | "ERROR";

/** PROMPT 다음에 따라온 AI 작업 한 줄 — tree 형태. */
export type AiActionNode = {
  id: string;
  kind: AiActionKind;
  label: string;
  isError: boolean;
  occurredAt: Date;
  /** TOOL_CALL 일 때 raw tool input (없을 수 있음 — 구버전 row). */
  toolInput?: unknown;
  /** FILE_EDIT 일 때, parent TOOL_CALL 의 toolInput 에서 파생한 원본/편집본 페어. */
  fileEdits?: FileEditChange[];
  /** ERROR 일 때 tool_result 본문 (capped). 토글로 노출. */
  errorDetail?: string;
  children: AiActionNode[];
};

export type PromptBranch = {
  id: string;
  /** PROMPT 본문 일부 (최대 ~80자). 없으면 "(빈 메시지)". */
  title: string;
  status: SessionStatus;
  occurredAt: Date;
  errorCount: number;
  toolCallCount: number;
  fileEditCount: number;
  /** 클릭 시 아래로 펼쳐질 AI 작업 tree (parent_id 기반 분기). */
  actions: AiActionNode[];
};

const HEAVY_ACTIONS = 12;

/**
 * Session 이벤트 시간순 → PROMPT 단위로 묶어 PromptBranch[] 반환.
 * actions 는 metadata.uuid + parentUuid 로 tree 구성.
 * uuid 가 없는 (구버전) row 는 linear chain 으로 fallback.
 */
export function buildPromptBranches(
  events: SessionEventRow[],
): PromptBranch[] {
  const branches: PromptBranch[] = [];
  let currentEvents: SessionEventRow[] = [];
  let currentPrompt: SessionEventRow | null = null;

  const flush = () => {
    if (!currentPrompt) return;
    branches.push(buildBranch(currentPrompt, currentEvents));
    currentEvents = [];
  };

  for (const e of events) {
    if (e.type === "PROMPT") {
      flush();
      currentPrompt = e;
      continue;
    }
    if (!currentPrompt) continue;
    currentEvents.push(e);
  }
  flush();
  return branches;
}

function buildBranch(
  prompt: SessionEventRow,
  followers: SessionEventRow[],
): PromptBranch {
  let errorCount = 0;
  let toolCallCount = 0;
  let fileEditCount = 0;
  for (const e of followers) {
    if (e.type === "ERROR") errorCount++;
    else if (e.type === "TOOL_CALL") toolCallCount++;
    else if (e.type === "FILE_EDIT") fileEditCount++;
  }
  const actions = buildActionTree(prompt, followers);
  return {
    id: prompt.id,
    title: prompt.content?.trim() || "(빈 메시지)",
    status: computeStatus(errorCount, toolCallCount + fileEditCount),
    occurredAt: prompt.timestamp,
    errorCount,
    toolCallCount,
    fileEditCount,
    actions,
  };
}

/**
 * followers 를 parent_id 기반 tree 로 변환.
 * - prompt 의 uuid 를 root parent 로 잡고, 그 child 들을 prompt.actions 로 반환
 * - uuid 없는 row 가 섞여있으면 linear chain (직전 노드의 child) 로 처리
 */
function buildActionTree(
  prompt: SessionEventRow,
  followers: SessionEventRow[],
): AiActionNode[] {
  const promptUuid = readUuid(prompt.metadata);
  const nodesByUuid = new Map<string, AiActionNode>();
  const childrenByParent = new Map<string | null, AiActionNode[]>();
  const allNodes: AiActionNode[] = [];

  // FILE_EDIT 노드에 붙일 toolInput 을 미리 모은다 (FILE_EDIT.parentUuid === TOOL_CALL.uuid).
  const toolCallByUuid = new Map<string, SessionEventRow>();
  for (const e of followers) {
    if (e.type !== "TOOL_CALL") continue;
    const uuid = readUuid(e.metadata);
    if (uuid) toolCallByUuid.set(uuid, e);
  }

  let lastUuid: string | null = promptUuid ?? null;

  for (const e of followers) {
    const node = makeActionNode(e, toolCallByUuid);
    allNodes.push(node);
    const uuid = readUuid(e.metadata);
    const parentUuid = readParentUuid(e.metadata);

    let effectiveParent: string | null;
    if (parentUuid) {
      effectiveParent = parentUuid;
    } else if (uuid) {
      // parent 정보 없지만 uuid 있으면 직전 노드 child (chain)
      effectiveParent = lastUuid;
    } else {
      // uuid 자체가 없으면 chain
      effectiveParent = lastUuid;
    }

    if (uuid) nodesByUuid.set(uuid, node);
    const list = childrenByParent.get(effectiveParent) ?? [];
    list.push(node);
    childrenByParent.set(effectiveParent, list);

    lastUuid = uuid ?? lastUuid;
  }

  // child 연결
  for (const [parentUuid, children] of childrenByParent) {
    if (parentUuid && nodesByUuid.has(parentUuid)) {
      nodesByUuid.get(parentUuid)!.children.push(...children);
    }
  }

  // root: prompt uuid 의 child + uuid 없는 root
  const rootChildren: AiActionNode[] = [];
  if (promptUuid && childrenByParent.has(promptUuid)) {
    rootChildren.push(...childrenByParent.get(promptUuid)!);
  }
  if (childrenByParent.has(null)) {
    rootChildren.push(...childrenByParent.get(null)!);
  }
  // 알려지지 않은 parent (followers 사이에 없는 uuid 가 parent) 도 root 에 매달기
  for (const [parentUuid, children] of childrenByParent) {
    if (parentUuid === null) continue;
    if (parentUuid === promptUuid) continue;
    if (nodesByUuid.has(parentUuid)) continue;
    rootChildren.push(...children);
  }

  // fallback: 어떤 이유로든 root 가 비고 followers 가 있으면 linear chain 으로 재구성
  if (rootChildren.length === 0 && allNodes.length > 0) {
    return linearChain(allNodes);
  }
  return rootChildren;
}

function linearChain(nodes: AiActionNode[]): AiActionNode[] {
  for (const n of nodes) n.children = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].children.push(nodes[i + 1]);
  }
  return nodes.length > 0 ? [nodes[0]] : [];
}

function makeActionNode(
  e: SessionEventRow,
  toolCallByUuid: Map<string, SessionEventRow>,
): AiActionNode {
  if (e.type === "ERROR") {
    const detail = e.content?.trim() ?? "";
    return {
      id: e.id,
      kind: "ERROR",
      label: readErrorType(e.metadata) ?? "Error",
      isError: true,
      occurredAt: e.timestamp,
      errorDetail: detail.length > 0 ? detail : undefined,
      children: [],
    };
  }
  if (e.type === "TOOL_CALL") {
    return {
      id: e.id,
      kind: "TOOL_CALL",
      label: readToolName(e.metadata) ?? "tool",
      isError: false,
      occurredAt: e.timestamp,
      toolInput: readToolInput(e.metadata),
      children: [],
    };
  }
  if (e.type === "FILE_EDIT") {
    const parentUuid = readParentUuid(e.metadata);
    const parent = parentUuid ? toolCallByUuid.get(parentUuid) : undefined;
    const parentToolName = parent ? readToolName(parent.metadata) : null;
    const parentToolInput = parent ? readToolInput(parent.metadata) : undefined;
    const fileEdits =
      parentToolName && parentToolInput !== undefined
        ? deriveFileEdits(parentToolName, parentToolInput)
        : undefined;
    return {
      id: e.id,
      kind: "FILE_EDIT",
      label: shortPath(readPath(e.metadata)) ?? "file",
      isError: false,
      occurredAt: e.timestamp,
      fileEdits,
      children: [],
    };
  }
  return {
    id: e.id,
    kind: "ASSISTANT",
    label: e.content?.trim() || "응답",
    isError: false,
    occurredAt: e.timestamp,
    children: [],
  };
}

function computeStatus(errors: number, busyActions: number): SessionStatus {
  if (errors > 0) return "red";
  if (busyActions >= HEAVY_ACTIONS) return "yellow";
  return "green";
}

function readUuid(meta: Record<string, unknown> | null): string | undefined {
  if (!meta) return undefined;
  const v = meta.uuid;
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function readParentUuid(
  meta: Record<string, unknown> | null,
): string | undefined {
  if (!meta) return undefined;
  const v = meta.parentUuid;
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function readToolName(meta: Record<string, unknown> | null): string | null {
  if (!meta) return null;
  const v = meta.toolName;
  return typeof v === "string" && v.length > 0 ? v : null;
}

function readToolInput(meta: Record<string, unknown> | null): unknown {
  if (!meta) return undefined;
  return meta.toolInput;
}

function readErrorType(meta: Record<string, unknown> | null): string | null {
  if (!meta) return null;
  const v = meta.errorType;
  return typeof v === "string" && v.length > 0 ? v : null;
}

function readPath(meta: Record<string, unknown> | null): string | null {
  if (!meta) return null;
  const v = meta.path;
  return typeof v === "string" && v.length > 0 ? v : null;
}

function shortPath(path: string | null): string | null {
  if (!path) return null;
  const segs = path.split("/").filter(Boolean);
  return segs[segs.length - 1] ?? path;
}


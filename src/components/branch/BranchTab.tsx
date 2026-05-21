"use client";

import { Info, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { getProjectBranchNodesAction } from "@/app/actions/getProjectBranchNodes";
import { getSessionPromptBranchesAction } from "@/app/actions/getSessionPromptBranches";
import type { BranchNode } from "@/application/getProjectBranchNodes";
import type { PromptBranch } from "@/application/getSessionPromptBranches";
import { BranchGraph } from "@/components/branch/BranchGraph";
import type { Project } from "@/components/project/ProjectsContext";
import { SessionDetailGraph } from "@/components/branch/SessionDetailGraph";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function BranchTab({
  selected,
  selectedSessionId: externalSelectedId,
}: {
  selected: Project;
  selectedSessionId?: string | null;
}) {
  const [nodes, setNodes] = useState<BranchNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [branches, setBranches] = useState<PromptBranch[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const activeNode = nodes?.find((n) => n.id === activeSessionId) ?? null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActiveSessionId(null);
    setBranches(null);
    getProjectBranchNodesAction(selected.id)
      .then((n) => {
        if (!cancelled) setNodes(n);
      })
      .catch(() => {
        if (!cancelled) setNodes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected.id]);

  // 외부에서 세션 ID가 지정되면 활성 세션 업데이트
  useEffect(() => {
    if (!externalSelectedId) return;
    setActiveSessionId(externalSelectedId);
  }, [externalSelectedId]);

  useEffect(() => {
    if (!activeSessionId) return;
    let cancelled = false;
    setDetailLoading(true);
    getSessionPromptBranchesAction(activeSessionId)
      .then((b) => {
        if (!cancelled) setBranches(b);
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSessionId]);

  const handleSelect = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  return (
    <div
      className={`flex flex-col ${
        activeSessionId
          ? "h-[calc(100vh-100px)] overflow-hidden"
          : "max-h-[calc(100vh-100px)]"
      }`}
    >
      <SectionTitle
        text="세션 흐름"
        info={{
          title: "세션 흐름이란?",
          body: (
            <div>
              <p>프로젝트의 각 세션을 <b>시작 시각 (startedAt) 오름차순</b>
              으로 나열해요.</p>
              <p>각 노드의 색은 세션 품질
                  <span className="text-gray-500">(에러·재시도·토큰 사용 등을 종합한 score)</span>을 의미해요.
              </p>
              <p>각 세션을 클릭하면 상세 내역을 확인할 수 있어요.</p>
              <ul className="py-1">
                <li>🟢 초록: 정상</li>
                <li>🟡 노랑: 약간 복잡</li>
                <li>🔴 빨강: 비정상</li>
              </ul>
            </div>
          ),
        }}
      />
      <div className="shrink-0 py-1">
        {loading ? (
          <div className="flex h-16 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : nodes && nodes.length > 0 ? (
          <BranchGraph
            nodes={nodes}
            cwd={selected.cwd}
            onSelect={handleSelect}
            selectedSessionId={externalSelectedId}
          />
        ) : (
          <p className="text-sm text-muted-foreground">아직 세션이 없어요.</p>
        )}
      </div>
      {activeSessionId && (
        <div className="flex min-h-0 flex-1 flex-col pt-3">
          <SectionTitle
            text="상세 작업 내역"
            info={{
              title: "상세 작업 내역이란?",
              body: (
                <div>
                  <p>한 세션 안의 <b>사용자 명령 1개 = 노드 1개</b>로 가로 타임라인을 그려요.</p>
                  <p>각 노드 색은 AI 작업 품질
                    <span className="text-gray-500">(에러 발생 / 작업량)</span>을 반영해요.
                  </p>
                  <p>명령 노드 클릭 → 좌측 AI 작업 노드 + 우측 채팅 내역.</p>
                  <p>좌측 노드 클릭 → 우측 채팅 해당 메시지로 즉시 이동해요.</p>
                </div>
              ),
            }}
          />
          {activeNode?.model && <ModelTag model={activeNode.model} />}
          <div className="flex min-h-0 flex-1 flex-col pt-2">
            {detailLoading ? (
              <div className="flex h-full min-h-[200px] items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : branches && branches.length > 0 ? (
              <SessionDetailGraph branches={branches} />
            ) : (
              <p className="text-sm text-muted-foreground">
                이 세션엔 사용자 명령이 없어요.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type ModelInfo = { color: string; textColor: string };

function getModelInfo(model: string): ModelInfo | null {
  const m = model.toLowerCase();
  if (m.includes("claude")) return { color: "#E8704E", textColor: "#fff" };
  if (m.includes("gpt") || m.includes("chatgpt") || /^o[1-9]-/.test(m))
    return { color: "#0D0D0D", textColor: "#fff" };
  if (m.includes("gemini")) return { color: "#0091FF", textColor: "#fff" };
  if (m.includes("antigravity")) return { color: "#1685EA", textColor: "#fff" };
  if (m.includes("cursor")) return { color: "#D7D1CC", textColor: "#1a1a1a" };
  return null;
}

function ModelTag({ model }: { model: string }) {
  const info = getModelInfo(model);
  if (!info) return null;
  return (
    <span
      className="mt-1 self-start rounded px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: info.color, color: info.textColor }}
    >
      {model}
    </span>
  );
}

function SectionTitle({
  text,
  info,
}: {
  text: string;
  info: { title: string; body: React.ReactNode };
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <h2 className="text-base font-semibold text-foreground">{text}</h2>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={`${text} 설명 보기`}
            className="cursor-pointer rounded-full p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Info className="size-4" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{info.title}</DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-relaxed text-foreground">
              {info.body}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

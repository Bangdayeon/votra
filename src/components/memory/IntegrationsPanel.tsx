"use client";

import { Check, Copy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getIntegrationSourcesAction } from "@/app/actions/getIntegrationSourcesAction";
import { updateIntegrationSourcesAction } from "@/app/actions/updateIntegrationSourcesAction";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const INTEGRATION_SERVICES = [
  {
    id: "notion",
    label: "Notion",
    description: "페이지, 데이터베이스, 회의록을 핵심 결정으로 변환해요.",
    mcpGuide: "https://github.com/makenotion/notion-mcp-server",
  },
  {
    id: "slack",
    label: "Slack",
    description: "채널 스레드와 중요 결정사항을 기억해요.",
    mcpGuide: "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
  },
  {
    id: "github",
    label: "GitHub",
    description: "이슈, PR 토론, 코드 리뷰 맥락을 저장해요.",
    mcpGuide: "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
  },
  {
    id: "linear",
    label: "Linear",
    description: "티켓 결정사항과 프로젝트 맥락을 가져와요.",
    mcpGuide: "https://github.com/modelcontextprotocol/servers/tree/main/src/linear",
  },
] as const;

type ServiceId = (typeof INTEGRATION_SERVICES)[number]["id"];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

function ConnectModal({
  service,
  onConfirm,
  onClose,
}: {
  service: { id: ServiceId; label: string };
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cliCmd = `haema connect ${service.id}`;
  const agentPrompt = `${service.label} MCP 자동 설치해줘`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">{service.label} 연결 안내</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            haema에 연결하면 AI 에이전트가 세션 시작 시 {service.label}에서 최신 맥락을 가져와요.
            MCP 서버도 함께 등록해야 실제로 동작해요.
          </p>

          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
              <p className="mb-2 text-xs font-medium">방법 1 — AI 에이전트에게 요청</p>
              <p className="mb-1.5 text-xs text-muted-foreground">
                Claude Code 등 에이전트 대화창에서 아래 말을 하면 자동 설치해드려요.
              </p>
              <div className="flex items-center justify-between rounded-md bg-background border border-border px-3 py-2">
                <code className="text-xs text-foreground">{agentPrompt}</code>
                <CopyButton text={agentPrompt} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
              <p className="mb-2 text-xs font-medium">방법 2 — CLI 직접 실행</p>
              <p className="mb-1.5 text-xs text-muted-foreground">
                터미널에서 아래 명령어를 실행하면 바로 등록돼요.
              </p>
              <div className="flex items-center justify-between rounded-md bg-background border border-border px-3 py-2">
                <code className="text-xs text-foreground">{cliCmd}</code>
                <CopyButton text={cliCmd} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            haema에 연결하기
          </button>
        </div>
      </div>
    </div>
  );
}

export function IntegrationsPanel({
  projectId,
  isOwner,
}: {
  projectId: string;
  isOwner: boolean;
}) {
  const [sources, setSources] = useState<string[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [pendingConnect, setPendingConnect] = useState<(typeof INTEGRATION_SERVICES)[number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getIntegrationSourcesAction(projectId)
      .then((r) => {
        if (!cancelled) setSources(r.ok ? r.sources : []);
      })
      .catch(() => {
        if (!cancelled) setSources([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const toggle = async (id: ServiceId, skipModal = false) => {
    if (!sources || saving) return;
    const enabled = sources.includes(id);

    if (!enabled && !skipModal) {
      const service = INTEGRATION_SERVICES.find((s) => s.id === id);
      if (service) {
        setPendingConnect(service);
        return;
      }
    }

    const next = enabled ? sources.filter((s) => s !== id) : [...sources, id];
    setSources(next);
    setSaving(true);
    const result = await updateIntegrationSourcesAction({ projectId, sources: next });
    setSaving(false);
    if (!result.ok) {
      setSources(sources);
      toast.error(result.error);
    }
  };

  const confirmConnect = async () => {
    if (!pendingConnect) return;
    const id = pendingConnect.id;
    setPendingConnect(null);
    await toggle(id, true);
  };

  return (
    <>
      {pendingConnect && (
        <ConnectModal
          service={pendingConnect}
          onConfirm={confirmConnect}
          onClose={() => setPendingConnect(null)}
        />
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-semibold text-foreground">외부 서비스 연결</p>
          <p className="text-sm text-muted-foreground">
            연결된 서비스 맥락을 AI 에이전트가 자동으로 핵심 결정으로 저장해요.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card">
          {sources === undefined ? (
            <div className="flex flex-col gap-2 p-4">
              {["w-4/5", "w-3/5", "w-11/12"].map((w, i) => (
                <Skeleton key={i} className={`h-4 rounded ${w}`} />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {INTEGRATION_SERVICES.map((service) => {
                const enabled = sources.includes(service.id);
                return (
                  <div key={service.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{service.label}</span>
                        {enabled && (
                          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                            연결됨
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{service.description}</p>
                      {enabled && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          MCP 설치 가이드:{" "}
                          <a
                            href={service.mcpGuide}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-foreground"
                          >
                            {service.mcpGuide.replace("https://", "")}
                          </a>
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!isOwner || saving}
                      onClick={() => toggle(service.id)}
                      className={cn(
                        "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        enabled
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "border border-border text-muted-foreground hover:bg-muted-foreground/10",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                      )}
                    >
                      {enabled ? "연결 해제" : "연결하기"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {sources !== undefined && sources.length === 0 && (
            <p className="px-4 pb-3 text-xs text-muted-foreground">
              Notion, Slack, GitHub, Linear 중 연결할 서비스가 있으신가요?
            </p>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getIntegrationSourcesAction } from "@/app/actions/getIntegrationSourcesAction";
import { updateIntegrationSourcesAction } from "@/app/actions/updateIntegrationSourcesAction";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const INTEGRATION_SERVICES = [
  {
    id: "notion",
    label: "Notion",
    description: "페이지, 데이터베이스, 회의록을 핵심 결정으로 변환해요.",
  },
  {
    id: "slack",
    label: "Slack",
    description: "채널 스레드와 중요 결정사항을 기억해요.",
  },
  {
    id: "github",
    label: "GitHub",
    description: "이슈, PR 토론, 코드 리뷰 맥락을 저장해요.",
  },
  {
    id: "linear",
    label: "Linear",
    description: "티켓 결정사항과 프로젝트 맥락을 가져와요.",
  },
] as const;

type ServiceId = (typeof INTEGRATION_SERVICES)[number]["id"];
type Service = (typeof INTEGRATION_SERVICES)[number];

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
  saving,
  onConnect,
  onClose,
}: {
  service: Service;
  saving: boolean;
  onConnect: () => void;
  onClose: () => void;
}) {
  const cliCmd = `haema connect ${service.id}`;
  const agentPrompt = `${service.label} MCP 자동 설치해줘`;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{service.label} 연결하기</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            MCP 서버를 먼저 설치해야 실제로 연결돼요. 아래 방법 중 하나로 설치를 완료한 뒤 연결 버튼을 눌러 주세요.
          </p>
          <div className="flex flex-col gap-2">
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5">
              <p className="mb-1.5 text-xs font-medium">방법 1 — CLI 직접 실행</p>
              <p className="mb-1.5 text-xs text-muted-foreground">
                API 키 입력부터 haema 등록까지 자동으로 처리해요.
              </p>
              <div className="flex items-center justify-between rounded-md bg-background border border-border px-3 py-1.5">
                <code className="text-xs text-foreground">{cliCmd}</code>
                <CopyButton text={cliCmd} />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5">
              <p className="mb-1.5 text-xs font-medium">방법 2 — AI 에이전트에게 요청</p>
              <div className="flex items-center justify-between rounded-md bg-background border border-border px-3 py-1.5">
                <code className="text-xs text-foreground">{agentPrompt}</code>
                <CopyButton text={agentPrompt} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onConnect}
              className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity disabled:opacity-40"
            >
              연결하기
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const [modalService, setModalService] = useState<Service | null>(null);

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

  const toggle = async (id: ServiceId) => {
    if (!sources || saving) return;
    const enabled = sources.includes(id);
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

  const handleConnect = async () => {
    if (!modalService) return;
    await toggle(modalService.id);
    setModalService(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <p className="text-base font-semibold text-foreground">외부 서비스 연결</p>
        <p className="text-sm text-muted-foreground">
          MCP 서버를 설치한 뒤 연결하면 AI 에이전트가 세션 시작 시 해당 서비스 맥락을 자동으로 가져와요.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {sources === undefined ? (
          <div className="rounded-xl border border-border bg-card flex flex-col gap-2 p-4">
            {["w-4/5", "w-3/5", "w-11/12"].map((w, i) => (
              <Skeleton key={i} className={`h-4 rounded ${w}`} />
            ))}
          </div>
        ) : (
          INTEGRATION_SERVICES.map((service) => {
            const enabled = sources.includes(service.id);
            return (
              <div key={service.id} className="rounded-xl border border-border bg-card px-4 py-4">
                <div className="flex items-start justify-between gap-3">
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
                  </div>
                  <button
                    type="button"
                    disabled={!isOwner || saving}
                    onClick={() => enabled ? toggle(service.id) : setModalService(service)}
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
              </div>
            );
          })
        )}
      </div>

      {modalService && (
        <ConnectModal
          service={modalService}
          saving={saving}
          onConnect={handleConnect}
          onClose={() => setModalService(null)}
        />
      )}
    </div>
  );
}

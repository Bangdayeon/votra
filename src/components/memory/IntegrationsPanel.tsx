"use client";

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

export function IntegrationsPanel({
  projectId,
  isOwner,
}: {
  projectId: string;
  isOwner: boolean;
}) {
  const [sources, setSources] = useState<string[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

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

  const toggle = async (id: string) => {
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

  return (
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
  );
}

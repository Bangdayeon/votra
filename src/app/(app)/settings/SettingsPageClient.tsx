"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AiSpecPolicyFields } from "@/components/aiSpec/AiSpecPolicyFields";
import { useProjects } from "@/components/project/ProjectsContext";
import { Button } from "@/components/ui/button";
import {
  buildAiSpecPolicyPatch,
  type AiSpecFileChange,
} from "@/domain/aiSpec/types";
import { DEFAULT_AI_SPEC_GUIDELINE } from "@/domain/aiSpec/defaultAiSpecGuideline";
import {
  AGENT_CONTEXT_FLOW_PROMPT_MAX,
  AI_ANALYSIS_INSTRUCTION_MAX,
  AI_NEXT_TASK_PROMPT_MAX,
} from "@/domain/project/settings/types";
import { cn } from "@/lib/utils";

type SettingsTab = "all" | "overview" | "ai-management";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function SettingsPageClient({ slug: slugProp }: { slug?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = slugProp ?? decodeSlug(searchParams.get("project"));
  const { projects } = useProjects();

  const project = projects.find((p) => p.name === slug) ?? null;

  if (!slug) {
    return <ProjectPicker />;
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col px-8 py-6">
        <h1 className="text-xl font-medium">설정</h1>
        <p className="mt-6 text-sm text-muted-foreground">
          프로젝트를 찾을 수 없어요.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-fit"
          onClick={() => router.push("/")}
        >
          홈으로
        </Button>
      </div>
    );
  }

  return <SettingsForm projectId={project.id} projectName={project.name} />;
}

function ProjectPicker() {
  const router = useRouter();
  const { projects } = useProjects();
  return (
    <div className="flex h-full flex-col px-8 py-6">
      <h1 className="text-xl font-medium">설정</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        설정할 프로젝트를 선택해 주세요.
      </p>
      <ul className="mt-6 flex flex-col gap-2">
        {projects.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() =>
                router.push(`/settings?project=${encodeURIComponent(p.name)}`)
              }
              className="w-full rounded-md border border-[#E4E2DD] bg-white px-4 py-3 text-left text-sm hover:bg-[#F2F0EB]"
            >
              {p.name}
            </button>
          </li>
        ))}
        {projects.length === 0 && (
          <li className="text-sm text-muted-foreground">
            아직 프로젝트가 없어요.
          </li>
        )}
      </ul>
    </div>
  );
}

function SettingsForm({
  projectId,
  projectName: _projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: SettingsTab =
    rawTab === "overview"
      ? "overview"
      : rawTab === "ai-management"
        ? "ai-management"
        : "all";

  const [analysisInstruction, setAnalysisInstruction] = useState("");
  const [nextTaskPrompt, setNextTaskPrompt] = useState("");
  const [guideline, setGuideline] = useState("");
  const [agentContextFlowPrompt, setAgentContextFlowPrompt] = useState("");
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [fileChange, setFileChange] = useState<AiSpecFileChange>({
    kind: "none",
  });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/projects/${projectId}`, { cache: "no-store" })
      .then(async (res) => {
        const data: unknown = await res.json();
        if (cancelled) return;
        if (isRecord(data) && data.ok === true) {
          const rawAi =
            isRecord(data.settings) && isRecord(data.settings.ai)
              ? data.settings.ai
              : {};
          setAnalysisInstruction(
            typeof rawAi.analysisInstruction === "string"
              ? rawAi.analysisInstruction
              : "",
          );
          setNextTaskPrompt(
            typeof rawAi.nextTaskPrompt === "string" ? rawAi.nextTaskPrompt : "",
          );
          setGuideline(
            typeof data.aiSpecGuideline === "string" && data.aiSpecGuideline.length > 0
              ? data.aiSpecGuideline
              : DEFAULT_AI_SPEC_GUIDELINE,
          );
          setExistingFileName(
            typeof data.aiSpecFileName === "string" ? data.aiSpecFileName : null,
          );
          setAgentContextFlowPrompt(
            typeof data.agentContextFlowPrompt === "string"
              ? data.agentContextFlowPrompt
              : "",
          );
          setFileChange({ kind: "none" });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const markDirty = useCallback(() => setSaveState({ kind: "idle" }), []);

  const onSave = useCallback(async () => {
    setSaveState({ kind: "saving" });
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ai: {
              analysisInstruction: analysisInstruction || null,
              nextTaskPrompt: nextTaskPrompt || null,
            },
          },
          ...buildAiSpecPolicyPatch(guideline, fileChange),
          agentContextFlowPrompt: agentContextFlowPrompt || null,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok || !isRecord(data) || data.ok !== true) {
        const msg =
          isRecord(data) && typeof data.error === "string"
            ? data.error
            : "저장에 실패했어요.";
        setSaveState({ kind: "error", message: msg });
        return;
      }
      setExistingFileName(
        typeof data.aiSpecFileName === "string" ? data.aiSpecFileName : null,
      );
      setAgentContextFlowPrompt(
        typeof data.agentContextFlowPrompt === "string"
          ? data.agentContextFlowPrompt
          : "",
      );
      setFileChange({ kind: "none" });
      setSaveState({ kind: "saved" });
    } catch (err) {
      setSaveState({
        kind: "error",
        message: err instanceof Error ? err.message : "저장에 실패했어요.",
      });
    }
  }, [
    projectId,
    analysisInstruction,
    nextTaskPrompt,
    guideline,
    fileChange,
    agentContextFlowPrompt,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col px-8 mb-6">
      <div className="mt-8 mx-auto w-full max-w-2xl flex flex-col gap-8">
        {activeTab === "overview" && (
          <>
            <Section
              title="프로젝트 상태 요약 & 솔루션 생성 지침"
              description="프로젝트 상태 요약 및 솔루션을 생성할 때 고려해야 할 사항을 작성해주세요."
            >
              <SessionDataInfo
                label="분석에 사용되는 세션 데이터"
                fields={[
                  "세션별 작업 의도 (최근 10개 세션)",
                  "세션별 수정 파일 목록",
                  "세션별 에러 목록",
                  "반복 수정 파일",
                  "보안 관련 파일 변경 신호",
                ]}
              />
              <textarea
                value={analysisInstruction}
                disabled={loading}
                maxLength={AI_ANALYSIS_INSTRUCTION_MAX}
                placeholder="예) 비용 절감 위주로 요약해 주세요. 에러가 가장 많은 세션을 콕 짚어 알려 주세요."
                rows={5}
                onChange={(e) => {
                  setAnalysisInstruction(e.target.value);
                  markDirty();
                }}
                className={cn(
                  "w-full rounded-md border border-[#E4E2DD] bg-white px-3 py-2 text-sm",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
              <p className="text-xs text-muted-foreground">
                {analysisInstruction.length} / {AI_ANALYSIS_INSTRUCTION_MAX}
              </p>
            </Section>

            <Section
              title="추천 다음 작업 생성 지침"
              description="추천 다음 작업 리스트를 생성할 때 고려해야 할 사항을 작성해주세요."
            >
              <SessionDataInfo
                label="분석에 사용되는 세션 데이터"
                fields={[
                  "세션별 작업 의도 (최근 5개 세션)",
                  "세션별 수정 파일 목록",
                  "진행 중인 작업 흐름",
                ]}
              />
              <textarea
                value={nextTaskPrompt}
                disabled={loading}
                maxLength={AI_NEXT_TASK_PROMPT_MAX}
                placeholder="예) 현재 마감이 촉박한 기능 위주로 제안해 주세요."
                rows={3}
                onChange={(e) => {
                  setNextTaskPrompt(e.target.value);
                  markDirty();
                }}
                className={cn(
                  "w-full rounded-md border border-[#E4E2DD] bg-white px-3 py-2 text-sm",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
              <p className="text-xs text-muted-foreground">
                {nextTaskPrompt.length} / {AI_NEXT_TASK_PROMPT_MAX}
              </p>
            </Section>

            <SaveBar
              saving={saveState.kind === "saving"}
              saved={saveState.kind === "saved"}
              error={saveState.kind === "error" ? saveState.message : null}
              disabled={loading}
              onSave={onSave}
            />
          </>
        )}

        {activeTab === "ai-management" && (
          <>
            <Section
              title="AI 스펙 문서 지침"
              description="AI 에이전트용 문서(CLAUDE.md, AGENTS.md 등)를 평가할 때 고려해야 할 사항을 작성해주세요."
            >
              <AiSpecPolicyFields
                guideline={guideline}
                onGuidelineChange={(next) => {
                  setGuideline(next);
                  markDirty();
                }}
                existingFileName={existingFileName}
                fileChange={fileChange}
                onFileChange={(next) => {
                  setFileChange(next);
                  markDirty();
                }}
                disabled={loading}
                guidelinePlaceholder="예) 보안 관련 지침이 명시돼야 해요. 폴더 구조와 의존 방향이 적혀 있어야 통과로 봐주세요."
              />
            </Section>

            <Section
              title="AI 지시 문서 흐름 진단 프롬프트"
              description="팀·프로젝트 정책과 비교해 지시 문서 플로우를 진단할 때 고려해야 할 사항을 작성해주세요."
            >
              <textarea
                value={agentContextFlowPrompt}
                disabled={loading}
                maxLength={AGENT_CONTEXT_FLOW_PROMPT_MAX}
                placeholder="비워두면 시스템 기본 프롬프트가 사용돼요."
                rows={8}
                onChange={(e) => {
                  setAgentContextFlowPrompt(e.target.value);
                  markDirty();
                }}
                className={cn(
                  "w-full rounded-md border border-[#E4E2DD] bg-white px-3 py-2 font-mono text-xs",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
              <p className="text-xs text-muted-foreground">
                {agentContextFlowPrompt.length} / {AGENT_CONTEXT_FLOW_PROMPT_MAX}
              </p>
            </Section>

            <SaveBar
              saving={saveState.kind === "saving"}
              saved={saveState.kind === "saved"}
              error={saveState.kind === "error" ? saveState.message : null}
              disabled={loading}
              onSave={onSave}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function SessionDataInfo({
  label,
  fields,
}: {
  label: string;
  fields: string[];
}) {
  return (
    <div className="rounded-md border border-[#E4E2DD] bg-[#F8F7F4] px-3 py-2.5">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <ul className="flex flex-col gap-0.5">
        {fields.map((field) => (
          <li
            key={field}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
            {field}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SaveBar({
  saving,
  saved,
  error,
  disabled,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  error: string | null;
  disabled: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Button
        type="button"
        onClick={onSave}
        disabled={disabled || saving}
      >
        {saving ? "저장 중…" : "저장"}
      </Button>
      {saved && <span className="text-sm text-emerald-600">저장됐어요.</span>}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

function decodeSlug(raw: string | null): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

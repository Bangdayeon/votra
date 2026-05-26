"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { updateProjectAction } from "@/app/actions/updateProject";
import { AiSpecPolicyFields } from "@/components/aiSpec/AiSpecPolicyFields";
import { DeleteProjectConfirmDialog } from "@/components/project/DeleteProjectConfirmDialog";
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

  return <SettingsForm projectId={project.id} projectName={project.name} projectDescription={project.description ?? ""} isOwner={project.isOwner ?? true} />;
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
  projectName,
  projectDescription: projectDescriptionProp,
  isOwner,
}: {
  projectId: string;
  projectName: string;
  projectDescription: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const { refresh } = useProjects();
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

  const [title, setTitle] = useState(projectName);
  const [description, setDescription] = useState(projectDescriptionProp);
  const [basicSaveState, setBasicSaveState] = useState<SaveState>({ kind: "idle" });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const onSaveBasicInfo = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setBasicSaveState({ kind: "error", message: "이름을 입력해주세요." });
      return;
    }
    setBasicSaveState({ kind: "saving" });
    const result = await updateProjectAction({
      id: projectId,
      title: trimmedTitle,
      description: description.trim() || null,
    });
    if (result.ok) {
      setBasicSaveState({ kind: "saved" });
      refresh();
    } else {
      setBasicSaveState({ kind: "error", message: result.error });
    }
  }, [projectId, title, description, refresh]);

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
        {(activeTab === "all" || activeTab === "overview") && (
          <>
            <Section
              title="프로젝트 기본 정보"
              description="프로젝트의 이름과 설명을 수정해요."
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">이름</label>
                  <input
                    type="text"
                    value={title}
                    disabled={!isOwner}
                    maxLength={100}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setBasicSaveState({ kind: "idle" });
                    }}
                    className={cn(
                      "w-full rounded-md border border-[#E4E2DD] bg-white px-3 py-2 text-sm",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">설명</label>
                  <textarea
                    value={description}
                    disabled={!isOwner}
                    maxLength={500}
                    placeholder="프로젝트에 대한 짧은 설명을 입력해주세요."
                    rows={2}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setBasicSaveState({ kind: "idle" });
                    }}
                    className={cn(
                      "w-full rounded-md border border-[#E4E2DD] bg-white px-3 py-2 text-sm",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  />
                </div>
              </div>
              {isOwner && (
                <SaveBar
                  saving={basicSaveState.kind === "saving"}
                  saved={basicSaveState.kind === "saved"}
                  error={basicSaveState.kind === "error" ? basicSaveState.message : null}
                  disabled={false}
                  onSave={onSaveBasicInfo}
                />
              )}
            </Section>
          </>
        )}

        {activeTab === "all" && isOwner && (
          <>
            <section className="flex flex-col gap-3 rounded-md border border-destructive/30 px-4 py-4">
              <div>
                <h2 className="text-sm font-medium text-destructive">위험 구역</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  되돌릴 수 없는 작업이에요. 신중하게 진행해주세요.
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">프로젝트 삭제</p>
                  <p className="text-xs text-muted-foreground">
                    프로젝트와 모든 세션·데이터가 영구 삭제돼요.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  삭제
                </Button>
              </div>
            </section>
            <DeleteProjectConfirmDialog
              project={showDeleteDialog ? { id: projectId, name: projectName } : null}
              onClose={() => setShowDeleteDialog(false)}
              onDeleted={() => router.push("/")}
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

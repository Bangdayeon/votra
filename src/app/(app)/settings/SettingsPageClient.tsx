"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { updateProjectAction } from "@/app/actions/updateProject";
import { AiSpecPolicyFields } from "@/components/aiSpec/AiSpecPolicyFields";
import { toast } from "sonner";
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

type SaveState = { kind: "idle" } | { kind: "saving" };

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

  return (
    <SettingsForm
      projectId={project.id}
      projectName={project.name}
      projectDescription={project.description ?? ""}
      projectImage={project.image}
      isOwner={project.isOwner ?? true}
    />
  );
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
              className="w-full rounded-md border border-border bg-muted px-4 py-3 text-left text-sm hover:bg-muted"
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
  projectImage,
  isOwner,
}: {
  projectId: string;
  projectName: string;
  projectDescription: string;
  projectImage?: string;
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

  // Basic info state
  const [title, setTitle] = useState(projectName);
  const [description, setDescription] = useState(projectDescriptionProp);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [basicSaveState, setBasicSaveState] = useState<SaveState>({
    kind: "idle",
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI settings state
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
            typeof rawAi.nextTaskPrompt === "string"
              ? rawAi.nextTaskPrompt
              : "",
          );
          setGuideline(
            typeof data.aiSpecGuideline === "string" &&
              data.aiSpecGuideline.length > 0
              ? data.aiSpecGuideline
              : DEFAULT_AI_SPEC_GUIDELINE,
          );
          setExistingFileName(
            typeof data.aiSpecFileName === "string"
              ? data.aiSpecFileName
              : null,
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

  const onThumbnailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 1024 * 1024) {
        toast.error("이미지는 1MB 이하여야 해요.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result !== "string") return;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          const scale = Math.min(256 / img.width, 256 / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 256, 256);
          ctx.drawImage(img, (256 - w) / 2, (256 - h) / 2, w, h);
          setThumbnailDataUrl(canvas.toDataURL("image/jpeg", 0.85));
          setBasicSaveState({ kind: "idle" });
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const onSaveBasicInfo = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    setBasicSaveState({ kind: "saving" });
    const result = await updateProjectAction({
      id: projectId,
      title: trimmedTitle,
      description: description.trim() || null,
      ...(thumbnailDataUrl !== null ? { thumbnailUrl: thumbnailDataUrl } : {}),
    });
    if (result.ok) {
      setBasicSaveState({ kind: "idle" });
      toast.success("저장됐어요.");
      refresh();
    } else {
      setBasicSaveState({ kind: "idle" });
      toast.error(result.error);
    }
  }, [projectId, title, description, thumbnailDataUrl, refresh]);

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
        setSaveState({ kind: "idle" });
        toast.error(msg);
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
      setSaveState({ kind: "idle" });
      toast.success("저장됐어요.");
    } catch (err) {
      setSaveState({ kind: "idle" });
      toast.error(err instanceof Error ? err.message : "저장에 실패했어요.");
    }
  }, [
    projectId,
    analysisInstruction,
    nextTaskPrompt,
    guideline,
    fileChange,
    agentContextFlowPrompt,
  ]);

  const displayThumbnail = thumbnailDataUrl ?? projectImage ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col px-8 mb-6">
      <div className="mt-8 mx-auto w-full max-w-2xl flex flex-col gap-8">
        {activeTab === "all" && (
          <>
            <Section
              title="프로젝트 기본 정보"
              description="프로젝트의 이름과 설명을 수정해요."
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    썸네일
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="size-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                      {displayThumbnail ? (
                        <img
                          src={displayThumbnail}
                          alt="썸네일 미리보기"
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-[#C4C0B8]">
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!isOwner}
                        onChange={onThumbnailChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!isOwner}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        이미지 선택
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        권장 256×256 · 1MB 이하
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    이름
                  </label>
                  <input
                    type="text"
                    value={title}
                    disabled={!isOwner}
                    maxLength={15}
                    placeholder="최대 15자"
                    onChange={(e) => {
                      setTitle(e.target.value.slice(0, 15));
                      setBasicSaveState({ kind: "idle" });
                    }}
                    className={cn(
                      "w-full rounded-md border border-border bg-muted px-3 py-2 text-sm",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  />
                  <p className="text-[10px] text-muted-foreground/70 text-right">{title.length} / 15</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    설명
                  </label>
                  <input
                    type="text"
                    value={description}
                    disabled={!isOwner}
                    maxLength={25}
                    placeholder="최대 25자"
                    onChange={(e) => {
                      setDescription(e.target.value.slice(0, 25));
                      setBasicSaveState({ kind: "idle" });
                    }}
                    className={cn(
                      "w-full rounded-md border border-border bg-muted px-3 py-2 text-sm",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  />
                  <p className="text-[10px] text-muted-foreground/70 text-right">{description.length} / 25</p>
                </div>
              </div>
              {isOwner && (
                <SaveBar
                  saving={basicSaveState.kind === "saving"}
                  disabled={false}
                  onSave={onSaveBasicInfo}
                />
              )}
            </Section>

          </>
        )}

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
                disabled={loading || !isOwner}
                maxLength={AI_ANALYSIS_INSTRUCTION_MAX}
                placeholder="예) 비용 절감 위주로 요약해 주세요. 에러가 가장 많은 세션을 콕 짚어 알려 주세요."
                rows={5}
                onChange={(e) => {
                  setAnalysisInstruction(e.target.value);
                  markDirty();
                }}
                className={cn(
                  "w-full rounded-md border border-border bg-muted px-3 py-2 text-sm",
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
                disabled={loading || !isOwner}
                maxLength={AI_NEXT_TASK_PROMPT_MAX}
                placeholder="예) 현재 마감이 촉박한 기능 위주로 제안해 주세요."
                rows={3}
                onChange={(e) => {
                  setNextTaskPrompt(e.target.value);
                  markDirty();
                }}
                className={cn(
                  "w-full rounded-md border border-border bg-muted px-3 py-2 text-sm",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
              <p className="text-xs text-muted-foreground">
                {nextTaskPrompt.length} / {AI_NEXT_TASK_PROMPT_MAX}
              </p>
            </Section>

            {isOwner && (
              <SaveBar
                saving={saveState.kind === "saving"}
                disabled={loading}
                onSave={onSave}
              />
            )}
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
                disabled={loading || !isOwner}
                guidelinePlaceholder="예) 보안 관련 지침이 명시돼야 해요. 폴더 구조와 의존 방향이 적혀 있어야 통과로 봐주세요."
              />
            </Section>

            <Section
              title="AI 프롬프트 흐름 진단 프롬프트"
              description="팀·프로젝트 정책과 비교해 프롬프트 플로우를 진단할 때 고려해야 할 사항을 작성해주세요."
            >
              <textarea
                value={agentContextFlowPrompt}
                disabled={loading || !isOwner}
                maxLength={AGENT_CONTEXT_FLOW_PROMPT_MAX}
                placeholder="비워두면 시스템 기본 프롬프트가 사용돼요."
                rows={8}
                onChange={(e) => {
                  setAgentContextFlowPrompt(e.target.value);
                  markDirty();
                }}
                className={cn(
                  "w-full rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
              <p className="text-xs text-muted-foreground">
                {agentContextFlowPrompt.length} / {AGENT_CONTEXT_FLOW_PROMPT_MAX}
              </p>
            </Section>

            {isOwner && (
              <SaveBar
                saving={saveState.kind === "saving"}
                disabled={loading}
                onSave={onSave}
              />
            )}
          </>
        )}

        {activeTab === "all" && isOwner && (
          <>
            <section className="flex flex-col gap-3 rounded-md border border-destructive/30 px-4 py-4">
              <div>
                <h2 className="text-sm font-medium text-destructive">
                  위험 구역
                </h2>
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
              project={
                showDeleteDialog
                  ? { id: projectId, name: projectName }
                  : null
              }
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
    <div className="rounded-md border border-border bg-muted px-3 py-2.5">
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
  disabled,
  onSave,
}: {
  saving: boolean;
  disabled: boolean;
  onSave: () => void;
}) {
  return (
    <div className="mb-6">
      <Button
        type="button"
        onClick={onSave}
        disabled={disabled || saving}
      >
        {saving ? "저장 중…" : "저장"}
      </Button>
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

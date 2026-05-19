"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AiSpecPolicyFields } from "@/components/aiSpec/AiSpecPolicyFields";
import { useProjects } from "@/components/project/ProjectsContext";
import { Button } from "@/components/ui/button";
import {
  buildAiSpecPolicyPatch,
  type AiSpecFileChange,
} from "@/domain/aiSpec/types";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import {
  AI_ANALYSIS_INSTRUCTION_MAX,
  ANALYSIS_STYLES,
  ANALYSIS_TARGETS,
  DEFAULT_PROJECT_SETTINGS,
  PROJECT_TYPES,
  type AnalysisStyle,
  type AnalysisTarget,
  type ProjectSettings,
  type ProjectType,
} from "@/domain/project/settings/types";
import { cn } from "@/lib/utils";

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  WEB_APP: "웹앱",
  MOBILE_NATIVE: "모바일 네이티브 앱",
  BACKEND: "백엔드",
  OTHER: "기타",
};

const ANALYSIS_TARGET_LABELS: Record<AnalysisTarget, string> = {
  ERROR_REPEAT: "에러 반복 감지",
  SAME_FILE_REPEAT: "동일 파일 반복 수정 감지",
  SESSION_SUMMARY: "세션 요약 생성",
  SECURITY_FILE_CHANGE: "보안 관련 파일 변경 감지",
  OTHER: "기타",
};

const ANALYSIS_STYLE_LABELS: Record<AnalysisStyle, string> = {
  DEVELOPER: "개발자가 읽어요",
  NON_DEVELOPER: "비개발자가 읽어요",
};

const PROJECT_TYPE_OTHER_MAX = 80;
const TARGET_OTHER_ITEM_MAX = 80;
const TARGET_OTHER_LIST_MAX = 20;

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

  const project = useMemo(
    () => projects.find((p) => p.name === slug) ?? null,
    [projects, slug],
  );

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
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<ProjectSettings>(
    DEFAULT_PROJECT_SETTINGS,
  );
  const [guideline, setGuideline] = useState("");
  const [otherTargetDraft, setOtherTargetDraft] = useState("");
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
          setSettings(parseProjectSettings(data.settings));
          setGuideline(
            typeof data.aiSpecGuideline === "string"
              ? data.aiSpecGuideline
              : "",
          );
          setExistingFileName(
            typeof data.aiSpecFileName === "string"
              ? data.aiSpecFileName
              : null,
          );
          setFileChange({ kind: "none" });
        }
      })
      .catch(() => {
        // 기본값 유지
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const markDirty = useCallback(() => {
    setSaveState({ kind: "idle" });
  }, []);

  const toggleTarget = useCallback(
    (target: AnalysisTarget) => {
      setSettings((prev) => {
        const has = prev.ai.targets.includes(target);
        const next = has
          ? prev.ai.targets.filter((t) => t !== target)
          : [...prev.ai.targets, target];
        const targetsOther =
          target === "OTHER" && has ? [] : prev.ai.targetsOther;
        return { ...prev, ai: { ...prev.ai, targets: next, targetsOther } };
      });
      markDirty();
    },
    [markDirty],
  );

  const addOtherTarget = useCallback(() => {
    const trimmed = otherTargetDraft.trim().slice(0, TARGET_OTHER_ITEM_MAX);
    if (!trimmed) return;
    setSettings((prev) => {
      if (prev.ai.targetsOther.includes(trimmed)) return prev;
      if (prev.ai.targetsOther.length >= TARGET_OTHER_LIST_MAX) return prev;
      return {
        ...prev,
        ai: {
          ...prev.ai,
          targetsOther: [...prev.ai.targetsOther, trimmed],
        },
      };
    });
    setOtherTargetDraft("");
    markDirty();
  }, [otherTargetDraft, markDirty]);

  const removeOtherTarget = useCallback(
    (item: string) => {
      setSettings((prev) => ({
        ...prev,
        ai: {
          ...prev.ai,
          targetsOther: prev.ai.targetsOther.filter((t) => t !== item),
        },
      }));
      markDirty();
    },
    [markDirty],
  );

  const onSave = useCallback(async () => {
    setSaveState({ kind: "saving" });
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings,
          ...buildAiSpecPolicyPatch(guideline, fileChange),
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
      setFileChange({ kind: "none" });
      setSaveState({ kind: "saved" });
    } catch (err) {
      setSaveState({
        kind: "error",
        message: err instanceof Error ? err.message : "저장에 실패했어요.",
      });
    }
  }, [projectId, settings, guideline, fileChange]);

  const otherTargetSelected = settings.ai.targets.includes("OTHER");

  return (
    <div className="flex h-full min-h-0 flex-col px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">설정</h1>
          <p className="mt-1 text-sm text-muted-foreground">{projectName}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/${encodeURIComponent(projectName)}`)}
        >
          뒤로
        </Button>
      </div>

      <div className="mt-8 flex max-w-2xl flex-col gap-8">
        <Section
          title="프로젝트 유형"
          description="이 프로젝트가 어떤 종류인지 알려주세요."
        >
          <RadioGroup
            value={settings.projectType}
            options={PROJECT_TYPES.map((t) => ({
              value: t,
              label: PROJECT_TYPE_LABELS[t],
            }))}
            disabled={loading}
            onChange={(v) => {
              setSettings((prev) => ({
                ...prev,
                projectType: v,
                projectTypeOther: v === "OTHER" ? prev.projectTypeOther : "",
              }));
              markDirty();
            }}
          />
          {settings.projectType === "OTHER" && (
            <input
              type="text"
              value={settings.projectTypeOther}
              disabled={loading}
              maxLength={PROJECT_TYPE_OTHER_MAX}
              placeholder="예) CLI 도구, 데이터 파이프라인…"
              onChange={(e) => {
                const next = e.target.value;
                setSettings((prev) => ({ ...prev, projectTypeOther: next }));
                markDirty();
              }}
              className={cn(
                "h-9 w-full rounded-md border border-[#E4E2DD] bg-white px-3 py-1 text-sm",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
          )}
        </Section>

        <Section
          title="AI 주요 분석 대상"
          description="어떤 이벤트를 중요하게 봐야 하나요? 여러 개 선택할 수 있어요."
        >
          <div className="flex flex-col gap-2">
            {ANALYSIS_TARGETS.map((t) => (
              <CheckboxRow
                key={t}
                label={ANALYSIS_TARGET_LABELS[t]}
                checked={settings.ai.targets.includes(t)}
                disabled={loading}
                onChange={() => toggleTarget(t)}
              />
            ))}
          </div>
          {otherTargetSelected && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={otherTargetDraft}
                  disabled={loading}
                  maxLength={TARGET_OTHER_ITEM_MAX}
                  placeholder="기타 분석 대상을 입력해 주세요"
                  onChange={(e) => setOtherTargetDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOtherTarget();
                    }
                  }}
                  className={cn(
                    "h-9 flex-1 rounded-md border border-[#E4E2DD] bg-white px-3 py-1 text-sm",
                    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOtherTarget}
                  disabled={
                    loading ||
                    otherTargetDraft.trim().length === 0 ||
                    settings.ai.targetsOther.length >= TARGET_OTHER_LIST_MAX
                  }
                >
                  추가
                </Button>
              </div>
              {settings.ai.targetsOther.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {settings.ai.targetsOther.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 rounded-md border border-[#E4E2DD] bg-white px-2 py-1 text-xs"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => removeOtherTarget(item)}
                        disabled={loading}
                        aria-label={`${item} 제거`}
                        className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                {settings.ai.targetsOther.length} / {TARGET_OTHER_LIST_MAX}
              </p>
            </div>
          )}
        </Section>

        <Section
          title="리포트 스타일"
          description="분석 리포트를 누가 읽을지 알려주세요."
        >
          <RadioGroup
            value={settings.ai.style}
            options={ANALYSIS_STYLES.map((s) => ({
              value: s,
              label: ANALYSIS_STYLE_LABELS[s],
            }))}
            disabled={loading}
            onChange={(v) => {
              setSettings((prev) => ({
                ...prev,
                ai: { ...prev.ai, style: v },
              }));
              markDirty();
            }}
          />
        </Section>

        <Section
          title="프로젝트 분석 AI 상세 지침"
          description="개요 페이지의 AI 요약/솔루션 을 생성할 때 AI 에게 추가로 줄 지침이에요. 비워두면 기본 프롬프트만 사용해요."
        >
          <textarea
            value={settings.ai.analysisInstruction}
            disabled={loading}
            maxLength={AI_ANALYSIS_INSTRUCTION_MAX}
            placeholder="예) 비용 절감 위주로 요약해 주세요. 에러가 가장 많은 세션을 콕 짚어 알려 주세요."
            rows={5}
            onChange={(e) => {
              const next = e.target.value;
              setSettings((prev) => ({
                ...prev,
                ai: { ...prev.ai, analysisInstruction: next },
              }));
              markDirty();
            }}
            className={cn(
              "w-full rounded-md border border-[#E4E2DD] bg-white px-3 py-2 text-sm",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <p className="text-xs text-muted-foreground">
            {settings.ai.analysisInstruction.length} / {AI_ANALYSIS_INSTRUCTION_MAX}
          </p>
        </Section>

        <Section
          title="AI 스펙 문서 지침"
          description="md 파일(CLAUDE.md, AGENTS.md 등)을 평가할 때 AI 에게 줄 지침이에요."
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

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={onSave}
            disabled={loading || saveState.kind === "saving"}
          >
            {saveState.kind === "saving" ? "저장 중…" : "저장"}
          </Button>
          {saveState.kind === "saved" && (
            <span className="text-sm text-emerald-600">저장됐어요.</span>
          )}
          {saveState.kind === "error" && (
            <span className="text-sm text-destructive">
              {saveState.message}
            </span>
          )}
        </div>
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

function RadioGroup<T extends string>({
  value,
  options,
  disabled,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md border px-3 py-2 text-sm transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-[#E4E2DD] bg-white hover:bg-[#F2F0EB]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border border-[#E4E2DD] bg-white px-3 py-2 text-sm transition-colors hover:bg-[#F2F0EB]",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="size-4 accent-foreground"
      />
      <span>{label}</span>
    </label>
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

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useProjects } from "@/components/project/ProjectsContext";
import { Button } from "@/components/ui/button";
import { parseProjectSettings } from "@/domain/project/settings/parseProjectSettings";
import {
  ANALYSIS_STYLES,
  ANALYSIS_TARGETS,
  AUTOMATION_MODES,
  DEFAULT_PROJECT_SETTINGS,
  PROJECT_TYPES,
  type AnalysisStyle,
  type AnalysisTarget,
  type AutomationMode,
  type ProjectSettings,
  type ProjectType,
} from "@/domain/project/settings/types";
import { cn } from "@/lib/utils";

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  WEB_APP: "웹앱",
  MOBILE: "모바일",
  BACKEND: "백엔드",
  OTHER: "기타",
};

const ANALYSIS_TARGET_LABELS: Record<AnalysisTarget, string> = {
  ERROR_REPEAT: "에러 반복 감지",
  SAME_FILE_REPEAT: "동일 파일 반복 수정 감지",
  SESSION_SUMMARY: "세션 요약 생성",
  SECURITY_FILE_CHANGE: "보안 관련 파일 변경 감지",
};

const ANALYSIS_STYLE_LABELS: Record<AnalysisStyle, string> = {
  DEVELOPER: "개발자가 읽어요",
  NON_DEVELOPER: "비개발자가 읽어요",
};

const AUTOMATION_LABELS: Record<AutomationMode, string> = {
  AUTO: "세션 업로드 시 자동 분석",
  MANUAL: "수동으로 직접 실행",
};

const AI_SPEC_GUIDELINE_MAX = 8000;
const GUIDELINE_AUTOSAVE_DELAY_MS = 800;

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

type GuidelineSaveState =
  | { kind: "idle" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function SettingsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = decodeSlug(searchParams.get("project"));
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
                router.push(
                  `/settings?project=${encodeURIComponent(p.name)}`,
                )
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
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [guidelineState, setGuidelineState] = useState<GuidelineSaveState>({
    kind: "idle",
  });
  const lastSavedGuidelineRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/projects/${projectId}`, { cache: "no-store" })
      .then(async (res) => {
        const data: unknown = await res.json();
        if (cancelled) return;
        if (isRecord(data) && data.ok === true) {
          setSettings(parseProjectSettings(data.settings));
          const g =
            typeof data.aiSpecGuideline === "string"
              ? data.aiSpecGuideline
              : "";
          setGuideline(g);
          lastSavedGuidelineRef.current = g;
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

  useEffect(() => {
    if (loading) return;
    if (guideline === lastSavedGuidelineRef.current) return;
    setGuidelineState({ kind: "dirty" });
    const timer = setTimeout(() => {
      void saveGuideline(projectId, guideline, lastSavedGuidelineRef, setGuidelineState);
    }, GUIDELINE_AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [guideline, loading, projectId]);

  const toggleTarget = useCallback((target: AnalysisTarget) => {
    setSettings((prev) => {
      const has = prev.ai.targets.includes(target);
      const next = has
        ? prev.ai.targets.filter((t) => t !== target)
        : [...prev.ai.targets, target];
      return { ...prev, ai: { ...prev.ai, targets: next } };
    });
    setSaveState({ kind: "idle" });
  }, []);

  const onSave = useCallback(async () => {
    setSaveState({ kind: "saving" });
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
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
      setSaveState({ kind: "saved" });
    } catch (err) {
      setSaveState({
        kind: "error",
        message: err instanceof Error ? err.message : "저장에 실패했어요.",
      });
    }
  }, [projectId, settings]);

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
          onClick={() =>
            router.push(`/${encodeURIComponent(projectName)}`)
          }
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
              setSettings((prev) => ({ ...prev, projectType: v }));
              setSaveState({ kind: "idle" });
            }}
          />
        </Section>

        <Section
          title="AI 분석 대상"
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
        </Section>

        <Section
          title="분석 스타일"
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
              setSaveState({ kind: "idle" });
            }}
          />
        </Section>

        <Section
          title="자동화"
          description="언제 분석을 실행할까요?"
        >
          <RadioGroup
            value={settings.ai.automation}
            options={AUTOMATION_MODES.map((m) => ({
              value: m,
              label: AUTOMATION_LABELS[m],
            }))}
            disabled={loading}
            onChange={(v) => {
              setSettings((prev) => ({
                ...prev,
                ai: { ...prev.ai, automation: v },
              }));
              setSaveState({ kind: "idle" });
            }}
          />
        </Section>

        <Section
          title="AI 스펙 문서 지침"
          description="md 파일(CLAUDE.md, AGENTS.md 등)을 평가할 때 AI 에게 줄 지침이에요. 작성 후 잠시 멈추면 자동 저장돼요."
        >
          <textarea
            value={guideline}
            disabled={loading}
            rows={5}
            maxLength={AI_SPEC_GUIDELINE_MAX}
            onChange={(e) => setGuideline(e.target.value)}
            placeholder="예) 보안 관련 지침이 명시돼야 해요. 폴더 구조와 의존 방향이 적혀 있어야 통과로 봐주세요."
            className={cn(
              "min-h-[8rem] w-full resize-y rounded-md border border-[#E4E2DD] bg-white px-3 py-2 text-sm leading-6",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <div className="flex items-center justify-between">
            <GuidelineStatus state={guidelineState} />
            <span className="text-xs text-muted-foreground">
              {guideline.length} / {AI_SPEC_GUIDELINE_MAX}
            </span>
          </div>
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

async function saveGuideline(
  projectId: string,
  value: string,
  lastSavedRef: { current: string },
  setState: (s: GuidelineSaveState) => void,
): Promise<void> {
  setState({ kind: "saving" });
  try {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiSpecGuideline: value }),
    });
    const data: unknown = await res.json();
    if (!res.ok || !isRecord(data) || data.ok !== true) {
      const msg =
        isRecord(data) && typeof data.error === "string"
          ? data.error
          : "지침 저장에 실패했어요.";
      setState({ kind: "error", message: msg });
      return;
    }
    lastSavedRef.current = value;
    setState({ kind: "saved" });
  } catch (err) {
    setState({
      kind: "error",
      message: err instanceof Error ? err.message : "지침 저장에 실패했어요.",
    });
  }
}

function GuidelineStatus({ state }: { state: GuidelineSaveState }) {
  if (state.kind === "dirty") {
    return <span className="text-xs text-muted-foreground">변경됨…</span>;
  }
  if (state.kind === "saving") {
    return <span className="text-xs text-muted-foreground">저장 중…</span>;
  }
  if (state.kind === "saved") {
    return <span className="text-xs text-emerald-600">자동 저장됨</span>;
  }
  if (state.kind === "error") {
    return <span className="text-xs text-destructive">{state.message}</span>;
  }
  return null;
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

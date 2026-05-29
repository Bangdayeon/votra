"use client";

import { ChevronDown, ChevronRight, ChevronUp, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getProjectSkillsAction, type SkillRecord } from "@/app/actions/getProjectSkillsAction";
import { toggleSkillAction } from "@/app/actions/toggleSkillAction";
import type { Project } from "@/components/project/ProjectsContext";
import { cn } from "@/lib/utils";

// ── category ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  coding: "코딩",
  process: "프로세스",
  analysis: "분석",
};

const CATEGORY_ORDER = ["coding", "process", "analysis"];

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

// ── SkillRow ──────────────────────────────────────────────────────────────────

function SkillRow({
  skill,
  projectId,
  onToggled,
}: {
  skill: SkillRecord;
  projectId: string;
  onToggled: (slug: string, enabled: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleToggle(enabled: boolean) {
    setPending(true);
    onToggled(skill.slug, enabled); // optimistic
    try {
      await toggleSkillAction(projectId, skill.slug, enabled);
    } catch (err) {
      onToggled(skill.slug, !enabled); // rollback
      toast.error(err instanceof Error ? err.message : "스킬 설정 변경에 실패했어요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div
        className="flex cursor-pointer items-start gap-4 px-4 py-3.5"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{skill.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{skill.description}</p>
          <p className="mt-1.5 text-xs text-muted-foreground/70 italic leading-relaxed">
            {skill.contextHint}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {pending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle checked={skill.enabled} onChange={handleToggle} disabled={pending} />
          </div>
          {expanded
            ? <ChevronUp className="size-3.5 text-muted-foreground" />
            : <ChevronDown className="size-3.5 text-muted-foreground" />
          }
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
            {skill.content}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── CategorySection ───────────────────────────────────────────────────────────

function CategorySection({
  category,
  skills,
  projectId,
  onToggled,
}: {
  category: string;
  skills: SkillRecord[];
  projectId: string;
  onToggled: (slug: string, enabled: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const enabledCount = skills.filter((s) => s.enabled).length;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="flex cursor-pointer items-center gap-2 text-left"
      >
        {collapsed
          ? <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          : <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        }
        <span className="text-sm font-semibold">{categoryLabel(category)}</span>
        <span className="text-xs text-muted-foreground">
          {enabledCount}/{skills.length} 활성화
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2 pl-0">
          {skills.map((skill) => (
            <SkillRow
              key={skill.slug}
              skill={skill}
              projectId={projectId}
              onToggled={onToggled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── SkillsTab ─────────────────────────────────────────────────────────────────

export function SkillsTab({ selected }: { selected: Project }) {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProjectSkillsAction(selected.id)
      .then((s) => { if (!cancelled) setSkills(s); })
      .catch((e: unknown) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "스킬 목록을 불러오지 못했어요.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selected.id]);

  function handleToggled(slug: string, enabled: boolean) {
    setSkills((prev) => prev.map((s) => s.slug === slug ? { ...s, enabled } : s));
  }

  const grouped = useMemo(() => {
    const map = new Map<string, SkillRecord[]>();
    for (const skill of skills) {
      const bucket = map.get(skill.category) ?? [];
      bucket.push(skill);
      map.set(skill.category, bucket);
    }
    return map;
  }, [skills]);

  const orderedCategories = useMemo(() => {
    const present = new Set(grouped.keys());
    const ordered = CATEGORY_ORDER.filter((c) => present.has(c));
    // 알 수 없는 category는 뒤에 추가
    for (const c of present) {
      if (!CATEGORY_ORDER.includes(c)) ordered.push(c);
    }
    return ordered;
  }, [grouped]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">스킬</h2>
        {!loading && (
          <span className="text-xs text-muted-foreground">
            AI 도구에서 <code className="rounded bg-muted px-1 py-0.5">load_skill</code>로 불러올 수 있어요.
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : skills.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <p>등록된 스킬이 없어요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {orderedCategories.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              skills={grouped.get(cat) ?? []}
              projectId={selected.id}
              onToggled={handleToggled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

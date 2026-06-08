"use client";

import { CheckSquare, ChevronDown, ChevronRight, ChevronUp, Info, Loader2, Plus, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createToolAction } from "@/app/actions/createToolAction";
import { deleteToolAction } from "@/app/actions/deleteToolAction";
import { restoreToolsAction } from "@/app/actions/restoreToolsAction";
import { getToolsAction, type ProjectToolRecord } from "@/app/actions/getToolsAction";
import { toggleToolAction } from "@/app/actions/toggleCustomCommandAction";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BADGE_COLORS, buildToolColorMap } from "@/shared/lib/toolBadgeColors";

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

// ── ToolRow ───────────────────────────────────────────────────────────────────

function ToolRow({
  tool,
  badgeColor,
  onToggled,
  isSelectMode,
  isSelected,
  onSelect,
}: {
  tool: ProjectToolRecord;
  badgeColor: string;
  onToggled: (id: string, isEnabled: boolean) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleToggle(isEnabled: boolean) {
    setPending(true);
    onToggled(tool.id, isEnabled);
    try {
      await toggleToolAction(tool.id, isEnabled);
    } catch (err) {
      onToggled(tool.id, !isEnabled);
      toast.error(err instanceof Error ? err.message : "툴 설정 변경에 실패했어요.");
    } finally {
      setPending(false);
    }
  }

  const selectable = !tool.isBuiltIn;

  return (
    <div className={cn(
      "rounded-lg border border-border bg-card transition-colors",
      isSelectMode && isSelected && "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20",
    )}>
      <div
        className="flex cursor-pointer items-start gap-4 px-4 py-3.5"
        onClick={isSelectMode && selectable ? onSelect : () => setExpanded((v) => !v)}
      >
        {isSelectMode && selectable && (
          <input
            type="checkbox"
            checked={isSelected}
            readOnly
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-foreground"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{tool.name}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", badgeColor)}>
              {tool.slug}
            </span>
            {tool.patternSummary && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                AI 추천
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{tool.description}</p>
          {tool.contextHint && (
            <p className="mt-1.5 text-xs text-muted-foreground/70 italic leading-relaxed">
              {tool.contextHint}
            </p>
          )}
          {expanded && tool.patternSummary && (
            <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-500/80">
              패턴: {tool.patternSummary}
            </p>
          )}
        </div>
        {!isSelectMode && (
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {pending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
            <div onClick={(e) => e.stopPropagation()}>
              <Toggle checked={tool.isEnabled} onChange={handleToggle} disabled={pending} />
            </div>
            {expanded
              ? <ChevronUp className="size-3.5 text-muted-foreground" />
              : <ChevronDown className="size-3.5 text-muted-foreground" />
            }
          </div>
        )}
      </div>

      {!isSelectMode && expanded && (
        <div className="border-t border-border px-4 py-3">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
            {tool.content}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── FolderSection ─────────────────────────────────────────────────────────────

function FolderSection({
  folder,
  tools,
  colorMap,
  onToggled,
  isSelectMode,
  selectedIds,
  onSelect,
}: {
  folder: string;
  tools: ProjectToolRecord[];
  colorMap: Map<string, string>;
  onToggled: (id: string, isEnabled: boolean) => void;
  isSelectMode: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const enabledCount = tools.filter((t) => t.isEnabled).length;

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
        <span className="text-sm font-semibold">{folder}</span>
        <span className="text-xs text-muted-foreground">
          {enabledCount}/{tools.length} 활성화
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2">
          {tools.map((tool) => (
            <ToolRow
              key={tool.slug}
              tool={tool}
              badgeColor={colorMap.get(tool.slug) ?? BADGE_COLORS[0]}
              onToggled={onToggled}
              isSelectMode={isSelectMode}
              isSelected={selectedIds.has(tool.id)}
              onSelect={() => onSelect(tool.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── AddToolModal ──────────────────────────────────────────────────────────────

function AddToolModal({
  projectId,
  onCreated,
  onClose,
}: {
  projectId: string;
  onCreated: (tool: ProjectToolRecord) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [folder, setFolder] = useState("");
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createToolAction(projectId, {
        name: name.trim(),
        description: description.trim(),
        folder: folder.trim() || "기타",
        content: content.trim(),
      });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("툴이 추가됐어요.");
      onCreated(result.value);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">툴 추가</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">이름 *</label>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: API Error Handler"
                maxLength={60}
                required
                className="h-9 rounded-md border border-input bg-muted px-3 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex w-32 flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">폴더</label>
              <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="기타"
                maxLength={30}
                className="h-9 rounded-md border border-input bg-muted px-3 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">설명</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="툴이 하는 일을 한 줄로 설명해요"
              maxLength={200}
              className="h-9 rounded-md border border-input bg-muted px-3 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">내용 *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"에이전트가 따를 지침을 마크다운으로 작성해요.\n\n예:\n## 규칙\n- API 오류 응답은 항상 로깅할 것\n- 재시도는 최대 3회"}
              rows={8}
              required
              className="resize-none rounded-md border border-input bg-muted px-3 py-2.5 font-mono text-xs leading-relaxed focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>
              취소
            </Button>
            <Button type="submit" size="sm" disabled={pending || !name.trim() || !content.trim()}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : "추가"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── DeleteConfirmModal ────────────────────────────────────────────────────────

function DeleteConfirmModal({
  count,
  onConfirm,
  onCancel,
  loading,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold">툴 {count}개를 삭제할까요?</p>
        <p className="mt-1.5 text-xs text-muted-foreground">삭제 후 토스트의 실행 취소 버튼으로 되돌릴 수 있어요.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>취소</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={loading} className="gap-1.5">
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            삭제
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── ToolsTab ──────────────────────────────────────────────────────────────────

export function ToolsTab({ projectId }: { projectId?: string } = {}) {
  const [tools, setTools] = useState<ProjectToolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getToolsAction(projectId)
      .then((data) => { if (!cancelled) setTools(data); })
      .catch((e: unknown) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "툴 목록을 불러오지 못했어요.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  function handleToggled(id: string, isEnabled: boolean) {
    setTools((prev) => prev.map((t) => t.id === id ? { ...t, isEnabled } : t));
  }

  function handleCreated(tool: ProjectToolRecord) {
    setTools((prev) => [...prev, tool]);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function exitSelectMode() {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  }

  async function handleConfirmDelete() {
    const ids = Array.from(selectedIds);
    const deletedItems = tools.filter((t) => ids.includes(t.id));
    setDeleteLoading(true);
    setShowDeleteConfirm(false);
    setTools((prev) => prev.filter((t) => !ids.includes(t.id)));
    setSelectedIds(new Set());
    setIsSelectMode(false);
    const results = await Promise.all(ids.map((id) => deleteToolAction(id)));
    const failed = results.filter((r) => !r.ok).length;
    setDeleteLoading(false);
    if (failed > 0) {
      toast.error(`${failed}개 삭제에 실패했어요.`);
    } else {
      toast.success(`${deletedItems.length}개 삭제됐어요.`, {
        action: { label: "실행 취소", onClick: () => handleUndo(deletedItems) },
        duration: 6000,
      });
    }
  }

  function handleUndo(deletedItems: ProjectToolRecord[]) {
    restoreToolsAction(deletedItems).then((result) => {
      if (!result.ok) { toast.error(result.error ?? "복원에 실패했어요."); return; }
      setTools((prev) => [...prev, ...result.restored]);
      toast.success(`${result.restored.length}개 복원됐어요.`);
    });
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectToolRecord[]>();
    for (const tool of tools) {
      const bucket = map.get(tool.folder) ?? [];
      bucket.push(tool);
      map.set(tool.folder, bucket);
    }
    return map;
  }, [tools]);

  const orderedFolders = useMemo(() => [...grouped.keys()].sort(), [grouped]);
  const colorMap = useMemo(() => buildToolColorMap(tools.map((t) => t.slug)), [tools]);

  return (
    <>
      {showModal && projectId && (
        <AddToolModal
          projectId={projectId}
          onCreated={handleCreated}
          onClose={() => setShowModal(false)}
        />
      )}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          count={selectedIds.size}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleteLoading}
        />
      )}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">툴</h2>
          <span className="text-xs text-muted-foreground">태스크 작업 시 자동으로 적용돼요.</span>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-default">
                  <Info className="size-3 text-muted-foreground/50" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px] text-xs">
                태스크 생성 시 툴이 자동으로 매칭돼요. 동작이 마음에 들지 않으면 내용 수정을 요청하거나, <code className="rounded bg-muted px-1">load_tool</code>로 직접 불러올 수 있어요.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {projectId && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (isSelectMode) { exitSelectMode(); } else { setIsSelectMode(true); }
                }}
                className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {!isSelectMode && <CheckSquare className="size-3.5" />}
                {isSelectMode ? "취소" : "선택하기"}
              </button>
              {!isSelectMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowModal(true)}
                >
                  <Plus className="size-3.5" />
                  툴 추가
                </Button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-6">
            {["개발", "프로세스"].map((label) => (
              <div key={label} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-semibold">{label}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : tools.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
            <p>등록된 툴이 없어요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {orderedFolders.map((folder) => (
              <FolderSection
                key={folder}
                folder={folder}
                tools={grouped.get(folder) ?? []}
                colorMap={colorMap}
                onToggled={handleToggled}
                isSelectMode={isSelectMode}
                selectedIds={selectedIds}
                onSelect={toggleSelect}
              />
            ))}
          </div>
        )}

        {isSelectMode && selectedIds.size > 0 && (
          <div className="sticky bottom-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
            <span className="text-sm font-medium text-muted-foreground">{selectedIds.size}개 선택됨</span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exitSelectMode} disabled={deleteLoading}>
                취소
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={deleteLoading}
                className="gap-1.5"
              >
                {deleteLoading
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Trash2 className="size-3.5" />
                }
                삭제
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

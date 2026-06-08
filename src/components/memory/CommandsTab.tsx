"use client";

import { BookOpen, CheckSquare, ChevronDown, ChevronRight, ChevronUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { getCommandsAction, type ProjectCommandRecord } from "@/app/actions/getCustomCommandsAction";
import { createCommandAction } from "@/app/actions/createCommandAction";
import { deleteCommandAction } from "@/app/actions/deleteCommandAction";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── CommandRow ────────────────────────────────────────────────────────────────

function CommandRow({
  command,
  isSelectMode,
  isSelected,
  onSelect,
}: {
  command: ProjectCommandRecord;
  isSelectMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectable = !command.isBuiltIn;

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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold">
              /{command.slug}
            </span>
            <span className="text-xs text-muted-foreground">{command.name}</span>
            {command.isBuiltIn && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                기본
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{command.description}</p>
        </div>
        {!isSelectMode && (
          <div className="flex shrink-0 items-center gap-1 pt-0.5">
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
            {command.content}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── FolderSection ─────────────────────────────────────────────────────────────

function FolderSection({
  folder,
  commands,

  isSelectMode,
  selectedIds,
  onSelect,
}: {
  folder: string;
  commands: ProjectCommandRecord[];

  isSelectMode: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

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
        <span className="text-xs text-muted-foreground">{commands.length}개</span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2">
          {commands.map((command) => (
            <CommandRow
              key={command.slug}
              command={command}

              isSelectMode={isSelectMode}
              isSelected={selectedIds.has(command.id)}
              onSelect={() => onSelect(command.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── AddCommandForm ─────────────────────────────────────────────────────────────

function AddCommandForm({
  existingFolders,
  onAdded,
  onCancel,
}: {
  existingFolders: string[];
  onAdded: (command: ProjectCommandRecord) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [folder, setFolder] = useState("기타");
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setPending(true);
    try {
      const result = await createCommandAction({
        name: name.trim(),
        description: description.trim(),
        folder: folder.trim() || "기타",
        content: content.trim(),
      });
      if (!result.ok) { toast.error(result.error); return; }
      onAdded(result.value);
      toast.success("커맨드가 추가됐어요.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "커맨드 추가에 실패했어요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">새 커맨드 추가</span>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">이름 *</label>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Backend Engineer"
            required
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">폴더</label>
          <input
            list="command-folders"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="개발"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <datalist id="command-folders">
            {existingFolders.map((f) => <option key={f} value={f} />)}
          </datalist>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">설명</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="이 커맨드가 하는 일을 간단히 설명해요"
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">내용 *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="에이전트에게 전달할 지침을 마크다운으로 작성하세요"
          required
          rows={6}
          className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs leading-relaxed outline-none focus:ring-1 focus:ring-ring resize-y"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending || !name.trim() || !content.trim()}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          커맨드 추가
        </button>
      </div>
    </form>
  );
}

// ── CommandsTab ───────────────────────────────────────────────────────────────

export function CommandsTab() {
  const [commands, setCommands] = useState<ProjectCommandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCommandsAction()
      .then((data) => { if (!cancelled) setCommands(data); })
      .catch((e: unknown) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "커맨드 목록을 불러오지 못했어요.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function handleAdded(command: ProjectCommandRecord) {
    setCommands((prev) => [...prev, command]);
    setShowAdd(false);
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

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setDeleteLoading(true);
    const ids = Array.from(selectedIds);
    setCommands((prev) => prev.filter((c) => !ids.includes(c.id)));
    setSelectedIds(new Set());
    setIsSelectMode(false);
    const results = await Promise.all(ids.map((id) => deleteCommandAction(id)));
    const failed = results.filter((r) => !r.ok).length;
    if (failed > 0) toast.error(`${failed}개 삭제에 실패했어요.`);
    setDeleteLoading(false);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectCommandRecord[]>();
    for (const command of commands) {
      const bucket = map.get(command.folder) ?? [];
      bucket.push(command);
      map.set(command.folder, bucket);
    }
    return map;
  }, [commands]);

  const orderedFolders = useMemo(() => [...grouped.keys()].sort(), [grouped]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 shrink-0 text-muted-foreground" />
        <h2 className="text-base font-semibold">커맨드</h2>
        <span className="text-xs text-muted-foreground">에이전트와 대화 중 슬래시 명령어로 실행해요.</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => {
              if (isSelectMode) { exitSelectMode(); } else { setIsSelectMode(true); setShowAdd(false); }
            }}
            className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {!isSelectMode && <CheckSquare className="size-3.5" />}
            {isSelectMode ? "취소" : "선택하기"}
          </button>
          {!isSelectMode && (
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="flex cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="size-3.5" />
              커맨드 추가
            </button>
          )}
        </div>
      </div>

      {!isSelectMode && showAdd && (
        <AddCommandForm
          existingFolders={orderedFolders}
          onAdded={handleAdded}
          onCancel={() => setShowAdd(false)}
        />
      )}

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
                  <Skeleton key={i} className="h-[60px] w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : commands.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <p>등록된 커맨드가 없어요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {orderedFolders.map((folder) => (
            <FolderSection
              key={folder}
              folder={folder}
              commands={grouped.get(folder) ?? []}

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
  );
}

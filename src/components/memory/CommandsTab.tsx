"use client";

import { BookOpen, ChevronDown, ChevronRight, ChevronUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { getCommandsAction, type ProjectCommandRecord } from "@/app/actions/getCustomCommandsAction";
import { createCommandAction } from "@/app/actions/createCommandAction";
import { deleteCommandAction } from "@/app/actions/deleteCommandAction";
import { cn } from "@/lib/utils";
import { BADGE_COLORS, buildToolColorMap } from "@/shared/lib/toolBadgeColors";

// ── CommandRow ────────────────────────────────────────────────────────────────

function CommandRow({
  command,
  badgeColor,
  onDeleted,
}: {
  command: ProjectCommandRecord;
  badgeColor: string;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setPending(true);
    onDeleted(command.id); // optimistic
    const result = await deleteCommandAction(command.id);
    if (!result.ok) {
      toast.error(result.error ?? "커맨드 삭제에 실패했어요.");
    }
    setPending(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div
        className="flex cursor-pointer items-start gap-4 px-4 py-3.5"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{command.name}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", badgeColor)}>
              {command.slug}
            </span>
            {command.isBuiltIn && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                기본
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{command.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {pending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
          {!command.isBuiltIn && (
            <button
              onClick={handleDelete}
              disabled={pending}
              className="rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-destructive disabled:pointer-events-none"
              aria-label="커맨드 삭제"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          {expanded
            ? <ChevronUp className="size-3.5 text-muted-foreground" />
            : <ChevronDown className="size-3.5 text-muted-foreground" />
          }
        </div>
      </div>

      {expanded && (
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
  colorMap,
  onDeleted,
}: {
  folder: string;
  commands: ProjectCommandRecord[];
  colorMap: Map<string, string>;
  onDeleted: (id: string) => void;
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
              badgeColor={colorMap.get(command.slug) ?? BADGE_COLORS[0]}
              onDeleted={onDeleted}
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

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

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
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCommandsAction()
      .then((data) => {
        if (!cancelled) setCommands(data);
      })
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

  function handleDeleted(id: string) {
    setCommands((prev) => prev.filter((c) => c.id !== id));
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

  const colorMap = useMemo(() => buildToolColorMap(commands.map((c) => c.slug)), [commands]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 shrink-0 text-muted-foreground" />
        <h2 className="text-base font-semibold">커맨드</h2>
        <span className="text-xs text-muted-foreground">에이전트와 대화 중 슬래시 명령어로 실행해요.</span>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="ml-auto flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="size-3.5" />
          커맨드 추가
        </button>
      </div>

      {showAdd && (
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
              colorMap={colorMap}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

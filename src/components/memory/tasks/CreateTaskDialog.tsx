"use client";

import { ChevronDown, Info, Loader2 } from "lucide-react";
import { Folder } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createTaskAction, type CreateTaskInput } from "@/app/actions/createTaskAction";
import { suggestTaskToolAction } from "@/app/actions/suggestTaskToolAction";
import type { TaskRecord } from "@/app/actions/getProjectTasks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FolderRecord, ProjectToolRecord } from "@/domain/memory/types";
import { cn } from "@/lib/utils";

import { FolderIconDisplay } from "./FolderIconDisplay";
import {
  PRIORITY_ACTIVE_STYLES,
  PRIORITY_CREATE_OPTIONS,
  TASK_DESC_MAX,
  TASK_TITLE_MAX,
} from "./taskConstants";

export function CreateTaskDialog({
  open,
  projectId,
  folders,
  defaultFolderId,
  tools,
  onClose,
  onCreated,
}: {
  open: boolean;
  projectId: string;
  folders: FolderRecord[];
  defaultFolderId: string | null;
  tools: ProjectToolRecord[];
  onClose: () => void;
  onCreated: (task: TaskRecord) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);
  const [tool, setTool] = useState<string | null>(null);
  const [priority, setPriority] = useState(2);
  const [loading, setLoading] = useState(false);
  const [toolLoading, setToolLoading] = useState(false);
  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestSeq = useRef(0);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setFolderId(defaultFolderId);
    setTool(null);
    setPriority(2);
    setToolLoading(false);
  }, [open, defaultFolderId]);

  useEffect(() => {
    if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    if (!title.trim()) return;
    const seq = ++suggestSeq.current;
    suggestDebounce.current = setTimeout(() => {
      setToolLoading(true);
      suggestTaskToolAction(projectId, title.trim(), description)
        .then((suggested) => {
          if (suggestSeq.current !== seq) return;
          if (suggested) setTool(suggested);
        })
        .catch(() => {})
        .finally(() => { if (suggestSeq.current === seq) setToolLoading(false); });
    }, 1500);
    return () => { if (suggestDebounce.current) clearTimeout(suggestDebounce.current); };
  }, [title, description, projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const input: CreateTaskInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        tool: tool ?? undefined,
        priority,
        folderId,
      };
      const task = await createTaskAction(projectId, input);
      onCreated(task);
      onClose();
      toast.success("태스크를 등록했어요.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "태스크 생성에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  const activeTools = tools.filter((t) => t.isEnabled);
  const currentFolderName = folderId
    ? (folders.find((f) => f.id === folderId)?.name ?? "알 수 없음")
    : "미분류";
  const currentFolder = folderId ? folders.find((f) => f.id === folderId) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>새 태스크</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">폴더</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <span className="flex items-center gap-1.5 text-foreground">
                      {currentFolder ? (
                        <FolderIconDisplay icon={currentFolder.icon} color={currentFolder.color} className="size-3.5" />
                      ) : (
                        <Folder className="size-3.5 text-muted-foreground" />
                      )}
                      {currentFolderName}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuItem
                    onClick={() => setFolderId(null)}
                    className={cn("gap-2", folderId === null && "font-medium")}
                  >
                    <Folder className="size-3.5" />
                    미분류
                  </DropdownMenuItem>
                  {folders.length > 0 && <DropdownMenuSeparator />}
                  {folders.map((f) => (
                    <DropdownMenuItem
                      key={f.id}
                      onClick={() => setFolderId(f.id)}
                      className={cn("gap-2", folderId === f.id && "font-medium")}
                    >
                      <FolderIconDisplay icon={f.icon} color={f.color} className="size-3.5" />
                      {f.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">제목</label>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  placeholder="태스크 제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, TASK_TITLE_MAX))}
                  maxLength={TASK_TITLE_MAX}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">
                  {title.length}/{TASK_TITLE_MAX}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">내용</label>
              <div className="relative">
                <textarea
                  rows={5}
                  placeholder="태스크 내용을 입력하세요 (선택)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, TASK_DESC_MAX))}
                  maxLength={TASK_DESC_MAX}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 pb-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-muted-foreground/50">
                  {description.length}/{TASK_DESC_MAX}
                </span>
              </div>
            </div>

            {activeTools.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-muted-foreground">툴</label>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-default">
                          <Info className="size-3 text-muted-foreground/50" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px] text-xs">
                        태스크가 속한 기능 영역이에요. 프로젝트에 등록된 툴 중 하나를 선택하면 태스크를 툴별로 분류할 수 있어요.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {toolLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <span className={tool ? "text-foreground" : "text-muted-foreground"}>
                        {tool
                          ? (activeTools.find((t) => t.slug === tool)?.name ?? tool)
                          : "툴 선택 (선택)"}
                      </span>
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    <DropdownMenuItem
                      onClick={() => setTool(null)}
                      className={cn("gap-2", !tool && "font-medium")}
                    >
                      선택 안 함
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {activeTools.map((t) => (
                      <DropdownMenuItem
                        key={t.slug}
                        onClick={() => setTool(t.slug)}
                        className={cn("gap-2", tool === t.slug && "font-medium")}
                      >
                        {t.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">중요도</label>
              <div className="flex gap-1.5">
                {PRIORITY_CREATE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPriority(value)}
                    className={cn(
                      "flex-1 cursor-pointer rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                      priority === value
                        ? PRIORITY_ACTIVE_STYLES[value]
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={!title.trim() || loading}>
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              만들기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

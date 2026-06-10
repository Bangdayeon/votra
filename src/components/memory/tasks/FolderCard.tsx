"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Folder, GripVertical, Loader2, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { deleteFolderAction } from "@/app/actions/deleteFolderAction";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { FolderRecord } from "@/domain/memory/types";

import { EditFolderDialog } from "./FolderDialogs";
import { FolderIconDisplay } from "./FolderIconDisplay";
import { getFolderColors } from "./taskConstants";

export function FolderCard({
  folder,
  total,
  inProgress,
  pending,
  onClick,
  projectId,
  onRenamed,
  onDeleted,
  dragHandleListeners,
  dragHandleAttributes,
}: {
  folder: FolderRecord | null;
  total: number;
  inProgress: number;
  pending: number;
  onClick: () => void;
  projectId: string;
  onRenamed?: (updated: FolderRecord) => void;
  onDeleted?: (id: string) => void;
  dragHandleListeners?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleAttributes?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDelete() {
    if (!folder) return;
    setDeleteLoading(true);
    try {
      await deleteFolderAction(projectId, folder.id);
      onDeleted?.(folder.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "폴더 삭제에 실패했어요.");
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  }

  const isUnclassified = folder === null;

  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-all hover:border-ring/40 hover:shadow-sm"
    >
      {dragHandleListeners && (
        <button
          type="button"
          {...dragHandleListeners}
          {...dragHandleAttributes}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-40 hover:!opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      )}

      {isUnclassified ? (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Folder className="size-4 text-muted-foreground" />
        </div>
      ) : (
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: getFolderColors(folder.color).bg }}
        >
          <FolderIconDisplay icon={folder.icon} color={folder.color} className="size-4" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{folder?.name ?? "미분류"}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{total}개</span>
          {inProgress > 0 && (
            <span className="rounded-full bg-blue-100 px-1.5 py-px text-blue-700 font-medium">
              진행 중 {inProgress}
            </span>
          )}
          {pending > 0 && inProgress === 0 && (
            <span className="text-muted-foreground">대기 {pending}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        {folder && onRenamed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => setEditOpen(true)}>수정</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-red-600 focus:text-red-600"
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {folder && onRenamed && (
        <EditFolderDialog
          open={editOpen}
          folder={folder}
          projectId={projectId}
          onClose={() => setEditOpen(false)}
          onUpdated={(updated) => { onRenamed(updated); }}
        />
      )}

      {folder && onDeleted && (
        <Dialog open={deleteOpen} onOpenChange={(v) => { if (!v) setDeleteOpen(false); }}>
          <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>폴더 삭제</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{folder.name}</span>
                을(를) 삭제할까요? 폴더 안의 태스크는 미분류로 이동돼요.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>취소</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading && <Loader2 className="size-3.5 animate-spin" />}
                삭제
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function SortableFolderCard(
  props: Omit<React.ComponentProps<typeof FolderCard>, "dragHandleListeners" | "dragHandleAttributes"> & { folder: FolderRecord },
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.folder.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-50" : ""}
    >
      <FolderCard {...props} dragHandleListeners={listeners} dragHandleAttributes={attributes} />
    </div>
  );
}

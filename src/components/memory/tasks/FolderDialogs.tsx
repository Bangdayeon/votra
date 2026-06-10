"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { createFolderAction } from "@/app/actions/createFolderAction";
import { updateFolderAction } from "@/app/actions/updateFolderAction";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FolderRecord } from "@/domain/memory/types";
import { cn } from "@/lib/utils";

import { FOLDER_COLOR_OPTIONS, FOLDER_ICON_OPTIONS, getFolderColors, type FolderColorValue, type FolderIconValue } from "./taskConstants";

export function CreateFolderDialog({
  open,
  projectId,
  onClose,
  onCreated,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: (folder: FolderRecord) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<FolderIconValue | null>(null);
  const [color, setColor] = useState<FolderColorValue | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setIcon(null);
      setColor(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const folder = await createFolderAction(projectId, name.trim(), icon, color);
      onCreated(folder);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "폴더 생성에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>새 폴더</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">이름</span>
              <input
                autoFocus
                type="text"
                placeholder="폴더 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">아이콘</span>
              <div className="grid grid-cols-6 gap-1.5">
                {FOLDER_ICON_OPTIONS.map(({ value, Icon }) => {
                  const { bg, fg } = getFolderColors(color);
                  const selected = icon === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setIcon(selected ? null : value)}
                      className={cn(
                        "flex size-9 cursor-pointer items-center justify-center rounded-lg border-2 transition-all",
                        selected ? "border-foreground/40 scale-110" : "border-transparent hover:scale-105",
                      )}
                      style={{ backgroundColor: bg }}
                    >
                      <Icon className="size-4" style={{ color: fg }} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">색상</span>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLOR_OPTIONS.map(({ value, bg, fg }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setColor(color === value ? null : value)}
                    className={cn(
                      "flex size-7 cursor-pointer items-center justify-center rounded-full border-2 transition-all",
                      color === value ? "border-foreground scale-110" : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: bg, borderColor: color === value ? fg : undefined }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              만들기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditFolderDialog({
  open,
  folder,
  projectId,
  onClose,
  onUpdated,
}: {
  open: boolean;
  folder: FolderRecord;
  projectId: string;
  onClose: () => void;
  onUpdated: (updated: FolderRecord) => void;
}) {
  const [name, setName] = useState(folder.name);
  const [icon, setIcon] = useState<FolderIconValue | null>(
    (folder.icon as FolderIconValue | null) ?? null,
  );
  const [color, setColor] = useState<FolderColorValue | null>(
    (folder.color as FolderColorValue | null) ?? null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(folder.name);
      setIcon((folder.icon as FolderIconValue | null) ?? null);
      setColor((folder.color as FolderColorValue | null) ?? null);
    }
  }, [open, folder]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const updated = await updateFolderAction(projectId, folder.id, name.trim(), icon, color);
      onUpdated(updated);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "폴더 수정에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>폴더 수정</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">이름</span>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">아이콘</span>
              <div className="grid grid-cols-6 gap-1.5">
                {FOLDER_ICON_OPTIONS.map(({ value, Icon }) => {
                  const { bg, fg } = getFolderColors(color);
                  const selected = icon === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setIcon(selected ? null : value)}
                      className={cn(
                        "flex size-9 cursor-pointer items-center justify-center rounded-lg border-2 transition-all",
                        selected ? "border-foreground/40 scale-110" : "border-transparent hover:scale-105",
                      )}
                      style={{ backgroundColor: bg }}
                    >
                      <Icon className="size-4" style={{ color: fg }} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">색상</span>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLOR_OPTIONS.map(({ value, bg, fg }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setColor(color === value ? null : value)}
                    className={cn(
                      "flex size-7 cursor-pointer items-center justify-center rounded-full border-2 transition-all",
                      color === value ? "border-foreground scale-110" : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: bg, borderColor: color === value ? fg : undefined }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

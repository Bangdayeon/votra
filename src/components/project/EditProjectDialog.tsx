"use client";

import { Info, Loader2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { updateProjectAction } from "@/app/actions/updateProject";
import type { FolderNode } from "@/shared/folder/types";
import type { Project } from "@/components/project/ProjectsContext";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { colorForFolder } from "@/lib/colorForFolder";
import { scanFolderTree } from "@/lib/scanFolderTree";

type Props = {
  /** null 이면 닫힘 */
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditProjectDialog({ project, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [codeTree, setCodeTree] = useState<FolderNode[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!project) return;
    setTitle(project.name);
    setDescription(project.description ?? "");
    setThumbnailUrl(project.image ?? null);
    setCodeTree(project.structure ?? null);
    setError(null);
  }, [project]);

  if (!project) return null;

  async function handlePickCodeFolder() {
    setError(null);
    const picker = (
      window as unknown as {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker;
    if (typeof picker !== "function") {
      setError("이 브라우저는 폴더 선택을 지원하지 않아요. Chrome/Edge/Brave 를 써주세요.");
      return;
    }
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await picker();
    } catch {
      return;
    }
    setScanning(true);
    try {
      const children = await scanFolderTree(handle, "");
      const rootName = handle.name || "프로젝트";
      setCodeTree([
        {
          name: rootName,
          color: colorForFolder(rootName, true),
          children,
          defaultOpen: true,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더를 읽지 못했어요.");
    } finally {
      setScanning(false);
    }
  }

  async function handleThumbnailSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("이미지는 1MB 이하만 가능해요.");
      return;
    }
    setError(null);
    const dataUrl = await readAsDataUrl(file);
    setThumbnailUrl(dataUrl);
  }

  function handleSave() {
    if (!project) return;
    startTransition(async () => {
      const result = await updateProjectAction({
        id: project.id,
        title: title.trim(),
        description: description.trim().length > 0 ? description.trim() : null,
        thumbnailUrl,
        structure: codeTree ? { tree: codeTree } : null,
      });
      if (result.ok) {
        onSaved();
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  const canSubmit = !pending && title.trim().length > 0;

  return (
    <Dialog open={project !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>프로젝트 수정</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <div className="font-medium">
              <span>프로젝트 이름</span>
              <span className="text-red-500"> *</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
            />
          </label>

          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">썸네일</span>
              <span className="text-xs text-muted-foreground my-1">
                권장 256×256 정사각형 · 1MB 이하
              </span>
            </div>
            <div className="relative size-16 shrink-0">
              <label
                className={cn(
                  "flex size-full cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/30 text-xs text-muted-foreground transition-colors hover:bg-muted/60",
                  thumbnailUrl && "border-solid",
                )}
              >
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl}
                    alt="썸네일"
                    className="size-full object-cover"
                  />
                ) : (
                  <span>선택</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailSelect}
                />
              </label>
              {thumbnailUrl && (
                <button
                  type="button"
                  onClick={() => setThumbnailUrl(null)}
                  aria-label="썸네일 제거"
                  className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            취소
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSubmit}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

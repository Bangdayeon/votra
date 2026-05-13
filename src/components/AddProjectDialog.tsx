"use client";

import { Info, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { addLocalProject } from "@/app/actions/addLocalProject";
import {
  discoverProjects,
  type DiscoverProjectsResult,
} from "@/app/actions/discoverProjects";
import type { FolderColor, FolderNode } from "@/components/FolderTree";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  ".cache",
  "dist",
  "build",
  "out",
  "coverage",
  ".vercel",
]);

type Props = { onAdded: () => void };

export function AddProjectDialog({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoverProjectsResult | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [codeTree, setCodeTree] = useState<FolderNode[] | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open && !discovered) {
      void runDiscover();
    }
  }, [open, discovered]);

  async function runDiscover() {
    setDiscovering(true);
    setError(null);
    try {
      const result = await discoverProjects();
      setDiscovered(result);
      if (result.claude.length > 0) {
        const first = result.claude[0];
        setSelectedKey(first.encodedPath);
        setTitle(first.shortName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로젝트 검색 실패");
    } finally {
      setDiscovering(false);
    }
  }

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
      const tree = await scanFolderTree(handle, "");
      const rootName = handle.name || "프로젝트";
      setCodeTree([
        {
          name: rootName,
          color: colorForFolder(rootName, true),
          children: tree,
          defaultOpen: true,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더를 읽지 못했어요.");
    } finally {
      setScanning(false);
    }
  }

  function handleSubmit() {
    if (!selectedKey) return;
    startTransition(async () => {
      const result = await addLocalProject({
        agentKind: "CLAUDE",
        encodedPath: selectedKey,
        title,
        description: description.trim() || undefined,
        tree: codeTree ?? undefined,
        thumbnailUrl: thumbnailUrl ?? undefined,
      });
      if (result.ok) {
        resetState();
        setOpen(false);
        onAdded();
      } else {
        setError(result.error);
      }
    });
  }

  function resetState() {
    setDiscovered(null);
    setSelectedKey(null);
    setTitle("");
    setDescription("");
    setCodeTree(null);
    setThumbnailUrl(null);
    setError(null);
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

  const claudeProjects = discovered?.claude ?? [];
  const canSubmit = !pending && selectedKey !== null && title.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start rounded-full px-3 py-2 text-sm font-normal text-muted-foreground"
        >
          <Plus className="size-4" />
          프로젝트 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-1.5">
            <DialogTitle>프로젝트 추가</DialogTitle>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="자세히 보기"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Info className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                  Claude Code 가 컴퓨터의 <code>~/.claude/projects</code> 폴더에 저장해 둔 작업 기록을 자동으로 읽어와요. 각 항목은 <code>claude</code> 명령어를 실행한 폴더(cwd) 별로 묶여 있어요.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <DialogDescription>
            AI 에이전트와 함께 작업한 프로젝트를 자동으로 찾았어요.
            <br />
            추가할 항목을 골라주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {discovering
                ? "검색 중..."
                : `${claudeProjects.length} 개 발견`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={runDiscover}
              disabled={discovering}
            >
              <RefreshCw className={cn("size-3", discovering && "animate-spin")} />
              다시 검색
            </Button>
          </div>

          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border border-border p-1">
            {claudeProjects.length === 0 && !discovering && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                아직 작업 기록이 없어요. Claude 와 한 번이라도 작업한 뒤 다시 와주세요.
              </li>
            )}
            {claudeProjects.map((p) => {
              const selected = p.encodedPath === selectedKey;
              return (
                <li key={p.encodedPath}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKey(p.encodedPath);
                      setTitle(p.shortName);
                    }}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      selected ? "bg-primary/10 text-primary" : "hover:bg-accent",
                    )}
                  >
                    <span className="font-medium">{p.shortName}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.displayPath} · 작업 {p.sessionCount} 번
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {selectedKey && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">프로젝트 이름</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
              />
            </label>
          )}

          {selectedKey && (
            <label className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">설명</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="이 프로젝트가 무슨 작업인지 한 줄로 적어보세요"
                className="resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
              />
            </label>
          )}

          {selectedKey && (
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">썸네일</span>
                <span className="text-xs text-muted-foreground">
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
          )}

          {selectedKey && (
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-medium">프로젝트 폴더</span>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label="자세히 보기"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Info className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                      코드 폴더를 골라두면 어떤 파일들이 있는지 보여주는 폴더 구조가 아키텍처 카드에 그려져요. 지금 안 골라도 프로젝트는 추가돼요. (Chrome / Edge / Brave 만 지원)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {codeTree ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                  <span className="text-sm">{codeTree[0]?.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCodeTree(null)}
                  >
                    제거
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePickCodeFolder}
                  disabled={scanning}
                  className="w-fit"
                >
                  {scanning && <Loader2 className="size-4 animate-spin" />}
                  폴더 선택
                </Button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            취소
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            추가
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

async function scanFolderTree(
  handle: FileSystemDirectoryHandle,
  basePath: string,
): Promise<FolderNode[]> {
  const tree: FolderNode[] = [];
  const entries = (
    handle as unknown as {
      entries: () => AsyncIterable<[string, FileSystemHandle]>;
    }
  ).entries();

  for await (const [name, child] of entries) {
    if (SKIP_DIRS.has(name)) continue;
    if (child.kind !== "directory") continue; // 파일은 트리에 넣지 않음
    const childPath = basePath ? `${basePath}/${name}` : name;
    const sub = await scanFolderTree(
      child as FileSystemDirectoryHandle,
      childPath,
    );
    tree.push({ name, color: colorForFolder(name, false), children: sub });
  }

  tree.sort((a, b) => a.name.localeCompare(b.name));
  return tree;
}

const HIDDEN_FOLDER_COLOR: FolderColor = "amber";
const ASSETS_FOLDER_COLOR: FolderColor = "yellow";
const DATA_FOLDER_COLOR: FolderColor = "green";
const SOURCE_FOLDER_COLOR: FolderColor = "blue";

const ASSET_NAMES = new Set([
  "public",
  "assets",
  "fonts",
  "images",
  "icons",
  "static",
  "media",
]);
const DATA_NAMES = new Set([
  "prisma",
  "migrations",
  "db",
  "database",
  "schema",
  "sql",
]);

function colorForFolder(name: string, isRoot: boolean): FolderColor {
  if (isRoot) return SOURCE_FOLDER_COLOR;
  if (name.startsWith(".")) return HIDDEN_FOLDER_COLOR;
  if (ASSET_NAMES.has(name)) return ASSETS_FOLDER_COLOR;
  if (DATA_NAMES.has(name)) return DATA_FOLDER_COLOR;
  return SOURCE_FOLDER_COLOR;
}

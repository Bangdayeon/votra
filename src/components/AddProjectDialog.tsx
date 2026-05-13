"use client";

import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { addLocalProject } from "@/app/actions/addLocalProject";
import {
  discoverProjects,
  type DiscoverProjectsResult,
} from "@/app/actions/discoverProjects";
import type { FolderNode } from "@/components/FolderTree";
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
  const [codeTree, setCodeTree] = useState<FolderNode[] | null>(null);
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
      setCodeTree([{ name: handle.name || "프로젝트", children: tree, defaultOpen: true }]);
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
        tree: codeTree ?? undefined,
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
    setCodeTree(null);
    setError(null);
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
          <DialogTitle>프로젝트 추가</DialogTitle>
          <DialogDescription>
            ~/.claude/projects 에서 자동 감지된 Claude Code 프로젝트 목록이에요. 클릭해서 추가하세요.
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
                감지된 프로젝트가 없어요. ~/.claude/projects/ 가 비어있을 수 있어요.
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
                      {p.displayPath} · 세션 {p.sessionCount} 개
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
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium">
                코드 폴더 <span className="text-xs text-muted-foreground">(선택, 아키텍처용)</span>
              </span>
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
    const childPath = basePath ? `${basePath}/${name}` : name;
    if (child.kind === "directory") {
      const sub = await scanFolderTree(child as FileSystemDirectoryHandle, childPath);
      tree.push({ name, children: sub });
    } else {
      tree.push({ name });
    }
  }

  tree.sort((a, b) => {
    const aDir = a.children !== undefined ? 0 : 1;
    const bDir = b.children !== undefined ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return a.name.localeCompare(b.name);
  });

  return tree;
}

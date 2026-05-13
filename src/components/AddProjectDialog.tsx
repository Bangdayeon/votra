"use client";

import { Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { addProject } from "@/app/actions/addProject";
import { detectAgent } from "@/domain/agent/detectAgent";
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

type ScanResult = {
  tree: FolderNode[];
  jsonlFiles: { path: string; content: string }[];
};

type Props = {
  onAdded: () => void;
};

export function AddProjectDialog({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [title, setTitle] = useState("");
  const [agentLabel, setAgentLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handlePickFolder() {
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
      const result = await scanDirectory(handle, "");
      const rootName = handle.name || "프로젝트";
      const rootTree: FolderNode[] = [
        { name: rootName, children: result.tree, defaultOpen: true },
      ];
      const folderFiles = result.jsonlFiles.map((f) => ({
        relativePath: f.path,
        readText: () => Promise.resolve(f.content),
      }));
      const adapter = detectAgent(folderFiles);
      setScan({ tree: rootTree, jsonlFiles: result.jsonlFiles });
      setTitle(rootName);
      setAgentLabel(adapter?.label ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더를 읽지 못했어요.");
    } finally {
      setScanning(false);
    }
  }

  function handleSubmit() {
    if (!scan) return;
    startTransition(async () => {
      const result = await addProject({
        title,
        tree: scan.tree,
        jsonlFiles: scan.jsonlFiles,
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
    setScan(null);
    setTitle("");
    setAgentLabel(null);
    setError(null);
  }

  const canSubmit =
    !pending && !scanning && scan !== null && title.length > 0 && agentLabel !== null;

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로젝트 추가</DialogTitle>
          <DialogDescription>
            로컬 폴더를 선택하면 jsonl 파일만 읽고 폴더 구조를 함께 저장해요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handlePickFolder}
            disabled={scanning || pending}
            className="w-fit"
          >
            {scanning && <Loader2 className="size-4 animate-spin" />}
            폴더 선택
          </Button>

          {scan && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <div>jsonl 파일 {scan.jsonlFiles.length} 개</div>
              <div className="text-muted-foreground">agent: {agentLabel ?? "감지 안 됨"}</div>
            </div>
          )}

          {scan && (
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

async function scanDirectory(
  handle: FileSystemDirectoryHandle,
  basePath: string,
): Promise<ScanResult> {
  const tree: FolderNode[] = [];
  const jsonlFiles: { path: string; content: string }[] = [];

  const entries = (
    handle as unknown as {
      entries: () => AsyncIterable<[string, FileSystemHandle]>;
    }
  ).entries();

  for await (const [name, child] of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const childPath = basePath ? `${basePath}/${name}` : name;

    if (child.kind === "directory") {
      const sub = await scanDirectory(child as FileSystemDirectoryHandle, childPath);
      tree.push({ name, children: sub.tree });
      jsonlFiles.push(...sub.jsonlFiles);
    } else {
      tree.push({ name });
      if (name.toLowerCase().endsWith(".jsonl")) {
        const file = await (child as FileSystemFileHandle).getFile();
        const text = await file.text();
        jsonlFiles.push({ path: childPath, content: text });
      }
    }
  }

  tree.sort((a, b) => {
    const aDir = a.children !== undefined ? 0 : 1;
    const bDir = b.children !== undefined ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return a.name.localeCompare(b.name);
  });

  return { tree, jsonlFiles };
}

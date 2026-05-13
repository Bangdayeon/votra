"use client";

import { Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { addProject } from "@/app/actions/addProject";
import { detectAgent } from "@/domain/agent/detectAgent";
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

type Props = {
  onAdded: () => void;
};

export function AddProjectDialog({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [agentLabel, setAgentLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFolderSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const all = Array.from(e.target.files ?? []);
    const jsonl = all.filter((f) => f.webkitRelativePath.toLowerCase().endsWith(".jsonl"));
    setFiles(jsonl);
    setError(null);

    if (jsonl.length === 0) {
      setAgentLabel(null);
      setTitle("");
      return;
    }
    setTitle(jsonl[0].webkitRelativePath.split("/")[0] ?? "프로젝트");

    const folderFiles = jsonl.map((f) => ({
      relativePath: f.webkitRelativePath,
      readText: () => f.text(),
    }));
    const adapter = detectAgent(folderFiles);
    setAgentLabel(adapter?.label ?? null);
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("__title", title);
      for (const file of files) {
        fd.append(file.webkitRelativePath, file);
      }
      const result = await addProject(fd);
      if (result.ok) {
        setOpen(false);
        setFiles([]);
        setTitle("");
        setAgentLabel(null);
        setError(null);
        onAdded();
      } else {
        setError(result.error);
      }
    });
  }

  const canSubmit = !pending && files.length > 0 && title.length > 0 && agentLabel !== null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            AI agent 세션이 들어있는 로컬 폴더를 선택하면 자동으로 감지해서 등록해요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">폴더 선택</span>
            <input
              type="file"
              multiple
              onChange={handleFolderSelect}
              ref={(el) => {
                if (el) el.setAttribute("webkitdirectory", "");
              }}
              className="cursor-pointer text-sm border px-2 py-1 rounded-md w-fit"
            />
          </label>

          {files.length > 0 && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <div>jsonl 파일 {files.length} 개 감지</div>
              <div className="text-muted-foreground">
                agent: {agentLabel ?? "감지 안 됨"}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">프로젝트 이름</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
            />
          </label>

          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
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

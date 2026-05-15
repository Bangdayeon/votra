"use client";

import { Check, Copy, Plus } from "lucide-react";
import { useState } from "react";

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

type Props = { onAdded: () => void };

export function AddProjectDialog({ onAdded }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onAdded();
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
            votra CLI 로 작업 기록을 업로드하면 자동으로 프로젝트가 만들어져요.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-col gap-4">
          <Step
            index={1}
            title="CLI 설치 (최초 1회)"
            command="npm i -g @votra/cli@latest"
          />
          <Step
            index={2}
            title="로그인 (로그아웃 상태일 때만)"
            command="votra signin"
          />
          <Step
            index={3}
            title="프로젝트 폴더 루트에서 업로드"
            command="votra upload --project"
            hint="실시간 동기화를 하고 싶다면 끝에 --watch 를 붙여주세요."
            extraCommand="votra upload --project --watch"
          />
        </ol>

        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type StepProps = {
  index: number;
  title: string;
  command: string;
  hint?: string;
  extraCommand?: string;
};

function Step({ index, title, command, hint, extraCommand }: StepProps) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
        {index}
      </span>
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="text-sm font-medium">{title}</span>
        <CommandBlock command={command} />
        {hint && (
          <p className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {extraCommand && <CommandBlock command={extraCommand} />}
      </div>
    </li>
  );
}

function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근이 막힌 환경 (브라우저 권한 거부 등) — 사용자가 직접 복사하면 돼요.
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
      <code className="truncate font-mono text-xs text-foreground">{command}</code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="명령어 복사"
        className={cn(
          "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          copied && "text-primary hover:text-primary",
        )}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

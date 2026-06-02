"use client";

import { Check, Copy, Plus, Terminal, Bot } from "lucide-react";
import { type ReactNode, useState } from "react";

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

type Props = {
  onAdded: () => void;
  children?: ReactNode;
};

export function AddProjectDialog({ onAdded, children }: Props) {
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
        {children ?? (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start rounded-full px-3 py-2 text-sm font-normal text-muted-foreground"
          >
            <Plus className="size-4" />
            프로젝트 추가
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>프로젝트 추가</DialogTitle>
          <DialogDescription>
            votra MCP 를 설치하고 AI agent 에게 brief 를 시키면 프로젝트가 자동으로 추가돼요.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-col gap-4">
          <Step
            index={1}
            source="terminal"
            title="CLI 설치 (최초 1회)"
            command="npm i -g @votra/cli@latest"
          />
          <Step
            index={2}
            source="terminal"
            title="MCP 설치 (최초 1회)"
            command="votra install"
          />
          <Step
            index={3}
            source="agent"
            title="로그인 (로그아웃 상태일 때만)"
            command="signin 해줘"
          />
          <Step
            index={4}
            source="agent"
            title="프로젝트 폴더 루트에서 세션 시작"
            command="brief 해줘"
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
  source: "terminal" | "agent";
};

function Step({ index, title, command, source }: StepProps) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
        {index}
      </span>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          <SourceBadge source={source} />
        </div>
        <CommandBlock command={command} source={source} />
      </div>
    </li>
  );
}

function SourceBadge({ source }: { source: "terminal" | "agent" }) {
  if (source === "terminal") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
        <Terminal className="size-2.5" />
        터미널
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
      <Bot className="size-2.5" />
      AI agent
    </span>
  );
}

function CommandBlock({ command, source }: { command: string; source: "terminal" | "agent" }) {
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
    <div className={cn(
      "flex items-center justify-between gap-2 rounded-md border px-3 py-2",
      source === "agent" ? "border-primary/20 bg-primary/5" : "border-border bg-muted/40",
    )}>
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

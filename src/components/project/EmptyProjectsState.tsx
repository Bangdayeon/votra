"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function EmptyProjectsState() {
  return (
    <div className="flex flex-col gap-6 h-full items-center justify-center px-8 py-6">
      <div className="flex flex-col gap-1 text-center text-sm text-muted-foreground">
        <p>아직 등록된 프로젝트가 없어요.</p>
        <p>votra mcp 설치 후 brief를 첫 실행하면 프로젝트가 추가돼요.</p>
      </div>

      <ol className="flex w-full max-w-md flex-col gap-4">
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
          title="프로젝트 폴더 루트에서 세션 실행 후 brief 명령"
          steps={[
            "프로젝트 폴더 루트로 이동",
            "AI agent 실행",
            "brief 첫 실행시켜서 프로젝트 추가",
          ]}
        />
      </ol>
    </div>
  );
}

type StepProps = {
  index: number;
  title: string;
  command?: string;
  hint?: string;
  extraCommand?: string;
  steps?: string[];
};

function Step({ index, title, command, hint, extraCommand, steps }: StepProps) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
        {index}
      </span>
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="text-sm font-medium">{title}</span>
        {steps && (
          <ol className="flex flex-col gap-1">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 font-medium text-foreground/60">{i + 1})</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}
        {command && <CommandBlock command={command} />}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
      // 클립보드 접근이 막힌 환경 — 사용자가 직접 복사하면 돼요.
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

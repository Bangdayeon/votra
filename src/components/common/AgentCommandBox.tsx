"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function AgentCommandBox({ command, className }: { command: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 무시
    }
  };

  return (
    <div className={cn("group relative pr-8", className)}>
      <div className="rounded-md border border-border bg-muted p-3">
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
          {command}
        </pre>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label="명령어 복사"
        title="복사"
        className="absolute right-0 top-1 cursor-pointer rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {copied ? (
          <Check className="size-3.5 text-green-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  );
}

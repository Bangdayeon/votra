"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function AgentCommandBox({ command }: { command: string }) {
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
    <div className="group relative pb-7">
      <div className="rounded-md border border-[#E4E2DD] bg-[#FAFAF8] p-3 pr-6">
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
          {command}
        </pre>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label="명령어 복사"
        title="복사"
        className="absolute bottom-1 right-0 cursor-pointer rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:bg-muted hover:text-foreground"
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

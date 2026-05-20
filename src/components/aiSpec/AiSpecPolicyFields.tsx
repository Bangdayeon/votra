"use client";

import { Upload, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import {
  AI_SPEC_FILE_MAX_BYTES,
  AI_SPEC_GUIDELINE_MAX,
  type AiSpecFileChange,
} from "@/domain/aiSpec/types";
import { cn } from "@/lib/utils";

export type AiSpecPolicyFieldsProps = {
  guideline: string;
  onGuidelineChange: (next: string) => void;
  existingFileName: string | null;
  fileChange: AiSpecFileChange;
  onFileChange: (next: AiSpecFileChange) => void;
  disabled?: boolean;
  guidelinePlaceholder?: string;
  fileHint?: string;
};

export function AiSpecPolicyFields({
  guideline,
  onGuidelineChange,
  existingFileName,
  fileChange,
  onFileChange,
  disabled = false,
  guidelinePlaceholder,
  fileHint,
}: AiSpecPolicyFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = async (file: File) => {
    if (file.size > AI_SPEC_FILE_MAX_BYTES) {
      toast.error("파일이 너무 커요. (최대 512KB)");
      return;
    }
    try {
      const content = await file.text();
      onFileChange({ kind: "upload", name: file.name, content });
    } catch {
      toast.error("파일을 읽지 못했어요.");
    }
  };

  const removeFile = () => {
    onFileChange(existingFileName ? { kind: "remove" } : { kind: "none" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const display = resolveFileDisplay(existingFileName, fileChange);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <textarea
          value={guideline}
          disabled={disabled}
          rows={12}
          maxLength={AI_SPEC_GUIDELINE_MAX}
          placeholder={guidelinePlaceholder}
          onChange={(e) => onGuidelineChange(e.target.value)}
          className={cn(
            "w-full rounded-md border border-[#E4E2DD] bg-white px-3 py-2 text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <p className="text-xs text-muted-foreground">
          {guideline.length} / {AI_SPEC_GUIDELINE_MAX}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {fileHint && (
          <p className="text-xs text-muted-foreground">{fileHint}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#E4E2DD] bg-white px-3 text-sm hover:bg-[#F2F0EB]",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <Upload className="size-4" />
            파일 선택
            <input
              ref={inputRef}
              type="file"
              accept=".md,.txt,.markdown,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {display && (
            <span className="inline-flex items-center gap-2 rounded-md border border-[#E4E2DD] bg-white px-2 py-1 text-xs">
              <span className="max-w-[16rem] truncate">{display.name}</span>
              <span className="text-muted-foreground">· {display.note}</span>
              <button
                type="button"
                onClick={removeFile}
                disabled={disabled}
                aria-label="파일 제거"
                className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function resolveFileDisplay(
  existingFileName: string | null,
  fileChange: AiSpecFileChange,
): { name: string; note: string } | null {
  if (fileChange.kind === "upload") {
    return { name: fileChange.name, note: "저장 시 업로드" };
  }
  if (fileChange.kind === "remove") {
    return existingFileName
      ? { name: existingFileName, note: "저장 시 제거" }
      : null;
  }
  if (existingFileName) {
    return { name: existingFileName, note: "업로드됨" };
  }
  return null;
}

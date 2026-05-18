"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { AiSpecPolicyFields } from "@/components/aiSpec/AiSpecPolicyFields";
import { useProjects } from "@/components/project/ProjectsContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildAiSpecPolicyPatch,
  type AiSpecFileChange,
} from "@/domain/aiSpec/types";

export function AiPolicySettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const { selected, projects } = useProjects();
  const projectId = selected?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [guideline, setGuideline] = useState("");
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [fileChange, setFileChange] = useState<AiSpecFileChange>({
    kind: "none",
  });
  const [pending, startSave] = useTransition();

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/projects/${projectId}`, { cache: "no-store" })
      .then(async (res) => {
        const data: unknown = await res.json();
        if (cancelled) return;
        if (isRecord(data) && data.ok === true) {
          setGuideline(
            typeof data.aiSpecGuideline === "string"
              ? data.aiSpecGuideline
              : "",
          );
          setExistingFileName(
            typeof data.aiSpecFileName === "string"
              ? data.aiSpecFileName
              : null,
          );
          setFileChange({ kind: "none" });
        }
      })
      .catch(() => {
        // 기본값 유지
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const onSave = () => {
    if (!projectId) return;
    startSave(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildAiSpecPolicyPatch(guideline, fileChange)),
        });
        const data: unknown = await res.json();
        if (!res.ok || !isRecord(data) || data.ok !== true) {
          const msg =
            isRecord(data) && typeof data.error === "string"
              ? data.error
              : "저장에 실패했어요.";
          toast.error(msg);
          return;
        }
        setExistingFileName(
          typeof data.aiSpecFileName === "string"
            ? data.aiSpecFileName
            : null,
        );
        setFileChange({ kind: "none" });
        toast.success("저장됐어요.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "저장에 실패했어요.",
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>회사/팀 AI 활용 정책</DialogTitle>
          <DialogDescription>
            {selected
              ? `'${selected.name}' 프로젝트에 회사·팀의 AI 활용 정책을 저장해요.`
              : "정책을 저장할 프로젝트가 필요해요."}
          </DialogDescription>
        </DialogHeader>

        {!projectId ? (
          <div className="flex flex-col gap-3 py-4 text-sm text-muted-foreground">
            {projects.length === 0 ? (
              <p>아직 프로젝트가 없어요. 먼저 프로젝트를 만들어 주세요.</p>
            ) : (
              <>
                <p>먼저 프로젝트를 선택해 주세요.</p>
                <ul className="flex flex-col gap-2">
                  {projects.slice(0, 5).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          router.push(`/${encodeURIComponent(p.name)}`);
                        }}
                        className="w-full rounded-md border border-[#E4E2DD] bg-white px-3 py-2 text-left text-sm text-foreground hover:bg-[#F2F0EB]"
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <AiSpecPolicyFields
            guideline={guideline}
            onGuidelineChange={setGuideline}
            existingFileName={existingFileName}
            fileChange={fileChange}
            onFileChange={setFileChange}
            disabled={loading || pending}
            guidelinePlaceholder="예) 고객 데이터를 포함한 코드를 외부 LLM 으로 보내지 않아요. 보안 관련 변경은 사람이 검토해요."
            fileHint="팀에서 이미 정리한 정책 문서가 있다면 텍스트 파일로 올려 주세요. (최대 512KB)"
          />
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            닫기
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={!projectId || loading || pending}
          >
            {pending ? "저장 중…" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

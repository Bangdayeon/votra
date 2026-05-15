"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { deleteProjectAction } from "@/app/actions/deleteProject";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  /** null 이면 닫힘 */
  project: { id: string; name: string } | null;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteProjectConfirmDialog({
  project,
  onClose,
  onDeleted,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (!project) return;
    startTransition(async () => {
      const result = await deleteProjectAction(project.id);
      if (result.ok) {
        onDeleted();
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog
      open={project !== null}
      onOpenChange={(next) => {
        if (!next) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로젝트 삭제</DialogTitle>
          <DialogDescription>
            <strong>{project?.name}</strong> 을(를) 정말 삭제할까요? 안에 있는 모든 세션과 데이터가 같이 사라져요.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

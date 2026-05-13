"use client";

import { Loader2, Trash2 } from "lucide-react";
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
  projectId: string;
  projectName: string;
  onDeleted: () => void;
  className?: string;
};

export function DeleteProjectButton({ projectId, projectName, onDeleted, className }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteProjectAction(projectId);
      if (result.ok) {
        setOpen(false);
        onDeleted();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={`${projectName} 삭제`}
        onClick={(e) => {
          e.stopPropagation();
          setError(null);
          setOpen(true);
        }}
        className={className}
      >
        <Trash2 className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로젝트 삭제</DialogTitle>
            <DialogDescription>
              <strong>{projectName}</strong> 을(를) 정말 삭제할까요? 안에 있는 모든 세션과 데이터가 같이 사라져요.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              취소
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirm} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

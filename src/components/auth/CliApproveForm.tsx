"use client";

import { useActionState } from "react";

import {
  approveCliSigninAction,
  type ApproveCliSigninState,
} from "@/app/actions/approveCliSignin";
import { switchCliAccountAction } from "@/app/actions/switchCliAccount";
import { Button } from "@/components/ui/button";

const INITIAL: ApproveCliSigninState = {};

export function CliApproveForm({
  callback,
  state,
  email,
}: {
  callback: string;
  state: string;
  email: string;
}) {
  const [actionState, action, pending] = useActionState(
    approveCliSigninAction,
    INITIAL,
  );

  return (
    <div className="flex flex-col gap-2">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="callback" value={callback} />
        <input type="hidden" name="state" value={state} />
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p>
            <span className="text-muted-foreground">계정</span>{" "}
            <span className="font-medium">{email}</span>
          </p>
          <p className="mt-1 break-all">
            <span className="text-muted-foreground">콜백</span>{" "}
            <span className="font-mono text-xs">{callback}</span>
          </p>
        </div>
        {actionState.error && (
          <p className="text-sm text-destructive">{actionState.error}</p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "연결 중…" : "CLI 연결 허용"}
        </Button>
      </form>
      <form action={switchCliAccountAction}>
        <input type="hidden" name="callback" value={callback} />
        <input type="hidden" name="state" value={state} />
        <Button type="submit" variant="ghost" className="w-full text-muted-foreground">
          다른 계정으로 변경
        </Button>
      </form>
    </div>
  );
}

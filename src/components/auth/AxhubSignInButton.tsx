"use client";

import { useTransition } from "react";

import { signInWithAxhubAction } from "@/app/actions/signInWithAxhub";
import { Button } from "@/components/ui/button";

export function AxhubSignInButton({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const result = await signInWithAxhubAction(next);
      if (result?.error) {
        // 간단한 인라인 알림. 폼 페이지 측에서 더 정교한 UI 가 필요해지면 폼 state 로 옮겨요.
        alert(result.error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={pending}
      className="w-full"
    >
      {pending ? "확인 중…" : "axhub 사용하기"}
    </Button>
  );
}

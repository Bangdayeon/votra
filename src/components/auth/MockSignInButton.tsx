"use client";

import { useTransition } from "react";

import { mockSignInAction } from "@/app/actions/mockSignIn";
import { Button } from "@/components/ui/button";

export function MockSignInButton({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      await mockSignInAction(next);
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={pending}
      className="w-full border-dashed border-orange-400 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/20"
    >
      {pending ? "로그인 중…" : "🛠 개발용 Mock 로그인"}
    </Button>
  );
}

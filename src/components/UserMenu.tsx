"use client";

import { CircleUserRound, LogOut } from "lucide-react";
import { useTransition } from "react";

import { signOutAction } from "@/app/actions/signOut";
import { useCurrentUser } from "@/components/CurrentUserContext";
import { Button } from "@/components/ui/button";

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser();
  const [pending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        disabled={pending}
        title={`${user.name ?? user.email} · 로그아웃`}
        aria-label="로그아웃"
      >
        <CircleUserRound className="size-7 text-muted-foreground" strokeWidth={1.5} />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <CircleUserRound
        className="size-7 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {user.name ?? user.email.split("@")[0]}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {user.email}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        disabled={pending}
        title="로그아웃"
        aria-label="로그아웃"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}

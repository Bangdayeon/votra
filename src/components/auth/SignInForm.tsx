"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction, type SignInState } from "@/app/actions/signIn";
import { AxhubSignInButton } from "@/components/auth/AxhubSignInButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INITIAL: SignInState = {};

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, INITIAL);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">로그인</h1>
        <p className="text-sm text-muted-foreground">
          votra 계정으로 로그인해요.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-3">
        {next && <input type="hidden" name="next" value={next} />}
        <label className="flex flex-col gap-1 text-sm">
          이메일
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        <Button type="submit" disabled={pending} className="mt-2">
          {pending ? "로그인 중…" : "로그인"}
        </Button>
      </form>

      <div className="relative flex items-center">
        <span className="flex-1 border-t border-border" />
        <span className="mx-3 text-xs text-muted-foreground">또는</span>
        <span className="flex-1 border-t border-border" />
      </div>

      <AxhubSignInButton next={next} />

      <p className="text-center text-sm text-muted-foreground">
        계정이 없으세요?{" "}
        <Link
          href={next ? `/auth/sign-up?next=${encodeURIComponent(next)}` : "/auth/sign-up"}
          className="text-primary underline"
        >
          회원가입
        </Link>
      </p>
    </div>
  );
}

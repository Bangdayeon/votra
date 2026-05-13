"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpAction, type SignUpState } from "@/app/actions/signUp";
import { AxhubSignInButton } from "@/components/AxhubSignInButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INITIAL: SignUpState = {};

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, INITIAL);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">회원가입</h1>
        <p className="text-sm text-muted-foreground">
          새 votra 계정을 만들어요.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-3">
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
          이름 (선택)
          <Input type="text" name="name" autoComplete="name" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호 (8자 이상)
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        <Button type="submit" disabled={pending} className="mt-2">
          {pending ? "가입 중…" : "가입하기"}
        </Button>
      </form>

      <div className="relative flex items-center">
        <span className="flex-1 border-t border-border" />
        <span className="mx-3 text-xs text-muted-foreground">또는</span>
        <span className="flex-1 border-t border-border" />
      </div>

      <AxhubSignInButton />

      <p className="text-center text-sm text-muted-foreground">
        이미 계정이 있으세요?{" "}
        <Link href="/auth/sign-in" className="text-primary underline">
          로그인
        </Link>
      </p>
    </div>
  );
}

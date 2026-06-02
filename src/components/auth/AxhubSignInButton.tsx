"use client";

import { useTransition } from "react";

import { signInWithAxhubAction } from "@/app/actions/signInWithAxhub";
import { Button } from "@/components/ui/button";

function AxhubIcon() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <g clipPath="url(#axhub-clip)">
        <path d="M0 11.5L7 1H8L10.5 4.5L9 6L8 4.5L4.5 9H8.5L6.5 11.5H0Z" fill="#0766FF" />
        <path d="M14.5 11L11.75 7L10.125 9L11.5 11H14.5Z" fill="#0766FF" />
        <path d="M12.5 3H15.5L12.25 7L10.625 9L9 11H6L12.5 3Z" fill="#FFBF00" />
      </g>
      <defs>
        <clipPath id="axhub-clip">
          <rect width="16" height="11" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

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
      {pending ? "확인 중…" : (
        <>
          <AxhubIcon />
          axhub로 시작하기
        </>
      )}
    </Button>
  );
}

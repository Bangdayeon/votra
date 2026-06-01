"use client";

import { AxhubSignInButton } from "@/components/auth/AxhubSignInButton";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export function SignInForm({ next }: { next?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <AxhubSignInButton next={next} />
      <GoogleSignInButton next={next} />
    </div>
  );
}

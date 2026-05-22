"use client";

import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, Users, ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { acceptProjectInviteAction } from "@/app/actions/acceptProjectInvite";
import type { ProjectInviteRow } from "@/app/actions/getProjectInviteInfo";
import { signOutForInviteAction } from "@/app/actions/signOutForInvite";
import { Button } from "@/components/ui/button";

type Props = {
  token: string;
  invite: ProjectInviteRow | null;
  userEmail: string;
};

export function InviteAcceptClient({ token, invite, userEmail }: Props) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);

  if (!invite) {
    return (
      <Card>
        <XCircle className="mx-auto size-12 text-destructive opacity-80" />
        <h1 className="mt-4 text-lg font-semibold">유효하지 않은 초대예요</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          링크가 만료됐거나 이미 사용된 초대예요.
        </p>
        <Button className="mt-6 w-full" onClick={() => router.push("/")}>
          홈으로 돌아가기
        </Button>
      </Card>
    );
  }

  const expired = invite.expiresAt < new Date();
  const alreadyAccepted = !!invite.acceptedAt;

  if (expired || alreadyAccepted) {
    return (
      <Card>
        <Clock className="mx-auto size-12 text-muted-foreground opacity-60" />
        <h1 className="mt-4 text-lg font-semibold">
          {alreadyAccepted ? "이미 사용된 초대예요" : "초대 링크가 만료됐어요"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          새 초대 링크를 프로젝트 소유자에게 요청해 주세요.
        </p>
        <Button className="mt-6 w-full" onClick={() => router.push("/")}>
          홈으로 돌아가기
        </Button>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CheckCircle className="mx-auto size-12 text-green-500" />
        <h1 className="mt-4 text-lg font-semibold">팀 합류 완료!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{invite.projectTitle}</span> 프로젝트에 합류했어요.
        </p>
        <Button
          className="mt-6 w-full"
          onClick={() => router.push(projectTitle ? `/${encodeURIComponent(projectTitle)}` : "/")}
        >
          프로젝트 보러 가기
        </Button>
      </Card>
    );
  }

  async function handleAccept() {
    setAccepting(true);
    try {
      const result = await acceptProjectInviteAction(token);
      if (result.ok) {
        setProjectTitle(result.projectTitle);
        setDone(true);
      } else {
        const msg =
          result.error === "ALREADY_ACCEPTED"
            ? "이미 수락된 초대예요."
            : result.error === "EXPIRED"
              ? "초대 링크가 만료됐어요."
              : "초대를 찾을 수 없어요.";
        toast.error(msg);
      }
    } catch {
      toast.error("오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <Card>
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 mx-auto">
        <Users className="size-6 text-primary" />
      </div>
      <h1 className="mt-4 text-lg font-semibold">팀 초대</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {invite.invitedByName ?? "누군가"}
        </span>
        님이{" "}
        <span className="font-medium text-foreground">{invite.projectTitle}</span>{" "}
        프로젝트에 초대했어요.
      </p>
      <AccountSwitcher email={userEmail} token={token} />
      <Button
        className="mt-4 w-full"
        onClick={handleAccept}
        disabled={accepting}
      >
        {accepting ? "처리 중..." : "초대 수락하기"}
      </Button>
    </Card>
  );
}

function AccountSwitcher({ email, token }: { email: string; token: string }) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function handleSwitch() {
    setSwitching(true);
    await signOutForInviteAction(token);
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm"
      >
        <span className="text-muted-foreground">로그인 계정</span>
        <span className="flex items-center gap-1.5 font-medium">
          {email}
          <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-2.5 text-xs text-muted-foreground">
            다른 계정으로 수락하려면 로그아웃 후 다시 로그인하세요.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleSwitch}
            disabled={switching}
          >
            {switching ? "처리 중..." : "다른 계정으로 변경"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-white px-8 py-10 text-center shadow-sm">
      {children}
    </div>
  );
}

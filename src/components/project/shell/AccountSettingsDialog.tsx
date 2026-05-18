"use client";

import {
  Globe2,
  LogOut,
  RotateCcw,
  Upload,
  UserCog,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { getUserAiPolicyAction } from "@/app/actions/getUserAiPolicy";
import { resetAccountAction } from "@/app/actions/resetAccount";
import { signOutAction } from "@/app/actions/signOut";
import { updateUserAiPolicyAction } from "@/app/actions/updateUserAiPolicy";
import { updateUserEmailAction } from "@/app/actions/updateUserEmail";
import { useCurrentUser } from "@/components/project/shell/CurrentUserContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const TEXT_MAX = 8000;
const FILE_MAX_BYTES = 512 * 1024;

type MenuKey = "account" | "policy";

type FileSlot =
  | { kind: "kept"; name: string }
  | { kind: "replaced"; name: string; content: string }
  | { kind: "removed" }
  | { kind: "empty" };

const MENU: { key: MenuKey; label: string; icon: React.ElementType }[] = [
  { key: "account", label: "계정 설정", icon: UserCog },
  { key: "policy", label: "전체 정책", icon: Globe2 },
];

export function AccountSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [active, setActive] = useState<MenuKey>("account");

  useEffect(() => {
    if (open) setActive("account");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 sm:max-w-3xl"
        style={{ width: "min(900px, calc(100vw - 2rem))" }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>설정</DialogTitle>
          <DialogDescription>
            계정 설정과 전체 정책을 관리해요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid h-[560px] grid-cols-[200px_1fr]">
          <nav className="flex flex-col gap-1 border-r border-border bg-[#F7F6F3] p-3">
            <h2 className="px-2 pb-2 text-xs font-medium text-muted-foreground">
              설정
            </h2>
            {MENU.map((m) => {
              const Icon = m.icon;
              const selected = m.key === active;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setActive(m.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    selected
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-[#EBE9E4]",
                  )}
                >
                  <Icon className="size-4" />
                  {m.label}
                </button>
              );
            })}
          </nav>

          <div className="custom-scrollbar overflow-y-auto p-6">
            {active === "account" ? (
              <AccountPane onClose={() => onOpenChange(false)} />
            ) : (
              <PolicyPane />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AccountPane({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const user = useCurrentUser();
  const [email, setEmail] = useState(user.email);
  const [emailPending, startEmailUpdate] = useTransition();
  const [signOutPending, startSignOut] = useTransition();
  const [resetPending, startReset] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);

  const emailDirty = email.trim() !== user.email && email.trim().length > 0;

  const onSaveEmail = () => {
    startEmailUpdate(async () => {
      const res = await updateUserEmailAction(email.trim());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("이메일이 변경됐어요.");
      router.refresh();
    });
  };

  const onSignOut = () => {
    startSignOut(async () => {
      await signOutAction();
    });
  };

  const onReset = () => {
    startReset(async () => {
      const res = await resetAccountAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("계정이 초기화됐어요.");
      setConfirmReset(false);
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-lg font-semibold">계정 설정</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          아이디·로그아웃·계정 초기화를 관리해요.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium">아이디 변경</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            로그인에 사용할 이메일을 변경할 수 있어요.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            disabled={emailPending}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            className={cn(
              "h-9 flex-1 rounded-md border border-[#E4E2DD] bg-white px-3 text-sm",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <Button
            type="button"
            onClick={onSaveEmail}
            disabled={!emailDirty || emailPending}
          >
            {emailPending ? "변경 중…" : "변경"}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium">로그아웃</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            현재 브라우저에서 로그아웃해요.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onSignOut}
          disabled={signOutPending}
          className="w-fit gap-2"
        >
          <LogOut className="size-4" />
          로그아웃
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium text-destructive">계정 초기화</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            계정은 유지하되, 등록한 프로젝트와 세션, 정책, 프로필 설정을 모두
            지워요. 되돌릴 수 없어요.
          </p>
        </div>
        {confirmReset ? (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-sm">정말 모든 프로젝트와 정책을 지울까요?</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmReset(false)}
                disabled={resetPending}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={onReset}
                disabled={resetPending}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {resetPending ? "초기화 중…" : "초기화"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmReset(true)}
            className="w-fit gap-2 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            <RotateCcw className="size-4" />
            계정 초기화
          </Button>
        )}
      </section>
    </div>
  );
}

function PolicyPane() {
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [initialText, setInitialText] = useState("");
  const [file, setFile] = useState<FileSlot>({ kind: "empty" });
  const [pending, startSave] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserAiPolicyAction()
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setText(res.policy.text);
          setInitialText(res.policy.text);
          setFile(
            res.policy.fileName
              ? { kind: "kept", name: res.policy.fileName }
              : { kind: "empty" },
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasChanges =
    text !== initialText ||
    file.kind === "replaced" ||
    file.kind === "removed";

  const onPickFile = async (picked: File) => {
    if (picked.size > FILE_MAX_BYTES) {
      toast.error("파일 용량이 너무 커요. (최대 512KB)");
      return;
    }
    const content = await picked.text();
    setFile({ kind: "replaced", name: picked.name, content });
  };

  const onRemoveFile = () => {
    setFile((prev) => (prev.kind === "empty" ? prev : { kind: "removed" }));
  };

  const onSave = () => {
    startSave(async () => {
      const filePayload =
        file.kind === "replaced"
          ? { name: file.name, content: file.content }
          : file.kind === "removed"
            ? null
            : undefined;
      const res = await updateUserAiPolicyAction({
        text,
        file: filePayload,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (file.kind === "replaced") {
        setFile({ kind: "kept", name: file.name });
      } else if (file.kind === "removed") {
        setFile({ kind: "empty" });
      }
      setInitialText(text);
      toast.success("저장됐어요.");
    });
  };

  const fileLabel =
    file.kind === "kept" || file.kind === "replaced" ? file.name : null;

  return (
    <div className="flex h-full flex-col gap-6">
      <header>
        <h2 className="text-lg font-semibold">전체 정책</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          이 계정의 모든 프로젝트에 공통으로 적용할 AI 활용 정책을 적어주세요.
          보안·민감 정보 처리 같은 기준이 여기에 들어가요.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="ai-policy-text">
          정책 본문
        </label>
        <textarea
          id="ai-policy-text"
          value={text}
          disabled={loading || pending}
          rows={8}
          maxLength={TEXT_MAX}
          placeholder="예) 고객 데이터를 포함한 코드를 외부 LLM 으로 보내지 않아요. 보안 관련 변경은 사람이 검토해요."
          onChange={(e) => setText(e.target.value)}
          className={cn(
            "min-h-[10rem] w-full resize-y rounded-md border border-[#E4E2DD] bg-white px-3 py-2 text-sm leading-6",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <div className="flex justify-end text-xs text-muted-foreground">
          {text.length} / {TEXT_MAX}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-medium">정책 파일</span>
        <p className="text-xs text-muted-foreground">
          이미 정리한 정책 문서가 있다면 텍스트 파일로 올려 주세요. (최대 512KB)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#E4E2DD] bg-white px-3 text-sm hover:bg-[#F2F0EB]",
              (loading || pending) && "pointer-events-none opacity-50",
            )}
          >
            <Upload className="size-4" />
            파일 선택
            <input
              type="file"
              accept=".md,.txt,.markdown,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPickFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {fileLabel && (
            <span className="inline-flex items-center gap-2 rounded-md border border-[#E4E2DD] bg-white px-2 py-1 text-xs">
              <span className="max-w-[16rem] truncate">{fileLabel}</span>
              <button
                type="button"
                onClick={onRemoveFile}
                disabled={loading || pending}
                aria-label="파일 제거"
                className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </span>
          )}
          {file.kind === "removed" && (
            <span className="text-xs text-muted-foreground">
              저장하면 파일이 제거돼요.
            </span>
          )}
        </div>
      </section>

      <div className="mt-auto flex justify-end pt-4">
        <Button
          type="button"
          onClick={onSave}
          disabled={loading || pending || !hasChanges}
        >
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </div>
  );
}

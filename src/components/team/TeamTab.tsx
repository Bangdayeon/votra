"use client";

import Image from "next/image";
import { Check, CircleUserRound, Copy, Crown, Eye, Loader2, MoreHorizontal, UserPlus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createProjectInviteAction } from "@/app/actions/createProjectInvite";
import {
  getProjectMembersAction,
  type ProjectMemberRow,
} from "@/app/actions/getProjectMembers";
import { updateMemberRoleAction } from "@/app/actions/updateMemberRole";
import { removeMemberAction } from "@/app/actions/removeMember";
import type { Project } from "@/components/project/ProjectsContext";
import { useProjectEvents } from "@/hooks/useProjectEvents";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PALETTE = [
  "#F38B7B", "#7BC67E", "#7BA6E0", "#E0B97B", "#B07BE0", "#E07BB6", "#7BE0D4",
];

function colorFromEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

function MemberAvatar({ member }: { member: ProjectMemberRow }) {
  const size = 36;
  if (!member.profileColor && !member.profileImage) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ width: size, height: size, backgroundColor: colorFromEmail(member.email) }}
      >
        {(member.name ?? member.email)[0]?.toUpperCase() ?? "?"}
      </span>
    );
  }
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: member.profileColor ? `#${member.profileColor}` : "transparent",
      }}
    >
      {member.profileImage ? (
        <Image
          src={member.profileImage}
          alt="프로필"
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-sm font-semibold text-white">
          {(member.name ?? member.email)[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </span>
  );
}

function RoleBadge({ role }: { role: "OWNER" | "MEMBER" }) {
  if (role === "OWNER") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        <Crown className="size-3" />
        Owner
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Eye className="size-3" />
      Member
    </span>
  );
}

function InviteDialog({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    setInviteUrl(null);
    setCopied(false);
    onClose();
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const { inviteUrl: url } = await createProjectInviteAction(projectId, null);
      setInviteUrl(url);
    } catch {
      toast.error("초대 링크 생성에 실패했어요.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("링크를 복사했어요.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>팀원 초대</DialogTitle>
        </DialogHeader>

        {!inviteUrl ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              초대 링크를 생성해서 팀원에게 공유하세요. 링크에 접속하면 프로젝트에 합류해요.
            </p>
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? (
                <><Loader2 className="mr-2 size-4 animate-spin" />생성 중...</>
              ) : (
                "초대 링크 생성"
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              아래 링크를 복사해서 팀원에게 공유하세요. 링크는 <span className="font-medium text-foreground">1일간</span> 유효해요.
            </p>
            <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-border bg-muted px-3 py-2">
              <span className="w-0 flex-1 truncate text-xs text-muted-foreground">
                {inviteUrl}
              </span>
              <button
                onClick={handleCopy}
                className="shrink-0 rounded p-1 transition-colors hover:bg-border"
                aria-label="링크 복사"
              >
                {copied ? (
                  <Check className="size-4 text-green-600" />
                ) : (
                  <Copy className="size-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setInviteUrl(null)}>
                새 링크 만들기
              </Button>
              <Button className="flex-1" onClick={handleClose}>
                완료
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type KickTarget = { userId: string; name: string };

export function TeamTab({
  selected,
  initialTeam,
}: {
  selected: Project;
  initialTeam?: { members: ProjectMemberRow[]; currentUserId: string };
}) {
  const [members, setMembers] = useState<ProjectMemberRow[]>(
    initialTeam?.members ?? [],
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    initialTeam?.currentUserId ?? null,
  );
  const [loading, setLoading] = useState(!initialTeam);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<KickTarget | null>(null);

  const loadMembers = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    getProjectMembersAction(selected.id)
      .then(({ members: m, currentUserId: uid }) => {
        if (!cancelled) {
          setMembers(m);
          setCurrentUserId(uid);
        }
      })
      .catch(() => { if (!cancelled) setMembers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selected.id]);

  const skipFirstFetch = useRef(!!initialTeam);
  useEffect(() => {
    if (skipFirstFetch.current) { skipFirstFetch.current = false; return; }
    return loadMembers();
  }, [loadMembers]);

  useProjectEvents(selected.id, loadMembers);

  const currentMember = members.find((m) => m.userId === currentUserId);
  const isOwner = currentMember?.role === "OWNER";

  async function handleRoleChange(targetUserId: string, newRole: "OWNER" | "MEMBER") {
    try {
      await updateMemberRoleAction(selected.id, targetUserId, newRole);
      toast.success("역할이 변경됐어요.");
      loadMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "역할 변경에 실패했어요.");
    }
  }

  async function handleKickConfirm() {
    if (!kickTarget) return;
    try {
      await removeMemberAction(selected.id, kickTarget.userId);
      toast.success(`${kickTarget.name}님을 내보냈어요.`);
      setKickTarget(null);
      loadMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "멤버 강퇴에 실패했어요.");
      setKickTarget(null);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="mb-4 flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h2 className="text-base font-semibold">팀 멤버</h2>
              {!loading && (
                <p className="text-xs text-muted-foreground">{members.length}명</p>
              )}
            </div>
            {isOwner && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInviteOpen(true)}
                className="gap-1.5"
              >
                <UserPlus className="size-3.5" />
                팀원 초대
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
              <CircleUserRound className="size-8 opacity-40" strokeWidth={1.5} />
              <p>멤버 정보를 불러올 수 없어요.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((member) => {
                const isSelf = member.userId === currentUserId;
                return (
                  <li key={member.userId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <MemberAvatar member={member} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.name ?? member.email}
                        {isSelf && <span className="ml-1 text-xs text-muted-foreground">(나)</span>}
                      </p>
                      {member.name && (
                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                      )}
                    </div>
                    <RoleBadge role={member.role} />
                    {isOwner && !isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="멤버 옵션"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {member.role === "MEMBER" ? (
                            <DropdownMenuItem onClick={() => handleRoleChange(member.userId, "OWNER")}>
                              소유자로 변경
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleRoleChange(member.userId, "MEMBER")}>
                              멤버로 변경
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              setKickTarget({
                                userId: member.userId,
                                name: member.name ?? member.email,
                              })
                            }
                          >
                            내보내기
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        projectId={selected.id}
      />

      <Dialog open={!!kickTarget} onOpenChange={(v: boolean) => !v && setKickTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{kickTarget?.name}님을 내보낼까요?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            이 멤버는 더 이상 프로젝트에 접근할 수 없어요. 나중에 다시 초대할 수 있어요.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setKickTarget(null)}>취소</Button>
            <Button
              variant="destructive"
              onClick={handleKickConfirm}
            >
              내보내기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

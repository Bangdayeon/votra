import { redirect } from "next/navigation";

import { getProjectInviteInfoAction } from "@/app/actions/getProjectInviteInfo";
import { InviteAcceptClient } from "@/app/invite/[token]/InviteAcceptClient";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, user] = await Promise.all([
    getProjectInviteInfoAction(token),
    getCurrentUser(),
  ]);

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3] p-4">
      <InviteAcceptClient token={token} invite={invite} userEmail={user.email} />
    </div>
  );
}

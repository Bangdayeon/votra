import { redirect } from "next/navigation";

import { listProjectsAction } from "@/app/actions/listProjects";
import { AppShell } from "@/components/AppShell";
import { getCurrentUser } from "@/infrastructure/auth/currentUser";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const initialProjects = await listProjectsAction();

  return (
    <AppShell initialProjects={initialProjects} currentUser={user}>
      {children}
    </AppShell>
  );
}

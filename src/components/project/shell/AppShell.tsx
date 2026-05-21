"use client";

import { ProjectsProvider, type Project } from "@/components/project/ProjectsContext";
import { CurrentUserProvider } from "@/components/project/shell/CurrentUserContext";
import { SideNavigation } from "@/components/project/shell/SideNavigation";
import { SidebarProvider, useSidebar } from "@/components/project/shell/SidebarContext";

export type AppShellUser = {
  id: string;
  email: string;
  name: string | null;
  profileColor: string | null;
  profileImage: string | null;
};

function ShellLayout({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();

  return (
    <div
      className="grid h-screen transition-[grid-template-columns] duration-200 ease-out"
      style={{ gridTemplateColumns: `${open ? 240 : 64}px 1fr` }}
    >
      <SideNavigation />
      <main className="custom-scrollbar overflow-auto bg-[#F7F6F3]">{children}</main>
    </div>
  );
}

export function AppShell({
  children,
  initialProjects,
  currentUser,
}: {
  children: React.ReactNode;
  initialProjects: Project[];
  currentUser: AppShellUser;
}) {
  return (
    <CurrentUserProvider user={currentUser}>
      <SidebarProvider>
        <ProjectsProvider initial={initialProjects}>
          <ShellLayout>{children}</ShellLayout>
        </ProjectsProvider>
      </SidebarProvider>
    </CurrentUserProvider>
  );
}

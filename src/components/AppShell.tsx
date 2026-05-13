"use client";

import { ProjectsProvider, type Project } from "@/components/ProjectsContext";
import { SideNavigation } from "@/components/SideNavigation";
import { SidebarProvider, useSidebar } from "@/components/SidebarContext";

function ShellLayout({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  return (
    <div
      className="grid h-screen transition-[grid-template-columns] duration-200 ease-out"
      style={{ gridTemplateColumns: `${open ? 240 : 64}px 1fr` }}
    >
      <SideNavigation />
      <main className="overflow-auto bg-[#F7F6F3]">{children}</main>
    </div>
  );
}

export function AppShell({
  children,
  initialProjects,
}: {
  children: React.ReactNode;
  initialProjects: Project[];
}) {
  return (
    <SidebarProvider>
      <ProjectsProvider initial={initialProjects}>
        <ShellLayout>{children}</ShellLayout>
      </ProjectsProvider>
    </SidebarProvider>
  );
}

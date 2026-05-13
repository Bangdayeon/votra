"use client";

import { ProjectsProvider } from "@/components/ProjectsContext";
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

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ProjectsProvider>
        <ShellLayout>{children}</ShellLayout>
      </ProjectsProvider>
    </SidebarProvider>
  );
}

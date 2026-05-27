"use client";

import { useLayoutEffect } from "react";

import { ProjectsProvider, type Project } from "@/components/project/ProjectsContext";
import { Icon } from "@/components/common/Icon";
import { CurrentUserProvider } from "@/components/project/shell/CurrentUserContext";
import { SideNavigation } from "@/components/project/shell/SideNavigation";
import { SidebarProvider, useSidebar } from "@/components/project/shell/SidebarContext";
import { Button } from "@/components/ui/button";

export type AppShellUser = {
  id: string;
  email: string;
  name: string | null;
  profileColor: string | null;
  profileImage: string | null;
};

function ShellLayout({ children }: { children: React.ReactNode }) {
  const { open, toggleMobile, mobileOpen } = useSidebar();
  const sidebarWidth = open ? 240 : 64;

  useLayoutEffect(() => {
    function update() {
      const isMobile = window.innerWidth < 640;
      document.documentElement.style.setProperty(
        "--sidebar-width",
        isMobile ? "0px" : `${sidebarWidth}px`,
      );
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [sidebarWidth]);

  return (
    <div
      className="h-screen flex flex-col sm:grid sm:transition-[grid-template-columns] sm:duration-200 sm:ease-out"
      style={{ gridTemplateColumns: `${sidebarWidth}px 1fr` }}
    >
      <SideNavigation />
      <main className="custom-scrollbar flex-1 min-h-0 sm:flex-none overflow-auto bg-background">
        {children}
      </main>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMobile}
        aria-label="메뉴 열기"
        aria-expanded={mobileOpen}
        className="sm:hidden fixed bottom-4 left-4 z-40 bg-background border border-border shadow-sm"
      >
        <Icon icon="IC_Sidenav" />
      </Button>
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

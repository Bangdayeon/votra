"use client";

import { createContext, useContext, useMemo, useState } from "react";

type SidebarCtx = {
  open: boolean;
  setOpen: (value: boolean) => void;
  toggle: () => void;
  mobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarCtx | null>(null);

export function useSidebar(): SidebarCtx {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used inside <SidebarProvider>");
  }
  return ctx;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const value = useMemo<SidebarCtx>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((v) => !v),
      mobileOpen,
      toggleMobile: () => setMobileOpen((v) => !v),
      closeMobile: () => setMobileOpen(false),
    }),
    [open, mobileOpen],
  );
  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

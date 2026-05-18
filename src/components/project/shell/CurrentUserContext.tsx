"use client";

import { createContext, useContext } from "react";

import type { AppShellUser } from "@/components/project/shell/AppShell";

const CurrentUserContext = createContext<AppShellUser | null>(null);

export function useCurrentUser(): AppShellUser {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error(
      "useCurrentUser must be used inside <CurrentUserProvider>",
    );
  }
  return ctx;
}

export function CurrentUserProvider({
  user,
  children,
}: {
  user: AppShellUser;
  children: React.ReactNode;
}) {
  return (
    <CurrentUserContext.Provider value={user}>
      {children}
    </CurrentUserContext.Provider>
  );
}

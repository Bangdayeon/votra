"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeSetting = "light" | "dark" | "system";

const ThemeContext = createContext<{
  theme: ThemeSetting;
  setTheme: (t: ThemeSetting) => void;
}>({ theme: "system", setTheme: () => {} });

function applyTheme(setting: ThemeSetting) {
  const isDark =
    setting === "dark" ||
    (setting === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSetting>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as ThemeSetting | null;
    const initial =
      stored === "dark" || stored === "light" || stored === "system"
        ? stored
        : "system";
    setThemeState(initial);
    applyTheme(initial);

    if (initial === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => applyTheme("system");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
  }, []);

  const setTheme = (next: ThemeSetting) => {
    setThemeState(next);
    localStorage.setItem("theme", next);
    applyTheme(next);

    if (next === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => applyTheme("system");
      mq.addEventListener("change", onChange);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

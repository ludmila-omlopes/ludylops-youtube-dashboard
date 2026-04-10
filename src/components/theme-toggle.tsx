"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const storageKey = "pipetz-theme";

type ThemeMode = "light" | "dark";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof document !== "undefined") {
      const rootTheme = document.documentElement.dataset.theme;
      if (rootTheme === "dark" || rootTheme === "light") {
        return rootTheme;
      }
    }

    return "light";
  });

  function handleToggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      onClick={handleToggle}
      variant="accent"
      size="xs"
      className="min-w-[104px]"
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-pressed={isDark}
      suppressHydrationWarning
    >
      <span className="mono tracking-[0.18em]" suppressHydrationWarning>
        {isDark ? "LIGHT ->" : "DARK ->"}
      </span>
    </Button>
  );
}

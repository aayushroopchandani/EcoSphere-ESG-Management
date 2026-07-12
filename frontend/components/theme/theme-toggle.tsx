"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark";

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("ecosphere-theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem("ecosphere-theme", theme);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const isDark = theme === "dark";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const nextTheme = getPreferredTheme();
      applyTheme(nextTheme);
      setTheme(nextTheme);
      setMounted(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  function handleToggle() {
    const nextTheme = isDark ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      aria-label="Toggle color theme"
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-emerald-400 dark:hover:text-emerald-300",
        className,
      )}
      onClick={handleToggle}
      type="button"
    >
      {mounted && isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

"use client";
import { useEffect, useState } from "react";

/** Light/dark toggle. Persists the choice in localStorage (client-only, not sensitive). */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("gbs-theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("gbs-theme", next ? "dark" : "light");
  }

  return (
    <button onClick={toggle} className="btn-ghost text-xs" aria-label="Toggle dark mode">
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}

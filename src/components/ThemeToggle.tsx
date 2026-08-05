"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // ignore — theme just won't persist across reloads
    }
  }

  return (
    <button
      onClick={toggle}
      className="btn-official"
      style={{
        color: "#F1F3F1",
        border: "1px solid var(--color-brass)",
        padding: "6px 10px",
        background: "transparent",
      }}
      aria-label="Toggle dark mode"
    >
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}

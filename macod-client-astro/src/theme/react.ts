import { useEffect, useState } from "react";
import { applyTheme, detectTheme, persistTheme, type Theme } from "./config";

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => detectTheme());

  useEffect(() => {
    const sync = () => setTheme(detectTheme());
    window.addEventListener("macod:theme", sync);
    return () => window.removeEventListener("macod:theme", sync);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return theme;
}

export function toggleTheme(theme: Theme): void {
  persistTheme(theme === "dark" ? "light" : "dark");
}

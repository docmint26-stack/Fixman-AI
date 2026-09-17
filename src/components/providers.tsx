"use client";

import * as React from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");

  React.useEffect(() => {
    const stored = window.localStorage.getItem("puvexa-theme");
    const initial: "dark" | "light" =
      stored === "light" || stored === "dark" ? stored : "dark";
    document.documentElement.classList.toggle("dark", initial === "dark");
    queueMicrotask(() => setTheme(initial));
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("puvexa-theme", theme);
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const ThemeContext = React.createContext<{
  theme: "dark" | "light";
  setTheme: React.Dispatch<React.SetStateAction<"dark" | "light">>;
  toggleTheme: () => void;
}>({ theme: "dark", setTheme: () => {}, toggleTheme: () => {} });

export function useTheme() {
  return React.useContext(ThemeContext);
}
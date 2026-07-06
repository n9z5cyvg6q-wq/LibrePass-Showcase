import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "auto";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "auto",
  setTheme: () => {},
  resolvedTheme: "light",
});

export const useTheme = () => useContext(ThemeContext);

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("librepass-theme") as Theme) || "auto";
  });

  const resolvedTheme = theme === "auto" ? getSystemTheme() : theme;

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("librepass-theme", t);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");

    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        root.classList.toggle("dark", mq.matches);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme, resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

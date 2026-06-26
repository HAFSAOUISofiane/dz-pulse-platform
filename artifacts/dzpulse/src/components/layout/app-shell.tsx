import { useState, useEffect } from "react";
import { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";

interface AppShellProps {
  children: ReactNode;
  hideFooter?: boolean;
}

export function AppShell({ children, hideFooter = false }: AppShellProps) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("dzpulse_theme");
    return saved === "dark";
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("dzpulse_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("dzpulse_theme", "light");
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header onThemeToggle={() => setIsDark(!isDark)} isDark={isDark} />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}

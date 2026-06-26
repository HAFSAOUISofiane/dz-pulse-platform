import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type PlatformMode = "all" | "professional" | "social";

interface PlatformModeContextValue {
  mode: PlatformMode;
  setMode: (mode: PlatformMode) => void;
}

const PlatformModeContext = createContext<PlatformModeContextValue>({
  mode: "all",
  setMode: () => {},
});

export function PlatformModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PlatformMode>(() => {
    try {
      const saved = localStorage.getItem("dzpulse_platform_mode") as PlatformMode;
      return saved === "professional" || saved === "social" ? saved : "all";
    } catch {
      return "all";
    }
  });

  useEffect(() => {
    try { localStorage.setItem("dzpulse_platform_mode", mode); } catch {}
    const root = document.documentElement;
    root.classList.remove("theme-professional");
    if (mode === "professional") root.classList.add("theme-professional");
  }, [mode]);

  return (
    <PlatformModeContext.Provider value={{ mode, setMode: setModeState }}>
      {children}
    </PlatformModeContext.Provider>
  );
}

export function usePlatformMode() {
  return useContext(PlatformModeContext);
}

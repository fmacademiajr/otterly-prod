import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { storage } from "@/src/utils/storage";
import { colorsDark, colorsLight, ThemeColors } from "./tokens";

type Mode = "light" | "dark" | "system";

type ThemeCtx = {
  mode: Mode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (m: Mode) => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = "otterly.theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<Mode>("system");

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem<string>(STORAGE_KEY, "system");
      if (stored === "light" || stored === "dark" || stored === "system") {
        setModeState(stored);
      }
    })();
  }, []);

  const isDark =
    mode === "dark" || (mode === "system" && system === "dark");
  const colors = isDark ? colorsDark : colorsLight;

  const setMode = (m: Mode) => {
    setModeState(m);
    storage.setItem(STORAGE_KEY, m);
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

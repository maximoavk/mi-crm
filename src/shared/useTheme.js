import { useContext } from "react";
import { ThemeCtx } from "./themeCtx.js";

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}

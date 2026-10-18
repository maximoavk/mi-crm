// Proveedor del modo claro/oscuro del rediseño — persiste en localStorage y
// expone los colores activos (C) y el objeto theme para pasarle a los
// componentes compartidos (shared/ui.jsx, finanzas/ui.jsx, etc). El hook
// useTheme() vive en useTheme.js (regla react-refresh: .jsx solo componentes).
import { useState, useEffect } from "react";
import { COLORS_LIGHT, COLORS_NIGHT, LIGHT_THEME, DARK_THEME } from "../theme.js";
import { ThemeCtx } from "./themeCtx.js";

const STORAGE_KEY = "polygonos-theme-mode";

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* localStorage no disponible */ }
  }, [mode]);

  const toggleMode = () => setMode(m => m === "dark" ? "light" : "dark");
  const C = mode === "dark" ? COLORS_NIGHT : COLORS_LIGHT;
  const theme = mode === "dark" ? DARK_THEME : LIGHT_THEME;

  return <ThemeCtx.Provider value={{ mode, toggleMode, C, theme }}>{children}</ThemeCtx.Provider>;
}

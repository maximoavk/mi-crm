// Objeto de contexto puro, separado de ThemeContext.jsx/useTheme.js para
// cumplir la regla de que los .jsx solo exporten componentes (react-refresh).
import { createContext } from "react";

export const ThemeCtx = createContext(null);

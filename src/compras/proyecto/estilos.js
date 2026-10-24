// Estilos base de campos de los modales de "Compras del proyecto". Sin
// colores fijos a propósito: antes traían COLORS (la paleta oscura vieja,
// siempre igual sin importar el tema activo) y el campo salía negro sobre
// el fondo claro. Cada pantalla arma su versión final con su `C` de
// useTheme() — ver el patrón en ComprasProyectoView.jsx.
import { FONT } from "../../theme.js";

export const campoBase = {
  width:"100%", borderRadius:6, padding:"7px 9px",
  fontFamily:FONT, fontSize:12, outline:"none", boxSizing:"border-box",
};
export const etiquetaBase = { fontFamily:FONT, fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 };

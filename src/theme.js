export const COLORS_DARK = {
  bg: "#0A0C10", surface: "#111318", card: "#161A22", border: "#1E2530",
  accent: "#00C2FF", accentDim: "#00C2FF22", accentGlow: "#00C2FF44",
  secondary: "#3B82F6",
  green: "#00E5A0", yellow: "#FFB800", red: "#FF4D6A", purple: "#A855F7",
  text: "#E8ECF4", textMuted: "#9BAAC4", textDim: "#4A5778",
};
export const COLORS = { ...COLORS_DARK };
export const FONT = "'DM Mono', 'Courier New', monospace";
export const FONT_DISPLAY = "'Space Grotesk', sans-serif";

// ── Sidebar del nuevo rediseño — fijo (no cambia con el modo claro/oscuro
// del contenido), visible en toda la app desde ya. Ver docs/paleta.
export const SIDEBAR = {
  bg: "#0B2A4A", border: "#15426B", activeBg: "#15426B",
  accent: "#4FB8E8", accentDim: "#4FB8E822", accentGlow: "#4FB8E844",
  text: "#F2F6FA", textMuted: "#8FADC9", textDim: "#51708E",
};

// ── Modo Claro (en construcción — por ahora solo el Dashboard). Colores
// aproximados desde la maqueta de Figma; ajustar hex exactos si hace falta.
export const COLORS_LIGHT = {
  bg: "#EDE6D8", surface: "#FFFFFF", card: "#FFFFFF", border: "#E0D6C2",
  accent: "#2C7BC9", accentDim: "#2C7BC922", accentGlow: "#2C7BC944",
  secondary: "#3B82F6",
  green: "#1E9478", yellow: "#E8A33D", red: "#D6453D", purple: "#6B5CA0",
  text: "#1A2B3C", textMuted: "#5B6B7D", textDim: "#8A96A3",
};

// Fuentes del Modo Claro: Manrope para texto, JetBrains Mono para números.
export const FONT_BODY = "'Manrope', sans-serif";
export const FONT_NUM  = "'JetBrains Mono', monospace";

// Para pasarle a los componentes compartidos de shared/ui.jsx (Modal, Input,
// Select, AddBtn, Badge, Stat) en las pantallas ya migradas al Modo Claro:
// <Modal theme={LIGHT_THEME} .../>. El título/heading sigue en Space Grotesk
// vía fontDisplay — solo el texto de cuerpo pasa a Manrope.
export const LIGHT_THEME = { colors: COLORS_LIGHT, font: FONT_BODY, fontDisplay: "'Space Grotesk', sans-serif" };

// ── Modo Oscuro del rediseño (distinto del COLORS_DARK viejo de arriba,
// que es el tema cian/negro previo al rediseño y sigue usándose en las
// pantallas aún no migradas). Pensado para combinar con SIDEBAR, que es
// fijo e igual en ambos modos. Ver maqueta en Pencil (17-oct-2026).
export const COLORS_NIGHT = {
  bg: "#14171C", surface: "#1B1F26", card: "#1B1F26", border: "#2A2F38",
  accent: "#4FB8E8", accentDim: "#4FB8E822", accentGlow: "#4FB8E844",
  secondary: "#5B9CF2",
  green: "#2DBF95", yellow: "#F0B84D", red: "#F0615A", purple: "#9C8AD1",
  text: "#EDEEF2", textMuted: "#8C96A6", textDim: "#5B6472",
};
export const DARK_THEME = { colors: COLORS_NIGHT, font: FONT_BODY, fontDisplay: "'Space Grotesk', sans-serif" };

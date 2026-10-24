// Componentes base de UI compartidos entre módulos.
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";

// Tema por defecto (oscuro, el de siempre) — las pantallas migradas al Modo
// Claro pasan `theme={{ colors:COLORS_LIGHT, font:FONT_BODY, fontDisplay:FONT_BODY }}`
// sin que el resto de la app (que no pasa nada) se vea afectado.
const DEFAULT_THEME = { colors: COLORS, font: FONT, fontDisplay: FONT_DISPLAY };

// ── COMMON UI ───────────────────────────────────────────────────────────────
export const Badge = ({ color, children, theme }) => {
  const { font } = theme || DEFAULT_THEME;
  return (
    <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:4, fontSize:11, fontFamily:font, fontWeight:600, letterSpacing:"0.06em", background:color+"22", color, border:`1px solid ${color}44`, textTransform:"uppercase" }}>{children}</span>
  );
};

export const Stat = ({ label, value, sub, color, theme }) => {
  const { colors:C, font, fontDisplay } = theme || DEFAULT_THEME;
  return (
    <div style={{ padding:"16px 20px", background:C.card, border:`1px solid ${C.border}`, borderRadius:10 }}>
      <div style={{ fontFamily:font, fontSize:10, color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:fontDisplay, fontSize:22, fontWeight:700, color:color||C.text }}>{value}</div>
      {sub && <div style={{ fontFamily:font, fontSize:11, color:C.textMuted, marginTop:3 }}>{sub}</div>}
    </div>
  );
};

export const Input = ({ label, theme, ...props }) => {
  const { colors:C, font } = theme || DEFAULT_THEME;
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ fontFamily:font, fontSize:11, color:C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>}
      <input {...props} style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, padding:"9px 12px", fontFamily:font, fontSize:13, color:C.text, outline:"none", boxSizing:"border-box" }} />
    </div>
  );
};

export const Select = ({ label, children, theme, ...props }) => {
  const { colors:C, font } = theme || DEFAULT_THEME;
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ fontFamily:font, fontSize:11, color:C.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>}
      <select {...props} style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, padding:"9px 12px", fontFamily:font, fontSize:13, color:C.text, outline:"none", boxSizing:"border-box" }}>{children}</select>
    </div>
  );
};

// fullScreen (solo móvil): ocupa toda la pantalla, con botón "Volver" arriba
// en vez de la ✕ y los botones fijos al pie.
export const Modal = ({ title, onClose, onSubmit, children, theme, fullScreen }) => {
  const { colors:C, fontDisplay } = theme || DEFAULT_THEME;
  if (fullScreen) return (
    <div style={{ position:"fixed", inset:0, background:C.surface, zIndex:200, display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <button onClick={onClose} aria-label="Volver" style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 12px", color:C.text, fontFamily:fontDisplay, fontSize:13, fontWeight:600, cursor:"pointer" }}>
          <span style={{ fontSize:16, lineHeight:1 }}>←</span>Volver
        </button>
        <div style={{ flex:1, minWidth:0, fontFamily:fontDisplay, fontSize:16, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:16 }}>{children}</div>
      <div style={{ display:"flex", gap:10, padding:"12px 16px", paddingBottom:"calc(12px + env(safe-area-inset-bottom))", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
        <button onClick={onClose} style={{ flex:1, padding:"11px 0", background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, color:C.textMuted, fontFamily:fontDisplay, fontSize:13, cursor:"pointer" }}>Cancelar</button>
        <button onClick={onSubmit} style={{ flex:2, padding:"11px 0", background:C.accent, border:"none", borderRadius:6, color:C===COLORS?C.bg:"#fff", fontFamily:fontDisplay, fontSize:13, fontWeight:700, cursor:"pointer" }}>Guardar</button>
      </div>
    </div>
  );
  return (
    <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:480, maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:fontDisplay, fontSize:16, fontWeight:700, color:C.text }}>{title}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        {children}
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, color:C.textMuted, fontFamily:fontDisplay, fontSize:13, cursor:"pointer" }}>Cancelar</button>
          <button onClick={onSubmit} style={{ flex:2, padding:"10px 0", background:C.accent, border:"none", borderRadius:6, color:C===COLORS?C.bg:"#fff", fontFamily:fontDisplay, fontSize:13, fontWeight:700, cursor:"pointer" }}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

export const AddBtn = ({ onClick, label, theme, style }) => {
  const { colors:C, fontDisplay } = theme || DEFAULT_THEME;
  return (
    <button onClick={onClick} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"9px 18px", background:C.accent, border:"none", borderRadius:7, color:C===COLORS?C.bg:"#fff", fontFamily:fontDisplay, fontSize:13, fontWeight:700, cursor:"pointer", ...style }}>
      <span style={{ fontSize:18, lineHeight:1 }}>+</span>{label}
    </button>
  );
};

export const Loader = () => (
  <div style={{ textAlign:"center", padding:40, fontFamily:FONT, color:COLORS.textMuted, fontSize:13 }}>Cargando…</div>
);

// Modal de vista previa de PDF — se muestra dentro de la misma pestaña (iframe)
// en vez de abrir una pestaña nueva, porque Firefox no deja navegar una pestaña
// ya abierta hacia una URL blob: creada en otra ventana (aunque sea el mismo
// origen), lo que dejaba la pestaña en blanco. Al vivir el <iframe> en la misma
// ventana que generó el blob, no depende de ese comportamiento entre navegadores.
export function PdfPreviewModal({ url, onClose }) {
  if (!url) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:9999, display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", padding:8, background:"#0f172a" }}>
        <button onClick={onClose} style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:4, padding:"6px 12px", cursor:"pointer", fontSize:13, fontFamily:FONT }}>Cerrar ✕</button>
      </div>
      <iframe src={url} title="Vista previa PDF" style={{ flex:1, border:"none", background:"#fff" }} />
    </div>
  );
}

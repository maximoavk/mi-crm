// Componentes base de UI compartidos entre módulos.
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";

// ── COMMON UI ───────────────────────────────────────────────────────────────
export const Badge = ({ color, children }) => (
  <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:4, fontSize:11, fontFamily:FONT, fontWeight:600, letterSpacing:"0.06em", background:color+"22", color, border:`1px solid ${color}44`, textTransform:"uppercase" }}>{children}</span>
);

export const Stat = ({ label, value, sub, color }) => (
  <div style={{ padding:"16px 20px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10 }}>
    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
    <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:color||COLORS.text }}>{value}</div>
    {sub && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>{sub}</div>}
  </div>
);

export const Input = ({ label, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>}
    <input {...props} style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
  </div>
);

export const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>{label}</div>}
    <select {...props} style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text, outline:"none", boxSizing:"border-box" }}>{children}</select>
  </div>
);

export const Modal = ({ title, onClose, onSubmit, children }) => (
  <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
    <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:480, maxHeight:"85vh", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{title}</div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
      </div>
      {children}
      <div style={{ display:"flex", gap:10, marginTop:20 }}>
        <button onClick={onClose} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
        <button onClick={onSubmit} style={{ flex:2, padding:"10px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>Guardar</button>
      </div>
    </div>
  </div>
);

export const AddBtn = ({ onClick, label }) => (
  <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 18px", background:COLORS.accent, border:"none", borderRadius:7, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
    <span style={{ fontSize:18, lineHeight:1 }}>+</span>{label}
  </button>
);

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

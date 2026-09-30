// Componentes de UI propios del módulo de Finanzas.
import { FONT_DISPLAY, COLORS, FONT } from "../theme.js";

// Común: título de sección
export const SecTitle = ({ children, sub }) => (
  <div style={{ marginBottom:20 }}>
    <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:COLORS.text }}>{children}</div>
    {sub && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginTop:3 }}>{sub}</div>}
  </div>
);

// Tarjeta KPI
export const KpiCard = ({ label, value, sub, color, icon }) => (
  <div style={{ padding:"18px 20px", background:COLORS.card, border:`1px solid ${COLORS.border}`,
    borderRadius:12, display:"flex", flexDirection:"column", gap:4 }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted,
        letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</div>
      {icon && <span style={{ fontSize:16 }}>{icon}</span>}
    </div>
    <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700,
      color:color||COLORS.text }}>{value}</div>
    {sub && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{sub}</div>}
  </div>
);

// Botón primario
export const BtnPrimary = ({ children, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ padding:"9px 18px", background:COLORS.accent, border:"none", borderRadius:8,
      color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700,
      cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.5:1 }}>
    {children}
  </button>
);

// Botón secundario
export const BtnSec = ({ children, onClick }) => (
  <button onClick={onClick}
    style={{ padding:"8px 14px", background:"transparent", border:`1px solid ${COLORS.border}`,
      borderRadius:8, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer" }}>
    {children}
  </button>
);

// Input etiquetado
export const LabelInput = ({ label, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
      letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>{label}</div>}
    <input {...props} style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
      borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text,
      outline:"none", boxSizing:"border-box", ...props.style }} />
  </div>
);

// Select etiquetado
export const LabelSelect = ({ label, children, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
      letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>{label}</div>}
    <select {...props} style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
      borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:13, color:COLORS.text,
      outline:"none", boxSizing:"border-box" }}>
      {children}
    </select>
  </div>
);

// Modal contenedor
export const FinModal = ({ title, onClose, children, width=480 }) => (
  <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:200,
    display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
    <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`,
      borderRadius:12, padding:24, width:"100%", maxWidth:width,
      maxHeight:"90vh", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{title}</div>
        <button onClick={onClose} style={{ background:"transparent", border:"none",
          color:COLORS.textMuted, cursor:"pointer", fontSize:18, lineHeight:1 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

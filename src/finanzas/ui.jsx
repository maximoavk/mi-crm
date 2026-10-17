// Componentes de UI propios del módulo de Finanzas.
import { FONT_DISPLAY, COLORS, FONT } from "../theme.js";

const DEFAULT_THEME = { colors: COLORS, font: FONT, fontDisplay: FONT_DISPLAY };

// Común: título de sección
export const SecTitle = ({ children, sub, theme }) => {
  const { colors:C, font, fontDisplay } = theme || DEFAULT_THEME;
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontFamily:fontDisplay, fontSize:20, fontWeight:700, color:C.text }}>{children}</div>
      {sub && <div style={{ fontFamily:font, fontSize:12, color:C.textMuted, marginTop:3 }}>{sub}</div>}
    </div>
  );
};

// Tarjeta KPI
export const KpiCard = ({ label, value, sub, color, icon, theme }) => {
  const { colors:C, font, fontDisplay } = theme || DEFAULT_THEME;
  return (
    <div style={{ padding:"18px 20px", background:C.card, border:`1px solid ${C.border}`,
      borderRadius:12, display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ fontFamily:font, fontSize:10, color:C.textMuted,
          letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</div>
        {icon && <span style={{ fontSize:16 }}>{icon}</span>}
      </div>
      <div style={{ fontFamily:fontDisplay, fontSize:22, fontWeight:700,
        color:color||C.text }}>{value}</div>
      {sub && <div style={{ fontFamily:font, fontSize:11, color:C.textMuted }}>{sub}</div>}
    </div>
  );
};

// Botón primario
export const BtnPrimary = ({ children, onClick, disabled, theme }) => {
  const { colors:C, fontDisplay } = theme || DEFAULT_THEME;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding:"9px 18px", background:C.accent, border:"none", borderRadius:8,
        color:C===COLORS?C.bg:"#fff", fontFamily:fontDisplay, fontSize:13, fontWeight:700,
        cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.5:1 }}>
      {children}
    </button>
  );
};

// Botón secundario
export const BtnSec = ({ children, onClick, theme }) => {
  const { colors:C, fontDisplay } = theme || DEFAULT_THEME;
  return (
    <button onClick={onClick}
      style={{ padding:"8px 14px", background:"transparent", border:`1px solid ${C.border}`,
        borderRadius:8, color:C.textMuted, fontFamily:fontDisplay, fontSize:12, cursor:"pointer" }}>
      {children}
    </button>
  );
};

// Input etiquetado
export const LabelInput = ({ label, theme, ...props }) => {
  const { colors:C, font } = theme || DEFAULT_THEME;
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ fontFamily:font, fontSize:11, color:C.textMuted,
        letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>{label}</div>}
      <input {...props} style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`,
        borderRadius:6, padding:"9px 12px", fontFamily:font, fontSize:13, color:C.text,
        outline:"none", boxSizing:"border-box", ...props.style }} />
    </div>
  );
};

// Select etiquetado
export const LabelSelect = ({ label, children, theme, ...props }) => {
  const { colors:C, font } = theme || DEFAULT_THEME;
  return (
    <div style={{ marginBottom:14 }}>
      {label && <div style={{ fontFamily:font, fontSize:11, color:C.textMuted,
        letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5 }}>{label}</div>}
      <select {...props} style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`,
        borderRadius:6, padding:"9px 12px", fontFamily:font, fontSize:13, color:C.text,
        outline:"none", boxSizing:"border-box" }}>
        {children}
      </select>
    </div>
  );
};

// Modal contenedor
export const FinModal = ({ title, onClose, children, width=480, theme }) => {
  const { colors:C, fontDisplay } = theme || DEFAULT_THEME;
  return (
    <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:12, padding:24, width:"100%", maxWidth:width,
        maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:fontDisplay, fontSize:16, fontWeight:700, color:C.text }}>{title}</div>
          <button onClick={onClose} style={{ background:"transparent", border:"none",
            color:C.textMuted, cursor:"pointer", fontSize:18, lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

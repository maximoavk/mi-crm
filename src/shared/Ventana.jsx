// Modal ancho (el Modal de ui.jsx es de 480px), con subtítulo y botón de envío configurable.
import { FONT_BODY as FONT, FONT_DISPLAY, FONT_NUM } from "../theme.js";
import { useTheme } from "./useTheme.js";
export function Ventana({ title, sub, onClose, onSubmit, submitLabel = "Guardar", disabled, maxWidth = 760, children }) {
  const { C } = useTheme();
  return (
    <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div role="dialog" aria-label={title}
        style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:22, width:"100%", maxWidth, maxHeight:"88vh", overflowY:"auto", boxSizing:"border-box" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, gap:12 }}>
          <div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:C.text }}>{title}</div>
            {sub && <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted, marginTop:4 }}>{sub}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background:"none", border:"none", color:C.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        {children}
        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, color:C.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
          <button onClick={onSubmit} disabled={disabled}
            style={{ flex:2, padding:"10px 0", background:disabled ? C.border : C.accent, border:"none", borderRadius:6, color:disabled ? C.textMuted : C.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:disabled ? "not-allowed" : "pointer" }}>{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

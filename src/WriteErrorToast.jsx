import { useEffect, useState } from "react";
import { COLORS, FONT } from "./theme.js";
import { WRITE_ERROR_EVENT } from "./supabaseClient.js";

// Aviso fijo abajo a la derecha cuando falla un guardado en Supabase.
// Se queda visible hasta que el usuario lo cierra: un error de guardado
// no debe desaparecer solo sin que nadie lo haya leído.
export default function WriteErrorToast() {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const onError = (e) => {
      const message = e.detail?.message || "Error desconocido";
      setErrors(prev => {
        // Varias escrituras seguidas suelen fallar por la misma causa
        if (prev.some(x => x.message === message)) return prev;
        return [...prev, { id: Date.now() + Math.random(), message }].slice(-3);
      });
    };
    window.addEventListener(WRITE_ERROR_EVENT, onError);
    return () => window.removeEventListener(WRITE_ERROR_EVENT, onError);
  }, []);

  if (errors.length === 0) return null;

  return (
    <div style={{ position:"fixed", right:16, bottom:16, left:16, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, zIndex:100000, pointerEvents:"none" }}>
      {errors.map(err => (
        <div key={err.id} role="alert" style={{ pointerEvents:"auto", maxWidth:380, width:"100%", background:COLORS.surface, border:`1px solid ${COLORS.red}`, borderRadius:10, padding:"12px 14px", fontFamily:FONT, fontSize:12, color:COLORS.text, boxShadow:"0 6px 24px #0008", display:"flex", gap:10, alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ color:COLORS.red, fontWeight:700, marginBottom:4 }}>No se guardó el cambio</div>
            <div style={{ color:COLORS.textMuted, wordBreak:"break-word" }}>{err.message}</div>
            <div style={{ color:COLORS.textDim, marginTop:6 }}>Recarga la página para ver los datos reales antes de seguir.</div>
          </div>
          <button onClick={() => setErrors(prev => prev.filter(x => x.id !== err.id))} aria-label="Cerrar aviso" style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontSize:16, cursor:"pointer", lineHeight:1, padding:0 }}>×</button>
        </div>
      ))}
    </div>
  );
}

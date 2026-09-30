// Comparación entre revisiones de una propuesta.
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";
import { fmt } from "../shared/format.js";

// ── DIFF VIEW ──────────────────────────────────────────────────────────────────
export function DiffView({ proposal, revA, revB, onBack }) {
  if (!revA || !revB) return null;

  const fields = [
    { key:"titulo",           label:"Título" },
    { key:"antecedentes",     label:"Antecedentes" },
    { key:"propuesta_tecnica",label:"Propuesta técnica" },
    { key:"garantias",        label:"Garantías" },
    { key:"condiciones_pago", label:"Forma de pago" },
  ];

  const diffText = (a, b) => {
    if (a === b) return null;
    return (
      <div>
        <div style={{ background:"#FF4D6A18", border:"1px solid #FF4D6A33", borderRadius:6, padding:"8px 12px", marginBottom:6 }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.red, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.07em" }}>Rev. {revA.revision} (anterior)</div>
          <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, whiteSpace:"pre-wrap" }}>{a || "—"}</div>
        </div>
        <div style={{ background:"#00E5A018", border:"1px solid #00E5A033", borderRadius:6, padding:"8px 12px" }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.07em" }}>Rev. {revB.revision} (actual)</div>
          <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, whiteSpace:"pre-wrap" }}>{b || "—"}</div>
        </div>
      </div>
    );
  };

  const totalDiff = (revB.total || 0) - (revA.total || 0);

  return (
    <div>
      <button onClick={onBack} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12, marginBottom:16, display:"flex", alignItems:"center", gap:5, padding:0 }}>
        ← Volver
      </button>
      <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:COLORS.text, marginBottom:4 }}>Control de cambios</div>
      <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:24 }}>
        {proposal.titulo} · Rev. {revA.revision} → Rev. {revB.revision}
      </div>

      {/* Resumen numérico */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12, marginBottom:20 }}>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 18px" }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Total Rev. {revA.revision}</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text }}>{fmt(revA.total || 0)}</div>
        </div>
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 18px" }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Total Rev. {revB.revision}</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text }}>{fmt(revB.total || 0)}</div>
        </div>
        <div style={{ background: totalDiff > 0 ? `${COLORS.red}15` : totalDiff < 0 ? `${COLORS.green}15` : COLORS.card, border:`1px solid ${totalDiff > 0 ? COLORS.red : totalDiff < 0 ? COLORS.green : COLORS.border}33`, borderRadius:10, padding:"14px 18px" }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Variación</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color: totalDiff > 0 ? COLORS.red : totalDiff < 0 ? COLORS.green : COLORS.textMuted }}>
            {totalDiff > 0 ? "+" : ""}{fmt(totalDiff)}
          </div>
        </div>
      </div>

      {/* Diff de campos de texto */}
      {fields.map(f => {
        const a = revA[f.key] || "";
        const b = revB[f.key] || "";
        if (a === b) return null;
        return (
          <div key={f.key} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"16px 18px", marginBottom:12 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>{f.label}</div>
            {diffText(a, b)}
          </div>
        );
      })}

      {/* Diff de partidas */}
      {JSON.stringify(revA.partidas) !== JSON.stringify(revB.partidas) && (
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"16px 18px" }}>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Partidas económicas</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.red, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Rev. {revA.revision}</div>
              {(revA.partidas || []).map((p, i) => (
                <div key={i} style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, padding:"5px 10px", background:`${COLORS.red}10`, borderRadius:4, marginBottom:4, display:"flex", justifyContent:"space-between" }}>
                  <span>{p.descripcion}</span><span>{fmt(p.total)}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Rev. {revB.revision}</div>
              {(revB.partidas || []).map((p, i) => (
                <div key={i} style={{ fontFamily:FONT, fontSize:12, color:COLORS.text, padding:"5px 10px", background:`${COLORS.green}10`, borderRadius:4, marginBottom:4, display:"flex", justifyContent:"space-between" }}>
                  <span>{p.descripcion}</span><span>{fmt(p.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

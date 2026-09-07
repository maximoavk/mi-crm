import React from "react";
import { COLORS, FONT } from "../theme.js";

const fieldStyle = {
  flex: "1 1 180px", padding: "7px 10px", borderRadius: 6,
  border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.text, fontSize: 12, fontFamily: FONT,
};

export function TitleBlockForm({ project, onChange, plotWidthM, plotLengthM, onPlotWidthChange, onPlotLengthChange, onApplyDims, dimsApplied, mppX, mppY }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
        <input placeholder="Nombre del plano" value={project.label} onChange={(e) => onChange({ label: e.target.value })} style={fieldStyle} />
        <input placeholder="Nombre del proyecto" value={project.projectName} onChange={(e) => onChange({ projectName: e.target.value })} style={fieldStyle} />
        <input placeholder="Nombre del cliente" value={project.clientName} onChange={(e) => onChange({ clientName: e.target.value })} style={fieldStyle} />
        <input placeholder="Elaborado por" value={project.preparedBy} onChange={(e) => onChange({ preparedBy: e.target.value })} style={fieldStyle} />
        <input type="date" value={project.visitDate} onChange={(e) => onChange({ visitDate: e.target.value })} style={{ ...fieldStyle, flex: "1 1 160px" }} />
        <input placeholder="N° plano" value={project.planNumber} onChange={(e) => onChange({ planNumber: e.target.value })} style={{ ...fieldStyle, flex: "0 1 90px" }} />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
        <span style={{ fontSize: 11, fontFamily: FONT, color: COLORS.textMuted, flex: "0 0 auto" }}>Dimensiones del lote:</span>
        <input type="number" placeholder="Ancho (m)" value={plotWidthM} onChange={(e) => onPlotWidthChange(e.target.value)} style={{ width: 100, padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.text, fontSize: 12 }} />
        <span style={{ color: COLORS.textMuted }}>×</span>
        <input type="number" placeholder="Largo (m)" value={plotLengthM} onChange={(e) => onPlotLengthChange(e.target.value)} style={{ width: 100, padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.text, fontSize: 12 }} />
        <button onClick={onApplyDims} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: COLORS.accent, color: COLORS.bg, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Aplicar</button>
        {dimsApplied && mppX && mppY && (
          <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT }}>
            Escala: {mppX.toFixed(3)} m/px (ancho) · {mppY.toFixed(3)} m/px (largo)
          </span>
        )}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { exportPNGBlob, exportPDFBlob, downloadBlob } from "./exportUtils.js";
import { FONT_BODY as FONT, FONT_NUM } from "../theme.js";
import { useTheme } from "../shared/useTheme.js";
export function ExportPanel({ svgRef, exportMeta }) {
  const { C } = useTheme();
  const [status, setStatus] = useState("");

  const handleExportPNG = async () => {
    setStatus("Generando PNG…");
    try {
      const blob = await exportPNGBlob(svgRef.current, 2, exportMeta);
      downloadBlob(blob, "plano-cctv.png");
      setStatus("PNG descargado ✓");
    } catch (e) {
      setStatus("Error generando la imagen.");
    }
  };

  const handleExportPDF = async () => {
    setStatus("Generando PDF…");
    try {
      const { jsPDF } = await import("jspdf"); // se carga solo al exportar
      const blob = await exportPDFBlob(svgRef.current, 2, jsPDF, exportMeta);
      downloadBlob(blob, "plano-cctv.pdf");
      setStatus("PDF descargado ✓");
    } catch (e) {
      setStatus("Error generando el PDF.");
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={handleExportPNG} style={{ flex: "1 1 160px", padding: "10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
        ⬇️ Exportar PNG
      </button>
      <button onClick={handleExportPDF} style={{ flex: "1 1 160px", padding: "10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
        ⬇️ Exportar PDF
      </button>
      {status && <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT }}>{status}</span>}
    </div>
  );
}

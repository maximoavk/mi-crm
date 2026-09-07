import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { exportPNGBlob, exportPDFBlob, downloadBlob } from "./exportUtils.js";
import { COLORS, FONT } from "../theme.js";

export function ExportPanel({ svgRef, exportMeta }) {
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
      const blob = await exportPDFBlob(svgRef.current, 2, jsPDF, exportMeta);
      downloadBlob(blob, "plano-cctv.pdf");
      setStatus("PDF descargado ✓");
    } catch (e) {
      setStatus("Error generando el PDF.");
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={handleExportPNG} style={{ flex: "1 1 160px", padding: "10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
        ⬇️ Exportar PNG
      </button>
      <button onClick={handleExportPDF} style={{ flex: "1 1 160px", padding: "10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, fontSize: 12, fontFamily: FONT, cursor: "pointer" }}>
        ⬇️ Exportar PDF
      </button>
      {status && <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONT }}>{status}</span>}
    </div>
  );
}

import { useState, useMemo } from "react";
import { FONT_BODY } from "../theme.js";

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

// Tamaños de punto por nivel de actividad (0 = sin actividad, 4 = máximo)
const DOT_BASE = [3, 6, 9, 12, 15];

// DayGrid — grilla de días como campo de puntos al estilo PanelUI/GitHub.
//
// Props:
//   cells    { date: "YYYY-MM-DD", level: 0-4, label?: string }[]
//            Los días deben estar en orden, empezando en lunes.
//            Días vacíos al inicio del mes se rellenan automáticamente.
//   color    string — color de los puntos (default: accent)
//   showWeekdays  boolean — muestra etiquetas L M M J V S D (default: true)
//   showMonthLabel boolean — muestra el mes arriba (default: true)
//   onDayClick (cell) => void — callback al hacer click en un día
//   theme    { colors }
export function DayGrid({ cells = [], color, showWeekdays = true, showMonthLabel = true, onDayClick, theme }) {
  const C = theme?.colors ?? {};
  const dotColor = color || C.accent || "#00C2FF";
  const [hoverIdx, setHoverIdx] = useState(null);

  // Precalcula cuántos días vacíos agregar al principio para alinear al lunes
  const paddedCells = useMemo(() => {
    if (!cells.length) return [];
    const firstDate = new Date(cells[0].date + "T12:00:00");
    // getDay(): 0=Dom, 1=Lun, ..., 6=Sáb. Queremos que Lun sea el primero.
    const dow = firstDate.getDay();
    const padCount = dow === 0 ? 6 : dow - 1; // días a rellenar antes del primero
    const pads = Array.from({ length: padCount }, () => ({ date: null, level: 0 }));
    return [...pads, ...cells];
  }, [cells]);

  // Distancia 2D en la grilla de 7 columnas para el efecto lupa
  const getLensScale = (i, hoverI) => {
    if (hoverI === null || hoverI === undefined) return 1;
    const col  = i % 7;
    const row  = Math.floor(i / 7);
    const hCol = hoverI % 7;
    const hRow = Math.floor(hoverI / 7);
    const dist = Math.sqrt((col - hCol) ** 2 + (row - hRow) ** 2);
    if (dist === 0) return 1.9;
    if (dist < 1.5) return 1.45;
    if (dist < 2.5) return 1.2;
    if (dist < 3.5) return 1.08;
    return 1;
  };

  const monthLabel = useMemo(() => {
    if (!cells.length) return "";
    const d = new Date(cells[0].date + "T12:00:00");
    return d.toLocaleDateString("es-CL", { month: "long", year: "numeric" })
      .replace(/^./, c => c.toUpperCase());
  }, [cells]);

  return (
    <div>
      {showMonthLabel && monthLabel && (
        <div style={{
          fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600,
          color: C.textMuted, letterSpacing: "0.06em",
          textTransform: "capitalize", marginBottom: 8,
        }}>
          {monthLabel}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px 4px" }}>
        {/* Encabezados de días de semana */}
        {showWeekdays && WEEKDAY_LABELS.map((d, i) => (
          <div key={i} style={{
            fontFamily: FONT_BODY, fontSize: 9, fontWeight: 600,
            color: C.textDim, textAlign: "center", paddingBottom: 2,
          }}>
            {d}
          </div>
        ))}

        {/* Celdas */}
        {paddedCells.map((cell, i) => {
          if (!cell.date) {
            return <div key={`pad-${i}`} />;
          }

          const level = Math.min(4, Math.max(0, cell.level ?? 0));
          const size  = DOT_BASE[level];
          const scale = getLensScale(i, hoverIdx);

          const opacity = level === 0
            ? 0.35
            : [0, 0.45, 0.6, 0.78, 1][level];

          const bgColor = level === 0 ? (C.textDim || "#5B6472") : dotColor;

          return (
            <div
              key={cell.date}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 20 }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => level > 0 && onDayClick?.(cell)}
              title={cell.label || (level > 0 ? `${level === 4 ? "4+" : level} actividad(es)` : "")}
            >
              <div style={{
                width: size, height: size, borderRadius: "50%",
                background: bgColor, opacity,
                transform: `scale(${scale})`,
                transition: "transform 0.14s cubic-bezier(0.34,1.56,0.64,1), opacity 0.12s ease",
                cursor: level > 0 ? "pointer" : "default",
                flexShrink: 0,
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}


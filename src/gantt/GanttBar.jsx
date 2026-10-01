// Barra de una fase, tarea o hito en la Carta Gantt. La geometría (recorte al
// rango visible del calendario) está en barra.js.
import { fmtShort } from "./fechas.js";
import { GANTT_COLORS } from "./constants.js";
import { geometriaBarra } from "./barra.js";

export function GanttBar({ task, calStart, calDays, cellW, today }) {
  const pct = Math.min(100, Math.max(0, Number(task.pctAvance)||0));
  const g = geometriaBarra({ inicio: task.inicio, fin: task.fin, calStart, calDays, cellW, pct });
  if(!g) return null;

  const isHito = task.tipo === "H";
  const isLate = task.fin < today && pct < 100;
  const color  = isHito ? GANTT_COLORS.hito : pct===100 ? GANTT_COLORS.done : isLate ? GANTT_COLORS.late : task.tipo==="F" ? GANTT_COLORS.fase : GANTT_COLORS.tarea;

  if(isHito) return (
    <div style={{ position:"absolute", left: g.left + cellW/2 - 7, top:"50%", transform:"translateY(-50%) rotate(45deg)",
      width:14, height:14, background:color, boxShadow:`0 0 6px ${color}88`, zIndex:2 }} title={`${task.nombre} · ${fmtShort(task.fin)}`} />
  );
  // Borde cortado (recto, sin línea) donde la barra sigue fuera del rango visible.
  const radio = `${g.cortaInicio?0:4}px ${g.cortaFin?0:4}px ${g.cortaFin?0:4}px ${g.cortaInicio?0:4}px`;
  const borde = `1.5px solid ${color}`;
  return (
    <div style={{ position:"absolute", left:g.left, top:4, height:"calc(100% - 8px)", width: Math.max(g.width - (g.cortaFin?0:2), 4),
      background:`${color}33`, borderTop:borde, borderBottom:borde, borderLeft: g.cortaInicio ? "none" : borde, borderRight: g.cortaFin ? "none" : borde,
      borderRadius:radio, overflow:"hidden", zIndex:2, boxSizing:"border-box" }}
      title={`${task.nombre} · ${fmtShort(task.inicio)}→${fmtShort(task.fin)} · ${pct}%${g.cortaInicio ? " · empieza antes del calendario" : ""}`}>
      <div style={{ width:g.avanceVisible, height:"100%", background:`${color}88`, transition:"width 0.3s" }} />
      {g.cortaInicio && <span style={{ position:"absolute", left:2, top:"50%", transform:"translateY(-50%)", fontSize:8, color }}>◂</span>}
      {g.cortaFin && <span style={{ position:"absolute", right:2, top:"50%", transform:"translateY(-50%)", fontSize:8, color }}>▸</span>}
      {g.width > 40 && <span style={{ position:"absolute", left: g.cortaInicio ? 12 : 5, top:"50%", transform:"translateY(-50%)", fontSize:9,
        fontFamily:"monospace", color:"white", fontWeight:700, whiteSpace:"nowrap" }}>{pct}%</span>}
    </div>
  );
}

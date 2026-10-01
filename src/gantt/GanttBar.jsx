// Barra de una fase, tarea o hito en la Carta Gantt. La geometría (recorte al
// rango visible del calendario) está en barra.js.
import { fmtShort } from "./fechas.js";
import { GANTT_COLORS } from "./constants.js";
import { geometriaBarra } from "./barra.js";

// colapsable: { collapsed, onToggle } para una fase con actividades: un
// triángulo al inicio de la barra las despliega/contrae (igual que en la
// columna Descripción). resumen: actividades de la fase contraída, que se
// marcan dentro de su barra (rombo = hito, línea = tarea).
export function GanttBar({ task, calStart, calDays, cellW, today, colapsable, resumen }) {
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
      {resumen && resumen.map(h => {
        const gh = geometriaBarra({ inicio: h.inicio, fin: h.fin, calStart, calDays, cellW });
        if (!gh) return null;
        const x = gh.left - g.left;
        return h.tipo === "H"
          ? <div key={h.id} title={`${h.nombre} · ${fmtShort(h.fin)}`} style={{ position:"absolute", left: x + cellW/2 - 3, bottom:3, width:6, height:6,
              background:GANTT_COLORS.hito, transform:"rotate(45deg)" }} />
          : <div key={h.id} title={`${h.nombre} · ${fmtShort(h.inicio)}→${fmtShort(h.fin)}`} style={{ position:"absolute", left: x + 1, bottom:3,
              width: Math.max(gh.width - 2, 3), height:3, borderRadius:2, background:GANTT_COLORS.tarea }} />;
      })}
      {colapsable && (
        <button type="button" className="tree-btn"
          onClick={e => { e.stopPropagation(); colapsable.onToggle(); }} onDoubleClick={e => e.stopPropagation()}
          title={colapsable.collapsed ? "Desplegar las actividades de la fase" : "Contraer las actividades de la fase"}
          style={{ position:"absolute", left: g.cortaInicio ? 10 : 3, top:"50%", width:14, height:14, padding:0, border:"none", borderRadius:3,
            background:`${color}55`, color:"white", fontSize:8, lineHeight:"14px", cursor:"pointer",
            transform:`translateY(-50%)` }}>
          <span style={{ display:"inline-block", transform: colapsable.collapsed ? "none" : "rotate(90deg)", transition:"transform 120ms" }}>▶</span>
        </button>
      )}
      {g.width > 40 && <span style={{ position:"absolute", left: (g.cortaInicio ? 12 : 5) + (colapsable ? 15 : 0), top:"50%", transform:"translateY(-50%)", fontSize:9,
        fontFamily:"monospace", color:"white", fontWeight:700, whiteSpace:"nowrap" }}>{pct}%</span>}
    </div>
  );
}

// Barra de una fase, tarea o hito en la Carta Gantt.
import { diffDays, fmtShort } from "./fechas.js";
import { GANTT_COLORS } from "./constants.js";

export function GanttBar({ task, calStart, calDays, cellW, today }) {
  if(!task.inicio || !task.fin) return null;
  const offsetDays = diffDays(calStart, task.inicio);
  const durDays    = Math.max(1, diffDays(task.inicio, task.fin)+1);
  const left  = offsetDays * cellW;
  const width = durDays * cellW;
  if(left + width < 0 || left > calDays * cellW) return null;

  const isHito = task.tipo === "H";
  const pct    = Math.min(100, Math.max(0, Number(task.pctAvance)||0));
  const isLate = task.fin < today && pct < 100;
  const color  = isHito ? GANTT_COLORS.hito : pct===100 ? GANTT_COLORS.done : isLate ? GANTT_COLORS.late : task.tipo==="F" ? GANTT_COLORS.fase : GANTT_COLORS.tarea;

  if(isHito) return (
    <div style={{ position:"absolute", left: left + cellW/2 - 7, top:"50%", transform:"translateY(-50%) rotate(45deg)",
      width:14, height:14, background:color, boxShadow:`0 0 6px ${color}88`, zIndex:2 }} title={`${task.nombre} · ${fmtShort(task.fin)}`} />
  );
  return (
    <div style={{ position:"absolute", left, top:4, height:"calc(100% - 8px)", width: Math.max(width-2,4),
      background:`${color}33`, border:`1.5px solid ${color}`, borderRadius:4, overflow:"hidden", zIndex:2 }}
      title={`${task.nombre} · ${fmtShort(task.inicio)}→${fmtShort(task.fin)} · ${pct}%`}>
      <div style={{ width:`${pct}%`, height:"100%", background:`${color}88`, transition:"width 0.3s" }} />
      {width > 40 && <span style={{ position:"absolute", left:5, top:"50%", transform:"translateY(-50%)", fontSize:9,
        fontFamily:"monospace", color:"white", fontWeight:700, whiteSpace:"nowrap" }}>{pct}%</span>}
    </div>
  );
}

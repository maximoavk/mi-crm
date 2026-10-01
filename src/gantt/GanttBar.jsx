// Barra de una fase, tarea o hito en la Carta Gantt. La geometría (recorte al
// rango visible del calendario) y el cálculo del arrastre están en barra.js.
import { useState } from "react";
import { fmtShort } from "./fechas.js";
import { GANTT_COLORS } from "./constants.js";
import { geometriaBarra, aplicarArrastre } from "./barra.js";

const BORDE_ARRASTRE = 6; // px de cada borde de la barra que estiran en vez de mover

// colapsable: { collapsed, onToggle } para una fase con actividades: un
// triángulo al inicio de la barra las despliega/contrae (igual que en la
// columna Descripción). resumen: actividades de la fase contraída, que se
// marcan dentro de su barra (rombo = hito, línea = tarea).
// onArrastrar(modo, dias): al soltar una barra arrastrada ("mover", "inicio"
// o "fin"); soloMover: la barra se mueve entera pero no se estira (fase
// calculada desde sus actividades).
export function GanttBar({ task, calStart, calDays, cellW, today, colapsable, resumen, onArrastrar, soloMover }) {
  const [drag, setDrag] = useState(null); // { modo, dias } mientras se arrastra

  const vista = drag ? { ...task, ...aplicarArrastre(task, drag.modo, drag.dias) } : task;
  const pct = Math.min(100, Math.max(0, Number(task.pctAvance)||0));
  const g = geometriaBarra({ inicio: vista.inicio, fin: vista.fin, calStart, calDays, cellW, pct });
  if(!g) return null;

  const isHito = task.tipo === "H";
  const isLate = task.fin < today && pct < 100;
  const color  = isHito ? GANTT_COLORS.hito : pct===100 ? GANTT_COLORS.done : isLate ? GANTT_COLORS.late : task.tipo==="F" ? GANTT_COLORS.fase : GANTT_COLORS.tarea;

  // Arrastre con eventos de puntero (mouse y pantalla táctil): la barra se
  // mueve de a días mientras se arrastra y la fecha se aplica al soltar.
  const empezar = (modo) => (e) => {
    if (!onArrastrar || e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    let dias = 0;
    setDrag({ modo, dias: 0 });
    const mover = (ev) => {
      const d = Math.round((ev.clientX - x0) / cellW);
      if (d !== dias) { dias = d; setDrag({ modo, dias: d }); }
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
      setDrag(null);
      if (dias) onArrastrar(modo, dias);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
  };
  const arrastrable = !!onArrastrar;
  const etiqueta = drag && drag.dias !== 0 && (
    <div style={{ position:"absolute", left: g.left, top:-14, zIndex:6, pointerEvents:"none", whiteSpace:"nowrap",
      padding:"1px 6px", borderRadius:4, background:color, color:"#0A0C10", fontFamily:"monospace", fontSize:9, fontWeight:700 }}>
      {isHito ? fmtShort(vista.fin) : `${fmtShort(vista.inicio)} → ${fmtShort(vista.fin)}`} ({drag.dias > 0 ? "+" : ""}{drag.dias} d)
    </div>
  );

  if(isHito) return (<>
    {etiqueta}
    <div onPointerDown={empezar("mover")}
      style={{ position:"absolute", left: g.left + cellW/2 - 7, top:"50%", transform:"translateY(-50%) rotate(45deg)",
        width:14, height:14, background:color, boxShadow:`0 0 6px ${color}88`, zIndex:drag?5:2,
        cursor: arrastrable ? (drag ? "grabbing" : "grab") : "default", touchAction: arrastrable ? "none" : "auto" }}
      title={`${task.nombre} · ${fmtShort(task.fin)}${arrastrable ? " · arrastra para cambiar la fecha" : ""}`} />
  </>);

  // Borde cortado (recto, sin línea) donde la barra sigue fuera del rango visible.
  const radio = `${g.cortaInicio?0:4}px ${g.cortaFin?0:4}px ${g.cortaFin?0:4}px ${g.cortaInicio?0:4}px`;
  const borde = `1.5px solid ${color}`;
  const asa = (lado) => (
    <div onPointerDown={empezar(lado)} title={lado === "inicio" ? "Arrastra para cambiar el inicio" : "Arrastra para cambiar el fin"}
      style={{ position:"absolute", top:0, bottom:0, [lado === "inicio" ? "left" : "right"]:0, width:BORDE_ARRASTRE, cursor:"ew-resize", zIndex:3 }} />
  );
  return (<>
    {etiqueta}
    <div onPointerDown={empezar("mover")}
      style={{ position:"absolute", left:g.left, top:4, height:"calc(100% - 8px)", width: Math.max(g.width - (g.cortaFin?0:2), 4),
        background:`${color}33`, borderTop:borde, borderBottom:borde, borderLeft: g.cortaInicio ? "none" : borde, borderRight: g.cortaFin ? "none" : borde,
        borderRadius:radio, overflow:"hidden", zIndex:drag?5:2, boxSizing:"border-box",
        boxShadow: drag ? `0 0 0 2px ${color}66` : "none",
        cursor: arrastrable ? (drag ? "grabbing" : "grab") : "default", touchAction: arrastrable ? "none" : "auto" }}
      title={`${task.nombre} · ${fmtShort(task.inicio)}→${fmtShort(task.fin)} · ${pct}%${g.cortaInicio ? " · empieza antes del calendario" : ""}${arrastrable ? (soloMover ? " · arrastra para mover la fase con sus actividades" : " · arrastra para mover, o estira sus bordes") : ""}`}>
      <div style={{ width:g.avanceVisible, height:"100%", background:`${color}88`, transition: drag ? "none" : "width 0.3s" }} />
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
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); colapsable.onToggle(); }} onDoubleClick={e => e.stopPropagation()}
          title={colapsable.collapsed ? "Desplegar las actividades de la fase" : "Contraer las actividades de la fase"}
          style={{ position:"absolute", left: g.cortaInicio ? 10 : 3, top:"50%", width:14, height:14, padding:0, border:"none", borderRadius:3,
            background:`${color}55`, color:"white", fontSize:8, lineHeight:"14px", cursor:"pointer", zIndex:4,
            transform:`translateY(-50%)` }}>
          <span style={{ display:"inline-block", transform: colapsable.collapsed ? "none" : "rotate(90deg)", transition:"transform 120ms" }}>▶</span>
        </button>
      )}
      {g.width > 40 && <span style={{ position:"absolute", left: (g.cortaInicio ? 12 : 5) + (colapsable ? 15 : 0), top:"50%", transform:"translateY(-50%)", fontSize:9,
        fontFamily:"monospace", color:"white", fontWeight:700, whiteSpace:"nowrap", pointerEvents:"none" }}>{pct}%</span>}
      {arrastrable && !soloMover && !g.cortaInicio && asa("inicio")}
      {arrastrable && !soloMover && !g.cortaFin && asa("fin")}
    </div>
  </>);
}

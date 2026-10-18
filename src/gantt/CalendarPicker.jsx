import React, { useState, useEffect } from "react";
import { FONT_BODY as FONT, FONT_DISPLAY } from "../theme.js";
import { useTheme } from "../shared/useTheme.js";
import { fmtDDMMYYYY, parseDDMMYYYY } from "./fechas.js";

// Calendario propio (desplegable) para elegir una fecha "YYYY-MM-DD" sin depender del picker nativo del navegador.
// Doble entrada: se puede escribir la fecha a mano (dd/mm/aaaa) en el campo,
// o abrir el calendario con el ícono 📅 para elegirla con el mouse.
export function CalendarPicker({ value, onChange }) {
  const { C } = useTheme();
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState(fmtDDMMYYYY(value));
  const initial = value ? new Date(value+"T00:00") : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const ref = React.useRef(null);
  const pad2 = n => String(n).padStart(2,"0");

  // El campo de texto sigue a `value` cuando cambia desde afuera (ej. al
  // elegir un día en el calendario, o si otra acción mueve la fecha).
  useEffect(() => { setTexto(fmtDDMMYYYY(value)); }, [value]);

  const commitTexto = () => {
    const parsed = parseDDMMYYYY(texto);
    if (parsed) onChange(parsed);
    else setTexto(fmtDDMMYYYY(value)); // texto inválido: vuelve al último valor válido
  };

  useEffect(() => {
    if(!open) return;
    const onDocClick = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const toggleOpen = () => {
    if(!open) {
      const d = value ? new Date(value+"T00:00") : new Date();
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
    }
    setOpen(o=>!o);
  };
  const changeMonth = (delta) => {
    let m = viewMonth + delta, y = viewYear;
    if(m<0){ m=11; y--; } else if(m>11){ m=0; y++; }
    setViewMonth(m); setViewYear(y);
  };

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("es-CL", { month:"long", year:"numeric" });
  const cells = [];
  for(let i=0;i<firstDow;i++) cells.push(null);
  for(let d=1; d<=daysInMonth; d++) cells.push(d);

  const selectDay = (d) => {
    onChange(`${viewYear}-${pad2(viewMonth+1)}-${pad2(d)}`);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position:"relative", display:"inline-flex", alignItems:"center", gap:3 }}>
      <input value={texto} onChange={e=>setTexto(e.target.value)}
        onBlur={commitTexto}
        onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); commitTexto(); } else if(e.key==="Escape"){ setTexto(fmtDDMMYYYY(value)); e.target.blur(); } }}
        placeholder="dd/mm/aaaa"
        style={{ width:72, background:C.bg, border:`1px solid ${C.border}`, borderRadius:4,
          color:C.text, fontFamily:FONT, fontSize:11, padding:"3px 5px", outline:"none" }} />
      <button type="button" onClick={toggleOpen} title="Elegir del calendario"
        style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:4,
          color:C.text, fontFamily:FONT, fontSize:11, padding:"3px 5px", cursor:"pointer", lineHeight:1 }}>
        📅
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:50, background:C.card, border:`1px solid ${C.border}`,
          borderRadius:8, padding:10, width:220, boxShadow:"0 8px 24px rgba(0,0,0,0.35)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <button type="button" onClick={()=>changeMonth(-1)} style={{ background:"transparent", border:"none", color:C.textMuted, cursor:"pointer", fontSize:13 }}>◀</button>
            <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:C.text, textTransform:"capitalize" }}>{monthLabel}</span>
            <button type="button" onClick={()=>changeMonth(1)} style={{ background:"transparent", border:"none", color:C.textMuted, cursor:"pointer", fontSize:13 }}>▶</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
            {["D","L","M","X","J","V","S"].map(d=><div key={d} style={{ textAlign:"center", fontSize:9, color:C.textMuted }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {cells.map((d,i) => {
              if(d===null) return <div key={i} />;
              const dateStr = `${viewYear}-${pad2(viewMonth+1)}-${pad2(d)}`;
              const isSelected = dateStr === value;
              return (
                <button key={i} type="button" onClick={()=>selectDay(d)}
                  style={{ padding:"4px 0", background: isSelected?C.accent:"transparent", border:"none", borderRadius:4,
                    color: isSelected?C.bg:C.text, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { fmtDDMMYYYY } from "./fechas.js";

// Calendario propio (desplegable) para elegir una fecha "YYYY-MM-DD" sin depender del picker nativo del navegador
export function CalendarPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const initial = value ? new Date(value+"T00:00") : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const ref = React.useRef(null);
  const pad2 = n => String(n).padStart(2,"0");

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
    <div ref={ref} style={{ position:"relative", display:"inline-block" }}>
      <button type="button" onClick={toggleOpen} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:4,
        color:COLORS.text, fontFamily:FONT, fontSize:11, padding:"3px 6px", cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
        📅 {fmtDDMMYYYY(value)}
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:50, background:COLORS.card, border:`1px solid ${COLORS.border}`,
          borderRadius:8, padding:10, width:220, boxShadow:"0 8px 24px rgba(0,0,0,0.35)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <button type="button" onClick={()=>changeMonth(-1)} style={{ background:"transparent", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:13 }}>◀</button>
            <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.text, textTransform:"capitalize" }}>{monthLabel}</span>
            <button type="button" onClick={()=>changeMonth(1)} style={{ background:"transparent", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:13 }}>▶</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
            {["D","L","M","X","J","V","S"].map(d=><div key={d} style={{ textAlign:"center", fontSize:9, color:COLORS.textMuted }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {cells.map((d,i) => {
              if(d===null) return <div key={i} />;
              const dateStr = `${viewYear}-${pad2(viewMonth+1)}-${pad2(d)}`;
              const isSelected = dateStr === value;
              return (
                <button key={i} type="button" onClick={()=>selectDay(d)}
                  style={{ padding:"4px 0", background: isSelected?COLORS.accent:"transparent", border:"none", borderRadius:4,
                    color: isSelected?COLORS.bg:COLORS.text, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
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

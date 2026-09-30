// Tareas: seguimiento por estado, prioridad y vencimiento.
import { useState } from "react";
import { supabase } from "../supabaseClient.js";
import { mapTaskToDb, mapTask } from "../shared/mappers.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { AddBtn } from "../shared/ui.jsx";
import { fmtDate, hoyISO } from "../shared/format.js";
import { STAGES } from "../shared/constants.js";

// ── TASKS ────────────────────────────────────────────────────────────────────
export function TasksView({ tasks, setTasks, contacts, deals, isMobile }) {
  const TASK_STATUSES = [
    { key:"pendiente",    label:"Pendiente",    color:"#FFB800" },
    { key:"en_progreso",  label:"En progreso",  color:"#00C2FF" },
    { key:"en_espera",    label:"En espera",    color:"#A855F7" },
    { key:"completada",   label:"Completada",   color:"#00E5A0" },
    { key:"cancelada",    label:"Cancelada",    color:"#6B7A99" },
  ];
  const TASK_CATEGORIES = [
    "Prospecto / Levantamiento",
    "Comercial / Venta","Operaciones / Terreno","Visita cliente",
    "Seguimiento","Cobranza / Pago","Soporte / Post-venta","Administrativa"
  ];
  const CAT_COLORS = {
    "Prospecto / Levantamiento":"#9BAAC4",
    "Comercial / Venta":"#00C2FF","Operaciones / Terreno":"#00E5A0",
    "Visita cliente":"#FFB800","Seguimiento":"#A855F7",
    "Cobranza / Pago":"#FF4D6A","Soporte / Post-venta":"#F97316","Administrativa":"#6B7A99"
  };

  const [viewMode, setViewMode]   = useState("semana"); // lista | dia | semana | mes
  const [calDate, setCalDate]     = useState(hoyISO());
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // hora o fecha resaltada
  const [filter, setFilter]       = useState("todas");
  const [filterCat, setFilterCat] = useState("todas");
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const emptyForm = () => ({ title:"", contactId:"", company:"", dueDate:"", startDate:"", startTime:"09:00", endTime:"10:00", priority:"media", type:"tarea", status:"pendiente", category:"Comercial / Venta", notes:"", cotizacion:"", dealId:"", dealStageSnapshot:"" });
  const [form, setForm] = useState(emptyForm());
  const ff = (k,v) => setForm(p=>({...p,[k]:v}));

  // ── Filtrar ──
  const today = hoyISO();
  const filtered = tasks.filter(t => {
    const statusOk = filter==="todas" ? true : filter==="vencidas" ? (t.status!=="completada"&&t.status!=="cancelada"&&t.dueDate&&t.dueDate<today) : t.status===filter;
    const catOk    = filterCat==="todas" || t.category===filterCat;
    return statusOk && catOk;
  }).sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||""));

  // ── Guardar ──
  const save = async () => {
    if (!form.title) return;
    setSaving(true);
    const contact = contacts.find(c=>c.id===form.contactId);
    const dbForm = { ...form, company: form.company||(contact?.company||""), done: form.status==="completada" };
    if (editTask) {
      const { data } = await supabase.from("task").update(mapTaskToDb(dbForm)).eq("id", editTask.id).select().single();
      if (!data) { setSaving(false); return; } // falló: el formulario queda abierto
      setTasks(tasks.map(t=>t.id===editTask.id ? mapTask(data) : t));
    } else {
      const { data } = await supabase.from("task").insert(mapTaskToDb(dbForm)).select().single();
      if (!data) { setSaving(false); return; }
      setTasks([...tasks, mapTask(data)]);
    }
    setSaving(false); setShowModal(false); setEditTask(null); setForm(emptyForm());
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar esta tarea?")) return;
    const { error } = await supabase.from("task").delete().eq("id", id); if(error) return;
    setTasks(tasks.filter(t=>t.id!==id));
  };

  const updateStatus = async (id, newStatus) => {
    await supabase.from("task").update({ estado: newStatus, completada: newStatus==="completada" }).eq("id", id);
    setTasks(tasks.map(t=>t.id===id ? {...t, status:newStatus, done:newStatus==="completada"} : t));
  };

  // DnD calendario: reprograma fecha y/o hora
  const rescheduleTask = async (id, newDate, newTime) => {
    const upd = {};
    if (newDate) { upd.fecha_inicio = newDate; upd.fecha_limite = newDate; }
    if (newTime) upd.hora_inicio = newTime;
    await supabase.from("task").update(upd).eq("id", id);
    setTasks(prev => prev.map(t => t.id===id ? {
      ...t,
      ...(newDate ? { startDate:newDate, dueDate:newDate } : {}),
      ...(newTime ? { startTime:newTime } : {}),
    } : t));
    setDragTaskId(null);
    setDropTarget(null);
  };

  const openEdit = (t) => {
    setEditTask(t);
    setForm({ title:t.title, contactId:t.contactId||"", company:t.company||"", dueDate:t.dueDate||"", startDate:t.startDate||"", startTime:t.startTime||"09:00", endTime:t.endTime||"10:00", priority:t.priority||"media", type:t.type||"tarea", status:t.status||"pendiente", category:t.category||"Comercial / Venta", notes:t.notes||"", cotizacion:t.cotizacion||"", dealId:t.dealId||"", dealStageSnapshot:t.dealStageSnapshot||"" });
    setShowModal(true);
  };

  // ── Helpers ──
  const stCfg = (s) => TASK_STATUSES.find(x=>x.key===s) || TASK_STATUSES[0];
  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" };
  const lbl = { fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4, display:"block" };

  // ── Vista día: tareas del día seleccionado, agrupadas por hora ──
  const HOURS = Array.from({length:14}, (_,i)=>i+7); // 7am-20pm
  const tasksDay = tasks.filter(t => (t.startDate||t.dueDate)===calDate);
  const tasksWeek = (() => {
    const d = new Date(calDate+"T12:00"); d.setDate(d.getDate() - d.getDay() + 1);
    const week = Array.from({length:7}, (_,i)=>{ const dd=new Date(d); dd.setDate(d.getDate()+i); return dd.toISOString().slice(0,10); });
    return week.map(date=>({ date, tasks: tasks.filter(t=>(t.startDate||t.dueDate)===date) }));
  })();
  // Vista mes: cuadrícula completa (semanas de lunes a domingo) cubriendo el mes de calDate
  const tasksMonth = (() => {
    const ref = new Date(calDate+"T12:00");
    const firstOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const start = new Date(firstOfMonth); start.setDate(start.getDate() - ((start.getDay()+6)%7)); // lunes anterior/actual
    const days = Array.from({length:42}, (_,i)=>{ const d=new Date(start); d.setDate(start.getDate()+i); return d.toISOString().slice(0,10); });
    return days.map(date=>({ date, inMonth: new Date(date+"T12:00").getMonth()===ref.getMonth(), tasks: tasks.filter(t=>(t.startDate||t.dueDate)===date) }));
  })();

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:18, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Operaciones</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Tareas</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          {/* Vista */}
          {["lista","dia","semana","mes"].map(v=>(
            <button key={v} onClick={()=>setViewMode(v)} style={{ padding:"6px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer", background:viewMode===v?COLORS.accent:COLORS.card, color:viewMode===v?COLORS.bg:COLORS.textMuted, border:`1px solid ${viewMode===v?COLORS.accent:COLORS.border}` }}>
              {v==="lista"?"☰ Lista":v==="dia"?"📅 Día":v==="semana"?"📆 Semana":"🗓 Mes"}
            </button>
          ))}
          <AddBtn onClick={()=>{ setEditTask(null); setForm(emptyForm()); setShowModal(true); }} label="Nueva tarea" />
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {[{k:"todas",l:"Todas"},{k:"vencidas",l:"⚠ Vencidas"},{k:"pendiente",l:"Pendiente"},{k:"en_progreso",l:"En progreso"},{k:"en_espera",l:"En espera"},{k:"completada",l:"Completada"},{k:"cancelada",l:"Cancelada"}].map(({k,l})=>(
            <button key={k} onClick={()=>setFilter(k)} style={{ padding:"4px 10px", borderRadius:5, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filter===k?COLORS.accent:COLORS.card, color:filter===k?COLORS.bg:COLORS.textMuted, border:`1px solid ${filter===k?COLORS.accent:COLORS.border}` }}>{l}</button>
          ))}
        </div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ ...inp, width:"auto", fontSize:11, padding:"4px 10px" }}>
          <option value="todas">Todas las categorías</option>
          {TASK_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── VISTA LISTA ── */}
      {viewMode==="lista" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map(t=>{
            const sc = stCfg(t.status);
            const overdue = t.status!=="completada"&&t.status!=="cancelada"&&t.dueDate&&t.dueDate<today;
            const catColor = CAT_COLORS[t.category]||COLORS.textMuted;
            return (
              <div key={t.id} style={{ background:COLORS.card, border:`1px solid ${overdue?COLORS.red+"44":COLORS.border}`, borderRadius:8, padding:"12px 16px", display:"flex", alignItems:"flex-start", gap:12, opacity:t.status==="cancelada"?0.5:1 }}>
                {/* Status pill clickeable */}
                <div style={{ flexShrink:0, marginTop:2 }}>
                  <select value={t.status} onChange={e=>updateStatus(t.id,e.target.value)}
                    style={{ background:`${sc.color}22`, border:`1px solid ${sc.color}44`, borderRadius:20, padding:"2px 8px", fontFamily:FONT, fontSize:10, color:sc.color, cursor:"pointer", outline:"none", fontWeight:700 }}>
                    {TASK_STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3 }}>
                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, textDecoration:t.status==="completada"?"line-through":"none" }}>{t.title}</span>
                    <span style={{ fontFamily:FONT, fontSize:10, background:`${catColor}18`, color:catColor, border:`1px solid ${catColor}33`, borderRadius:10, padding:"1px 7px" }}>{t.category}</span>
                    {t.cotizacion && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>COT-{t.cotizacion}</span>}
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                    {t.company}{t.startTime?` · ${t.startTime}${t.endTime?`-${t.endTime}`:""}`:""}{t.dueDate?` · Vence: ${fmtDate(t.dueDate)}`:""}
                    {overdue && <span style={{ color:COLORS.red, marginLeft:6 }}>⚠ Vencida</span>}
                  </div>
                  {t.notes && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:4, fontStyle:"italic" }}>{t.notes}</div>}
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={()=>openEdit(t)} style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.textMuted, cursor:"pointer", padding:"3px 8px", fontSize:11 }}>✏️</button>
                  <button onClick={()=>del(t.id)} style={{ background:"none", border:"none", color:COLORS.textDim, cursor:"pointer", fontSize:13 }}>✕</button>
                </div>
              </div>
            );
          })}
          {filtered.length===0 && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin tareas en esta categoría</div>}
        </div>
      )}

      {/* ── VISTA DÍA ── */}
      {viewMode==="dia" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setDate(d.getDate()-1); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>←</button>
            <input type="date" value={calDate} onChange={e=>setCalDate(e.target.value)} style={{ ...inp, width:"auto", fontSize:12 }} />
            <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:600, color:COLORS.text }}>
              {new Date(calDate+"T12:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})}
            </span>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setDate(d.getDate()+1); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>→</button>
            <button onClick={()=>setCalDate(hoyISO())} style={{ background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, borderRadius:6, padding:"5px 10px", color:COLORS.accent, cursor:"pointer", fontFamily:FONT, fontSize:11 }}>Hoy</button>
          </div>
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, overflow:"hidden" }}>
            {HOURS.map(h=>{
              const hStr = `${String(h).padStart(2,"0")}:00`;
              const hTasks = tasksDay.filter(t=>t.startTime && t.startTime.slice(0,2)===String(h).padStart(2,"0"));
              const noTimeTasks = h===7 ? tasksDay.filter(t=>!t.startTime) : [];
              const isDropHour = dropTarget===hStr;
              return (
                <div key={h}
                  onDragOver={e=>{ e.preventDefault(); setDropTarget(hStr); }}
                  onDragLeave={()=>setDropTarget(null)}
                  onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("taskId"); if(id) rescheduleTask(id, calDate, hStr); }}
                  style={{ display:"flex", borderBottom:`1px solid ${COLORS.border}`, minHeight:48, background:isDropHour?`${COLORS.accent}11`:"transparent", transition:"background 0.1s" }}>
                  <div style={{ width:52, padding:"6px 8px", fontFamily:FONT, fontSize:11, color:isDropHour?COLORS.accent:COLORS.textMuted, flexShrink:0, borderRight:`1px solid ${isDropHour?COLORS.accent:COLORS.border}`, paddingTop:8, fontWeight:isDropHour?700:400 }}>{hStr}</div>
                  <div style={{ flex:1, padding:"4px 8px", display:"flex", flexDirection:"column", gap:4 }}>
                    {[...hTasks,...noTimeTasks].map(t=>{
                      const sc=stCfg(t.status);
                      const catColor=CAT_COLORS[t.category]||COLORS.textMuted;
                      const isDragging = dragTaskId===t.id;
                      return (
                        <div key={t.id}
                          draggable
                          onDragStart={e=>{ e.dataTransfer.setData("taskId", t.id); setDragTaskId(t.id); }}
                          onDragEnd={()=>{ setDragTaskId(null); setDropTarget(null); }}
                          onClick={()=>openEdit(t)}
                          style={{ background:`${catColor}18`, border:`1px solid ${catColor}44`, borderLeft:`3px solid ${catColor}`, borderRadius:5, padding:"4px 10px", cursor:"grab", display:"flex", alignItems:"center", gap:8, opacity:isDragging?0.4:1, transition:"opacity 0.15s" }}>
                          <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text, flex:1 }}>{t.title}</span>
                          <span style={{ fontFamily:FONT, fontSize:10, color:sc.color, fontWeight:700 }}>{sc.label}</span>
                          {t.startTime && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{t.startTime}{t.endTime?`-${t.endTime}`:""}</span>}
                          <button onClick={e=>{ e.stopPropagation(); del(t.id); }}
                            style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:13, lineHeight:1, padding:"0 2px", opacity:0.6 }}
                            title="Eliminar">×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VISTA SEMANA ── */}
      {viewMode==="semana" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setDate(d.getDate()-7); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>←</button>
            <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>
              Semana del {new Date(tasksWeek[0]?.date+"T12:00").toLocaleDateString("es-CL",{day:"numeric",month:"short"})} al {new Date(tasksWeek[6]?.date+"T12:00").toLocaleDateString("es-CL",{day:"numeric",month:"short",year:"numeric"})}
            </span>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setDate(d.getDate()+7); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>→</button>
            <button onClick={()=>setCalDate(hoyISO())} style={{ background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, borderRadius:6, padding:"5px 10px", color:COLORS.accent, cursor:"pointer", fontFamily:FONT, fontSize:11 }}>Hoy</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8 }}>
            {tasksWeek.map(({date,tasks:dayTasks})=>{
              const isToday = date===hoyISO();
              const isDropDay = dropTarget===date;
              return (
                <div key={date}
                  onDragOver={e=>{ e.preventDefault(); setDropTarget(date); }}
                  onDragLeave={()=>setDropTarget(null)}
                  onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("taskId"); if(id) rescheduleTask(id, date, null); }}
                  style={{ background:isDropDay?`${COLORS.accent}11`:COLORS.card, border:`1px solid ${isDropDay?COLORS.accent:isToday?COLORS.accent:COLORS.border}`, borderRadius:8, minHeight:120, overflow:"hidden", transition:"background 0.1s" }}>
                  <div style={{ padding:"6px 8px", background:isToday?COLORS.accentDim:COLORS.surface, borderBottom:`1px solid ${COLORS.border}`, textAlign:"center" }}>
                    <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase" }}>
                      {new Date(date+"T12:00").toLocaleDateString("es-CL",{weekday:"short"})}
                    </div>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:isToday?COLORS.accent:COLORS.text }}>
                      {new Date(date+"T12:00").getDate()}
                    </div>
                  </div>
                  <div style={{ padding:"4px 6px", display:"flex", flexDirection:"column", gap:3 }}>
                    {dayTasks.map(t=>{
                      const catColor=CAT_COLORS[t.category]||COLORS.textMuted;
                      const sc=stCfg(t.status);
                      const isDragging = dragTaskId===t.id;
                      return (
                        <div key={t.id}
                          draggable
                          onDragStart={e=>{ e.dataTransfer.setData("taskId", t.id); setDragTaskId(t.id); }}
                          onDragEnd={()=>{ setDragTaskId(null); setDropTarget(null); }}
                          onClick={()=>openEdit(t)}
                          style={{ background:`${catColor}18`, borderLeft:`2px solid ${catColor}`, borderRadius:3, padding:"2px 6px", cursor:"grab", fontSize:11, opacity:isDragging?0.4:1, display:"flex", alignItems:"flex-start", gap:4 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</div>
                            <div style={{ fontFamily:FONT, fontSize:9, color:sc.color }}>{sc.label}</div>
                          </div>
                          <button onClick={e=>{ e.stopPropagation(); del(t.id); }}
                            style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:12, lineHeight:1, padding:0, flexShrink:0, opacity:0.6 }}
                            title="Eliminar">×</button>
                        </div>
                      );
                    })}
                    {dayTasks.length===0 && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, textAlign:"center", padding:"8px 0" }}>—</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VISTA MES ── */}
      {viewMode==="mes" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setMonth(d.getMonth()-1); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>←</button>
            <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:600, color:COLORS.text, textTransform:"capitalize" }}>
              {new Date(calDate+"T12:00").toLocaleDateString("es-CL",{month:"long",year:"numeric"})}
            </span>
            <button onClick={()=>{ const d=new Date(calDate+"T12:00"); d.setMonth(d.getMonth()+1); setCalDate(d.toISOString().slice(0,10)); }} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"5px 10px", color:COLORS.text, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>→</button>
            <button onClick={()=>setCalDate(hoyISO())} style={{ background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, borderRadius:6, padding:"5px 10px", color:COLORS.accent, cursor:"pointer", fontFamily:FONT, fontSize:11 }}>Hoy</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:1, background:COLORS.border, border:`1px solid ${COLORS.border}`, borderRadius:8, overflow:"hidden" }}>
            {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=>(
              <div key={d} style={{ background:COLORS.surface, padding:"6px 8px", fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", textAlign:"center" }}>{d}</div>
            ))}
            {tasksMonth.map(({date,inMonth,tasks:dayTasks})=>{
              const isToday = date===hoyISO();
              const isDropDay = dropTarget===date;
              return (
                <div key={date}
                  onDragOver={e=>{ e.preventDefault(); setDropTarget(date); }}
                  onDragLeave={()=>setDropTarget(null)}
                  onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("taskId"); if(id) rescheduleTask(id, date, null); }}
                  style={{ background:isDropDay?`${COLORS.accent}18`:COLORS.card, minHeight:78, padding:"4px 5px", opacity:inMonth?1:0.4, transition:"background 0.1s" }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:isToday?700:400, color:isToday?COLORS.accent:COLORS.text, marginBottom:3 }}>
                    {isToday ? <span style={{ background:COLORS.accentDim, borderRadius:4, padding:"0 5px" }}>{new Date(date+"T12:00").getDate()}</span> : new Date(date+"T12:00").getDate()}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    {dayTasks.slice(0,3).map(t=>{
                      const catColor=CAT_COLORS[t.category]||COLORS.textMuted;
                      const isDragging = dragTaskId===t.id;
                      return (
                        <div key={t.id}
                          draggable
                          onDragStart={e=>{ e.dataTransfer.setData("taskId", t.id); setDragTaskId(t.id); }}
                          onDragEnd={()=>{ setDragTaskId(null); setDropTarget(null); }}
                          onClick={()=>openEdit(t)}
                          style={{ background:`${catColor}18`, borderLeft:`2px solid ${catColor}`, borderRadius:3, padding:"1px 4px", cursor:"grab", fontSize:9, opacity:isDragging?0.4:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:FONT, color:COLORS.text }}>
                          {t.title}
                        </div>
                      );
                    })}
                    {dayTasks.length>3 && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim }}>+{dayTasks.length-3} más</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:520, maxHeight:"88vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{editTask?"Editar tarea":"Nueva tarea"}</div>
              <button onClick={()=>{ setShowModal(false); setEditTask(null); }} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><label style={lbl}>Título *</label><input value={form.title} onChange={e=>ff("title",e.target.value)} placeholder="Ej: Visita técnica cliente" style={inp} /></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={lbl}>Estado</label>
                  <select value={form.status} onChange={e=>ff("status",e.target.value)} style={inp}>
                    {TASK_STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Categoría</label>
                  <select value={form.category} onChange={e=>ff("category",e.target.value)} style={inp}>
                    {TASK_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Fecha inicio</label><input type="date" value={form.startDate} onChange={e=>ff("startDate",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Fecha límite</label><input type="date" value={form.dueDate} onChange={e=>ff("dueDate",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Hora inicio</label><input type="time" value={form.startTime} onChange={e=>ff("startTime",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Hora fin</label><input type="time" value={form.endTime} onChange={e=>ff("endTime",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Prioridad</label>
                  <select value={form.priority} onChange={e=>ff("priority",e.target.value)} style={inp}>
                    <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Vincular a Deal</label>
                  <select value={form.dealId} onChange={e=>{ const deal=deals.find(d=>d.id===e.target.value); ff("dealId",e.target.value); if(deal){ ff("company",deal.company||form.company); ff("dealStageSnapshot",deal.stage); if(deal.quoteNumber) ff("cotizacion",deal.quoteNumber); } }} style={inp}>
                    <option value="">— Sin deal vinculado —</option>
                    {(deals||[]).filter(d=>d.stage!=="cerrado"&&d.stage!=="rechazado").sort((a,b)=>a.company.localeCompare(b.company)).map(d=>{ const stage=STAGES.find(s=>s.key===d.stage); return <option key={d.id} value={d.id}>{d.company} — {d.title} [{stage?.label||d.stage}]</option>; })}
                  </select>
                </div>
                <div><label style={lbl}>N° Cotización</label><input value={form.cotizacion} onChange={e=>ff("cotizacion",e.target.value)} placeholder="Ej: 88" style={inp} /></div>
              </div>
              <div><label style={lbl}>Contacto</label>
                <select value={form.contactId} onChange={e=>{ const c=contacts.find(x=>x.id===e.target.value); ff("contactId",e.target.value); if(c) ff("company",c.company); }} style={inp}>
                  <option value="">— Sin contacto —</option>
                  {contacts.map(c=><option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                </select>
              </div>
              <div><label style={lbl}>Empresa / Razón social</label><input value={form.company} onChange={e=>ff("company",e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Notas</label><textarea value={form.notes} onChange={e=>ff("notes",e.target.value)} rows={3} style={{ ...inp, resize:"vertical" }} /></div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={()=>{ setShowModal(false); setEditTask(null); }} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ flex:2, padding:"10px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>{saving?"Guardando…":"Guardar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

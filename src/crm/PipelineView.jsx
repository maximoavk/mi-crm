// Pipeline de ventas (deals por etapa) con tareas asociadas.
import { useState, useEffect, useMemo } from "react";
import { TreeCaret } from "../shared/TreeCaret.jsx";
import { TreeBranch } from "../shared/TreeBranch.jsx";
import { supabase } from "../supabaseClient.js";
import { STAGES, REJECT_REASONS } from "../shared/constants.js";
import { mapDealToDb, mapDeal, mapTaskToDb, mapTask } from "../shared/mappers.js";
import { isOverdue, fmt, fmtDate, formatRut, hoyISO } from "../shared/format.js";
import { FONT_BODY as FONT, FONT_DISPLAY, FONT_NUM } from "../theme.js";
import { useTheme } from "../shared/useTheme.js";
import { Modal, Select, Input } from "../shared/ui.jsx";

// ── PIPELINE ────────────────────────────────────────────────────────────────
export function PipelineView({ deals, setDeals, contacts, tasks, setTasks, isMobile }) {
  const { C, theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:"", company:"", contactId:"", rut:"", value:"", stage:"propuesta", probability:"40", closeDate:"", quoteNumber:"", serie:"COT" });
  const [dragDealId, setDragDealId] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null); // "COT:propuesta" | "SIN:cerrado"
  const [quoteBusqueda, setQuoteBusqueda] = useState("");
  const [quoteFound, setQuoteFound] = useState(null);
  const [quoteSearching, setQuoteSearching] = useState(false);
  const [quickTask, setQuickTask] = useState(null); // { dealId, company, dealStageSnapshot, cotizacion, contactId, editingId? }
  const [quickTaskForm, setQuickTaskForm] = useState({ title:"", type:"llamada", dueDate:"", priority:"media" });
  const [facturandoId, setFacturandoId] = useState(null);
  const [facturaVal, setFacturaVal]     = useState("");
  const [facturaFecha, setFacturaFecha] = useState("");
  const [cotFechas, setCotFechas] = useState([]);
  const [monthOverride, setMonthOverride] = useState({});
  const [hoverMonth, setHoverMonth] = useState(null);
  const [resumenOpen, setResumenOpen] = useState(true);

  useEffect(() => {
    supabase.from("cotizaciones").select("id,fecha").then(({data})=>{ if(data) setCotFechas(data); });
  }, []);

  const dealsCOT = useMemo(()=>deals.filter(d=>(d.serie||"COT")==="COT"),[deals]);
  const dealsSIN = useMemo(()=>deals.filter(d=>d.serie==="SIN"),[deals]);
  const groupedCOT = useMemo(()=>{ const g={}; STAGES.forEach(s=>{g[s.key]=dealsCOT.filter(d=>d.stage===s.key);}); return g; },[dealsCOT]);
  const groupedSIN = useMemo(()=>{ const g={}; STAGES.forEach(s=>{g[s.key]=dealsSIN.filter(d=>d.stage===s.key);}); return g; },[dealsSIN]);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const registrarFactura = async (dealId) => {
    if (!facturaVal.trim()) return;
    const updates = {
      facturado:      true,
      numero_factura: facturaVal.trim(),
      fecha_factura:  facturaFecha || hoyISO(),
    };
    await supabase.from("deals").update(updates).eq("id", dealId);
    setDeals(prev => prev.map(d =>
      d.id === dealId
        ? { ...d, facturado: true, numeroFactura: facturaVal.trim(), fechaFactura: facturaFecha }
        : d
    ));
    setFacturandoId(null); setFacturaVal(""); setFacturaFecha("");
  };

  const openEdit = (d) => { setEditingId(d.id); setForm({ title:d.title, company:d.company, contactId:d.contactId||"", rut:d.rut||"", value:String(d.value), stage:d.stage, probability:String(d.probability), closeDate:d.closeDate||"", quoteNumber:d.quoteNumber||"", serie:d.serie||"COT", pctAnticipo:d.pctAnticipo||50 }); setQuoteFound(null); setQuoteBusqueda(""); setShowModal(true); };
  const toggleCollapse = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));
  // Todo parte colapsado (meses y cards); Expandir/Comprimir abre o cierra
  // ambos niveles a la vez.
  const [allOpen, setAllOpen] = useState(false);
  const allCollapsed = !allOpen;
  const toggleAll = () => { const n={}; deals.forEach(d=>{n[d.id]=allOpen;}); setCollapsed(n); setMonthOverride({}); setAllOpen(!allOpen); };

  const buscarCotizacion = async () => {
    if(!quoteBusqueda) return;
    setQuoteSearching(true);
    const { data } = await supabase.from("cotizaciones").select("*").eq("numero", Number(quoteBusqueda)).limit(1);
    if(data && data[0]) {
      const q = data[0];
      setQuoteFound(q);
      // Autocompletar campos del deal
      f("quoteNumber", String(q.numero));
      f("title", q.comentarios || q.nombre_cliente || `Cotización #${q.numero}`);
      f("company", q.razon_social || q.nombre_cliente || "");
      f("rut", q.rut_cliente || "");
      f("value", String(Math.round(q.total || 0)));
      f("pctAnticipo", q.pct_anticipo || 50);
      // Mapear estado cotización → etapa pipeline
      const estadoMap = { aprobada:"cerrado", enviada:"propuesta" };
      f("stage", estadoMap[q.estado] || "propuesta");
    } else {
      setQuoteFound(null);
      alert(`No se encontró la cotización #${quoteBusqueda}`);
    }
    setQuoteSearching(false);
  };

  const save = async () => {
    if (!form.title||!form.company) return;
    setSaving(true);
    const dbData = { ...mapDealToDb(form), numero_cotizacion: form.quoteNumber ? Number(form.quoteNumber) : null };
    if (editingId) {
      const { data, error } = await supabase.from("deals").update(dbData).eq("id", editingId).select().single();
      if (error) { setSaving(false); return; } // falló: el formulario queda abierto
      setDeals(deals.map(d=>d.id===editingId?{...mapDeal(data), quoteNumber:form.quoteNumber}:d));
    } else {
      const { data, error } = await supabase.from("deals").insert(dbData).select().single();
      if (error) { setSaving(false); return; }
      setDeals([...deals, {...mapDeal(data), quoteNumber:form.quoteNumber}]);
    }
    setSaving(false); setShowModal(false); setEditingId(null);
  };

  const moveDeal = async (id, stage, motivo=null) => {
    const updates = { etapa: stage };
    if(stage==="rechazado"){ updates.motivo_rechazo = motivo||null; updates.fecha_rechazo = new Date().toISOString(); }
    await supabase.from("deals").update(updates).eq("id", id);
    // Al pasar un deal a Cerrado, su cotización vinculada pasa a aprobada —
    // sincroniza en la dirección contraria a QuoteEditor.jsx (que ya mueve
    // el deal a Cerrado cuando la cotización se marca aprobada). Antes solo
    // existía esa dirección: mover el deal en el Pipeline no aprobaba la
    // cotización, así que quedaban desincronizados.
    if(stage==="cerrado"){
      const deal = deals.find(d=>d.id===id);
      if(deal?.quoteId) await supabase.from("cotizaciones").update({ estado:"aprobada" }).eq("id", deal.quoteId);
    }
    setDeals(deals.map(d=>d.id===id?{...d, stage, ...(stage==="rechazado"?{motivoRechazo:motivo||"", fechaRechazo:updates.fecha_rechazo}:{})}:d));
  };

  const [rejectModal, setRejectModal] = useState(null); // { dealId }
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOtro, setRejectOtro] = useState("");
  const requestMoveDeal = (id, stage) => {
    if(stage==="rechazado"){ setRejectModal({ dealId:id }); setRejectReason(""); setRejectOtro(""); }
    else moveDeal(id, stage);
  };
  const confirmReject = () => {
    if(!rejectModal) return;
    const motivo = rejectReason==="Otro" ? rejectOtro.trim() : rejectReason;
    moveDeal(rejectModal.dealId, "rechazado", motivo||null);
    setRejectModal(null);
  };

  const del = async (id) => {
    const { error } = await supabase.from("deals").delete().eq("id", id); if(error) return;
    setDeals(deals.filter(d=>d.id!==id));
  };

  // ── Quick task (actividad rápida desde Kanban) ───────────────────────────────
  const openQuickTask = (deal) => {
    setQuickTask({ dealId:deal.id, company:deal.company, dealStageSnapshot:deal.stage, cotizacion:deal.quoteNumber||"", contactId:deal.contactId||"" });
    setQuickTaskForm({ title:"", type:"llamada", dueDate:"", priority:"media" });
  };
  const openEditQuickTask = (task) => {
    setQuickTask({ editingId:task.id, dealId:task.dealId, company:task.company, dealStageSnapshot:task.dealStageSnapshot });
    setQuickTaskForm({ title:task.title, type:task.type, dueDate:task.dueDate||"", priority:task.priority, status:task.status });
  };
  const saveQuickTask = async (form) => {
    if (!form.title) return;
    if (quickTask.editingId) {
      // UPDATE — no insert
      const { data } = await supabase.from("task")
        .update(mapTaskToDb({ ...form, dealId:quickTask.dealId, company:quickTask.company }))
        .eq("id", quickTask.editingId).select().single();
      if (data) setTasks(prev=>prev.map(t=>t.id===quickTask.editingId?mapTask(data):t));
    } else {
      // INSERT — solo si no hay duplicado mismo tipo+fecha+deal
      const exists = tasks.find(t=>t.dealId===quickTask.dealId && t.type===form.type && t.dueDate===form.dueDate && !t.done);
      if (exists) { alert("Ya existe una tarea similar para este deal en esa fecha."); return; }
      const { data } = await supabase.from("task")
        .insert(mapTaskToDb({ ...form, dealId:quickTask.dealId, dealStageSnapshot:quickTask.dealStageSnapshot, company:quickTask.company, contactId:quickTask.contactId||"", cotizacion:quickTask.cotizacion||"", status:"pendiente", category:"Comercial / Venta", notes:"", startDate:"", startTime:"09:00", endTime:"10:00" }))
        .select().single();
      if (data) setTasks(prev=>[...prev, mapTask(data)]);
    }
    setQuickTask(null);
  };
  const completeQuickTask = async (taskId) => {
    await supabase.from("task").update({ completada:true, estado:"completada" }).eq("id", taskId);
    setTasks(prev=>prev.map(t=>t.id===taskId?{...t,done:true,status:"completada"}:t));
  };

  // ── Activity helpers (Pipeline ↔ Tasks) ────────────────────────────────────
  const getDealActivityStatus = (dealId) => {
    const dealTasks = tasks.filter(t=>t.dealId===dealId && !t.done);
    if(dealTasks.length===0) return "none";
    return dealTasks.some(t=>isOverdue(t.dueDate)) ? "overdue" : "active";
  };
  const getDealNextTask = (dealId) => {
    return tasks.filter(t=>t.dealId===dealId && !t.done)
      .sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||""))[0] || null;
  };
  const ACTIVITY_BORDER = { active:C.green, overdue:C.red, none:C.border };

  // ── Agrupación por mes (según fecha de la cotización vinculada) ─────────────
  const monthLabel = (key) => {
    const [y,m] = key.split("-");
    const label = new Date(Number(y), Number(m)-1, 1).toLocaleDateString("es-CL", { month:"long", year:"numeric" });
    return label.charAt(0).toUpperCase()+label.slice(1);
  };
  const groupDealsByMonth = (dealsArr) => {
    const groups = {};
    dealsArr.forEach(d=>{
      const cot = cotFechas.find(c=>c.id===d.quoteId);
      const key = cot?.fecha ? cot.fecha.slice(0,7) : "sin-fecha";
      (groups[key] = groups[key]||[]).push(d);
    });
    const ordered = Object.keys(groups).filter(k=>k!=="sin-fecha").sort()
      .map(k=>({ key:k, label:monthLabel(k), deals:groups[k] }));
    if(groups["sin-fecha"]) ordered.push({ key:"sin-fecha", label:"Sin fecha", deals:groups["sin-fecha"] });
    return ordered;
  };
  const monthShortLabel = (key) => {
    const [y,m] = key.split("-");
    const label = new Date(Number(y), Number(m)-1, 1).toLocaleDateString("es-CL", { month:"short" }).replace(".","");
    return label.charAt(0).toUpperCase()+label.slice(1);
  };

  // ── Resumen mensual combinado COT+SIN (panel de donas) ───────────────────────
  const monthlyStats = useMemo(()=>{
    const groups = {};
    deals.forEach(d=>{
      const cot = cotFechas.find(c=>c.id===d.quoteId);
      if(!cot?.fecha) return;
      const key = cot.fecha.slice(0,7);
      if(!groups[key]) groups[key] = { propuesta:0, cerrado:0, rechazado:0 };
      groups[key][d.stage] = (groups[key][d.stage]||0) + Number(d.value);
    });
    return Object.keys(groups).sort().map(key=>{
      const g = groups[key];
      return { key, year:key.slice(0,4), label:monthLabel(key), shortLabel:monthShortLabel(key), ...g, total:g.propuesta+g.cerrado+g.rechazado };
    });
  },[deals, cotFechas]);

  // Donas agrupadas por año — una fila por año, para que escale bien con 12+ meses
  const monthlyByYear = useMemo(()=>{
    const groups = {};
    monthlyStats.forEach(m=>{ (groups[m.year] = groups[m.year]||[]).push(m); });
    return Object.keys(groups).sort().map(year=>({ year, months:groups[year] }));
  },[monthlyStats]);
  const resumenYears = monthlyByYear.map(g=>g.year);

  // Dona chica de resumen mensual (hover = agranda + tooltip con detalle)
  const renderMonthDonut = (m) => {
    const isHover = hoverMonth===m.key;
    const size = 46, r = size*0.32, cx = size/2, cy = size/2, sw = size*0.16;
    const circ = 2*Math.PI*r;
    let offset = 0;
    const segs = STAGES.map(s=>{
      const val = m[s.key];
      const len = m.total>0 ? (val/m.total)*circ : 0;
      const rot = (offset/circ)*360 - 90;
      offset += len;
      return len>0 ? { key:s.key, color:s.color, dash:`${len} ${circ-len}`, rot } : null;
    }).filter(Boolean);
    return (
      <div key={m.key}
        {...(isMobile
          ? { onClick:()=>setHoverMonth(k=>k===m.key?null:m.key), role:"button", "aria-pressed":isHover }
          : { onMouseEnter:()=>setHoverMonth(m.key), onMouseLeave:()=>setHoverMonth(null) })}
        style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:6, borderRadius:8, cursor:isMobile?"pointer":"default", flexShrink:0, background:isHover?C.border:"transparent", transition:"background 0.15s" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:isHover&&!isMobile?"scale(1.35)":"scale(1)", transition:"transform 0.18s ease" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={sw} />
          {segs.map(seg=>(
            <circle key={seg.key} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={sw}
              strokeDasharray={seg.dash} transform={`rotate(${seg.rot} ${cx} ${cy})`} />
          ))}
        </svg>
        <span style={{ fontFamily:FONT, fontSize:9, color:C.textMuted, textTransform:"uppercase" }}>{m.shortLabel}</span>
        {isHover && !isMobile && (
          <div style={{ position:"absolute", bottom:"100%", left:"50%", transform:"translateX(-50%) translateY(-6px)", background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, padding:"8px 10px", width:150, zIndex:10, boxShadow:"0 8px 20px #00000066" }}>
            {STAGES.filter(s=>m[s.key]>0).map(s=>(
              <div key={s.key} style={{ display:"flex", alignItems:"center", gap:5, fontFamily:FONT, fontSize:9, color:C.text, marginBottom:3 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:s.color, flexShrink:0 }} />
                {s.label}: {fmt(m[s.key])}
              </div>
            ))}
            <div style={{ fontFamily:FONT_NUM, fontSize:10, fontWeight:700, color:C.text, marginTop:4, paddingTop:4, borderTop:`1px dashed ${C.border}` }}>Total: {fmt(m.total)}</div>
          </div>
        )}
      </div>
    );
  };

  // Render de una card de deal individual
  const renderDealCard = (d, stage, laneKey, accentColor) => {
    const isCollapsed = collapsed[d.id] !== false;
    return (
              <div key={d.id} draggable
                onDragStart={()=>setDragDealId(d.id)}
                onDragEnd={()=>{ setDragDealId(null); setDragOverKey(null); }}
                style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, borderLeft:`3px solid ${stage.key==="cerrado" && d.facturado ? C.purple : ACTIVITY_BORDER[getDealActivityStatus(d.id)]}`, overflow:"hidden", cursor:"grab", opacity:dragDealId===d.id?0.5:d.facturado?0.55:1, transition:"opacity 0.2s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, padding:isCollapsed?"9px 11px":"11px 13px 7px" }}>
                  <TreeCaret collapsed={isCollapsed} onToggle={()=>toggleCollapse(d.id)} title={isCollapsed?"Ver detalle":"Ocultar detalle"} color={C.textMuted} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{d.title}</div>
                    {isCollapsed && <div style={{ fontFamily:FONT, fontSize:10, color:C.textMuted }}>{d.company}</div>}
                  </div>
                  {isCollapsed && <div style={{ fontFamily:FONT_NUM, fontSize:11, color:C.green, fontWeight:700, flexShrink:0 }}>{fmt(d.value)}</div>}
                  <button onClick={()=>openEdit(d)} style={{ background:"none", border:`1px solid ${accentColor}44`, borderRadius:4, color:accentColor, cursor:"pointer", fontSize:11, padding:"2px 5px", flexShrink:0 }}>✏️</button>
                  <button onClick={()=>del(d.id)} style={{ background:"none", border:`1px solid ${C.red}44`, borderRadius:4, color:C.red, cursor:"pointer", fontSize:12, padding:"2px 5px", flexShrink:0 }}>×</button>
                </div>
                {!isCollapsed && (
                  <div className="tree-row-in" style={{ padding:"0 13px 11px" }}>
                    {/* Próxima actividad */}
                    {(()=>{ const actStatus=getDealActivityStatus(d.id); const nextTask=getDealNextTask(d.id); return (
                      <div style={{ borderLeft:`3px solid ${ACTIVITY_BORDER[actStatus]}`, paddingLeft:8, marginBottom:10 }}>
                        {nextTask ? (
                          <div style={{ fontFamily:FONT, fontSize:10, color:C.textMuted }}>
                            <span style={{ marginRight:4 }}>{nextTask.type==="llamada"?"📞":nextTask.type==="reunion"?"🤝":nextTask.type==="email"?"✉️":"✅"}</span>
                            {nextTask.title}
                            <span style={{ marginLeft:6, color:isOverdue(nextTask.dueDate)?C.red:C.textDim, fontSize:9 }}>{fmtDate(nextTask.dueDate)}</span>
                          </div>
                        ) : (
                          <div style={{ fontFamily:FONT, fontSize:10, color:C.textDim, fontStyle:"italic" }}>Sin actividad programada</div>
                        )}
                      </div>
                    );})()}
                    <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted, marginBottom:d.rut?2:7 }}>{d.company}</div>
                    {d.rut && <div style={{ fontFamily:FONT, fontSize:10, color:C.textDim, marginBottom:7 }}>RUT: {d.rut}</div>}
                    {d.quoteNumber && <div style={{ fontFamily:FONT, fontSize:10, color:accentColor, background:`${accentColor}11`, border:`1px solid ${accentColor}33`, borderRadius:4, padding:"2px 7px", display:"inline-block", marginBottom:7 }}>📄 {laneKey}-{d.quoteNumber}</div>}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                      <div style={{ fontFamily:FONT_NUM, fontSize:12, color:C.green, fontWeight:700 }}>{fmt(d.value)}</div>
                      <div style={{ fontFamily:FONT, fontSize:10, color:C.textMuted }}>{fmtDate(d.closeDate)}</div>
                    </div>
                    {stage.key === "cerrado" && (()=>{ const pct=d.pctAnticipo||50; const ant=Math.round(d.value*pct/100); const saldo=d.value-ant; return (
                      <div style={{ fontFamily:FONT, fontSize:10, color:C.textDim, marginBottom:7 }}>
                        Anticipo esperado: <span style={{ color:C.textMuted }}>{fmt(ant)} ({pct}%)</span> · Saldo: <span style={{ color:C.textMuted }}>{fmt(saldo)}</span>
                      </div>
                    );})()}
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontFamily:FONT, fontSize:10, color:C.textMuted }}>Prob.</span>
                      <span style={{ fontFamily:FONT, fontSize:10, color:accentColor }}>{d.probability}%</span>
                    </div>
                    <div style={{ height:3, background:C.border, borderRadius:2, marginBottom:9 }}>
                      <div style={{ height:3, borderRadius:2, background:accentColor, width:`${d.probability}%` }} />
                    </div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {STAGES.filter(s=>s.key!==stage.key).map(s=>(
                        <button key={s.key} onClick={()=>requestMoveDeal(d.id,s.key)} style={{ padding:"2px 6px", borderRadius:4, fontFamily:FONT, fontSize:10, cursor:"pointer", background:"transparent", border:`1px solid ${accentColor}44`, color:accentColor }}>→ {s.label}</button>
                      ))}
                      <button onClick={()=>del(d.id)} style={{ padding:"2px 6px", borderRadius:4, fontFamily:FONT, fontSize:10, cursor:"pointer", background:"transparent", border:`1px solid ${C.red}44`, color:C.red, marginLeft:"auto" }}>✕</button>
                    </div>
                    {/* Botón actividad */}
                    {(()=>{ const nextTask=getDealNextTask(d.id); return nextTask ? (
                      <button onClick={()=>openEditQuickTask(nextTask)} style={{ display:"flex", alignItems:"center", gap:4, background:"transparent", border:`1px solid ${C.green}44`, borderRadius:5, padding:"3px 8px", fontFamily:FONT, fontSize:10, color:C.green, cursor:"pointer", marginTop:6 }}>✏️ editar actividad</button>
                    ) : (
                      <button onClick={()=>openQuickTask(d)} style={{ display:"flex", alignItems:"center", gap:4, background:"transparent", border:`1px solid ${C.accent}44`, borderRadius:5, padding:"3px 8px", fontFamily:FONT, fontSize:10, color:C.accent, cursor:"pointer", marginTop:6 }}>+ actividad</button>
                    );})()}
                    {/* Bloque facturación — solo en stage cerrado */}
                    {stage.key === "cerrado" && (
                      <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                        {d.facturado ? (
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:9, padding:"2px 8px", borderRadius:4, fontWeight:600, background:`${C.purple}18`, color:C.purple, border:`1px solid ${C.purple}33` }}>✓ Facturado</span>
                            <span style={{ fontFamily:FONT, fontSize:10, color:C.textDim }}>N° {d.numeroFactura}{d.fechaFactura && ` · ${fmtDate(d.fechaFactura)}`}</span>
                          </div>
                        ) : facturandoId === d.id ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            <div style={{ fontFamily:FONT, fontSize:9, color:C.yellow, textTransform:"uppercase", letterSpacing:"0.08em" }}>Registrar factura SII</div>
                            <input value={facturaVal} onChange={e=>setFacturaVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")registrarFactura(d.id);if(e.key==="Escape")setFacturandoId(null);}} placeholder="N° factura SII..." autoFocus style={{ background:C.bg, border:`1px solid ${C.yellow}`, borderRadius:5, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:C.text, outline:"none" }} />
                            <input value={facturaFecha} onChange={e=>setFacturaFecha(e.target.value)} type="date" style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:5, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:C.text, outline:"none" }} />
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>registrarFactura(d.id)} style={{ flex:2, padding:"5px 0", background:`${C.purple}22`, border:`1px solid ${C.purple}55`, borderRadius:5, color:C.purple, fontFamily:FONT, fontSize:10, fontWeight:700, cursor:"pointer" }}>✓ Registrar</button>
                              <button onClick={()=>setFacturandoId(null)} style={{ flex:1, padding:"5px 0", background:"transparent", border:`1px solid ${C.border}`, borderRadius:5, color:C.textMuted, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={()=>{ setFacturandoId(d.id); setFacturaVal(""); setFacturaFecha(""); }} style={{ width:"100%", padding:"5px 0", background:`${C.yellow}18`, border:`1px solid ${C.yellow}44`, borderRadius:5, color:C.yellow, fontFamily:FONT, fontSize:10, fontWeight:700, cursor:"pointer" }}>📋 Pendiente facturar</button>
                        )}
                      </div>
                    )}
                    {/* Motivo de rechazo — solo en stage rechazado */}
                    {stage.key === "rechazado" && (
                      <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                        <span style={{ fontSize:9, padding:"2px 8px", borderRadius:4, fontWeight:600, background:`${C.red}18`, color:C.red, border:`1px solid ${C.red}33` }}>{d.motivoRechazo || "Sin motivo especificado"}</span>
                        {d.fechaRechazo && <span style={{ fontFamily:FONT, fontSize:10, color:C.textDim, marginLeft:8 }}>{fmtDate(d.fechaRechazo.slice(0,10))}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
    );
  };

  // Render de una columna de etapa para un lane específico (con cards agrupadas por mes)
  const renderStageCol = (stage, grouped, laneKey, accentColor) => {
    const stageDeals = grouped[stage.key]||[];
    const total = stageDeals.reduce((s,d)=>s+Number(d.value),0);
    const totalAnticipo = stage.key === "cerrado"
      ? stageDeals.reduce((s,d)=>s+Math.round(Number(d.value)*(d.pctAnticipo||50)/100),0)
      : null;
    const dropKey = `${laneKey}:${stage.key}`;
    const isDropTarget = dragDealId && dragOverKey===dropKey;
    const monthGroups = groupDealsByMonth(stageDeals);
    return (
      <div key={`${laneKey}-${stage.key}`}
        onDragOver={e=>{ e.preventDefault(); setDragOverKey(dropKey); }}
        onDragLeave={e=>{ if(!e.currentTarget.contains(e.relatedTarget)) setDragOverKey(null); }}
        onDrop={e=>{ e.preventDefault(); if(dragDealId) requestMoveDeal(dragDealId, stage.key); setDragDealId(null); setDragOverKey(null); }}
        style={{ outline: isDropTarget ? `2px dashed ${accentColor}` : "2px dashed transparent", borderRadius:8, transition:"outline 0.15s" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, padding:"8px 12px", background:C.card, borderRadius:8, border:`1px solid ${accentColor}33` }}>
          <div>
            <div style={{ fontFamily:FONT, fontSize:10, color:accentColor, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>{stage.label}</div>
            <div style={{ fontFamily:FONT_NUM, fontSize:10, color:C.textMuted, marginTop:1 }}>{fmt(total)}</div>
            {totalAnticipo!==null && <div style={{ fontFamily:FONT_NUM, fontSize:9, color:C.textDim, marginTop:1 }}>Anticipo esperado: {fmt(totalAnticipo)}</div>}
          </div>
          <div style={{ width:20, height:20, borderRadius:"50%", background:accentColor+"22", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT, fontSize:10, color:accentColor, fontWeight:700 }}>{stageDeals.length}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {monthGroups.map((group) => {
            const groupKey = `${laneKey}:${stage.key}:${group.key}`;
            const isOpen = monthOverride[groupKey] !== undefined ? monthOverride[groupKey] : allOpen;
            const groupTotal = group.deals.reduce((s,d)=>s+Number(d.value),0);
            return (
              <div key={group.key}>
                <button onClick={()=>setMonthOverride(p=>({...p,[groupKey]:!isOpen}))}
                  style={{ width:"100%", display:"flex", flexDirection:"column", padding:"6px 10px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer", marginBottom: isOpen?7:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:4, fontFamily:FONT, fontSize:10, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.06em" }}><TreeCaret collapsed={!isOpen} color={C.textMuted} /> {group.label}</span>
                    <span style={{ fontFamily:FONT, fontSize:10, color:C.textDim }}>{group.deals.length}</span>
                  </div>
                  <div style={{ fontFamily:FONT_NUM, fontSize:10, color:accentColor, fontWeight:600, marginTop:2, textAlign:"left", paddingLeft:18 }}>{fmt(groupTotal)}</div>
                </button>
                {isOpen && (
                  // Árbol: la línea baja desde el triángulo del mes (borde 1 + padding 10 + 7)
                  <TreeBranch x={18} anchor={17} reach={30} gap={2} style={{ marginBottom:7 }} color={C.border}>
                    {group.deals.map(d=><div key={d.id} style={{ marginBottom:7 }}>{renderDealCard(d, stage, laneKey, accentColor)}</div>)}
                  </TreeBranch>
                )}
              </div>
            );
          })}
          {stageDeals.length===0 && <div style={{ border:`1px dashed ${C.border}`, borderRadius:8, padding:"16px 0", textAlign:"center", fontFamily:FONT, fontSize:11, color:C.textDim }}>—</div>}
        </div>
      </div>
    );
  };

  // ── Panel resumen mensual (dona COT+SIN por mes) — al pie en escritorio;
  // en móvil va arriba de las etapas (al pie quedaba bajo una lista muy larga),
  // las donas se deslizan hacia el lado y al tocar un mes se ve su detalle abajo.
  const mesSel = isMobile ? monthlyStats.find(m=>m.key===hoverMonth) : null;
  const resumenPanel = monthlyStats.length>0 && (
        <div style={{ marginTop:isMobile?0:28, marginBottom:isMobile?20:0, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
          <button onClick={()=>setResumenOpen(o=>!o)} style={{ width:"100%", display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", padding:0, marginBottom:resumenOpen?12:0 }}>
            <TreeCaret collapsed={!resumenOpen} color={C.textMuted} />
            <span style={{ fontFamily:FONT, fontSize:10, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>
              Resumen por mes{resumenYears.length===1 && ` · ${resumenYears[0]}`}
            </span>
          </button>
          {resumenOpen && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {monthlyByYear.map(({year, months})=>(
                <div key={year} className={isMobile?"no-scrollbar":undefined}
                  style={isMobile
                    ? { display:"flex", gap:4, alignItems:"flex-start", overflowX:"auto", margin:"0 -14px", padding:"0 14px", WebkitOverflowScrolling:"touch" }
                    : { display:"flex", flexWrap:"wrap", gap:18, alignItems:"flex-start" }}>
                  {resumenYears.length>1 && (
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:C.text, writingMode:"vertical-rl", padding:"4px 2px", flexShrink:0 }}>{year}</div>
                  )}
                  {months.map(renderMonthDonut)}
                </div>
              ))}
              {isMobile && (mesSel ? (
                <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px" }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:C.text, marginBottom:6 }}>{mesSel.label.charAt(0).toUpperCase()+mesSel.label.slice(1)}</div>
                  {STAGES.filter(st=>mesSel[st.key]>0).map(st=>(
                    <div key={st.key} style={{ display:"flex", alignItems:"center", gap:6, fontFamily:FONT, fontSize:11, color:C.text, marginBottom:3 }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:st.color, flexShrink:0 }} />
                      <span style={{ flex:1 }}>{st.label}</span>
                      <span style={{ fontFamily:FONT_NUM }}>{fmt(mesSel[st.key])}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", fontFamily:FONT_NUM, fontSize:12, fontWeight:700, color:C.text, marginTop:4, paddingTop:5, borderTop:`1px dashed ${C.border}` }}>
                    <span style={{ flex:1 }}>Total</span>{fmt(mesSel.total)}
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily:FONT, fontSize:10, color:C.textDim }}>Toca un mes para ver el detalle</div>
              ))}
            </div>
          )}
        </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Kanban</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:C.text }}>Pipeline de Ventas</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={toggleAll} style={{ padding:"8px 14px", background:C.card, border:`1px solid ${C.border}`, borderRadius:7, color:C.textMuted, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer" }}>{allCollapsed?"⊞ Expandir":"⊟ Comprimir"}</button>
        </div>
      </div>

      {isMobile && resumenPanel}

      <div>
        {/* ── LANE COT — Con factura / IVA ── */}
        <div style={{ marginBottom:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:C.accent, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700 }}>COT · Con IVA · Facturas empresa</div>
            <div style={{ flex:1, height:1, background:C.accent+"33" }} />
            <div style={{ fontFamily:FONT_NUM, fontSize:11, color:C.textMuted }}>{fmt(dealsCOT.reduce((s,d)=>s+Number(d.value),0))}</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:12 }}>
            {STAGES.map(stage => renderStageCol(stage, groupedCOT, "COT", C.accent))}
          </div>
        </div>

        {/* ── LANE SIN — Sin IVA / Boletas / Personal ── */}
        <div style={{ marginTop:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:"#2563EB", textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700 }}>SIN · Sin IVA · Boletas / Personal</div>
            <div style={{ flex:1, height:1, background:"#2563EB33" }} />
            <div style={{ fontFamily:FONT_NUM, fontSize:11, color:C.textMuted }}>{fmt(dealsSIN.reduce((s,d)=>s+Number(d.value),0))}</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:12 }}>
            {STAGES.map(stage => renderStageCol(stage, groupedSIN, "SIN", "#2563EB"))}
          </div>
        </div>
      </div>

      {!isMobile && resumenPanel}
      {rejectModal && (
        <Modal title="Motivo de rechazo" onClose={()=>setRejectModal(null)} onSubmit={confirmReject} theme={theme}>
          <Select label="Causa" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} theme={theme}>
            <option value="">Sin especificar</option>
            {REJECT_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
          </Select>
          {rejectReason==="Otro" && (
            <Input label="Detalle" value={rejectOtro} onChange={e=>setRejectOtro(e.target.value)} placeholder="Especifica el motivo..." theme={theme} />
          )}
        </Modal>
      )}
      {quickTask && (
        <Modal title={`${quickTask.editingId?"Editar":"Nueva"} actividad — ${quickTask.company}`} onClose={()=>setQuickTask(null)} onSubmit={()=>saveQuickTask(quickTaskForm)} theme={theme}>
          <Input label="Título *" value={quickTaskForm.title} onChange={e=>setQuickTaskForm(p=>({...p,title:e.target.value}))} placeholder="Ej: Llamada de seguimiento" theme={theme} />
          <Select label="Tipo" value={quickTaskForm.type} onChange={e=>setQuickTaskForm(p=>({...p,type:e.target.value}))} theme={theme}>
            <option value="llamada">📞 Llamada</option>
            <option value="reunion">🤝 Reunión</option>
            <option value="email">✉️ Email</option>
            <option value="tarea">✅ Tarea</option>
          </Select>
          <Input label="Fecha límite" value={quickTaskForm.dueDate} onChange={e=>setQuickTaskForm(p=>({...p,dueDate:e.target.value}))} type="date" theme={theme} />
          <Select label="Prioridad" value={quickTaskForm.priority} onChange={e=>setQuickTaskForm(p=>({...p,priority:e.target.value}))} theme={theme}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </Select>
          {quickTask.editingId && (
            <div style={{ marginTop:8 }}>
              <button onClick={()=>{ completeQuickTask(quickTask.editingId); setQuickTask(null); }}
                style={{ width:"100%", padding:"8px", background:`${C.green}22`, border:`1px solid ${C.green}44`, borderRadius:6, color:C.green, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                ✓ Marcar como completada
              </button>
            </div>
          )}
        </Modal>
      )}
      {showModal && (
        <Modal title={editingId?"Editar Deal":"Nuevo Deal"} onClose={()=>setShowModal(false)} onSubmit={save} theme={theme}>
          {/* Buscador cotización */}
          <div style={{ background:C.surface, border:`1px solid ${C.accent}33`, borderRadius:8, padding:"12px 14px", marginBottom:8 }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:C.accent, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Vincular cotización</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={quoteBusqueda} onChange={e=>setQuoteBusqueda(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&buscarCotizacion()}
                placeholder="N° cotización..." type="number"
                style={{ flex:1, background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, color:C.text, fontFamily:FONT, fontSize:12, padding:"7px 10px" }} />
              <button onClick={buscarCotizacion} disabled={quoteSearching}
                style={{ padding:"7px 14px", background:C.accent, border:"none", borderRadius:6, color:C.bg, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:"pointer", opacity:quoteSearching?0.6:1 }}>
                {quoteSearching?"...":"Buscar"}
              </button>
            </div>
            {quoteFound && (
              <div style={{ marginTop:8, padding:"8px 10px", background:`${C.green}11`, border:`1px solid ${C.green}33`, borderRadius:6 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:C.green, fontWeight:700 }}>✓ Cotización #{quoteFound.numero} encontrada</div>
                <div style={{ fontFamily:FONT, fontSize:11, color:C.textMuted, marginTop:2 }}>{quoteFound.razon_social||quoteFound.nombre_cliente} · ${Math.round(quoteFound.total||0).toLocaleString("es-CL")}</div>
                <div style={{ fontFamily:FONT, fontSize:10, color:C.textMuted }}>Datos autocargados ↓</div>
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            {[{k:"COT",label:"COT · Con IVA",color:C.accent},{k:"SIN",label:"SIN · Sin IVA",color:"#2563EB"}].map(({k,label,color})=>(
              <button key={k} onClick={()=>f("serie",k)}
                style={{ flex:1, padding:"9px 0", borderRadius:7, cursor:"pointer", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, border:`1px solid ${form.serie===k?color:C.border}`, background:form.serie===k?color+"22":"transparent", color:form.serie===k?color:C.textMuted }}>
                {label}
              </button>
            ))}
          </div>
          <Input label="Título *" value={form.title} onChange={e=>f("title",e.target.value)} placeholder="Ej: CCTV Etapa I" theme={theme} />
          <Input label="Empresa *" value={form.company} onChange={e=>f("company",e.target.value)} placeholder="Ej: AdministARS" theme={theme} />
          <Select label="Contacto" value={form.contactId} onChange={e=>f("contactId",e.target.value)} theme={theme}>
            <option value="">— Sin contacto —</option>
            {contacts.map(c=><option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
          </Select>
          <Input label="RUT empresa" value={form.rut} onChange={e=>f("rut",formatRut(e.target.value))} placeholder="12.345.678-9" maxLength={12} theme={theme} />
          <Input label="Valor (CLP)" value={form.value} onChange={e=>f("value",e.target.value)} placeholder="0" type="number" theme={theme} />
          <Select label="Etapa" value={form.stage} onChange={e=>f("stage",e.target.value)} theme={theme}>
            {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
          <Input label="Probabilidad %" value={form.probability} onChange={e=>f("probability",e.target.value)} type="number" placeholder="0-100" theme={theme} />
          <Input label="Fecha de cierre estimada" value={form.closeDate} onChange={e=>f("closeDate",e.target.value)} type="date" theme={theme} />
          {saving && <div style={{ fontFamily:FONT, fontSize:12, color:C.accent, textAlign:"center" }}>Guardando…</div>}
        </Modal>
      )}
    </div>
  );
}

// Pipeline de ventas (deals por etapa) con tareas asociadas.
import { useState, useEffect, useMemo } from "react";
import { TreeCaret } from "../shared/TreeCaret.jsx";
import { TreeBranch } from "../shared/TreeBranch.jsx";
import { Wallet, Receipt } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { STAGES, REJECT_REASONS } from "../shared/constants.js";
import { mapDealToDb, mapDeal, mapTaskToDb, mapTask } from "../shared/mappers.js";
import { isOverdue, fmt, fmtDate, formatRut, hoyISO } from "../shared/format.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { Modal, Select, Input } from "../shared/ui.jsx";

// ── PIPELINE ────────────────────────────────────────────────────────────────
export function PipelineView({ deals, setDeals, contacts, tasks, setTasks, isMobile }) {
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

  const openNew = (serie="COT") => { setEditingId(null); setForm({ title:"", company:"", contactId:"", rut:"", value:"", stage:"propuesta", probability:"40", closeDate:"", quoteNumber:"", serie, pctAnticipo:50 }); setQuoteFound(null); setQuoteBusqueda(""); setShowModal(true); };
  const openEdit = (d) => { setEditingId(d.id); setForm({ title:d.title, company:d.company, contactId:d.contactId||"", rut:d.rut||"", value:String(d.value), stage:d.stage, probability:String(d.probability), closeDate:d.closeDate||"", quoteNumber:d.quoteNumber||"", serie:d.serie||"COT", pctAnticipo:d.pctAnticipo||50 }); setQuoteFound(null); setQuoteBusqueda(""); setShowModal(true); };
  const toggleCollapse = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));
  const allCollapsed = Object.values(collapsed).filter(Boolean).length >= deals.length/2;
  const toggleAll = () => { const n={}; deals.forEach(d=>{n[d.id]=!allCollapsed;}); setCollapsed(n); };

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
  const ACTIVITY_BORDER = { active:COLORS.green, overdue:COLORS.red, none:COLORS.border };

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
      return { key, label:monthLabel(key), shortLabel:monthShortLabel(key), ...g, total:g.propuesta+g.cerrado+g.rechazado };
    });
  },[deals, cotFechas]);

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
      <div key={m.key} onMouseEnter={()=>setHoverMonth(m.key)} onMouseLeave={()=>setHoverMonth(null)}
        style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:6, borderRadius:8, cursor:"default", background:isHover?COLORS.border:"transparent", transition:"background 0.15s" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:isHover?"scale(1.35)":"scale(1)", transition:"transform 0.18s ease" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.border} strokeWidth={sw} />
          {segs.map(seg=>(
            <circle key={seg.key} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={sw}
              strokeDasharray={seg.dash} transform={`rotate(${seg.rot} ${cx} ${cy})`} />
          ))}
        </svg>
        <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase" }}>{m.shortLabel}</span>
        {isHover && (
          <div style={{ position:"absolute", bottom:"100%", left:"50%", transform:"translateX(-50%) translateY(-6px)", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:7, padding:"8px 10px", width:150, zIndex:10, boxShadow:"0 8px 20px #00000066" }}>
            {STAGES.filter(s=>m[s.key]>0).map(s=>(
              <div key={s.key} style={{ display:"flex", alignItems:"center", gap:5, fontFamily:FONT, fontSize:9, color:COLORS.text, marginBottom:3 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:s.color, flexShrink:0 }} />
                {s.label}: {fmt(m[s.key])}
              </div>
            ))}
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:10, fontWeight:700, color:COLORS.text, marginTop:4, paddingTop:4, borderTop:`1px dashed ${COLORS.border}` }}>Total: {fmt(m.total)}</div>
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
                style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, borderLeft:`3px solid ${stage.key==="cerrado" && d.facturado ? COLORS.purple : ACTIVITY_BORDER[getDealActivityStatus(d.id)]}`, overflow:"hidden", cursor:"grab", opacity:dragDealId===d.id?0.5:d.facturado?0.55:1, transition:"opacity 0.2s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, padding:isCollapsed?"9px 11px":"11px 13px 7px" }}>
                  <TreeCaret collapsed={isCollapsed} onToggle={()=>toggleCollapse(d.id)} title={isCollapsed?"Ver detalle":"Ocultar detalle"} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:600, color:COLORS.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{d.title}</div>
                    {isCollapsed && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{d.company}</div>}
                  </div>
                  {isCollapsed && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.green, fontWeight:700, flexShrink:0 }}>{fmt(d.value)}</div>}
                  <button onClick={()=>openEdit(d)} style={{ background:"none", border:`1px solid ${accentColor}44`, borderRadius:4, color:accentColor, cursor:"pointer", fontSize:11, padding:"2px 5px", flexShrink:0 }}>✏️</button>
                  <button onClick={()=>del(d.id)} style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:4, color:COLORS.red, cursor:"pointer", fontSize:12, padding:"2px 5px", flexShrink:0 }}>×</button>
                </div>
                {!isCollapsed && (
                  <div className="tree-row-in" style={{ padding:"0 13px 11px" }}>
                    {/* Próxima actividad */}
                    {(()=>{ const actStatus=getDealActivityStatus(d.id); const nextTask=getDealNextTask(d.id); return (
                      <div style={{ borderLeft:`3px solid ${ACTIVITY_BORDER[actStatus]}`, paddingLeft:8, marginBottom:10 }}>
                        {nextTask ? (
                          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
                            <span style={{ marginRight:4 }}>{nextTask.type==="llamada"?"📞":nextTask.type==="reunion"?"🤝":nextTask.type==="email"?"✉️":"✅"}</span>
                            {nextTask.title}
                            <span style={{ marginLeft:6, color:isOverdue(nextTask.dueDate)?COLORS.red:COLORS.textDim, fontSize:9 }}>{fmtDate(nextTask.dueDate)}</span>
                          </div>
                        ) : (
                          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, fontStyle:"italic" }}>Sin actividad programada</div>
                        )}
                      </div>
                    );})()}
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:d.rut?2:7 }}>{d.company}</div>
                    {d.rut && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginBottom:7 }}>RUT: {d.rut}</div>}
                    {d.quoteNumber && <div style={{ fontFamily:FONT, fontSize:10, color:accentColor, background:`${accentColor}11`, border:`1px solid ${accentColor}33`, borderRadius:4, padding:"2px 7px", display:"inline-block", marginBottom:7 }}>📄 {laneKey}-{d.quoteNumber}</div>}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                      <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.green, fontWeight:700 }}>{fmt(d.value)}</div>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{fmtDate(d.closeDate)}</div>
                    </div>
                    {stage.key === "cerrado" && (()=>{ const pct=d.pctAnticipo||50; const ant=Math.round(d.value*pct/100); const saldo=d.value-ant; return (
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginBottom:7 }}>
                        Anticipo esperado: <span style={{ color:COLORS.textMuted }}>{fmt(ant)} ({pct}%)</span> · Saldo: <span style={{ color:COLORS.textMuted }}>{fmt(saldo)}</span>
                      </div>
                    );})()}
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Prob.</span>
                      <span style={{ fontFamily:FONT, fontSize:10, color:accentColor }}>{d.probability}%</span>
                    </div>
                    <div style={{ height:3, background:COLORS.border, borderRadius:2, marginBottom:9 }}>
                      <div style={{ height:3, borderRadius:2, background:accentColor, width:`${d.probability}%` }} />
                    </div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {STAGES.filter(s=>s.key!==stage.key).map(s=>(
                        <button key={s.key} onClick={()=>requestMoveDeal(d.id,s.key)} style={{ padding:"2px 6px", borderRadius:4, fontFamily:FONT, fontSize:10, cursor:"pointer", background:"transparent", border:`1px solid ${accentColor}44`, color:accentColor }}>→ {s.label}</button>
                      ))}
                      <button onClick={()=>del(d.id)} style={{ padding:"2px 6px", borderRadius:4, fontFamily:FONT, fontSize:10, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red, marginLeft:"auto" }}>✕</button>
                    </div>
                    {/* Botón actividad */}
                    {(()=>{ const nextTask=getDealNextTask(d.id); return nextTask ? (
                      <button onClick={()=>openEditQuickTask(nextTask)} style={{ display:"flex", alignItems:"center", gap:4, background:"transparent", border:`1px solid ${COLORS.green}44`, borderRadius:5, padding:"3px 8px", fontFamily:FONT, fontSize:10, color:COLORS.green, cursor:"pointer", marginTop:6 }}>✏️ editar actividad</button>
                    ) : (
                      <button onClick={()=>openQuickTask(d)} style={{ display:"flex", alignItems:"center", gap:4, background:"transparent", border:`1px solid ${COLORS.accent}44`, borderRadius:5, padding:"3px 8px", fontFamily:FONT, fontSize:10, color:COLORS.accent, cursor:"pointer", marginTop:6 }}>+ actividad</button>
                    );})()}
                    {/* Bloque facturación — solo en stage cerrado */}
                    {stage.key === "cerrado" && (
                      <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${COLORS.border}` }}>
                        {d.facturado ? (
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:9, padding:"2px 8px", borderRadius:4, fontWeight:600, background:`${COLORS.purple}18`, color:COLORS.purple, border:`1px solid ${COLORS.purple}33` }}>✓ Facturado</span>
                            <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>N° {d.numeroFactura}{d.fechaFactura && ` · ${fmtDate(d.fechaFactura)}`}</span>
                          </div>
                        ) : facturandoId === d.id ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.yellow, textTransform:"uppercase", letterSpacing:"0.08em" }}>Registrar factura SII</div>
                            <input value={facturaVal} onChange={e=>setFacturaVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")registrarFactura(d.id);if(e.key==="Escape")setFacturandoId(null);}} placeholder="N° factura SII..." autoFocus style={{ background:COLORS.bg, border:`1px solid ${COLORS.yellow}`, borderRadius:5, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                            <input value={facturaFecha} onChange={e=>setFacturaFecha(e.target.value)} type="date" style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:5, padding:"5px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
                            <div style={{ display:"flex", gap:6 }}>
                              <button onClick={()=>registrarFactura(d.id)} style={{ flex:2, padding:"5px 0", background:`${COLORS.purple}22`, border:`1px solid ${COLORS.purple}55`, borderRadius:5, color:COLORS.purple, fontFamily:FONT, fontSize:10, fontWeight:700, cursor:"pointer" }}>✓ Registrar</button>
                              <button onClick={()=>setFacturandoId(null)} style={{ flex:1, padding:"5px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:5, color:COLORS.textMuted, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={()=>{ setFacturandoId(d.id); setFacturaVal(""); setFacturaFecha(""); }} style={{ width:"100%", padding:"5px 0", background:`${COLORS.yellow}18`, border:`1px solid ${COLORS.yellow}44`, borderRadius:5, color:COLORS.yellow, fontFamily:FONT, fontSize:10, fontWeight:700, cursor:"pointer" }}>📋 Pendiente facturar</button>
                        )}
                      </div>
                    )}
                    {/* Motivo de rechazo — solo en stage rechazado */}
                    {stage.key === "rechazado" && (
                      <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${COLORS.border}` }}>
                        <span style={{ fontSize:9, padding:"2px 8px", borderRadius:4, fontWeight:600, background:`${COLORS.red}18`, color:COLORS.red, border:`1px solid ${COLORS.red}33` }}>{d.motivoRechazo || "Sin motivo especificado"}</span>
                        {d.fechaRechazo && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim, marginLeft:8 }}>{fmtDate(d.fechaRechazo.slice(0,10))}</span>}
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
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, padding:"8px 12px", background:COLORS.card, borderRadius:8, border:`1px solid ${accentColor}33` }}>
          <div>
            <div style={{ fontFamily:FONT, fontSize:10, color:accentColor, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>{stage.label}</div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:1 }}>{fmt(total)}</div>
            {totalAnticipo!==null && <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textDim, marginTop:1 }}>Anticipo esperado: {fmt(totalAnticipo)}</div>}
          </div>
          <div style={{ width:20, height:20, borderRadius:"50%", background:accentColor+"22", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT, fontSize:10, color:accentColor, fontWeight:700 }}>{stageDeals.length}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {monthGroups.map((group, gi) => {
            const groupKey = `${laneKey}:${stage.key}:${group.key}`;
            const isOldest = gi===0 && group.key!=="sin-fecha";
            const isOpen = monthOverride[groupKey] !== undefined ? monthOverride[groupKey] : isOldest;
            const groupTotal = group.deals.reduce((s,d)=>s+Number(d.value),0);
            return (
              <div key={group.key}>
                <button onClick={()=>setMonthOverride(p=>({...p,[groupKey]:!isOpen}))}
                  style={{ width:"100%", display:"flex", flexDirection:"column", padding:"6px 10px", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, cursor:"pointer", marginBottom: isOpen?7:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:4, fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.06em" }}><TreeCaret collapsed={!isOpen} /> {group.label}</span>
                    <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textDim }}>{group.deals.length}</span>
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:accentColor, fontWeight:600, marginTop:2, textAlign:"left", paddingLeft:18 }}>{fmt(groupTotal)}</div>
                </button>
                {isOpen && (
                  // Árbol: la línea baja desde el triángulo del mes (borde 1 + padding 10 + 7)
                  <TreeBranch x={18} anchor={17} reach={30} gap={2} style={{ marginBottom:7 }}>
                    {group.deals.map(d=><div key={d.id} style={{ marginBottom:7 }}>{renderDealCard(d, stage, laneKey, accentColor)}</div>)}
                  </TreeBranch>
                )}
              </div>
            );
          })}
          {stageDeals.length===0 && <div style={{ border:`1px dashed ${COLORS.border}`, borderRadius:8, padding:"16px 0", textAlign:"center", fontFamily:FONT, fontSize:11, color:COLORS.textDim }}>—</div>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Kanban</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Pipeline de Ventas</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={toggleAll} style={{ padding:"8px 14px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:7, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer" }}>{allCollapsed?"⊞ Expandir":"⊟ Comprimir"}</button>
          <button onClick={()=>openNew("SIN")} style={{ position:"relative", display:"flex", alignItems:"center", gap:7, padding:"8px 16px 8px 12px", borderRadius:20, background:"#2563EB22", border:"1px solid #2563EB44", color:"#2563EB", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <span style={{ position:"absolute", top:-4, right:-4, width:14, height:14, borderRadius:"50%", background:"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:COLORS.bg }}>+</span>
            <Wallet size={14} /> SIN
          </button>
          <button onClick={()=>openNew("COT")} style={{ position:"relative", display:"flex", alignItems:"center", gap:7, padding:"8px 16px 8px 12px", borderRadius:20, background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`, color:COLORS.accent, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <span style={{ position:"absolute", top:-4, right:-4, width:14, height:14, borderRadius:"50%", background:COLORS.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:COLORS.bg }}>+</span>
            <Receipt size={14} /> COT
          </button>
        </div>
      </div>

      <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
        <div style={{ flex:1, minWidth:0 }}>
          {/* ── LANE COT — Con factura / IVA ── */}
          <div style={{ marginBottom:6 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700 }}>COT · Con IVA · Facturas empresa</div>
              <div style={{ flex:1, height:1, background:COLORS.accent+"33" }} />
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{fmt(dealsCOT.reduce((s,d)=>s+Number(d.value),0))}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:12 }}>
              {STAGES.map(stage => renderStageCol(stage, groupedCOT, "COT", COLORS.accent))}
            </div>
          </div>

          {/* ── LANE SIN — Sin IVA / Boletas / Personal ── */}
          <div style={{ marginTop:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ fontFamily:FONT, fontSize:10, color:"#2563EB", textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700 }}>SIN · Sin IVA · Boletas / Personal</div>
              <div style={{ flex:1, height:1, background:"#2563EB33" }} />
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{fmt(dealsSIN.reduce((s,d)=>s+Number(d.value),0))}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:12 }}>
              {STAGES.map(stage => renderStageCol(stage, groupedSIN, "SIN", "#2563EB"))}
            </div>
          </div>
        </div>

        {/* ── Panel resumen mensual (dona COT+SIN por mes) ── */}
        {!isMobile && monthlyStats.length>0 && (
          <div style={{ width:280, flexShrink:0, background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:14 }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Resumen por mes</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4 }}>
              {monthlyStats.map(renderMonthDonut)}
            </div>
          </div>
        )}
      </div>
      {rejectModal && (
        <Modal title="Motivo de rechazo" onClose={()=>setRejectModal(null)} onSubmit={confirmReject}>
          <Select label="Causa" value={rejectReason} onChange={e=>setRejectReason(e.target.value)}>
            <option value="">Sin especificar</option>
            {REJECT_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
          </Select>
          {rejectReason==="Otro" && (
            <Input label="Detalle" value={rejectOtro} onChange={e=>setRejectOtro(e.target.value)} placeholder="Especifica el motivo..." />
          )}
        </Modal>
      )}
      {quickTask && (
        <Modal title={`${quickTask.editingId?"Editar":"Nueva"} actividad — ${quickTask.company}`} onClose={()=>setQuickTask(null)} onSubmit={()=>saveQuickTask(quickTaskForm)}>
          <Input label="Título *" value={quickTaskForm.title} onChange={e=>setQuickTaskForm(p=>({...p,title:e.target.value}))} placeholder="Ej: Llamada de seguimiento" />
          <Select label="Tipo" value={quickTaskForm.type} onChange={e=>setQuickTaskForm(p=>({...p,type:e.target.value}))}>
            <option value="llamada">📞 Llamada</option>
            <option value="reunion">🤝 Reunión</option>
            <option value="email">✉️ Email</option>
            <option value="tarea">✅ Tarea</option>
          </Select>
          <Input label="Fecha límite" value={quickTaskForm.dueDate} onChange={e=>setQuickTaskForm(p=>({...p,dueDate:e.target.value}))} type="date" />
          <Select label="Prioridad" value={quickTaskForm.priority} onChange={e=>setQuickTaskForm(p=>({...p,priority:e.target.value}))}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </Select>
          {quickTask.editingId && (
            <div style={{ marginTop:8 }}>
              <button onClick={()=>{ completeQuickTask(quickTask.editingId); setQuickTask(null); }}
                style={{ width:"100%", padding:"8px", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, borderRadius:6, color:COLORS.green, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                ✓ Marcar como completada
              </button>
            </div>
          )}
        </Modal>
      )}
      {showModal && (
        <Modal title={editingId?"Editar Deal":"Nuevo Deal"} onClose={()=>setShowModal(false)} onSubmit={save}>
          {/* Buscador cotización */}
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.accent}33`, borderRadius:8, padding:"12px 14px", marginBottom:8 }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Vincular cotización</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={quoteBusqueda} onChange={e=>setQuoteBusqueda(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&buscarCotizacion()}
                placeholder="N° cotización..." type="number"
                style={{ flex:1, background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, padding:"7px 10px" }} />
              <button onClick={buscarCotizacion} disabled={quoteSearching}
                style={{ padding:"7px 14px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT, fontSize:12, fontWeight:700, cursor:"pointer", opacity:quoteSearching?0.6:1 }}>
                {quoteSearching?"...":"Buscar"}
              </button>
            </div>
            {quoteFound && (
              <div style={{ marginTop:8, padding:"8px 10px", background:`${COLORS.green}11`, border:`1px solid ${COLORS.green}33`, borderRadius:6 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.green, fontWeight:700 }}>✓ Cotización #{quoteFound.numero} encontrada</div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:2 }}>{quoteFound.razon_social||quoteFound.nombre_cliente} · ${Math.round(quoteFound.total||0).toLocaleString("es-CL")}</div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Datos autocargados ↓</div>
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            {[{k:"COT",label:"COT · Con IVA",color:COLORS.accent},{k:"SIN",label:"SIN · Sin IVA",color:"#2563EB"}].map(({k,label,color})=>(
              <button key={k} onClick={()=>f("serie",k)}
                style={{ flex:1, padding:"9px 0", borderRadius:7, cursor:"pointer", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, border:`1px solid ${form.serie===k?color:COLORS.border}`, background:form.serie===k?color+"22":"transparent", color:form.serie===k?color:COLORS.textMuted }}>
                {label}
              </button>
            ))}
          </div>
          <Input label="Título *" value={form.title} onChange={e=>f("title",e.target.value)} placeholder="Ej: CCTV Etapa I" />
          <Input label="Empresa *" value={form.company} onChange={e=>f("company",e.target.value)} placeholder="Ej: AdministARS" />
          <Select label="Contacto" value={form.contactId} onChange={e=>f("contactId",e.target.value)}>
            <option value="">— Sin contacto —</option>
            {contacts.map(c=><option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
          </Select>
          <Input label="RUT empresa" value={form.rut} onChange={e=>f("rut",formatRut(e.target.value))} placeholder="12.345.678-9" maxLength={12} />
          <Input label="Valor (CLP)" value={form.value} onChange={e=>f("value",e.target.value)} placeholder="0" type="number" />
          <Select label="Etapa" value={form.stage} onChange={e=>f("stage",e.target.value)}>
            {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
          <Input label="Probabilidad %" value={form.probability} onChange={e=>f("probability",e.target.value)} type="number" placeholder="0-100" />
          <Input label="Fecha de cierre estimada" value={form.closeDate} onChange={e=>f("closeDate",e.target.value)} type="date" />
          {saving && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.accent, textAlign:"center" }}>Guardando…</div>}
        </Modal>
      )}
    </div>
  );
}

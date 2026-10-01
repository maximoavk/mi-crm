// Incidencias / tickets de soporte post-venta con visitas técnicas.
import React, { useState, useEffect } from "react";
import { TreeCaret } from "../shared/TreeCaret.jsx";
import { TreeBranch } from "../shared/TreeBranch.jsx";
import { hoyISO, fmtFecha } from "../shared/format.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { supabase } from "../supabaseClient.js";
import { LOGO_PRINT } from "../shared/assets.js";
import { AddBtn } from "../shared/ui.jsx";
import { EMPRESA, EMPRESA_RUT, TITULAR } from "../shared/empresa.js";

// ── INCIDENCIAS ──────────────────────────────────────────────────────────────
export function IncidenciasView({ contacts, isMobile }) {
  const ESTADOS = [
    { key:"reportada",  label:"Reportada",  color:"#FFB800" },
    { key:"en_curso",   label:"En curso",   color:"#00C2FF" },
    { key:"solucionada",label:"Solucionada",color:"#00E5A0" },
  ];
  const CATEGORIAS = [
    "Motor / Automatización","Cámara CCTV","Citófono / Acceso",
    "Accesorio remoto","Instalación / Cableado","Garantía proveedor"
  ];
  const CAT_COLORS = {
    "Motor / Automatización":"#A855F7","Cámara CCTV":"#00C2FF",
    "Citófono / Acceso":"#FFB800","Accesorio remoto":"#F97316",
    "Instalación / Cableado":"#00E5A0","Garantía proveedor":"#FF4D6A"
  };
  const PRIORIDADES = [
    { key:"alta",  label:"Alta",  color:"#FF4D6A" },
    { key:"media", label:"Media", color:"#FFB800" },
    { key:"baja",  label:"Baja",  color:"#00E5A0" },
  ];

  const [tickets, setTickets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterEst, setFilterEst] = useState("todas");
  const [filterCat, setFilterCat] = useState("todas");
  const [showModal, setShowModal] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [showLog, setShowLog]     = useState(null); // ticket id con log abierto
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm]     = useState({ fecha: hoyISO(), hora:"09:00", tecnico:TITULAR.nombre, diagnostico:"", piezas:"", upselling:false, notas:"" });
  const [saving, setSaving]       = useState(false);
  const [vistaMode, setVistaMode]       = useState("lista");
  const [calendarDate, setCalendarDate] = useState(hoyISO());
  const [filterPrio, setFilterPrio]     = useState("todas");
  const [dragId, setDragId]             = useState(null);

  const emptyForm = () => ({
    numero_cotizacion:"", titulo:"", cliente:"", descripcion:"",
    categoria:"Cámara CCTV", estado:"reportada",
    fecha_reporte: hoyISO(),
    equipo:"", serie:"", garantia:false, upselling:false,
    solucion_final:"", prioridad:"media", fecha_programada:"", hora_programada:"",
    visitas: []
  });
  const [form, setForm] = useState(emptyForm());
  const ff = (k,v) => setForm(p=>({...p,[k]:v}));
  const lf = (k,v) => setLogForm(p=>({...p,[k]:v}));

  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" };
  const lbl = { fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4, display:"block" };

  useEffect(() => {
    supabase.from("incidencias").select("*").order("created_at", { ascending:false })
      .then(({ data }) => { setTickets((data||[]).map(r=>({...r, visitas: r.visitas||[] }))); setLoading(false); });
  }, []);

  const save = async () => {
    if (!form.titulo) return;
    setSaving(true);
    const payload = { ...form, visitas: form.visitas||[] };
    if (editTicket) {
      const { data } = await supabase.from("incidencias").update(payload).eq("id", editTicket.id).select().single();
      if (!data) { setSaving(false); return; } // falló: el formulario queda abierto
      setTickets(tickets.map(t=>t.id===editTicket.id ? {...data, visitas:data.visitas||[]} : t));
    } else {
      const { data } = await supabase.from("incidencias").insert(payload).select().single();
      if (!data) { setSaving(false); return; }
      setTickets([{...data, visitas:data.visitas||[]}, ...tickets]);
    }
    setSaving(false); setShowModal(false); setEditTicket(null); setForm(emptyForm());
  };

  const updateEstado = async (id, estado) => {
    await supabase.from("incidencias").update({ estado }).eq("id", id);
    setTickets(tickets.map(t=>t.id===id ? {...t, estado} : t));
  };

  const updateSchedule = async (id, fecha_programada, hora_programada) => {
    const upd = { fecha_programada: fecha_programada||null, hora_programada: hora_programada||null };
    await supabase.from("incidencias").update(upd).eq("id", id);
    setTickets(prev => prev.map(t => t.id===id ? {...t,...upd} : t));
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar esta incidencia?")) return;
    const { error } = await supabase.from("incidencias").delete().eq("id", id); if(error) return;
    setTickets(tickets.filter(t=>t.id!==id));
  };

  const addVisita = async (ticket) => {
    const newVisita = { ...logForm, id: Date.now() };
    const updatedVisitas = [...(ticket.visitas||[]), newVisita];
    await supabase.from("incidencias").update({ visitas: updatedVisitas }).eq("id", ticket.id);
    setTickets(tickets.map(t=>t.id===ticket.id ? {...t, visitas: updatedVisitas} : t));
    setShowLogModal(false);
    setLogForm({ fecha: hoyISO(), hora:"09:00", tecnico:TITULAR.nombre, diagnostico:"", piezas:"", upselling:false, notas:"" });
  };

  const openEdit = (t) => {
    setEditTicket(t);
    setForm({ numero_cotizacion:t.numero_cotizacion||"", titulo:t.titulo||"", cliente:t.cliente||"", descripcion:t.descripcion||"", categoria:t.categoria||"Cámara CCTV", estado:t.estado||"reportada", fecha_reporte:t.fecha_reporte||"", equipo:t.equipo||"", serie:t.serie||"", garantia:t.garantia||false, upselling:t.upselling||false, solucion_final:t.solucion_final||"", prioridad:t.prioridad||"media", fecha_programada:t.fecha_programada||"", hora_programada:t.hora_programada||"", visitas:t.visitas||[] });
    setShowModal(true);
  };

  const printPDF = (t) => {
    const estCfg = ESTADOS.find(e=>e.key===t.estado)||ESTADOS[0];
    const catColor = CAT_COLORS[t.categoria]||"#00C2FF";
    const visitasHTML = (t.visitas||[]).map((v,i)=>`
      <div style="margin-bottom:10px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;border-left:3px solid #0ea5e9">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <b style="font-size:10px;color:#0f172a">Visita ${i+1} · ${v.fecha||""} ${v.hora||""}</b>
          <span style="font-size:9px;color:#64748b">Técnico: ${v.tecnico||""}</span>
        </div>
        ${v.diagnostico?`<div style="font-size:9px;margin-bottom:3px"><b>Diagnóstico:</b> ${v.diagnostico}</div>`:""}
        ${v.piezas?`<div style="font-size:9px;margin-bottom:3px"><b>Piezas cambiadas:</b> ${v.piezas}</div>`:""}
        ${v.upselling?`<div style="font-size:9px;color:#f97316;font-weight:700">⚡ Oportunidad de upselling identificada</div>`:""}
        ${v.notas?`<div style="font-size:9px;color:#64748b;margin-top:3px;font-style:italic">${v.notas}</div>`:""}
      </div>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;padding:12mm;background:#fff;color:#1e293b}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;padding-bottom:10px;border-bottom:2px solid #0f172a}
      .hdr-left{display:flex;align-items:center;gap:12px}
      .hdr-logo{height:38px}
      .hdr-title{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px}
      .hdr-sub{font-size:9px;color:#64748b}
      .ticket-id{font-size:22px;font-weight:900;color:#0f172a}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:700;color:#fff}
      .section{margin-bottom:12px}
      .section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #e2e8f0}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
      .field .lbl{font-size:8px;color:#94a3b8;text-transform:uppercase;margin-bottom:2px}
      .field .val{font-size:10px;color:#1e293b;font-weight:600}
      @page{size:A4 portrait;margin:0}
      @media print{body{padding:10mm}}
    </style></head><body>
    <div class="hdr">
      <div class="hdr-left">
        <img src="${LOGO_PRINT}" class="hdr-logo"/>
        <div>
          <div class="hdr-title">Reporte de Incidencia Técnica</div>
          <div class="hdr-sub">${EMPRESA_RUT}</div>
          <div class="hdr-sub">${EMPRESA.email} · ${TITULAR.telefono}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div class="ticket-id">#INC-${String(t.id||"").slice(-6).toUpperCase()}</div>
        <div style="margin-top:4px"><span class="badge" style="background:${estCfg.color}">${estCfg.label}</span></div>
        <div style="font-size:9px;color:#64748b;margin-top:4px">Fecha reporte: ${t.fecha_reporte||""}</div>
        ${t.numero_cotizacion?`<div style="font-size:9px;color:#64748b">COT-${t.numero_cotizacion}</div>`:""}
      </div>
    </div>
    <div class="section">
      <div class="section-title">Información del Caso</div>
      <div style="margin-bottom:6px"><b style="font-size:12px">${t.titulo||""}</b></div>
      <div class="grid2">
        <div class="field"><div class="lbl">Cliente</div><div class="val">${t.cliente||"—"}</div></div>
        <div class="field"><div class="lbl">Categoría</div><div class="val" style="color:${catColor}">${t.categoria||"—"}</div></div>
        <div class="field"><div class="lbl">Equipo</div><div class="val">${t.equipo||"—"}</div></div>
        <div class="field"><div class="lbl">N° Serie</div><div class="val">${t.serie||"—"}</div></div>
      </div>
      ${t.descripcion?`<div style="font-size:10px;color:#475569;background:#f8fafc;padding:8px;border-radius:4px;border-left:3px solid ${catColor}">${t.descripcion}</div>`:""}
    </div>
    ${(t.visitas||[]).length>0?`<div class="section"><div class="section-title">Log de Visitas Técnicas (${t.visitas.length})</div>${visitasHTML}</div>`:""}
    ${t.solucion_final?`<div class="section"><div class="section-title">Solución Final</div><div style="font-size:10px;color:#1e293b;background:#f0fdf4;padding:8px;border-radius:4px;border-left:3px solid #22c55e">${t.solucion_final}</div></div>`:""}
    <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8">
      <span>Documento generado el ${new Date().toLocaleDateString("es-CL",{day:"2-digit",month:"long",year:"numeric"})}</span>
      <span>${EMPRESA.razonSocial} · Soporte Técnico</span>
    </div>
    <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`;
    const w = window.open("","_blank"); w.document.write(html); w.document.close();
  };

  const filtered = tickets.filter(t => {
    const eOk = filterEst==="todas" || t.estado===filterEst;
    const cOk = filterCat==="todas" || t.categoria===filterCat;
    const pOk = filterPrio==="todas" || (t.prioridad||"media")===filterPrio;
    return eOk && cOk && pOk;
  });

  const stCfg = (s) => ESTADOS.find(e=>e.key===s)||ESTADOS[0];
  const prioConfig = (p) => PRIORIDADES.find(pr=>pr.key===p)||PRIORIDADES[1];

  const DIAS_SEMANA = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
  const HORAS_DIA   = Array.from({length:13},(_,i)=>`${String(i+8).padStart(2,"0")}:00`);

  const getWeekDays = (dateStr) => {
    const d = new Date(dateStr+"T12:00:00");
    const day = d.getDay();
    const diff = day===0 ? -6 : 1-day;
    const mon = new Date(d); mon.setDate(d.getDate()+diff);
    return Array.from({length:7},(_,i)=>{ const dd=new Date(mon); dd.setDate(mon.getDate()+i); return dd.toISOString().slice(0,10); });
  };
  const weekDays = getWeekDays(calendarDate);

  const navCalendar = (delta, unit) => {
    const d = new Date(calendarDate+"T12:00:00");
    if (unit==="week") d.setDate(d.getDate()+delta*7); else d.setDate(d.getDate()+delta);
    setCalendarDate(d.toISOString().slice(0,10));
  };

  const handleDragStart = (e, id) => { e.dataTransfer.setData("ticketId", id); setDragId(id); };
  const handleDragEnd   = () => setDragId(null);
  const handleDropOnDay = async (e, targetDate) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("ticketId");
    if (!id) return;
    const tk = tickets.find(t=>t.id===id);
    await updateSchedule(id, targetDate, tk?.hora_programada||null);
    setDragId(null);
  };
  const handleDropOnHour = async (e, targetHora) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("ticketId");
    if (!id) return;
    await updateSchedule(id, calendarDate, targetHora);
    setDragId(null);
  };

  const today = hoyISO();
  const nowHour = `${String(new Date().getHours()).padStart(2,"0")}:00`;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:18, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Operaciones · Soporte</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Incidencias Técnicas</div>
        </div>
        <AddBtn onClick={()=>{ setEditTicket(null); setForm(emptyForm()); setShowModal(true); }} label="+ Nueva incidencia" />
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:18 }}>
        {[
          { label:"Total", val:tickets.length, color:COLORS.text },
          { label:"Reportadas", val:tickets.filter(t=>t.estado==="reportada").length, color:"#FFB800" },
          { label:"En curso", val:tickets.filter(t=>t.estado==="en_curso").length, color:"#00C2FF" },
          { label:"Solucionadas", val:tickets.filter(t=>t.estado==="solucionada").length, color:"#00E5A0" },
          { label:"Garantía", val:tickets.filter(t=>t.garantia).length, color:"#FF4D6A" },
          { label:"Upselling", val:tickets.filter(t=>t.upselling||(t.visitas||[]).some(v=>v.upselling)).length, color:"#F97316" },
          { label:"Alta prioridad", val:tickets.filter(t=>t.prioridad==="alta").length, color:"#FF4D6A" },
        ].map(s=>(
          <div key={s.label} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 16px" }}>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{s.label}</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Vista tabs + Filtros */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
        {/* Vista mode tabs */}
        <div style={{ display:"flex", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:3, gap:2 }}>
          {[{k:"lista",l:"Lista"},{k:"semana",l:"Semana"},{k:"dia",l:"Día"}].map(({k,l})=>(
            <button key={k} onClick={()=>setVistaMode(k)} style={{ padding:"5px 16px", borderRadius:6, fontFamily:FONT, fontSize:12, cursor:"pointer", background:vistaMode===k?COLORS.accent:"transparent", color:vistaMode===k?COLORS.bg:COLORS.textMuted, border:"none", fontWeight:vistaMode===k?700:400 }}>{l}</button>
          ))}
        </div>
        {/* Filtros */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          {[{k:"todas",l:"Todas"},...ESTADOS.map(e=>({k:e.key,l:e.label}))].map(({k,l})=>(
            <button key={k} onClick={()=>setFilterEst(k)} style={{ padding:"4px 12px", borderRadius:20, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filterEst===k?COLORS.accent:COLORS.card, color:filterEst===k?COLORS.bg:COLORS.textMuted, border:`1px solid ${filterEst===k?COLORS.accent:COLORS.border}` }}>{l}</button>
          ))}
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"4px 10px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }}>
            <option value="todas">Todas las categorías</option>
            {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          {/* Prioridad filter */}
          {[{k:"todas",l:"Todas",c:COLORS.accent},{k:"alta",l:"Alta",c:"#FF4D6A"},{k:"media",l:"Media",c:"#FFB800"},{k:"baja",l:"Baja",c:"#00E5A0"}].map(({k,l,c})=>(
            <button key={k} onClick={()=>setFilterPrio(k)} style={{ padding:"4px 12px", borderRadius:20, fontFamily:FONT, fontSize:11, cursor:"pointer", background:filterPrio===k?c:COLORS.card, color:filterPrio===k?COLORS.bg:COLORS.textMuted, border:`1px solid ${filterPrio===k?c:COLORS.border}` }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── LISTA ─────────────────────────────────────────────────────────── */}
      {vistaMode==="lista" && (
        loading ? <div style={{ textAlign:"center", padding:40, color:COLORS.textMuted, fontFamily:FONT }}>Cargando...</div> : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map(t=>{
              const sc = stCfg(t.estado);
              const catColor = CAT_COLORS[t.categoria]||COLORS.textMuted;
              const pc = prioConfig(t.prioridad||"media");
              const isOpen = showLog===t.id;
              return (
                <div key={t.id}
                  draggable onDragStart={e=>handleDragStart(e,t.id)} onDragEnd={handleDragEnd}
                  style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, overflow:"hidden", opacity:dragId===t.id?0.5:1, cursor:"grab" }}>
                  {/* Priority stripe */}
                  <div style={{ height:3, background:pc.color }} />
                  {/* Main row */}
                  <div style={{ padding:"14px 18px", display:"flex", alignItems:"flex-start", gap:12 }}>
                    <select value={t.estado} onChange={e=>updateEstado(t.id,e.target.value)}
                      style={{ background:`${sc.color}22`, border:`1px solid ${sc.color}55`, borderRadius:20, padding:"3px 10px", fontFamily:FONT, fontSize:10, color:sc.color, cursor:"pointer", outline:"none", fontWeight:700, flexShrink:0 }}>
                      {ESTADOS.map(e=><option key={e.key} value={e.key}>{e.label}</option>)}
                    </select>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                        <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>{t.titulo}</span>
                        <span style={{ fontFamily:FONT, fontSize:10, background:`${catColor}18`, color:catColor, border:`1px solid ${catColor}33`, borderRadius:10, padding:"1px 8px" }}>{t.categoria}</span>
                        <span style={{ fontFamily:FONT, fontSize:10, background:`${pc.color}22`, color:pc.color, border:`1px solid ${pc.color}44`, borderRadius:10, padding:"1px 8px", fontWeight:700 }}>{pc.label}</span>
                        {t.garantia && <span style={{ fontFamily:FONT, fontSize:10, background:"#FF4D6A22", color:"#FF4D6A", border:"1px solid #FF4D6A33", borderRadius:10, padding:"1px 8px" }}>Garantía</span>}
                        {(t.upselling||(t.visitas||[]).some(v=>v.upselling)) && <span style={{ fontFamily:FONT, fontSize:10, background:"#F9731622", color:"#F97316", border:"1px solid #F9731633", borderRadius:10, padding:"1px 8px" }}>Upselling</span>}
                      </div>
                      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                        {t.cliente && <span>{t.cliente} · </span>}
                        {t.numero_cotizacion && <span>COT-{t.numero_cotizacion} · </span>}
                        {t.equipo && <span>{t.equipo} · </span>}
                        <span>{t.fecha_reporte}</span>
                        {t.fecha_programada && <span style={{color:COLORS.accent}}> · Prog: {fmtFecha(t.fecha_programada)}{t.hora_programada?` ${t.hora_programada}`:""}</span>}
                      </div>
                      {t.descripcion && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:4, fontStyle:"italic" }}>{t.descripcion.slice(0,120)}{t.descripcion.length>120?"…":""}</div>}
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>
                      <button onClick={()=>setShowLog(isOpen?null:t.id)} style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", background:`${COLORS.accent}18`, border:`1px solid ${COLORS.accent}33`, borderRadius:6, color:COLORS.accent, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>
                        <TreeCaret collapsed={!isOpen} color={COLORS.accent} size={8} /> Log ({(t.visitas||[]).length})
                      </button>
                      <button onClick={()=>openEdit(t)} style={{ padding:"4px 8px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, cursor:"pointer", fontSize:11 }}>✏️</button>
                      <button onClick={()=>printPDF(t)} style={{ padding:"4px 10px", background:`${COLORS.green}18`, border:`1px solid ${COLORS.green}33`, borderRadius:6, color:COLORS.green, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>PDF</button>
                      <button onClick={()=>del(t.id)} style={{ background:"none", border:"none", color:COLORS.textDim, cursor:"pointer", fontSize:13 }}>✕</button>
                    </div>
                  </div>
                  {/* Log de visitas */}
                  {isOpen && (
                    <div className="tree-row-in" style={{ borderTop:`1px solid ${COLORS.border}`, padding:"12px 18px", background:COLORS.surface }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Log de visitas</div>
                        <button onClick={()=>{ setShowLog(t.id); setShowLogModal(true); }} style={{ padding:"4px 12px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>+ Agregar visita</button>
                      </div>
                      {(t.visitas||[]).length===0 ? (
                        <div style={{ textAlign:"center", padding:20, fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Sin visitas registradas</div>
                      ) : (
                        // Árbol: las visitas cuelgan del log, en orden
                        <TreeBranch x={7} anchor={19}>
                          {(t.visitas||[]).map((v,i)=>(
                            <div key={v.id||i} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"10px 14px", borderLeft:`3px solid ${COLORS.accent}`, marginBottom:8 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>Visita {i+1} · {v.fecha} {v.hora}</span>
                                <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Técnico: {v.tecnico}</span>
                              </div>
                              {v.diagnostico && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:3 }}><b style={{color:COLORS.text}}>Diagnóstico:</b> {v.diagnostico}</div>}
                              {v.piezas && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:3 }}><b style={{color:COLORS.text}}>Piezas cambiadas:</b> {v.piezas}</div>}
                              {v.upselling && <div style={{ fontFamily:FONT, fontSize:11, color:"#F97316", fontWeight:700 }}>Oportunidad de upselling</div>}
                              {v.notas && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, fontStyle:"italic", marginTop:4 }}>{v.notas}</div>}
                            </div>
                          ))}
                        </TreeBranch>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length===0 && !loading && <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>Sin incidencias</div>}
          </div>
        )
      )}

      {/* ── SEMANA ────────────────────────────────────────────────────────── */}
      {vistaMode==="semana" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <button onClick={()=>navCalendar(-1,"week")} style={{ padding:"6px 14px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>← Semana ant.</button>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>{fmtFecha(weekDays[0])} — {fmtFecha(weekDays[6])}</div>
            <button onClick={()=>navCalendar(1,"week")} style={{ padding:"6px 14px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>Semana sig. →</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"130px repeat(7,1fr)", gap:6 }}>
            {/* Headers */}
            <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"8px 10px", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", display:"flex", alignItems:"center" }}>Sin fecha</div>
            {weekDays.map((d,i)=>{
              const isToday = d===today;
              return (
                <div key={d} style={{ background:isToday?`${COLORS.accent}18`:COLORS.card, border:`1px solid ${isToday?COLORS.accent:COLORS.border}`, borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{DIAS_SEMANA[i]}</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:isToday?COLORS.accent:COLORS.text }}>{d.slice(8)}</div>
                </div>
              );
            })}
            {/* Sin fecha drop zone */}
            <div onDragOver={e=>e.preventDefault()}
              onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("ticketId"); if(id) updateSchedule(id,null,null); setDragId(null); }}
              style={{ background:COLORS.surface, border:`1px dashed ${COLORS.border}`, borderRadius:8, padding:6, minHeight:140, display:"flex", flexDirection:"column", gap:4 }}>
              {filtered.filter(t=>!t.fecha_programada).map(t=>{
                const pc = prioConfig(t.prioridad||"media");
                const sc = stCfg(t.estado);
                return (
                  <div key={t.id} draggable onDragStart={e=>handleDragStart(e,t.id)} onDragEnd={handleDragEnd}
                    onClick={()=>openEdit(t)}
                    style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"6px 8px", cursor:"grab", opacity:dragId===t.id?0.35:1, borderLeft:`3px solid ${pc.color}` }}>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, color:COLORS.text, marginBottom:2 }}>{t.titulo}</div>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{t.cliente||""}</div>
                    <span style={{ fontFamily:FONT, fontSize:9, background:`${sc.color}22`, color:sc.color, borderRadius:10, padding:"1px 6px" }}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
            {/* Day drop zones */}
            {weekDays.map(d=>{
              const dayTickets = filtered.filter(t=>t.fecha_programada===d);
              return (
                <div key={d} onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropOnDay(e,d)}
                  style={{ background:COLORS.surface, border:`1px dashed ${COLORS.border}`, borderRadius:8, padding:6, minHeight:140, display:"flex", flexDirection:"column", gap:4 }}>
                  {dayTickets.length===0 && <div style={{ textAlign:"center", paddingTop:24, fontFamily:FONT, fontSize:11, color:`${COLORS.textMuted}55` }}>—</div>}
                  {dayTickets.map(t=>{
                    const pc = prioConfig(t.prioridad||"media");
                    const sc = stCfg(t.estado);
                    return (
                      <div key={t.id} draggable onDragStart={e=>handleDragStart(e,t.id)} onDragEnd={handleDragEnd}
                        onClick={()=>openEdit(t)}
                        style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"6px 8px", cursor:"grab", opacity:dragId===t.id?0.35:1, borderLeft:`3px solid ${pc.color}` }}>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, color:COLORS.text, marginBottom:2 }}>{t.titulo}</div>
                        {t.hora_programada && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, marginBottom:2 }}>{t.hora_programada}</div>}
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{t.cliente||""}</div>
                        <span style={{ fontFamily:FONT, fontSize:9, background:`${sc.color}22`, color:sc.color, borderRadius:10, padding:"1px 6px" }}>{sc.label}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DÍA ──────────────────────────────────────────────────────────── */}
      {vistaMode==="dia" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <button onClick={()=>navCalendar(-1,"day")} style={{ padding:"6px 14px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>← Día ant.</button>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>{fmtFecha(calendarDate)}</div>
              <input type="date" value={calendarDate} onChange={e=>setCalendarDate(e.target.value)} style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"4px 8px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none" }} />
            </div>
            <button onClick={()=>navCalendar(1,"day")} style={{ padding:"6px 14px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>Día sig. →</button>
          </div>
          {/* Sin hora bucket */}
          <div onDragOver={e=>e.preventDefault()}
            onDrop={e=>{ e.preventDefault(); const id=e.dataTransfer.getData("ticketId"); if(id) updateSchedule(id,calendarDate,null); setDragId(null); }}
            style={{ background:COLORS.surface, border:`1px dashed ${COLORS.border}`, borderRadius:8, padding:"8px 12px", marginBottom:8, minHeight:44, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", flexShrink:0 }}>Sin hora</span>
            {filtered.filter(t=>t.fecha_programada===calendarDate && !t.hora_programada).map(t=>{
              const pc = prioConfig(t.prioridad||"media");
              return (
                <div key={t.id} draggable onDragStart={e=>handleDragStart(e,t.id)} onDragEnd={handleDragEnd}
                  onClick={()=>openEdit(t)}
                  style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"4px 10px", cursor:"grab", opacity:dragId===t.id?0.35:1, borderLeft:`3px solid ${pc.color}` }}>
                  <span style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, color:COLORS.text }}>{t.titulo}</span>
                </div>
              );
            })}
          </div>
          {/* Hourly timeline */}
          <div style={{ display:"grid", gridTemplateColumns:"48px 1fr", gap:0 }}>
            {HORAS_DIA.map(hora=>{
              const slotTickets = filtered.filter(t=>t.fecha_programada===calendarDate && t.hora_programada===hora);
              const isCurrent = hora===nowHour && calendarDate===today;
              return (
                <React.Fragment key={hora}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:isCurrent?COLORS.accent:COLORS.textMuted, paddingTop:8, textAlign:"right", paddingRight:10, fontWeight:isCurrent?700:400 }}>{hora}</div>
                  <div onDragOver={e=>e.preventDefault()} onDrop={e=>handleDropOnHour(e,hora)}
                    style={{ borderTop:`1px solid ${isCurrent?COLORS.accent:COLORS.border}`, minHeight:52, padding:"4px 8px", display:"flex", gap:6, flexWrap:"wrap", alignItems:"flex-start", background:isCurrent?`${COLORS.accent}08`:"transparent" }}>
                    {slotTickets.map(t=>{
                      const pc = prioConfig(t.prioridad||"media");
                      const sc = stCfg(t.estado);
                      return (
                        <div key={t.id} draggable onDragStart={e=>handleDragStart(e,t.id)} onDragEnd={handleDragEnd}
                          onClick={()=>openEdit(t)}
                          style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"6px 12px", cursor:"grab", opacity:dragId===t.id?0.35:1, borderLeft:`3px solid ${pc.color}`, minWidth:160 }}>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.text, marginBottom:2 }}>{t.titulo}</div>
                          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:3 }}>{t.cliente}</div>
                          <span style={{ fontFamily:FONT, fontSize:9, background:`${sc.color}22`, color:sc.color, borderRadius:10, padding:"1px 6px" }}>{sc.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal nueva/editar incidencia */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{editTicket?"Editar incidencia":"Nueva incidencia"}</div>
              <button onClick={()=>{ setShowModal(false); setEditTicket(null); }} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><label style={lbl}>Título *</label><input value={form.titulo} onChange={e=>ff("titulo",e.target.value)} placeholder="Ej: Cámara sin señal en piso 3" style={inp} /></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={lbl}>N° Cotización</label><input value={form.numero_cotizacion} onChange={e=>ff("numero_cotizacion",e.target.value)} placeholder="Ej: 88" style={inp} /></div>
                <div><label style={lbl}>Cliente</label><input value={form.cliente} onChange={e=>ff("cliente",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Estado</label>
                  <select value={form.estado} onChange={e=>ff("estado",e.target.value)} style={inp}>
                    {ESTADOS.map(e=><option key={e.key} value={e.key}>{e.label}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Categoría</label>
                  <select value={form.categoria} onChange={e=>ff("categoria",e.target.value)} style={inp}>
                    {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Equipo / Modelo</label><input value={form.equipo} onChange={e=>ff("equipo",e.target.value)} placeholder="Ej: Cámara Dahua 4MP" style={inp} /></div>
                <div><label style={lbl}>N° Serie</label><input value={form.serie} onChange={e=>ff("serie",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Fecha reporte</label><input type="date" value={form.fecha_reporte} onChange={e=>ff("fecha_reporte",e.target.value)} style={inp} /></div>
              </div>
              {/* Prioridad */}
              <div>
                <label style={lbl}>Prioridad</label>
                <div style={{ display:"flex", gap:6 }}>
                  {PRIORIDADES.map(p=>(
                    <button key={p.key} type="button" onClick={()=>ff("prioridad",p.key)}
                      style={{ flex:1, padding:"7px 0", borderRadius:6, fontFamily:FONT, fontSize:12, cursor:"pointer", fontWeight:form.prioridad===p.key?700:400, background:form.prioridad===p.key?`${p.color}22`:"transparent", color:form.prioridad===p.key?p.color:COLORS.textMuted, border:`1px solid ${form.prioridad===p.key?p.color:COLORS.border}` }}>{p.label}</button>
                  ))}
                </div>
              </div>
              {/* Programación */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={lbl}>Fecha programada</label><input type="date" value={form.fecha_programada} onChange={e=>ff("fecha_programada",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Hora programada</label><input type="time" value={form.hora_programada} onChange={e=>ff("hora_programada",e.target.value)} style={inp} /></div>
              </div>
              <div><label style={lbl}>Descripción del problema</label><textarea value={form.descripcion} onChange={e=>ff("descripcion",e.target.value)} rows={3} style={{ ...inp, resize:"vertical" }} /></div>
              <div><label style={lbl}>Solución final</label><textarea value={form.solucion_final} onChange={e=>ff("solucion_final",e.target.value)} rows={2} style={{ ...inp, resize:"vertical" }} placeholder="Completar al resolver" /></div>
              <div style={{ display:"flex", gap:16 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontFamily:FONT, fontSize:12, color:COLORS.text }}>
                  <input type="checkbox" checked={form.garantia} onChange={e=>ff("garantia",e.target.checked)} />
                  Aplica garantía
                </label>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontFamily:FONT, fontSize:12, color:"#F97316" }}>
                  <input type="checkbox" checked={form.upselling} onChange={e=>ff("upselling",e.target.checked)} />
                  Oportunidad upselling
                </label>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={()=>{ setShowModal(false); setEditTicket(null); }} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ flex:2, padding:"10px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>{saving?"Guardando…":"Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar visita */}
      {showLogModal && showLog && (
        <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:24, width:"100%", maxWidth:480 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>Agregar visita técnica</div>
              <button onClick={()=>setShowLogModal(false)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={lbl}>Fecha</label><input type="date" value={logForm.fecha} onChange={e=>lf("fecha",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Hora</label><input type="time" value={logForm.hora} onChange={e=>lf("hora",e.target.value)} style={inp} /></div>
              </div>
              <div><label style={lbl}>Técnico</label><input value={logForm.tecnico} onChange={e=>lf("tecnico",e.target.value)} style={inp} /></div>
              <div><label style={lbl}>Diagnóstico</label><textarea value={logForm.diagnostico} onChange={e=>lf("diagnostico",e.target.value)} rows={2} style={{ ...inp, resize:"vertical" }} /></div>
              <div><label style={lbl}>Piezas cambiadas / garantía</label><input value={logForm.piezas} onChange={e=>lf("piezas",e.target.value)} placeholder="Ej: Cámara reemplazada bajo garantía" style={inp} /></div>
              <div><label style={lbl}>Notas adicionales</label><textarea value={logForm.notas} onChange={e=>lf("notas",e.target.value)} rows={2} style={{ ...inp, resize:"vertical" }} /></div>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontFamily:FONT, fontSize:12, color:"#F97316" }}>
                <input type="checkbox" checked={logForm.upselling} onChange={e=>lf("upselling",e.target.checked)} />
                ⚡ Identificar oportunidad de upselling
              </label>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button onClick={()=>setShowLogModal(false)} style={{ flex:1, padding:"10px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={()=>addVisita(tickets.find(t=>t.id===showLog))} style={{ flex:2, padding:"10px 0", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>Guardar visita</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

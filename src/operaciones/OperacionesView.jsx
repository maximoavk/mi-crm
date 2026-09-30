// ── OPERACIONES / TERRENO: órdenes de trabajo y operaciones ─────────────────
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { AddBtn, Loader, Badge } from "../shared/ui.jsx";
import { printOT } from "./printOT.js";
import { OTModal } from "./OTModal.jsx";
import { printOp } from "./printOp.js";
import { OpModal } from "./OpModal.jsx";
import { fechaLocal } from "../shared/format.js";

// ─── Componente principal ─────────────────────────────────────────────────────
export function OperacionesView({ isMobile }) {
  const [ops, setOps]             = useState([]);
  const [quotes, setQuotes]       = useState([]);
  const [contacts, setContacts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editOp, setEditOp]       = useState(null);
  const [mainTab, setMainTab]     = useState("ot"); // "comisionamiento" | "ot"

  // OT state
  const [ots, setOts]             = useState([]);
  const [showOTModal, setShowOTModal] = useState(false);
  const [editOT, setEditOT]       = useState(null);
  const [filterOTEstado, setFilterOTEstado] = useState("todos");

  useEffect(()=>{ load(); },[]);

  const load = async () => {
    setLoading(true);
    const [{ data:opsData },{ data:qData },{ data:cData },{ data:otData }] = await Promise.all([
      supabase.from("operaciones_terreno").select("*").order("created_at",{ascending:false}),
      supabase.from("cotizaciones").select("id,numero,serie,nombre_cliente,razon_social,rut_cliente,direccion,estado").order("numero",{ascending:false}),
      supabase.from("contactos").select("id,nombre,empresa"),
      supabase.from("ordenes_trabajo").select("*").order("created_at",{ascending:false}),
    ]);
    setOps(opsData||[]);
    setQuotes(qData||[]);
    setContacts(cData||[]);
    setOts(otData||[]);
    setLoading(false);
  };

  const deleteOp = async(id)=>{
    if(!window.confirm("¿Eliminar esta operación?")) return;
    const { error } = await supabase.from("operaciones_terreno").delete().eq("id",id); if(error) return;
    setOps(prev=>prev.filter(o=>o.id!==id));
  };

  const filtered = ops.filter(o=> o.tipo==="comisionamiento");

  const TIPO_COLOR = { mantencion: COLORS.secondary, comisionamiento: COLORS.green };
  const TIPO_LABEL = { mantencion:"Mantención", comisionamiento:"Comisionamiento" };
  const TIPO_ICON  = { mantencion:"🔧", comisionamiento:"🏗️" };

  const ESTADO_COLOR = { borrador:COLORS.textMuted, completado:COLORS.yellow, firmado:COLORS.green };
  const ESTADO_LABEL = { borrador:"Borrador", completado:"Completado", firmado:"Firmado" };

  const ESTADO_OT_CFG = {
    todos:       { label:"Todos",        color:COLORS.textMuted },
    borrador:    { label:"Borrador",     color:COLORS.textMuted },
    pendiente:   { label:"Pendiente",    color:"#FFB800" },
    confirmado:  { label:"Confirmado",   color:COLORS.accent },
    en_progreso: { label:"En progreso",  color:COLORS.accent },
    prorrogado:  { label:"Prorrogado",   color:"#FF8C00" },
    completado:  { label:"Completado",   color:COLORS.green },
    cancelado:   { label:"Cancelado",    color:COLORS.red },
    firmada:     { label:"Firmada",      color:COLORS.green },
  };
  const filteredOTs = ots.filter(o=>filterOTEstado==="todos"||o.estado===filterOTEstado);
  const fmtClp = n => "$"+Math.round(n||0).toLocaleString("es-CL");

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Terreno · Documentos técnicos</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Operaciones</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {mainTab==="comisionamiento" && <AddBtn onClick={()=>{ setEditOp(null); setShowModal(true); }} label="Nueva instalación" />}
          {mainTab==="ot" && <AddBtn onClick={()=>{ setEditOT(null); setShowOTModal(true); }} label="Nueva OT" />}
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${COLORS.border}`, marginBottom:20 }}>
        {[{k:"ot",l:"🔧 Órdenes de Trabajo"},{k:"comisionamiento",l:"🏗️ Comisionamiento"}].map(t=>(
          <button key={t.k} onClick={()=>setMainTab(t.k)}
            style={{ padding:"9px 22px", fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer", border:"none", background:"transparent",
              color:mainTab===t.k?COLORS.accent:COLORS.textMuted,
              borderBottom:`2px solid ${mainTab===t.k?COLORS.accent:"transparent"}`,
              marginBottom:-1, transition:"all 0.15s" }}>
            {t.l}
            {t.k==="ot" && ots.filter(o=>o.estado==="pendiente"||o.estado==="confirmado").length>0 && (
              <span style={{ marginLeft:6, background:COLORS.red, color:"#fff", borderRadius:8, padding:"1px 6px", fontSize:10 }}>
                {ots.filter(o=>o.estado==="pendiente"||o.estado==="confirmado").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── VISTA ÓRDENES DE TRABAJO ── */}
      {mainTab==="ot" && (
        <div>
          {/* KPIs OT */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:18 }}>
            {[
              { label:"Total OTs",    val:ots.length,                                                               color:COLORS.accent },
              { label:"Borradores",   val:ots.filter(o=>o.estado==="borrador").length,                             color:COLORS.textMuted },
              { label:"Pendientes",   val:ots.filter(o=>o.estado==="pendiente"||o.estado==="confirmado").length,   color:"#FFB800" },
              { label:"Completadas",  val:ots.filter(o=>o.estado==="completado"||o.estado==="firmada").length,     color:COLORS.green },
              { label:"Valor total",  val:fmtClp(ots.reduce((s,o)=>s+Number(o.valor_servicio||0),0)),             color:COLORS.green },
            ].map(({label,val,color})=>(
              <div key={label} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 16px" }}>
                <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{label}</div>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color }}>{val}</div>
              </div>
            ))}
          </div>
          {/* Filtro estado */}
          <div style={{ display:"flex", gap:4, marginBottom:16, flexWrap:"wrap" }}>
            {Object.entries(ESTADO_OT_CFG).map(([k,v])=>(
              <button key={k} onClick={()=>setFilterOTEstado(k)}
                style={{ padding:"4px 12px", borderRadius:6, fontFamily:FONT, fontSize:11, cursor:"pointer",
                  background:filterOTEstado===k?`${v.color}22`:"transparent",
                  border:`1px solid ${filterOTEstado===k?v.color:COLORS.border}`,
                  color:filterOTEstado===k?v.color:COLORS.textMuted }}>
                {v.label}
              </button>
            ))}
          </div>
          {/* Lista OTs */}
          {loading ? <div style={{ padding:32, textAlign:"center", fontFamily:FONT, color:COLORS.textMuted }}>Cargando…</div>
          : filteredOTs.length===0 ? (
            <div style={{ padding:40, textAlign:"center", background:COLORS.card, borderRadius:12, border:`1px solid ${COLORS.border}`, fontFamily:FONT, color:COLORS.textMuted }}>
              Sin órdenes de trabajo. Crea la primera con "+ Nueva OT".
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filteredOTs.map(o=>{
                const est = ESTADO_OT_CFG[o.estado]||ESTADO_OT_CFG.pendiente;
                const pct = (o.checklist||[]).length>0 ? (() => {
                  const total=(o.checklist||[]).reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado!=="na").length,0);
                  const done=(o.checklist||[]).reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado==="ok"||it.estado==="ok_c").length,0);
                  return total>0?Math.round(done/total*100):0;
                })() : 0;
                return (
                  <div key={o.id} onClick={()=>{ setEditOT(o); setShowOTModal(true); }}
                    style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderLeft:`4px solid ${est.color}`, borderRadius:10, padding:"14px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                    <div style={{ minWidth:80 }}>
                      <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>OT</div>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.accent }}>{o.numero_ot||"—"}</div>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:2 }}>{o.actividad||"Sin descripción"}</div>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                        {o.proveedor_nombre && <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>👤 {o.proveedor_nombre}</span>}
                        {o.cliente_nombre && <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>🏢 {o.cliente_nombre}</span>}
                        {o.fecha_programada && <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>📅 {new Date(o.fecha_programada+"T12:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short"})}</span>}
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>🔧 {o.equipo_tipo}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, minWidth:100 }}>
                      <span style={{ fontFamily:FONT, fontSize:10, background:`${est.color}22`, color:est.color, border:`1px solid ${est.color}44`, borderRadius:10, padding:"2px 8px", fontWeight:700 }}>{est.label}</span>
                      {o.valor_servicio>0 && <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.green }}>{fmtClp(o.valor_servicio)}</span>}
                      {pct>0 && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Checklist {pct}%</span>}
                      {o.firma_imagen && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.green }}>✓ Firmado</span>}
                    </div>
                    <button onClick={async e=>{ e.stopPropagation(); const {data:hist}=await supabase.from("ordenes_trabajo").select("id,numero_ot,fecha_programada,fecha_ultima_mantencion,estado,checklist,observaciones,proveedor_nombre,valor_servicio").eq("cliente_nombre",o.cliente_nombre).eq("equipo_tipo",o.equipo_tipo).neq("id",o.id).order("fecha_programada",{ascending:false}).limit(10); printOT(o,false,hist||[]); }}
                      title="PDF Técnico (con valor)"
                      style={{ background:"none", border:`1px solid ${COLORS.accent}44`, borderRadius:6, color:COLORS.accent, cursor:"pointer", padding:"4px 10px", fontSize:11, flexShrink:0 }}>🖨 Técnico</button>
                    <button onClick={async e=>{ e.stopPropagation(); const {data:hist}=await supabase.from("ordenes_trabajo").select("id,numero_ot,fecha_programada,fecha_ultima_mantencion,estado,checklist,observaciones,proveedor_nombre,valor_servicio").eq("cliente_nombre",o.cliente_nombre).eq("equipo_tipo",o.equipo_tipo).neq("id",o.id).order("fecha_programada",{ascending:false}).limit(10); printOT(o,true,hist||[]); }}
                      title="PDF Cliente (sin valor)"
                      style={{ background:"none", border:`1px solid ${COLORS.green}44`, borderRadius:6, color:COLORS.green, cursor:"pointer", padding:"4px 10px", fontSize:11, flexShrink:0 }}>🖨 Cliente</button>
                    <button onClick={async e=>{ e.stopPropagation(); if(!window.confirm("¿Eliminar esta OT?")) return; const {error}=await supabase.from("ordenes_trabajo").delete().eq("id",o.id); if(error){ alert("Error al eliminar: "+error.message); return; } setOts(prev=>prev.filter(x=>x.id!==o.id)); }}
                      style={{ background:"none", border:`1px solid ${COLORS.red}44`, borderRadius:6, color:COLORS.red, cursor:"pointer", padding:"4px 8px", fontSize:12, flexShrink:0 }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
          {showOTModal && (
            <OTModal
              ot={editOT}
              quotes={quotes}
              onClose={()=>{ setShowOTModal(false); setEditOT(null); }}
              onSaved={(data,isNew)=>{ setOts(prev=>isNew?[data,...prev]:prev.map(o=>o.id===data.id?data:o)); setShowOTModal(false); setEditOT(null); }}
            />
          )}
        </div>
      )}

      {/* ── VISTA COMISIONAMIENTO ── */}
      {mainTab==="comisionamiento" && (<div>

      {/* Stats rápidas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:20 }}>
        {[
          { label:"Total", val:filtered.length, color:COLORS.accent },
          { label:"Completados", val:filtered.filter(o=>o.estado==="completado"||o.estado==="firmado").length, color:COLORS.green },
          { label:"En proceso", val:filtered.filter(o=>o.estado==="borrador"||o.estado==="pendiente").length, color:COLORS.secondary },
          { label:"Con garantía", val:filtered.filter(o=>o.garantia_meses>0).length, color:COLORS.yellow },
        ].map(({label,val,color})=>(
          <div key={label} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 16px" }}>
            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{label}</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {loading ? <Loader /> : filtered.length===0 ? (
        <div style={{ textAlign:"center", padding:60, fontFamily:FONT, color:COLORS.textMuted }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔧</div>
          Sin operaciones aún. Crea la primera desde una cotización aprobada.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(op=>{
            const q = quotes.find(q=>q.id===op.quote_id);
            const tc = TIPO_COLOR[op.tipo]||COLORS.accent;
            const checklist = op.checklist||[];
            const totalItems = checklist.reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado!=="na").length,0);
            const doneItems  = checklist.reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado==="ok"||it.estado==="obs").length,0);
            const pct = totalItems>0?Math.round(doneItems/totalItems*100):0;
            const garantiaVence = op.garantia_meses && op.fecha_visita
              ? new Date(fechaLocal(op.fecha_visita).setMonth(fechaLocal(op.fecha_visita).getMonth()+Number(op.garantia_meses))).toLocaleDateString("es-CL")
              : null;
            return (
              <div key={op.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:"14px 18px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                  {/* Info principal */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:tc }}>{TIPO_ICON[op.tipo]} {op.numero||op.id.slice(0,8)}</span>
                      <Badge color={tc}>{TIPO_LABEL[op.tipo]}</Badge>
                      <Badge color={ESTADO_COLOR[op.estado]||COLORS.textMuted}>{ESTADO_LABEL[op.estado]||op.estado}</Badge>
                      {op.tipo==="comisionamiento" && garantiaVence && (
                        <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.yellow, background:`${COLORS.yellow}15`, padding:"2px 8px", borderRadius:10, border:`1px solid ${COLORS.yellow}33` }}>
                          🛡 Garantía hasta {garantiaVence}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:3 }}>
                      {op.cliente_nombre||q?.razon_social||q?.nombre_cliente||"—"}
                    </div>
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                      {q && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent }}>COT °{q.numero}</span>}
                      {op.tecnico && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>👷 {op.tecnico}</span>}
                      {op.fecha_visita && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>📅 {new Date(op.fecha_visita+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"})}</span>}
                      {op.equipo_modelo && <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>⚙️ {op.equipo_modelo}{op.equipo_serial?` · S/N: ${op.equipo_serial}`:""}</span>}
                    </div>
                  </div>
                  {/* Progreso checklist */}
                  {totalItems>0 && (
                    <div style={{ flexShrink:0, textAlign:"right", minWidth:100 }}>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:pct===100?COLORS.green:tc }}>{pct}%</div>
                      <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginBottom:4 }}>{doneItems}/{totalItems} ítems</div>
                      <div style={{ height:4, width:100, background:COLORS.border, borderRadius:99, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:pct===100?COLORS.green:tc, borderRadius:99, transition:"width 0.3s" }} />
                      </div>
                    </div>
                  )}
                </div>
                {/* Acciones */}
                <div style={{ display:"flex", gap:8, marginTop:12, paddingTop:10, borderTop:`1px solid ${COLORS.border}`, flexWrap:"wrap" }}>
                  <button onClick={()=>{ setEditOp(op); setShowModal(true); }}
                    style={{ padding:"5px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${tc}22`, border:`1px solid ${tc}44`, color:tc }}>
                    ✏️ Abrir / Editar
                  </button>
                  <button onClick={()=>printOp(op, q)}
                    style={{ padding:"5px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.accent}22`, border:`1px solid ${COLORS.accent}44`, color:COLORS.accent }}>
                    🖨 PDF
                  </button>
                  <button onClick={()=>deleteOp(op.id)}
                    style={{ padding:"5px 10px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red, marginLeft:"auto" }}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <OpModal
          op={editOp}
          defaultTipo="comisionamiento"
          quotes={quotes}
          contacts={contacts}
          onClose={()=>{ setShowModal(false); setEditOp(null); }}
          onSaved={(saved, isNew)=>{
            if(isNew) setOps(prev=>[saved,...prev]);
            else setOps(prev=>prev.map(o=>o.id===saved.id?saved:o));
            setShowModal(false); setEditOp(null);
          }}
          onPrint={(op)=>{ const q=quotes.find(q=>q.id===op.quote_id); printOp(op,q); }}
        />
      )}
    </div>)} {/* cierre comisionamiento tab */}
    </div>
  );
}

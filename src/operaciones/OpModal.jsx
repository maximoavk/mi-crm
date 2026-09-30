// Modal para crear o editar una operación en terreno con su checklist.
import React, { useState } from "react";
import { CHECKLIST_COMISIONAMIENTO, CHECKLIST_TEMPLATES, buildChecklist } from "./checklists.js";
import { supabase } from "../supabaseClient.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { fechaLocal } from "../shared/format.js";

// ─── Modal Operación ──────────────────────────────────────────────────────────
export function OpModal({ op, defaultTipo, quotes, contacts, onClose, onSaved, onPrint }) {
  const isNew = !op;
  const [tipo,   setTipo]   = useState(op?.tipo||defaultTipo||"comisionamiento");
  const [form,   setForm]   = useState({
    quote_id:             op?.quote_id||"",
    tecnico:              op?.tecnico||"Maximo Hudson",
    fecha_visita:         op?.fecha_visita||new Date().toISOString().slice(0,10),
    lugar:                op?.lugar||"",
    cliente_nombre:       op?.cliente_nombre||"",
    cliente_rut:          op?.cliente_rut||"",
    equipo_tipo:          op?.equipo_tipo||"Motor de portón",
    equipo_modelo:        op?.equipo_modelo||"",
    equipo_serial:        op?.equipo_serial||"",
    equipo_marca:         op?.equipo_marca||"",
    garantia_meses:       op?.garantia_meses||"",
    observaciones_generales: op?.observaciones_generales||"",
    estado:               op?.estado||"borrador",
    revision:             op?.revision||0,
  });
  const [checklist, setChecklist] = useState(op?.checklist||null);
  const [firma, setFirma]         = useState({ img: op?.firma_imagen||null, nombre: op?.firma_nombre||"" });
  const [firmaMode, setFirmaMode] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState("info"); // info | checklist | firma
  const canvasRef = React.useRef(null);
  const drawing   = React.useRef(false);

  const ff = (k,v) => setForm(p=>({...p,[k]:v}));

  // Auto-fill cliente when quote selected
  React.useEffect(()=>{
    if(form.quote_id){
      const q = quotes.find(q=>q.id===form.quote_id);
      if(q){ ff("cliente_nombre", q.razon_social||q.nombre_cliente||""); }
    }
  },[form.quote_id]);

  // Init checklist when equipo_tipo or tipo changes
  React.useEffect(()=>{
    if(!op?.checklist){
      const tmpl = tipo==="comisionamiento"
        ? CHECKLIST_COMISIONAMIENTO[form.equipo_tipo]
        : CHECKLIST_TEMPLATES[form.equipo_tipo];
      setChecklist(buildChecklist(tmpl||[]));
    }
  },[form.equipo_tipo, tipo]);

  const setItem = (sIdx, iIdx, field, val) => {
    setChecklist(prev => prev.map((s,si)=> si!==sIdx ? s : {
      ...s, items: s.items.map((it,ii)=> ii!==iIdx ? it : {...it,[field]:val})
    }));
  };

  // Firma canvas
  const startDraw = (e) => {
    drawing.current = true;
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const cx = c.getContext("2d");
    cx.beginPath();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    cx.moveTo(clientX-r.left, clientY-r.top);
  };
  const draw = (e) => {
    if(!drawing.current) return;
    e.preventDefault();
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const cx = c.getContext("2d");
    cx.lineWidth = 2; cx.lineCap = "round"; cx.strokeStyle = "#1a1a1a";
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    cx.lineTo(clientX-r.left, clientY-r.top);
    cx.stroke();
  };
  const endDraw = () => { drawing.current = false; };
  const clearFirma = () => { canvasRef.current?.getContext("2d").clearRect(0,0,400,120); };
  const saveFirma  = () => { setFirma(p=>({...p, img:canvasRef.current.toDataURL()})); setFirmaMode(false); };

  const totalItems = (checklist||[]).reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado!=="na").length,0);
  const doneItems  = (checklist||[]).reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado==="ok"||it.estado==="obs").length,0);
  const pct = totalItems>0?Math.round(doneItems/totalItems*100):0;

  const save = async (nuevoEstado) => {
    setSaving(true);
    try {
      const q    = quotes.find(q=>q.id===form.quote_id);
      const cotN = q?.numero||"00";
      const payload = {
        tipo, ...form,
        garantia_meses: form.garantia_meses !== "" ? Number(form.garantia_meses) : null,
        revision:       Number(form.revision||0),
        checklist: checklist||[],
        firma_imagen: firma.img||null,
        firma_nombre: firma.nombre||null,
        estado: nuevoEstado||form.estado,
      };
      let data, error;
      if(isNew){
        // Generate correlative number
        const { data:existing } = await supabase.from("operaciones_terreno").select("numero").like("numero",`${tipo==="comisionamiento"?"COM":"MNT"}-${cotN}-%`);
        const seq = String((existing?.length||0)+1).padStart(3,"0");
        payload.numero = `${tipo==="comisionamiento"?"COM":"MNT"}-${cotN}-${seq}`;
        ({ data, error } = await supabase.from("operaciones_terreno").insert(payload).select().single());
      } else {
        ({ data, error } = await supabase.from("operaciones_terreno").update(payload).eq("id",op.id).select().single());
      }
      if(error){ alert("Error: "+error.message); setSaving(false); return; }
      onSaved(data, isNew);
    } catch(e){ alert("Error: "+e.message); setSaving(false); }
  };

  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"9px 12px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" };
  const lbl = { fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4, fontWeight:600, display:"block" };
  const TABS = [{ k:"info",label:"📋 Info"},{k:"checklist",label:`✅ Checklist (${pct}%)`},{k:"firma",label:"✍️ Firma"}];
  const TC = tipo==="comisionamiento"?COLORS.green:COLORS.secondary;

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:12 }}>
      <div style={{ background:COLORS.surface, border:`1px solid ${TC}44`, borderRadius:16, width:"100%", maxWidth:720, maxHeight:"95vh", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"18px 24px 0", borderBottom:`1px solid ${COLORS.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div>
              <div style={{ fontFamily:FONT, fontSize:10, color:TC, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>
                {isNew?"Nueva operación":op.numero}
              </div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:17, fontWeight:700, color:COLORS.text }}>
                {isNew ? (
                  <div style={{ display:"flex", gap:8 }}>
                    {[["mantencion","🔧 Mantención",COLORS.secondary],["comisionamiento","🏗️ Comisionamiento",COLORS.green]].map(([k,l,c])=>(
                      <button key={k} onClick={()=>setTipo(k)}
                        style={{ padding:"5px 16px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", border:`1px solid ${tipo===k?c:COLORS.border}`, background:tipo===k?`${c}22`:"transparent", color:tipo===k?c:COLORS.textMuted }}>
                        {l}
                      </button>
                    ))}
                  </div>
                ) : `${tipo==="comisionamiento"?"🏗️":"🔧"} ${tipo==="comisionamiento"?"Comisionamiento":"Mantención"}`}
              </div>
            </div>
            <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontSize:20, cursor:"pointer" }}>✕</button>
          </div>
          {/* Tabs */}
          <div style={{ display:"flex", gap:0 }}>
            {TABS.map(t=>(
              <button key={t.k} onClick={()=>setActiveTab(t.k)}
                style={{ padding:"8px 18px", fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", border:"none", background:"transparent",
                  color:activeTab===t.k?TC:COLORS.textMuted, borderBottom:`2px solid ${activeTab===t.k?TC:"transparent"}`, transition:"all 0.15s" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {/* TAB INFO */}
          {activeTab==="info" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Cotización */}
              <div>
                <label style={lbl}>Cotización asociada</label>
                <select value={form.quote_id} onChange={e=>ff("quote_id",e.target.value)} style={inp}>
                  <option value="">— Sin cotización —</option>
                  {quotes.map(q=><option key={q.id} value={q.id}>COT °{q.numero} · {q.razon_social||q.nombre_cliente}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label style={lbl}>Técnico responsable</label><input value={form.tecnico} onChange={e=>ff("tecnico",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Fecha visita</label><input type="date" value={form.fecha_visita} onChange={e=>ff("fecha_visita",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Cliente / Lugar</label><input value={form.cliente_nombre} onChange={e=>ff("cliente_nombre",e.target.value)} style={inp} /></div>
                <div><label style={lbl}>RUT cliente</label><input value={form.cliente_rut} onChange={e=>ff("cliente_rut",e.target.value)} placeholder="Ej: 65.198.585-4" style={inp} /></div>
                <div style={{ gridColumn:"span 2" }}><label style={lbl}>Dirección / Lugar de faena</label><input value={form.lugar} onChange={e=>ff("lugar",e.target.value)} placeholder="Ej: Av. Peñuelas 2500, Coquimbo" style={inp} /></div>
              </div>
              {/* Equipo */}
              <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:TC, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, marginBottom:12 }}>⚙️ Datos del equipo</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <label style={lbl}>Tipo de equipo</label>
                    <select value={form.equipo_tipo} onChange={e=>ff("equipo_tipo",e.target.value)} style={inp}>
                      {Object.keys(CHECKLIST_TEMPLATES).map(k=><option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Modelo</label><input value={form.equipo_modelo} onChange={e=>ff("equipo_modelo",e.target.value)} placeholder="Ej: Centurion D10 Turbo" style={inp} /></div>
                  <div><label style={lbl}>Marca</label><input value={form.equipo_marca} onChange={e=>ff("equipo_marca",e.target.value)} placeholder="Ej: Centurion" style={inp} /></div>
                  <div><label style={lbl}>N° Serie / Serial</label><input value={form.equipo_serial} onChange={e=>ff("equipo_serial",e.target.value)} placeholder="Ej: CTD10-2024-00123" style={inp} /></div>
                  {tipo==="comisionamiento" && (
                    <div><label style={lbl}>Garantía (meses)</label>
                      <input type="number" min="0" value={form.garantia_meses} onChange={e=>ff("garantia_meses",e.target.value)} placeholder="Ej: 12" style={inp} />
                      {form.garantia_meses&&form.fecha_visita&&<div style={{fontFamily:FONT,fontSize:10,color:COLORS.green,marginTop:3}}>
                        Vence: {new Date(fechaLocal(form.fecha_visita).setMonth(fechaLocal(form.fecha_visita).getMonth()+Number(form.garantia_meses))).toLocaleDateString("es-CL")}
                      </div>}
                    </div>
                  )}
                  <div><label style={lbl}>Revisión Nro.</label><input type="number" min="0" value={form.revision} onChange={e=>ff("revision",e.target.value)} style={inp} /></div>
                </div>
              </div>
              <div>
                <label style={lbl}>Observaciones generales</label>
                <textarea value={form.observaciones_generales} onChange={e=>ff("observaciones_generales",e.target.value)}
                  placeholder="Notas generales del estado del equipo, recomendaciones, etc."
                  rows={3} style={{...inp, resize:"vertical"}} />
              </div>
            </div>
          )}

          {/* TAB CHECKLIST */}
          {activeTab==="checklist" && (
            <div>
              {/* Barra de progreso global */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, padding:"10px 14px", background:COLORS.bg, borderRadius:10, border:`1px solid ${COLORS.border}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{doneItems} de {totalItems} ítems completados</span>
                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:pct===100?COLORS.green:TC }}>{pct}%</span>
                  </div>
                  <div style={{ height:6, background:COLORS.border, borderRadius:99, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:pct===100?COLORS.green:TC, borderRadius:99, transition:"width 0.3s" }} />
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {[["ok","✓ OK",COLORS.green],["obs","⚠ OBS",COLORS.yellow],["na","N/A",COLORS.textMuted]].map(([s,l,c])=>(
                    <div key={s} style={{ fontFamily:FONT, fontSize:9, color:c, background:`${c}15`, padding:"2px 7px", borderRadius:10 }}>{l}</div>
                  ))}
                </div>
              </div>

              {(checklist||[]).map((sec,sIdx)=>(
                <div key={sIdx} style={{ marginBottom:16 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.text, borderBottom:`2px solid ${TC}44`, paddingBottom:6, marginBottom:8 }}>
                    {sec.seccion}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {(sec.items||[]).map((it,iIdx)=>(
                      <div key={iIdx} style={{ background:it.estado==="ok"?`${COLORS.green}10`:it.estado==="obs"?`${COLORS.yellow}10`:it.estado==="na"?`${COLORS.border}22`:COLORS.bg, border:`1px solid ${it.estado==="ok"?COLORS.green+"33":it.estado==="obs"?COLORS.yellow+"33":COLORS.border}`, borderRadius:7, padding:"8px 12px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, flexShrink:0, minWidth:16, textAlign:"center" }}>
                            {it.estado==="ok"?"✓":it.estado==="na"?"⊘":"○"}
                          </span>
                          <span style={{ fontFamily:FONT, fontSize:12, color:it.estado==="na"?COLORS.textMuted:COLORS.text, flex:1, textDecoration:it.estado==="na"?"line-through":"none" }}>{it.label}</span>
                          <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                            {[["ok","OK",COLORS.green],["obs","OBS",COLORS.yellow],["na","N/A",COLORS.textMuted]].map(([s,l,c])=>(
                              <button key={s} onClick={()=>setItem(sIdx,iIdx,"estado",it.estado===s?null:s)}
                                style={{ padding:"2px 8px", borderRadius:5, fontFamily:FONT_DISPLAY, fontSize:9, cursor:"pointer", border:`1px solid ${it.estado===s?c:COLORS.border}`, background:it.estado===s?`${c}22`:"transparent", color:it.estado===s?c:COLORS.textMuted, fontWeight:it.estado===s?700:400 }}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                        {it.estado==="obs" && (
                          <input value={it.obs||""} onChange={e=>setItem(sIdx,iIdx,"obs",e.target.value)}
                            placeholder="Describe la observación…"
                            style={{ marginTop:6, width:"100%", background:"transparent", border:`1px solid ${COLORS.yellow}44`, borderRadius:5, padding:"5px 9px", fontFamily:FONT, fontSize:11, color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB FIRMA */}
          {activeTab==="firma" && (
            <div>
              {firma.img && !firmaMode ? (
                <div style={{ marginBottom:16, padding:"14px 16px", background:COLORS.bg, border:`1px solid ${COLORS.green}44`, borderRadius:10 }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontWeight:700 }}>✓ Firma registrada</div>
                  <img src={firma.img} alt="firma" style={{ maxWidth:260, maxHeight:90, border:`1px solid ${COLORS.border}`, borderRadius:6, background:"#fff", padding:4 }} />
                  <div style={{ marginTop:8 }}>
                    <input value={firma.nombre} onChange={e=>setFirma(p=>({...p,nombre:e.target.value}))} placeholder="Nombre del firmante"
                      style={{...inp, maxWidth:300}} />
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:10 }}>
                    <button onClick={()=>setFirmaMode(true)} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.yellow}22`, border:`1px solid ${COLORS.yellow}44`, color:COLORS.yellow }}>✏️ Volver a firmar</button>
                    <button onClick={()=>setFirma({img:null,nombre:""})} style={{ padding:"6px 14px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red }}>✕ Borrar firma</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:10 }}>
                    El cliente puede firmar directamente en pantalla. Funciona en celular/tablet con dedo.
                  </div>
                  <div style={{ background:"#fff", border:`2px solid ${TC}`, borderRadius:10, overflow:"hidden", marginBottom:10, touchAction:"none" }}>
                    <canvas ref={canvasRef} width={650} height={130} style={{ display:"block", width:"100%", cursor:"crosshair" }}
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                    />
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <input value={firma.nombre} onChange={e=>setFirma(p=>({...p,nombre:e.target.value}))} placeholder="Nombre del firmante (cliente)"
                      style={{...inp, maxWidth:320}} />
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={clearFirma} style={{ padding:"7px 16px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>🗑 Limpiar</button>
                    <button onClick={saveFirma} style={{ padding:"7px 16px", borderRadius:6, fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, color:COLORS.green }}>✓ Aceptar firma</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer botones */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${COLORS.border}`, display:"flex", gap:8, flexShrink:0, flexWrap:"wrap" }}>
          <button onClick={onClose} style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>Cancelar</button>
          <button onClick={()=>save("borrador")} disabled={saving}
            style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:`${COLORS.border}`, border:"none", color:COLORS.textMuted }}>
            💾 Guardar borrador
          </button>
          <button onClick={()=>save("completado")} disabled={saving}
            style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:`${TC}22`, border:`1px solid ${TC}44`, color:TC }}>
            ✓ Marcar completado
          </button>
          {firma.img && <button onClick={()=>save("firmado")} disabled={saving}
            style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, color:COLORS.green }}>
            ✍️ Guardar firmado
          </button>}
          <button onClick={async()=>{ await save(form.estado); }} disabled={saving}
            style={{ padding:"9px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:COLORS.accent, border:"none", color:"#fff", marginLeft:"auto" }}>
            🖨 Guardar y PDF
          </button>
        </div>
      </div>
    </div>
  );
}

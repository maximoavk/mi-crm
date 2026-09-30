// Modal para crear o editar una orden de trabajo (OT) con su checklist.
import React, { useState } from "react";
import { CHECKLIST_TEMPLATES, CHECKLIST_COMISIONAMIENTO, buildChecklist } from "./checklists.js";
import { supabase } from "../supabaseClient.js";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";

// ─── OT MODAL ────────────────────────────────────────────────────────────────
export function OTModal({ ot, quotes, onClose, onSaved }) {
  const isNew = !ot;
  const [tab, setTab]           = useState("info");
  const [saving, setSaving]     = useState(false);
  const [productos, setProductosOT] = useState([]); // cargado internamente
  const [proveedores, setProveedores] = useState([]);
  const [cotSearch, setCotSearch] = useState(()=>{
    if(ot?.cotizacion_id){
      const q = (quotes||[]).find(q=>q.id===ot.cotizacion_id);
      return q ? `${q.serie||"COT"}-${String(q.numero||q.number||"?").padStart(3,"0")}` : "";
    }
    return "";
  });
  const [showCotResults, setShowCotResults] = useState(false);
  const [showServPanel, setShowServPanel]   = useState(false);
  const [busquedaServ, setBusquedaServ]     = useState("");
  const [matSearch, setMatSearch]           = useState("");
  const [showMatResults, setShowMatResults] = useState(false);

  const [form, setForm] = useState({
    actividad:        ot?.actividad||"",
    tipo_servicio:    ot?.tipo_servicio||"mantencion",
    equipo_tipo:      ot?.equipo_tipo||Object.keys(CHECKLIST_TEMPLATES)[0],
    valor_servicio:   ot?.valor_servicio||"",
    fecha_programada: ot?.fecha_programada||new Date().toISOString().slice(0,10),
    cliente_nombre:   ot?.cliente_nombre||"",
    cliente_rut:      ot?.cliente_rut||"",
    lugar:            ot?.lugar||"",
    cotizacion_id:    ot?.cotizacion_id||"",
    observaciones:    ot?.observaciones||"",
    estado:           ot?.estado||"pendiente",
    codigo_servicio:  ot?.codigo_servicio||"",
    nombre_servicio:  ot?.nombre_servicio||"",
    proveedor_nombre:          ot?.proveedor_nombre||"",
    fecha_ultima_mantencion:   ot?.fecha_ultima_mantencion||"",
    fecha_proxima_mantencion:  ot?.fecha_proxima_mantencion||"",
  });
  const [checklist, setChecklist] = useState(ot?.checklist||null);
  const [historial, setHistorial] = useState([]);
  const [historialLoaded, setHistorialLoaded] = useState(false);
  const [materiales, setMateriales] = useState(ot?.materiales||[]);
  const [firma, setFirma]         = useState({ img: ot?.firma_imagen||null, nombre: ot?.firma_nombre||"" });
  const [firmaMode, setFirmaMode] = useState(false);
  const canvasRef = React.useRef(null);
  const drawing   = React.useRef(false);
  const ff = (k,v) => setForm(p=>({...p,[k]:v}));

  // Cargar productos y proveedores desde DB
  React.useEffect(()=>{
    supabase.from("products").select("id,nombre,codigo,tipo,precio,descripcion,unidad,categoria").order("codigo")
      .then(({data,error})=>{
        if(!error && data) setProductosOT(data);
      });
    supabase.from("proveedores").select("id,nombre,rut,contacto").order("nombre")
      .then(({data})=>setProveedores(data||[]));
  },[]);

  // Auto-fill cliente desde COT
  React.useEffect(()=>{
    if(form.cotizacion_id){
      const q = (quotes||[]).find(q=>q.id===form.cotizacion_id);
      if(q){
        ff("cliente_nombre", q.razon_social||q.nombre_cliente||"");
        if(q.rut_cliente)  ff("cliente_rut", q.rut_cliente);
        if(q.direccion){
          const dir = typeof q.direccion==="object"
            ? [q.direccion.calle, q.direccion.comuna, q.direccion.region].filter(Boolean).join(", ")
            : q.direccion;
          if(dir) ff("lugar", dir);
        }
      }
    }
  },[form.cotizacion_id]);

  // Cargar historial de mantenciones del mismo cliente + equipo
  React.useEffect(()=>{
    if(!form.cliente_nombre || !form.equipo_tipo) return;
    supabase.from("ordenes_trabajo")
      .select("id,numero_ot,fecha_programada,fecha_ultima_mantencion,estado,checklist,observaciones,proveedor_nombre,valor_servicio")
      .eq("cliente_nombre", form.cliente_nombre)
      .eq("equipo_tipo", form.equipo_tipo)
      .order("fecha_programada", { ascending: false })
      .limit(20)
      .then(({ data })=>{
        const prev = (data||[]).filter(r=>r.id !== ot?.id);
        setHistorial(prev);
        setHistorialLoaded(true);
        // Auto-fill última mantención si no tiene y hay historial
        if(!form.fecha_ultima_mantencion && prev.length > 0 && prev[0].fecha_programada){
          ff("fecha_ultima_mantencion", prev[0].fecha_programada);
        }
      });
  },[form.cliente_nombre, form.equipo_tipo]);

  // Init checklist cuando cambia equipo_tipo
  React.useEffect(()=>{
    if(!ot?.checklist){
      const tmpl = form.tipo_servicio==="comisionamiento"
        ? CHECKLIST_COMISIONAMIENTO[form.equipo_tipo]
        : CHECKLIST_TEMPLATES[form.equipo_tipo];
      setChecklist(buildChecklist(tmpl||[]));
    }
  },[form.equipo_tipo, form.tipo_servicio]);

  const setItem = (sIdx,iIdx,field,val) =>
    setChecklist(prev=>prev.map((s,si)=>si!==sIdx?s:{...s,items:s.items.map((it,ii)=>ii!==iIdx?it:{...it,[field]:val})}));

  const totalItems = (checklist||[]).reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado!=="na").length,0);
  const doneItems  = (checklist||[]).reduce((s,sec)=>s+(sec.items||[]).filter(it=>it.estado==="ok"||it.estado==="ok_c").length,0);
  const pct = totalItems>0?Math.round(doneItems/totalItems*100):0;

  // Resultados búsqueda COT
  const cotResults = React.useMemo(()=>{
    if(!cotSearch.trim()||form.cotizacion_id) return [];
    const q = cotSearch.toLowerCase();
    return (quotes||[]).filter(qt=>{
      const num  = String(qt.numero||qt.number||"").padStart(3,"0");
      const serie = qt.serie||"COT";
      const cod  = `${serie}-${num}`.toLowerCase();
      return cod.includes(q.replace(/[^a-z0-9]/g,"")) || (qt.razon_social||qt.nombre_cliente||"").toLowerCase().includes(q);
    }).slice(0,8);
  },[cotSearch, quotes, form.cotizacion_id]);

  // Resultados búsqueda servicio del maestro — patrón igual al cotizador
  const servicioResults = React.useMemo(()=>{
    if(busquedaServ.length < 2) return [];
    const q = busquedaServ.toLowerCase();
    return (productos||[]).filter(p=>{
      const cod  = (p.codigo||"").toLowerCase();
      const nom  = (p.nombre||"").toLowerCase();
      const mod  = (p.modelo||"").toLowerCase();
      return cod.includes(q) || nom.includes(q) || mod.includes(q);
    }).slice(0,10);
  },[busquedaServ, productos]);

  // Resultados búsqueda materiales
  const matResults = React.useMemo(()=>{
    if(!matSearch.trim()) return [];
    const q = matSearch.toLowerCase();
    return (productos||[]).filter(p=>
      (p.nombre||"").toLowerCase().includes(q) || (p.codigo||"").toLowerCase().includes(q)
    ).slice(0,10);
  },[matSearch, productos]);

  const addMaterial = (prod) => {
    setMateriales(prev=>[...prev, {
      id: Date.now().toString(),
      producto_id: prod.id,
      nombre: prod.nombre,
      codigo: prod.codigo||"",
      unidad: "un",
      cantidad: 1,
    }]);
    setMatSearch("");
    setShowMatResults(false);
  };

  // Seleccionar servicio: rellena como el cotizador
  const selectServicio = (prod) => {
    ff("codigo_servicio", prod.codigo||"");
    ff("nombre_servicio", prod.nombre);
    if(!form.actividad){
      ff("actividad", prod.modelo||prod.nombre);
    }
    if((!form.valor_servicio || Number(form.valor_servicio)===0) && prod.precio){
      ff("valor_servicio", String(prod.precio));
    }
    setBusquedaServ("");
    setShowServPanel(false);
  };

  // Canvas firma
  const startDraw = (e)=>{ drawing.current=true; const c=canvasRef.current; const r=c.getBoundingClientRect(); const cx=c.getContext("2d"); cx.beginPath(); const x=e.touches?.[0]?.clientX??e.clientX; const y=e.touches?.[0]?.clientY??e.clientY; cx.moveTo(x-r.left,y-r.top); };
  const draw = (e)=>{ if(!drawing.current)return; e.preventDefault(); const c=canvasRef.current; const r=c.getBoundingClientRect(); const cx=c.getContext("2d"); cx.lineWidth=2;cx.lineCap="round";cx.strokeStyle="#1a1a1a"; const x=e.touches?.[0]?.clientX??e.clientX; const y=e.touches?.[0]?.clientY??e.clientY; cx.lineTo(x-r.left,y-r.top); cx.stroke(); };
  const endDraw = ()=>{ drawing.current=false; };
  const clearFirma = ()=>{ canvasRef.current?.getContext("2d").clearRect(0,0,400,120); };
  const saveFirma  = ()=>{ setFirma(p=>({...p,img:canvasRef.current.toDataURL()})); setFirmaMode(false); };

  const save = async (nuevoEstado) => {
    const isBorrador = nuevoEstado === "borrador";
    if(!isBorrador && !form.actividad) {
      alert("Para generar la OT se requiere la actividad/descripción.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        valor_servicio: form.valor_servicio !== "" ? Number(form.valor_servicio) : null,
        cotizacion_id:  form.cotizacion_id || null,
        checklist:      checklist||[],
        materiales:     materiales||[],
        firma_imagen:   firma.img||null,
        firma_nombre:   firma.nombre||null,
        estado:         nuevoEstado||form.estado,
      };
      let data, error;
      if(isNew){
        if(form.cotizacion_id){
          // Correlativo por cotización: COT-045/OT-1, COT-045/OT-2...
          const q = (quotes||[]).find(qt=>qt.id===form.cotizacion_id);
          const serie = q?.serie||"COT";
          const num   = String(q?.numero||q?.number||"?").padStart(3,"0");
          const { data:cotOTs } = await supabase.from("ordenes_trabajo").select("id").eq("cotizacion_id",form.cotizacion_id);
          const otIdx = (cotOTs?.length||0)+1;
          payload.numero_ot = `${serie}-${num}/OT-${otIdx}`;
        } else {
          // Correlativo global OT-001
          const { data:existing } = await supabase.from("ordenes_trabajo").select("numero_ot").not("numero_ot","like","%-OT-%").order("created_at",{ascending:false}).limit(1);
          const lastNum = existing?.[0]?.numero_ot ? parseInt(existing[0].numero_ot.replace("OT-",""))||0 : 0;
          payload.numero_ot = `OT-${String(lastNum+1).padStart(3,"0")}`;
        }
        ({ data, error } = await supabase.from("ordenes_trabajo").insert(payload).select().single());
      } else {
        ({ data, error } = await supabase.from("ordenes_trabajo").update(payload).eq("id",ot.id).select().single());
      }
      if(error){ alert("Error: "+error.message); setSaving(false); return; }
      // Auto-crear / actualizar entrada en facturas_recibidas (Cuentas por Pagar)
      if(data && !isBorrador){
        const hoy = new Date().toISOString().slice(0,10);
        const montoNeto = Number(payload.valor_servicio)||0;
        const fpp = {
          numero_documento:      data.numero_ot,
          tipo_documento:        "Orden de Trabajo",
          fecha_recepcion:       hoy,
          razon_social_proveedor: form.proveedor_nombre||"",
          rut_proveedor:         null,
          tipo_proveedor:        "Subcontratista",
          monto_neto:            montoNeto,
          aplica_iva:            false,
          monto_iva:             0,
          monto_total:           montoNeto,
          vencimiento:           form.fecha_programada||null,
          referencia_oc:         data.numero_ot,
          referencia_proyecto:   form.actividad||"",
          notas:                 `OT generada automáticamente · ${form.tipo_servicio||""}`,
          linea_negocio:         form.tipo_servicio||"",
        };
        const { data:fppRows } = await supabase.from("facturas_recibidas").select("id").eq("numero_documento",data.numero_ot).limit(1);
        if(fppRows && fppRows.length > 0){
          await supabase.from("facturas_recibidas").update({ monto_neto:fpp.monto_neto, monto_total:fpp.monto_total, razon_social_proveedor:fpp.razon_social_proveedor, referencia_proyecto:fpp.referencia_proyecto, vencimiento:fpp.vencimiento }).eq("numero_documento",data.numero_ot);
        } else {
          const { error:insErr } = await supabase.from("facturas_recibidas").insert(fpp);
          if(insErr) alert("Error al crear entrada en Cuentas por Pagar: "+insErr.message);
        }
      }
      onSaved(data, isNew);
    } catch(e){ alert("Error: "+e.message); setSaving(false); }
  };

  const fmtClp = n => "$"+Math.round(n||0).toLocaleString("es-CL");
  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"8px 10px", fontFamily:FONT, fontSize:12, color:COLORS.text, outline:"none", boxSizing:"border-box" };
  const lbl = { fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4, fontWeight:600, display:"block" };
  const TC = COLORS.accent;

  const ESTADO_OT = {
    borrador:    { label:"Borrador",    color:COLORS.textMuted },
    pendiente:   { label:"Pendiente",   color:"#FFB800" },
    confirmado:  { label:"Confirmado",  color:COLORS.accent },
    en_progreso: { label:"En progreso", color:COLORS.accent },
    prorrogado:  { label:"Prorrogado",  color:"#FF8C00" },
    completado:  { label:"Completado",  color:COLORS.green },
    cancelado:   { label:"Cancelado",   color:COLORS.red },
    firmada:     { label:"Firmada",     color:COLORS.green },
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:12 }}>
      <div style={{ background:COLORS.surface, border:`1px solid ${TC}44`, borderRadius:16, width:"100%", maxWidth:740, maxHeight:"95vh", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"16px 22px 0", borderBottom:`1px solid ${COLORS.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div>
              <div style={{ fontFamily:FONT, fontSize:9, color:TC, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:2 }}>
                {isNew?"Nueva OT":ot.numero_ot} · Orden de Trabajo
              </div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>
                {form.actividad||"Sin título"}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {!isNew && (
                <select value={form.estado} onChange={e=>ff("estado",e.target.value)}
                  style={{ ...inp, width:"auto", fontSize:11, padding:"4px 10px", color:ESTADO_OT[form.estado]?.color||COLORS.text }}>
                  {Object.entries(ESTADO_OT).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              )}
              <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
          </div>
          <div style={{ display:"flex", gap:0 }}>
            {[{k:"info",l:"📋 Info"},{k:"checklist",l:`✅ Checklist (${pct}%)`},{k:"materiales",l:`📦 Materiales (${materiales.length})`},{k:"conformidad",l:"🤝 Conformidad"},{k:"historial",l:`📅 Historial${historial.length>0?" ("+historial.length+")":""}`}].map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)}
                style={{ padding:"7px 16px", fontFamily:FONT_DISPLAY, fontSize:11, cursor:"pointer", border:"none", background:"transparent",
                  color:tab===t.k?TC:COLORS.textMuted, borderBottom:`2px solid ${tab===t.k?TC:"transparent"}`, transition:"all 0.15s" }}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"18px 22px" }}>

          {/* TAB INFO */}
          {tab==="info" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {/* Proveedor / Subcontratista */}
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Proveedor / Subcontratista</label>
                <select value={form.proveedor_nombre} onChange={e=>ff("proveedor_nombre",e.target.value)} style={inp}>
                  <option value="">— Sin asignar —</option>
                  {proveedores.map(p=>(
                    <option key={p.id} value={p.nombre}>{p.nombre}{p.rut?` · ${p.rut}`:""}</option>
                  ))}
                </select>
                {proveedores.length===0 && (
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:4 }}>
                    No hay proveedores cargados. Agrégalos directamente en Supabase en la tabla <code>proveedores</code>.
                  </div>
                )}
              </div>
              {/* Tipo servicio */}
              <div>
                <label style={lbl}>Tipo de servicio</label>
                <select value={form.tipo_servicio} onChange={e=>ff("tipo_servicio",e.target.value)} style={inp}>
                  <option value="mantencion">Mantención</option>
                  <option value="comisionamiento">Comisionamiento / Instalación</option>
                  <option value="visita">Visita técnica</option>
                  <option value="garantia">Garantía</option>
                  <option value="emergencia">Emergencia</option>
                </select>
              </div>
              {/* Equipo */}
              <div>
                <label style={lbl}>Tipo de equipo (checklist)</label>
                <select value={form.equipo_tipo} onChange={e=>ff("equipo_tipo",e.target.value)} style={inp}>
                  {Object.keys(CHECKLIST_TEMPLATES).map(k=><option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              {/* Código de servicio — mismo patrón que cotizador */}
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Línea de servicio (Maestro de productos)</label>
                <div style={{ position:"relative" }}>
                  {/* Selección actual o botón */}
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    {form.codigo_servicio ? (
                      <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, background:COLORS.card, border:`1px solid ${TC}44`, borderRadius:6, padding:"8px 12px" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:FONT, fontSize:10, color:TC, fontWeight:700 }}>{form.codigo_servicio}</div>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, color:COLORS.text, fontWeight:600 }}>{form.nombre_servicio}</div>
                        </div>
                        <button onClick={()=>{ ff("codigo_servicio",""); ff("nombre_servicio",""); }}
                          style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:16, lineHeight:1, padding:0 }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ flex:1, fontFamily:FONT, fontSize:11, color:COLORS.textMuted, background:COLORS.card, border:`1px dashed ${COLORS.border}`, borderRadius:6, padding:"8px 12px" }}>
                        Sin servicio seleccionado
                      </div>
                    )}
                    <button onClick={()=>{ setShowServPanel(p=>!p); setBusquedaServ(""); }}
                      style={{ padding:"8px 14px", background:showServPanel?TC:`${TC}22`, border:`1px solid ${TC}44`, borderRadius:6,
                        fontFamily:FONT_DISPLAY, fontSize:11, color:showServPanel?COLORS.bg:TC, cursor:"pointer", whiteSpace:"nowrap", fontWeight:600 }}>
                      🔍 {form.codigo_servicio?"Cambiar":"Buscar"}
                    </button>
                  </div>
                  {/* Panel de búsqueda — igual al cotizador */}
                  {showServPanel && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:200, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, boxShadow:"0 6px 24px #0009", marginTop:4 }}>
                      <div style={{ padding:"8px 10px", borderBottom:`1px solid ${COLORS.border}22` }}>
                        <input autoFocus value={busquedaServ} onChange={e=>setBusquedaServ(e.target.value)}
                          placeholder="Buscar por código (SINS-004, SMTO-004) o nombre…"
                          style={{ ...inp, fontSize:12, padding:"6px 10px" }} />
                      </div>
                      {busquedaServ.length < 2 && (
                        <div style={{ padding:"10px 14px", fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Escribe al menos 2 caracteres… ({productos.length} productos cargados)</div>
                      )}
                      {busquedaServ.length >= 2 && servicioResults.length === 0 && (
                        <div style={{ padding:"10px 14px", fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Sin resultados para "{busquedaServ}"</div>
                      )}
                      {servicioResults.map(p=>(
                        <div key={p.id} onClick={()=>selectServicio(p)}
                          style={{ padding:"9px 14px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}11`, display:"flex", justifyContent:"space-between", alignItems:"center" }}
                          onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <div>
                            <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>{p.nombre}</div>
                            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{p.codigo||"—"} · {p.modelo||p.categoria||""}</div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                            {p.precio>0 && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.green, fontWeight:700 }}>${Number(p.precio).toLocaleString("es-CL")}</div>}
                            <div style={{ fontFamily:FONT, fontSize:10, color:TC, fontWeight:700 }}>{p.codigo}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Actividad */}
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Actividad / Descripción *</label>
                <textarea value={form.actividad} onChange={e=>ff("actividad",e.target.value)}
                  rows={2} placeholder="Ej: Mantención preventiva motor portón doble hoja…"
                  style={{ ...inp, resize:"vertical" }} />
              </div>
              {/* Fecha + Valor */}
              <div>
                <label style={lbl}>Fecha programada</label>
                <input type="date" value={form.fecha_programada} onChange={e=>ff("fecha_programada",e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Valor del servicio ($)</label>
                <input type="number" value={form.valor_servicio} onChange={e=>ff("valor_servicio",e.target.value)} placeholder="0" style={inp} />
              </div>
              {/* Fechas mantención */}
              <div>
                <label style={lbl}>Última mantención</label>
                <input type="date" value={form.fecha_ultima_mantencion} onChange={e=>ff("fecha_ultima_mantencion",e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Próxima mantención</label>
                <input type="date" value={form.fecha_proxima_mantencion} onChange={e=>ff("fecha_proxima_mantencion",e.target.value)} style={inp} />
              </div>
              {/* COT vinculada — buscador */}
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Cotización vinculada (opcional)</label>
                <div style={{ position:"relative" }}>
                  <input value={cotSearch}
                    onChange={e=>{ setCotSearch(e.target.value); setShowCotResults(true); if(!e.target.value){ ff("cotizacion_id",""); } }}
                    onFocus={()=>setShowCotResults(true)} onBlur={()=>setTimeout(()=>setShowCotResults(false),180)}
                    placeholder="Buscar por número COT-001, SIN-003 o nombre cliente…" style={inp} />
                  {form.cotizacion_id && (
                    <button onMouseDown={()=>{ ff("cotizacion_id",""); setCotSearch(""); }}
                      style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:14 }}>✕</button>
                  )}
                  {showCotResults && cotResults.length>0 && !form.cotizacion_id && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, zIndex:60, maxHeight:200, overflowY:"auto", boxShadow:"0 4px 20px #0008" }}>
                      {cotResults.map(q=>{
                        const num   = String(q.numero||q.number||"?").padStart(3,"0");
                        const serie = q.serie||"COT";
                        return (
                          <div key={q.id} onMouseDown={()=>{ ff("cotizacion_id",q.id); setCotSearch(`${serie}-${num}`); setShowCotResults(false); }}
                            style={{ padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}22`, fontFamily:FONT, fontSize:12, color:COLORS.text, display:"flex", justifyContent:"space-between" }}>
                            <span><span style={{ color:TC, fontWeight:700 }}>{serie}-{num}</span> · {q.razon_social||q.nombre_cliente}</span>
                            <span style={{ fontSize:10, color:COLORS.textMuted }}>{q.estado}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Cliente */}
              <div>
                <label style={lbl}>Cliente</label>
                <input value={form.cliente_nombre} onChange={e=>ff("cliente_nombre",e.target.value)} placeholder="Nombre cliente" style={inp} />
              </div>
              <div>
                <label style={lbl}>RUT cliente</label>
                <input value={form.cliente_rut} onChange={e=>ff("cliente_rut",e.target.value)} placeholder="12.345.678-9" style={inp} />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Lugar / Dirección</label>
                <input value={form.lugar} onChange={e=>ff("lugar",e.target.value)} placeholder="Ej: Condominio Los Álamos, Vitacura" style={inp} />
              </div>
            </div>
          )}

          {/* TAB CHECKLIST */}
          {tab==="checklist" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>
                  {doneItems}/{totalItems} ítems · {pct}% completado
                </div>
                <div style={{ height:8, width:200, background:COLORS.border, borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:8, borderRadius:4, background:pct===100?COLORS.green:TC, width:`${pct}%`, transition:"width 0.3s" }} />
                </div>
              </div>
              {(checklist||[]).map((sec,sIdx)=>(
                <div key={sIdx} style={{ marginBottom:16 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.text, marginBottom:8, padding:"6px 10px", background:COLORS.surface, borderRadius:6, borderLeft:`3px solid ${TC}` }}>
                    {sec.seccion}
                  </div>
                  {(sec.items||[]).map((it,iIdx)=>(
                    <div key={iIdx} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", borderBottom:`1px solid ${COLORS.border}11` }}>
                      <div style={{ flex:1, fontFamily:FONT, fontSize:11, color:COLORS.text }}>{it.label}</div>
                      {[
                        {k:"ok",   l:"✓ OK",   c:COLORS.green},
                        {k:"ok_c", l:"✓ Nota",  c:"#4CAF50"},
                        {k:"desv", l:"⚠ Desv",  c:COLORS.yellow},
                        {k:"na",   l:"N/A",     c:COLORS.textMuted},
                      ].map(({k,l,c})=>(
                        <button key={k} onClick={()=>setItem(sIdx,iIdx,"estado",it.estado===k?null:k)}
                          style={{ padding:"2px 8px", borderRadius:5, fontFamily:FONT, fontSize:10, cursor:"pointer",
                            background:it.estado===k?`${c}22`:"transparent", border:`1px solid ${it.estado===k?c:COLORS.border}`,
                            color:it.estado===k?c:COLORS.textMuted }}>
                          {l}
                        </button>
                      ))}
                      {(it.estado==="ok_c"||it.estado==="desv") && (
                        <input value={it.obs||""} onChange={e=>setItem(sIdx,iIdx,"obs",e.target.value)}
                          placeholder={it.estado==="ok_c"?"Nota…":"Desviación…"}
                          style={{ ...inp, width:160, padding:"2px 8px", fontSize:10 }} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* TAB MATERIALES */}
          {tab==="materiales" && (
            <div>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:14 }}>
                Listado de productos y materiales entregados al técnico o subcontratista. Sirve como constancia de entrega.
              </div>
              {/* Buscador */}
              <div style={{ position:"relative", marginBottom:16 }}>
                <input value={matSearch} onChange={e=>{ setMatSearch(e.target.value); setShowMatResults(true); }}
                  onFocus={()=>setShowMatResults(true)} onBlur={()=>setTimeout(()=>setShowMatResults(false),180)}
                  placeholder="Buscar producto del maestro por nombre o código…" style={inp} />
                {showMatResults && matResults.length>0 && (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, zIndex:60, maxHeight:220, overflowY:"auto", boxShadow:"0 4px 20px #0008" }}>
                    {matResults.map(p=>(
                      <div key={p.id} onMouseDown={()=>addMaterial(p)}
                        style={{ padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}22`, fontFamily:FONT, fontSize:12, color:COLORS.text, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span><span style={{ color:TC, fontWeight:700, fontSize:10 }}>{p.codigo||""}</span>{p.codigo?" · ":""}{p.nombre}</span>
                        {p.precio_unitario && <span style={{ color:COLORS.textMuted, fontSize:10 }}>${Number(p.precio_unitario).toLocaleString("es-CL")}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Lista */}
              {materiales.length===0 ? (
                <div style={{ textAlign:"center", padding:40, fontFamily:FONT, color:COLORS.textMuted, background:COLORS.card, borderRadius:10, border:`1px dashed ${COLORS.border}` }}>
                  Sin materiales agregados. Busca y selecciona productos del maestro.
                </div>
              ) : (
                <div>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr auto", gap:8, padding:"5px 10px", fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    <div>Producto</div><div>Código</div><div>Cantidad</div><div></div>
                  </div>
                  {materiales.map((m,idx)=>(
                    <div key={m.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr auto", gap:8, padding:"8px 10px", borderBottom:`1px solid ${COLORS.border}22`, alignItems:"center" }}>
                      <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{m.nombre}</div>
                      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{m.codigo||"—"}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <input type="number" min="1" value={m.cantidad}
                          onChange={e=>setMateriales(prev=>prev.map((x,i)=>i===idx?{...x,cantidad:Number(e.target.value)||1}:x))}
                          style={{ ...inp, width:60, padding:"4px 8px", fontSize:12 }} />
                        <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{m.unidad}</span>
                      </div>
                      <button onClick={()=>setMateriales(prev=>prev.filter((_,i)=>i!==idx))}
                        style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
                    </div>
                  ))}
                  <div style={{ marginTop:10, padding:"8px 12px", background:COLORS.card, borderRadius:8, fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                    {materiales.length} ítem{materiales.length!==1?"s":""} · {materiales.reduce((s,m)=>s+Number(m.cantidad||0),0)} unidades totales
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONFORMIDAD */}
          {tab==="conformidad" && (
            <div>
              {/* Valor confirmado */}
              <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16, marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Resumen del servicio</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div><label style={lbl}>Proveedor</label><div style={{ fontFamily:FONT_DISPLAY, fontSize:13, color:COLORS.text }}>{form.proveedor_nombre||"—"}</div></div>
                  <div><label style={lbl}>Valor del servicio</label><div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.green }}>{form.valor_servicio ? fmtClp(form.valor_servicio) : "No definido"}</div></div>
                  <div><label style={lbl}>Tipo</label><div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{form.tipo_servicio}{form.codigo_servicio&&<span style={{ color:TC, fontSize:10 }}> · {form.codigo_servicio}</span>}</div></div>
                  <div><label style={lbl}>Avance checklist</label><div style={{ fontFamily:FONT_DISPLAY, fontSize:13, color:pct===100?COLORS.green:COLORS.yellow }}>{pct}%</div></div>
                  {materiales.length>0 && <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Materiales entregados ({materiales.length})</label><div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{materiales.map(m=>`${m.nombre} ×${m.cantidad}`).join(" · ")}</div></div>}
                </div>
              </div>
              {/* Observaciones cierre */}
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>Observaciones de cierre</label>
                <textarea value={form.observaciones} onChange={e=>ff("observaciones",e.target.value)}
                  rows={3} placeholder="Trabajo realizado, materiales usados, recomendaciones…"
                  style={{ ...inp, resize:"vertical" }} />
              </div>
              {/* Firma cliente */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
                  Firma de conformidad del cliente
                </div>
                {firma.img ? (
                  <div style={{ textAlign:"center" }}>
                    <img src={firma.img} style={{ maxWidth:"100%", height:100, border:`1px solid ${COLORS.green}44`, borderRadius:8, background:"#fff" }} alt="firma" />
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:6 }}>{firma.nombre}</div>
                    <button onClick={()=>{ setFirma({img:null,nombre:""}); setFirmaMode(true); }}
                      style={{ marginTop:8, padding:"4px 12px", borderRadius:6, fontFamily:FONT, fontSize:10, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red }}>
                      Borrar firma
                    </button>
                  </div>
                ) : (
                  <div>
                    {!firmaMode ? (
                      <button onClick={()=>setFirmaMode(true)}
                        style={{ width:"100%", padding:"20px 0", background:`${TC}11`, border:`2px dashed ${TC}44`, borderRadius:10, fontFamily:FONT_DISPLAY, fontSize:13, color:TC, cursor:"pointer" }}>
                        ✍️ Capturar firma del cliente
                      </button>
                    ) : (
                      <div>
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:6 }}>El cliente firma directamente en pantalla:</div>
                        <canvas ref={canvasRef} width={680} height={120}
                          style={{ width:"100%", height:120, background:"#f0f0f0", borderRadius:8, cursor:"crosshair", touchAction:"none", border:`1px solid ${COLORS.border}` }}
                          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                        <input value={firma.nombre} onChange={e=>setFirma(p=>({...p,nombre:e.target.value}))}
                          placeholder="Nombre del firmante"
                          style={{ ...inp, marginTop:8 }} />
                        <div style={{ display:"flex", gap:8, marginTop:8 }}>
                          <button onClick={clearFirma} style={{ flex:1, padding:"8px 0", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:7, fontFamily:FONT, fontSize:12, color:COLORS.textMuted, cursor:"pointer" }}>🗑 Limpiar</button>
                          <button onClick={saveFirma} style={{ flex:2, padding:"8px 0", background:COLORS.green, border:"none", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer" }}>✓ Aceptar firma</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB HISTORIAL */}
          {tab==="historial" && (
            <div>
              {!historialLoaded ? (
                <div style={{ color:COLORS.textMuted, fontFamily:FONT, fontSize:13, textAlign:"center", padding:32 }}>Cargando historial…</div>
              ) : historial.length === 0 ? (
                <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:24, textAlign:"center" }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
                  <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.textMuted }}>
                    {form.cliente_nombre ? `Sin mantenciones previas registradas para ${form.cliente_nombre} · ${form.equipo_tipo}` : "Completa cliente y equipo para ver el historial"}
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>
                    {historial.length} mantención{historial.length!==1?"es":""} registrada{historial.length!==1?"s":""} · {form.equipo_tipo} · {form.cliente_nombre}
                  </div>
                  {historial.map((h,i)=>{
                    const eConf = ESTADO_OT[h.estado]||{ label:h.estado, color:COLORS.textMuted };
                    const hPct = h.checklist ? (() => {
                      const items = h.checklist.flatMap(s=>s.items||[]).filter(it=>it.estado!=="na");
                      const done  = items.filter(it=>it.estado==="ok"||it.estado==="ok_c");
                      return items.length ? Math.round(done.length/items.length*100) : 0;
                    })() : null;
                    return (
                      <div key={h.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"12px 16px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.accent }}>{h.numero_ot||`#${i+1}`}</span>
                            <span style={{ padding:"2px 8px", borderRadius:12, fontSize:10, fontWeight:700, background:`${eConf.color}22`, color:eConf.color }}>{eConf.label}</span>
                          </div>
                          <span style={{ fontFamily:"monospace", fontSize:11, color:COLORS.textMuted }}>
                            {h.fecha_programada ? new Date(h.fecha_programada+"T12:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"}) : "Sin fecha"}
                          </span>
                        </div>
                        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                          {h.proveedor_nombre && <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>👤 {h.proveedor_nombre}</span>}
                          {hPct !== null && (
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Checklist</span>
                              <div style={{ width:60, height:4, background:COLORS.border, borderRadius:2 }}>
                                <div style={{ width:`${hPct}%`, height:"100%", borderRadius:2, background:hPct===100?COLORS.green:COLORS.accent }} />
                              </div>
                              <span style={{ fontFamily:"monospace", fontSize:10, color:hPct===100?COLORS.green:COLORS.accent, fontWeight:700 }}>{hPct}%</span>
                            </div>
                          )}
                          {h.valor_servicio > 0 && <span style={{ fontFamily:"monospace", fontSize:11, color:COLORS.text }}>${Number(h.valor_servicio).toLocaleString("es-CL")}</span>}
                        </div>
                        {h.observaciones && (
                          <div style={{ marginTop:8, fontFamily:FONT, fontSize:11, color:COLORS.textMuted, background:COLORS.surface, borderRadius:6, padding:"6px 10px", borderLeft:`3px solid ${COLORS.border}` }}>
                            {h.observaciones}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer acciones */}
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${COLORS.border}`, display:"flex", gap:8, flexShrink:0, flexWrap:"wrap" }}>
          <button onClick={onClose} style={{ padding:"10px 16px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer" }}>Cancelar</button>
          <button onClick={()=>save("borrador")} disabled={saving}
            style={{ padding:"10px 16px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer" }}>
            {saving?"Guardando…":"Guardar borrador"}
          </button>
          <div style={{ flex:1 }} />
          {!isNew && firma.img && (
            <button onClick={()=>save("firmada")} disabled={saving}
              style={{ padding:"10px 20px", background:COLORS.green, border:"none", borderRadius:8, color:"#fff", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>
              ✓ Confirmar con firma
            </button>
          )}
          {!isNew && !firma.img && (
            <button onClick={()=>save(form.estado)} disabled={saving}
              style={{ padding:"10px 20px", background:`${TC}22`, border:`1px solid ${TC}`, borderRadius:8, color:TC, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer" }}>
              {saving?"Guardando…":"Guardar cambios"}
            </button>
          )}
          {isNew && (
            <button onClick={()=>save("pendiente")} disabled={saving||!form.actividad}
              style={{ padding:"10px 24px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer",
                opacity:!form.actividad?0.45:1 }}>
              {saving?"Generando…":"Generar OT"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

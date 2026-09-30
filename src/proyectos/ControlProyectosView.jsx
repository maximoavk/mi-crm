// Control de proyectos: avance, cobros y partidas de los costeos en ejecución.
import { useState, useEffect } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";
import { supabase } from "../supabaseClient.js";
import { calcFase, partidaCobrado } from "../calculos.js";
import { fmtDate, fmt } from "../shared/format.js";
import { Loader } from "../shared/ui.jsx";

// ── CONTROL DE PROYECTOS ─────────────────────────────────────────────────────
export function ControlProyectosView({ contacts }) {
  const [proyectos,   setProyectos]   = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null); // null | "new" | proyecto
  const [saving,      setSaving]      = useState(false);
  const [cotSearch,   setCotSearch]   = useState("");
  const [cotMatches,  setCotMatches]  = useState([]);

  const EMPTY = { nombre:"", cliente:"", rut_cliente:"", estado:"activo",
    numero_cotizacion:"", cotizacion_id:null, notas:"",
    fecha_inicio:"", fecha_fin:"" };
  const [form, setForm] = useState(EMPTY);
  const f = (k,v) => setForm(x=>({...x,[k]:v}));

  const ESTADO_COLORS = {
    activo:       { label:"Activo",       color:"#22c55e" },
    en_ejecucion: { label:"En Ejecución", color:"#06b6d4" },
    pausado:      { label:"Pausado",      color:"#f59e0b" },
    cerrado:      { label:"Cerrado",      color:COLORS.textMuted },
  };

  // Carga proyectos + enriquece con gantt y costeo
  const load = async () => {
    setLoading(true);
    const [{ data: pRows }, { data: gRows }, { data: tRows }, { data: cRows }, { data: costeoRows }] = await Promise.all([
      supabase.from("proyectos").select("*").order("created_at", { ascending: false }),
      supabase.from("gantt_proyectos").select("*"),
      supabase.from("gantt_tareas").select("id, gantt_id, pct_avance, nombre, tipo"),
      supabase.from("cotizaciones").select("id, numero, serie, nombre_cliente, razon_social, total, aplica_iva"),
      supabase.from("costeos").select("id, nombre, fases, partidas, proyecto_id, cotizacion"),
    ]);
    const tareasByGantt = (tRows||[]).reduce((acc,t)=>{ (acc[t.gantt_id]=acc[t.gantt_id]||[]).push(t); return acc; },{});
    const ganttByCot = (gRows||[]).reduce((acc,g)=>{ acc[g.numero_cotizacion]=g; return acc; },{});
    // Costeo desde Supabase (proyectoId → costeoRows.proyecto_id, cotizacion → costeoRows.cotizacion)
    const costeoProyectos = (costeoRows||[]).map(cp=>({ ...cp, proyectoId: cp.proyecto_id }));

    const enriched = (pRows||[]).map(p=>{
      const cot = (cRows||[]).find(c=>c.id===p.cotizacion_id || c.numero===p.numero_cotizacion);
      const gantt = p.numero_cotizacion ? ganttByCot[Number(p.numero_cotizacion)] : null;
      const tareas = gantt ? (tareasByGantt[gantt.id]||[]) : [];
      const totalT = tareas.length;
      const pctGantt = totalT > 0
        ? Math.round(tareas.reduce((s,t)=>s+Number(t.pct_avance||0),0)/totalT)
        : null;
      // Costeo vinculado (por proyectoId o por numero_cotizacion)
      const costeo = costeoProyectos.find(cp=>
        cp.proyectoId===p.id ||
        (p.numero_cotizacion && String(cp.cotizacion)===String(p.numero_cotizacion))
      );
      const fases = costeo ? (costeo.fases||[]).map(fase=>{
        const fc = calcFase(fase);
        return { id: fase.id, nombre: fase.nombre, ventaTotal: fc.ventaTotal,
          costoNeto: fc.costoNeto, estado: fase.estado||"pendiente" };
      }) : [];
      const totalVenta = fases.reduce((s,fa)=>s+fa.ventaTotal,0);
      const partidas   = costeo ? (costeo.partidas||[]) : [];
      const totalPartidas = partidas.reduce((s,pa)=>s+Number(pa.monto||0),0);
      const totalCobrado  = partidas.reduce((s,pa)=>s+partidaCobrado(pa),0);
      return {
        ...p, cot, gantt, tareas, totalT, pctGantt,
        fases, totalVenta, partidas, totalPartidas, totalCobrado,
        saldo: totalPartidas - totalCobrado,
      };
    });
    setProyectos(enriched);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  // Buscar cotización para autocompletar
  useEffect(()=>{
    if(!cotSearch || cotSearch.length < 1) { setCotMatches([]); return; }
    const buscar = async () => {
      const { data } = await supabase.from("cotizaciones")
        .select("id,numero,serie,nombre_cliente,razon_social,rut_cliente,total")
        .or(`numero.eq.${isNaN(cotSearch)?0:cotSearch},nombre_cliente.ilike.%${cotSearch}%,razon_social.ilike.%${cotSearch}%`)
        .limit(5);
      setCotMatches(data||[]);
    };
    buscar();
  },[cotSearch]);

  const saveProyecto = async () => {
    if(!form.nombre?.trim()) return alert("El nombre es obligatorio");
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(), cliente: form.cliente||"",
      rut_cliente: form.rut_cliente||"", estado: form.estado||"activo",
      numero_cotizacion: form.numero_cotizacion ? Number(form.numero_cotizacion) : null,
      cotizacion_id: form.cotizacion_id||null, notas: form.notas||"",
      fecha_inicio: form.fecha_inicio||null, fecha_fin: form.fecha_fin||null,
      updated_at: new Date().toISOString(),
    };
    if(modal==="new") {
      const { data: existing } = await supabase.from("proyectos").select("codigo").order("created_at",{ascending:false});
      let nextNum = 1;
      if(existing?.length) {
        const nums = existing.map(x=>{ const m=(x.codigo||"").match(/PR-(\d+)/); return m?parseInt(m[1]):0; });
        nextNum = Math.max(...nums)+1;
      }
      const codigo = `PR-${String(nextNum).padStart(6,"0")}`;
      const { data, error } = await supabase.from("proyectos").insert({...payload,codigo}).select().single();
      if(error){ alert("Error: "+error.message); setSaving(false); return; }
      if(data) { await load(); setSelected(data.id); }
    } else {
      const { data, error } = await supabase.from("proyectos").update(payload).eq("id",modal.id).select().single();
      if(error){ alert("Error: "+error.message); setSaving(false); return; }
      await load();
    }
    setSaving(false);
    setModal(null);
  };

  const updateFaseEstado = async (proyId, faseId, nuevoEstado) => {
    const pr = proyectos.find(p=>p.id===proyId);
    if(!pr) return;
    const { data: cRows } = await supabase.from("costeos").select("id, fases")
      .or(`proyecto_id.eq.${proyId}${pr.numero_cotizacion?`,cotizacion.eq.${pr.numero_cotizacion}`:""}`);
    const costeo = (cRows||[])[0];
    if(costeo){
      const fasesActualizadas = (costeo.fases||[]).map(fa=>fa.id===faseId?{...fa,estado:nuevoEstado}:fa);
      await supabase.from("costeos").update({ fases: fasesActualizadas, updated_at: new Date().toISOString() }).eq("id", costeo.id);
    }
    setProyectos(prev=>prev.map(p=>{
      if(p.id!==proyId) return p;
      return { ...p, fases: p.fases.map(fa=>fa.id===faseId?{...fa,estado:nuevoEstado}:fa) };
    }));
  };

  const inp = { width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
    borderRadius:6, padding:"8px 12px", fontFamily:FONT, fontSize:13,
    color:COLORS.text, outline:"none", boxSizing:"border-box" };

  const proySeleccionado = proyectos.find(p=>p.id===selected);

  // ── DETALLE ────────────────────────────────────────────────────────────────
  if(proySeleccionado) {
    const pr = proySeleccionado;
    const ec = ESTADO_COLORS[pr.estado]||ESTADO_COLORS.activo;
    const pctGantt = pr.pctGantt ?? 0;
    const pctCobro = pr.totalPartidas > 0 ? Math.round((pr.totalCobrado/pr.totalPartidas)*100) : 0;

    return (
      <div>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
          <div>
            <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12, marginBottom:4 }}>← Volver</button>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>{pr.codigo}</div>
            <div style={{ fontFamily:FONT, fontSize:14, color:COLORS.textMuted }}>{pr.nombre}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ padding:"4px 12px", borderRadius:20, background:ec.color+"22", border:`1px solid ${ec.color}44`, fontFamily:FONT, fontSize:12, color:ec.color, fontWeight:600 }}>{ec.label}</div>
            <button onClick={()=>{ setForm({...pr, numero_cotizacion:pr.numero_cotizacion||"", fecha_inicio:pr.fecha_inicio||"", fecha_fin:pr.fecha_fin||""}); setCotSearch(pr.numero_cotizacion||""); setModal(pr); }}
              style={{ padding:"6px 16px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>✏️ Editar</button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14, marginBottom:16 }}>
          {/* Info cliente */}
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Cliente</div>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text, marginBottom:4 }}>{pr.cliente||pr.cot?.nombre_cliente||"—"}</div>
            <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{pr.rut_cliente||"—"}</div>
            {(pr.fecha_inicio||pr.fecha_fin) && (
              <div style={{ marginTop:10, display:"flex", gap:12 }}>
                {pr.fecha_inicio && <div><div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>INICIO</div><div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{fmtDate(pr.fecha_inicio)}</div></div>}
                {pr.fecha_fin && <div><div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>TÉRMINO</div><div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{fmtDate(pr.fecha_fin)}</div></div>}
              </div>
            )}
            {pr.cot && (
              <div style={{ marginTop:10, padding:"6px 10px", background:COLORS.bg, borderRadius:6, fontFamily:FONT, fontSize:11, color:COLORS.accent }}>
                📄 {pr.cot.serie||"COT"}-{String(pr.cot.numero).padStart(3,"0")} · {fmt(pr.cot.total||0)}
              </div>
            )}
          </div>

          {/* % Avance Gantt */}
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Avance Gantt</div>
            {pr.totalT > 0 ? (<>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>{pr.totalT} tareas</span>
                <span style={{ fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, color:pctGantt>=100?COLORS.green:pctGantt>=50?COLORS.accent:COLORS.yellow }}>{pctGantt}%</span>
              </div>
              <div style={{ background:COLORS.bg, borderRadius:20, height:10, overflow:"hidden" }}>
                <div style={{ width:`${pctGantt}%`, height:"100%", borderRadius:20, background:pctGantt>=100?COLORS.green:pctGantt>=50?COLORS.accent:COLORS.yellow, transition:"width 0.4s" }}/>
              </div>
              {/* Mini lista por tipo */}
              {["planificacion","ejecucion","cierre"].map(tipo=>{
                const tt = pr.tareas.filter(t=>t.tipo===tipo);
                if(!tt.length) return null;
                const pct = Math.round(tt.reduce((s,t)=>s+Number(t.pct_avance||0),0)/tt.length);
                return (
                  <div key={tipo} style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                    <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"capitalize" }}>{tipo}</span>
                    <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}>{pct}% ({tt.length})</span>
                  </div>
                );
              })}
            </>) : (
              <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, padding:"10px 0" }}>Sin Gantt vinculado a COT-{pr.numero_cotizacion||"?"}</div>
            )}
          </div>

          {/* Resumen financiero */}
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Financiero</div>
            {[
              { label:"Cotizado", val: pr.cot?.total||pr.totalVenta, color:COLORS.text },
              { label:"Cobrado",  val: pr.totalCobrado, color:COLORS.green },
              { label:"Saldo",    val: pr.saldo, color:pr.saldo>0?COLORS.yellow:COLORS.green },
            ].map(({label,val,color})=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{label}</span>
                <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color }}>{fmt(val||0)}</span>
              </div>
            ))}
            {pr.totalPartidas > 0 && (<>
              <div style={{ background:COLORS.bg, borderRadius:20, height:8, overflow:"hidden", marginTop:4 }}>
                <div style={{ width:`${pctCobro}%`, height:"100%", borderRadius:20, background:COLORS.green, transition:"width 0.4s" }}/>
              </div>
              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginTop:4, textAlign:"right" }}>{pctCobro}% cobrado</div>
            </>)}
          </div>
        </div>

        {/* Fases del Proyecto */}
        {pr.fases.length > 0 && (
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16, marginBottom:16 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Fases del Proyecto</div>
            <div style={{ display:"grid", gap:8 }}>
              {pr.fases.map(fa=>{
                const FASE_ESTADOS = [
                  { k:"pendiente",   label:"Pendiente",   color:COLORS.textMuted },
                  { k:"en_curso",    label:"En Curso",    color:COLORS.accent },
                  { k:"terminado",   label:"Terminado",   color:COLORS.green },
                ];
                const est = FASE_ESTADOS.find(e=>e.k===fa.estado)||FASE_ESTADOS[0];
                return (
                  <div key={fa.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:COLORS.bg, borderRadius:8, border:`1px solid ${COLORS.border}` }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>{fa.nombre}</div>
                      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{fmt(fa.ventaTotal)}</div>
                    </div>
                    {/* Selector estado manual/automático */}
                    <div style={{ display:"flex", gap:4 }}>
                      {FASE_ESTADOS.map(e=>(
                        <button key={e.k} onClick={()=>updateFaseEstado(pr.id, fa.id, e.k)}
                          style={{ padding:"3px 10px", borderRadius:20, fontFamily:FONT, fontSize:10, fontWeight:600,
                            cursor:"pointer", border:`1px solid ${fa.estado===e.k?e.color:COLORS.border}`,
                            background:fa.estado===e.k?e.color+"22":"transparent",
                            color:fa.estado===e.k?e.color:COLORS.textMuted }}>
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notas */}
        {pr.notas && (
          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 }}>
            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Notas</div>
            <div style={{ fontFamily:FONT, fontSize:13, color:COLORS.text, whiteSpace:"pre-wrap" }}>{pr.notas}</div>
          </div>
        )}
      </div>
    );
  }

  // ── LISTA ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>Proyectos</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Control de Proyectos</div>
        </div>
        <button onClick={()=>{ setForm(EMPTY); setCotSearch(""); setCotMatches([]); setModal("new"); }}
          style={{ padding:"10px 20px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
          + Nuevo Proyecto
        </button>
      </div>

      {loading ? <Loader /> : (<>
        {proyectos.length===0 && <div style={{ textAlign:"center", color:COLORS.textMuted, fontFamily:FONT, padding:60 }}>Sin proyectos. ¡Crea el primero!</div>}
        <div style={{ display:"grid", gap:12 }}>
          {proyectos.map(pr=>{
            const ec = ESTADO_COLORS[pr.estado]||ESTADO_COLORS.activo;
            const pctGantt = pr.pctGantt ?? null;
            const pctCobro = pr.totalPartidas > 0 ? Math.round((pr.totalCobrado/pr.totalPartidas)*100) : null;
            return (
              <div key={pr.id} onClick={()=>setSelected(pr.id)}
                style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`,
                  borderLeft:`3px solid ${ec.color}`, borderRadius:10,
                  padding:"16px 20px", cursor:"pointer", transition:"border-color 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=COLORS.accent}
                onMouseLeave={e=>e.currentTarget.style.borderColor=COLORS.border}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.accent }}>{pr.codigo}</span>
                      <div style={{ padding:"2px 8px", borderRadius:10, background:ec.color+"22", border:`1px solid ${ec.color}44`, fontFamily:FONT, fontSize:10, color:ec.color }}>{ec.label}</div>
                      {pr.cot && <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>📄 {pr.cot.serie||"COT"}-{String(pr.cot.numero).padStart(3,"0")}</div>}
                    </div>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:600, color:COLORS.text, marginBottom:2 }}>{pr.nombre}</div>
                    <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{pr.cliente} {pr.fecha_inicio?`· Inicio: ${fmtDate(pr.fecha_inicio)}`:""}</div>
                  </div>
                  <div style={{ display:"flex", gap:20, flexShrink:0 }}>
                    {pctGantt !== null && (
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:2 }}>GANTT</div>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:pctGantt>=100?COLORS.green:pctGantt>=50?COLORS.accent:COLORS.yellow }}>{pctGantt}%</div>
                      </div>
                    )}
                    {pctCobro !== null && (
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:2 }}>COBRO</div>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.green }}>{pctCobro}%</div>
                      </div>
                    )}
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:2 }}>COTIZADO</div>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>{fmt(pr.cot?.total||pr.totalVenta||0)}</div>
                    </div>
                  </div>
                </div>
                {/* Barra Gantt mini */}
                {pctGantt !== null && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ background:COLORS.bg, borderRadius:20, height:4, overflow:"hidden" }}>
                      <div style={{ width:`${pctGantt}%`, height:"100%", borderRadius:20,
                        background:pctGantt>=100?COLORS.green:pctGantt>=50?COLORS.accent:COLORS.yellow }}/>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>)}

      {/* Modal nuevo/editar */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:28, width:"100%", maxWidth:540, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text, marginBottom:20 }}>
              {modal==="new" ? "Nuevo Proyecto" : `Editar ${modal.codigo}`}
            </div>
            <div style={{ display:"grid", gap:12 }}>
              {/* Nombre */}
              <div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Nombre del Proyecto *</div>
                <input value={form.nombre} onChange={e=>f("nombre",e.target.value)} placeholder="Ej: Sistema CCTV Condominio..." style={inp}/>
              </div>
              {/* Cotización vinculada */}
              <div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Cotización Vinculada (N°)</div>
                <input value={cotSearch} onChange={e=>{ setCotSearch(e.target.value); f("numero_cotizacion",e.target.value); }}
                  placeholder="Ej: 81 o nombre cliente..." style={inp}/>
                {cotMatches.length > 0 && (
                  <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:6, marginTop:4 }}>
                    {cotMatches.map(c=>(
                      <div key={c.id} onMouseDown={()=>{
                        f("numero_cotizacion", c.numero);
                        f("cotizacion_id", c.id);
                        f("cliente", c.razon_social||c.nombre_cliente||"");
                        setCotSearch(String(c.numero));
                        setCotMatches([]);
                      }} style={{ padding:"8px 12px", cursor:"pointer", fontFamily:FONT, fontSize:12, color:COLORS.text,
                        borderBottom:`1px solid ${COLORS.border}22` }}
                        onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        ✓ {c.serie||"COT"}-{String(c.numero).padStart(3,"0")} — {c.razon_social||c.nombre_cliente} · {fmt(c.total||0)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Cliente + RUT */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Cliente</div>
                  <input value={form.cliente} onChange={e=>f("cliente",e.target.value)} placeholder="Nombre o razón social" style={inp}/>
                </div>
                <div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>RUT Cliente</div>
                  <input value={form.rut_cliente} onChange={e=>f("rut_cliente",e.target.value)} placeholder="Ej: 65.066.845-6" style={inp}/>
                </div>
              </div>
              {/* Fechas */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Fecha Inicio</div>
                  <input type="date" value={form.fecha_inicio||""} onChange={e=>f("fecha_inicio",e.target.value)} style={inp}/>
                </div>
                <div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Fecha Término</div>
                  <input type="date" value={form.fecha_fin||""} onChange={e=>f("fecha_fin",e.target.value)} style={inp}/>
                </div>
              </div>
              {/* Estado */}
              <div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Estado</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {Object.entries(ESTADO_COLORS).map(([k,{label,color}])=>(
                    <button key={k} onClick={()=>f("estado",k)}
                      style={{ padding:"6px 14px", borderRadius:20, fontFamily:FONT, fontSize:11, fontWeight:600,
                        cursor:"pointer", border:`1px solid ${form.estado===k?color:COLORS.border}`,
                        background:form.estado===k?color+"22":"transparent",
                        color:form.estado===k?color:COLORS.textMuted }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Notas */}
              <div>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Notas</div>
                <textarea value={form.notas} onChange={e=>f("notas",e.target.value)} rows={3}
                  placeholder="Observaciones, alcance, condiciones..." style={{...inp, resize:"vertical"}}/>
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
              <button onClick={()=>setModal(null)} style={{ padding:"9px 20px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={saveProyecto} disabled={saving} style={{ padding:"9px 24px", background:COLORS.accent, border:"none", borderRadius:6, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                {saving ? "Guardando…" : modal==="new" ? "Crear Proyecto" : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

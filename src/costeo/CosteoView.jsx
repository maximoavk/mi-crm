// ── COSTEO DE PROYECTOS ──────────────────────────────────────────────────────
import React, { useState, useEffect } from "react";
import { pdf } from "@react-pdf/renderer";
import { supabase } from "../supabaseClient.js";
import { mapCosteo, mapCosteoToDb } from "./mappers.js";
import { mapProduct } from "../shared/mappers.js";
import { syncPartidasConFases, calcFase, redondearTotal, partidaCobrado, codigosPorFase, IVA, totalCotizacion } from "../calculos.js";
import { FONT_DISPLAY, COLORS, FONT } from "../theme.js";
import { fetchImageAsDataUri, CosteoInternoDoc, CosteoClienteDoc } from "../CosteoPdfDocs.jsx";
import { LOGO_PRINT } from "../shared/assets.js";
import { fmt } from "../shared/format.js";
import { RUBRO_OPTIONS, TIPO_TRABAJO_OPTIONS } from "../shared/constants.js";
import { TotBox, FaseBlock, PartidaRow } from "./FaseBlock.jsx";
import { HistorialCambiosTab } from "./HistorialCambios.jsx";
import { DesignProjectsPanel } from "../design/DesignProjectsPanel.jsx";
import { PdfPreviewModal } from "../shared/ui.jsx";

export function CosteoView({ contacts, openId, onOpenIdHandled, onOpenDesign }) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState("costeo");
  const [rutSearch, setRutSearch] = useState("");
  const [rutMatches, setRutMatches] = useState([]);
  const [productos, setProductos] = useState([]);
  const [quoteMap, setQuoteMap] = useState({}); // cotizacion_id → { numero, serie }
  const [genModal, setGenModal] = useState(false);
  const [genTipo, setGenTipo] = useState("fases");
  const [genSaving, setGenSaving] = useState(false);
  const [genDone, setGenDone] = useState(null);
  const [syncModal, setSyncModal] = useState(false);
  const [syncPreview, setSyncPreview] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSaving, setSyncSaving] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [versionModal, setVersionModal] = useState(false);
  const [versionNota, setVersionNota] = useState("");
  const [versionSaving, setVersionSaving] = useState(false);
  const [versionSavedNum, setVersionSavedNum] = useState(null);
  const [search, setSearch] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved
  const [localBackup, setLocalBackup] = useState(null); // proyectos sin sincronizar de este navegador
  const [importing, setImporting] = useState(false);
  const saveTimers = React.useRef({});
  const proyectosRef = React.useRef([]);
  React.useEffect(()=>{ proyectosRef.current = proyectos; },[proyectos]);

  const loadCosteos = async () => {
    const { data } = await supabase.from("costeos").select("*").order("created_at",{ascending:false});
    setProyectos((data||[]).map(mapCosteo));
    setLoading(false);
  };

  useEffect(()=>{
    loadCosteos();
    // Detecta proyectos guardados en localStorage de ESTE navegador (de antes de Supabase,
    // o de un navegador/PC que nunca se sincronizó) para ofrecer importarlos.
    let local = [];
    try { local = JSON.parse(localStorage.getItem("costeo_proyectos")||"[]"); } catch{}
    if(local.length > 0) setLocalBackup(local);
    // Cargar catálogo desde Supabase
    supabase.from("products").select("*").then(({data})=>{
      if(data) setProductos(data.map(mapProduct));
    });
    // Mapa liviano de cotizaciones para resolver serie/número reales en el listado
    supabase.from("cotizaciones").select("id,numero,serie").then(({data})=>{
      if(data){
        const map = {};
        data.forEach(q=>{ map[q.id] = { numero:q.numero, serie:q.serie||"COT" }; });
        setQuoteMap(map);
      }
    });
  },[]);

  // Si llega un proyecto a abrir desde otro módulo (ej. link "Ver costeo origen" en Cotizar), lo selecciona.
  useEffect(()=>{
    if(!openId || proyectos.length===0) return;
    if(proyectos.some(p=>p.id===openId)) setSelected(openId);
    if(onOpenIdHandled) onOpenIdHandled();
  },[openId, proyectos]);

  const importLocalBackup = async () => {
    if(!localBackup || localBackup.length===0) return;
    setImporting(true);
    const contactIds = new Set(contacts.map(c=>c.id));
    // clienteId/proyectoId de datos viejos pueden apuntar a un contacto/proyecto ya borrado
    // o inexistente en este entorno: se descartan para no violar la FK y perder toda la importación.
    const rows = localBackup.map(p => mapCosteoToDb({
      ...p,
      clienteId: contactIds.has(p.clienteId) ? p.clienteId : null,
      proyectoId: null,
    }));
    const { error } = await supabase.from("costeos").insert(rows);
    if(error){ alert("Error al importar: "+error.message); setImporting(false); return; }
    localStorage.removeItem("costeo_proyectos");
    setLocalBackup(null);
    await loadCosteos();
    setImporting(false);
  };

  useEffect(()=>{
    return () => {
      Object.keys(saveTimers.current).forEach(id=>{
        clearTimeout(saveTimers.current[id]);
        const p = proyectosRef.current.find(x=>String(x.id)===String(id));
        if(p) supabase.from("costeos").update(mapCosteoToDb(p)).eq("id", p.id).then(()=>{});
      });
    };
  },[]);

  const persistNow = async (p) => {
    setSaveStatus("saving");
    const { error } = await supabase.from("costeos").update(mapCosteoToDb(p)).eq("id", p.id);
    setSaveStatus(error ? "idle" : "saved");
  };

  const scheduleSave = (p) => {
    clearTimeout(saveTimers.current[p.id]);
    saveTimers.current[p.id] = setTimeout(()=>{ delete saveTimers.current[p.id]; persistNow(p); }, 700);
  };

  const flushPending = (id) => {
    if(saveTimers.current[id]){
      clearTimeout(saveTimers.current[id]);
      delete saveTimers.current[id];
      const p = proyectosRef.current.find(x=>x.id===id);
      if(p) persistNow(p);
    }
  };

  const newProyecto = async () => {
    const draft = { nombre:"Nuevo Proyecto", cliente:"", fecha: new Date().toISOString().slice(0,10), fases:[], partidas:[] };
    const { data, error } = await supabase.from("costeos").insert(mapCosteoToDb(draft)).select().single();
    if(error){ alert("Error al crear proyecto: "+error.message); return; }
    const p = mapCosteo(data);
    setProyectos(prev=>[p, ...prev]);
    setSelected(p.id);
  };

  const updateProyecto = (p) => {
    setProyectos(prev => prev.map(x=>x.id===p.id?p:x));
    scheduleSave(p);
  };
  const deleteProyecto = async (id) => {
    const { error } = await supabase.from("costeos").delete().eq("id", id); if(error) return;
    clearTimeout(saveTimers.current[id]); delete saveTimers.current[id];
    setProyectos(prev => prev.filter(x=>x.id!==id));
    if(selected===id) setSelected(null);
  };
  const duplicateProyecto = async (p, e) => {
    e.stopPropagation();
    const copia = {
      nombre: `${p.nombre} (copia)`,
      cliente: p.cliente, clienteNombre: p.clienteNombre, clienteEmpresa: p.clienteEmpresa,
      clienteRut: p.clienteRut, clienteTelefono: p.clienteTelefono, clienteDireccion: p.clienteDireccion,
      clienteId: p.clienteId,
      fecha: new Date().toISOString().slice(0,10),
      fases: (p.fases||[]).map(f=>({ ...f, id: Date.now()+Math.random(), items:(f.items||[]).map(it=>({...it, id:Math.random().toString(36).slice(2)})) })),
      partidas: (p.partidas||[]).map(pa=>({...pa, id: Date.now()+Math.random()}))
    };
    const { data, error } = await supabase.from("costeos").insert(mapCosteoToDb(copia)).select().single();
    if(error){ alert("Error al duplicar proyecto: "+error.message); return; }
    setProyectos(prev=>[mapCosteo(data), ...prev]);
  };

  const proyecto = proyectos.find(p=>p.id===selected);

  // Resincroniza el monto de las partidas vinculadas a una fase cada vez que el
  // costeo de esa fase cambia, para que nunca quede un monto viejo guardado.
  useEffect(() => {
    if(!proyecto) return;
    const synced = syncPartidasConFases(proyecto.partidas||[], proyecto.fases||[]);
    if(synced !== proyecto.partidas) updateProyecto({ ...proyecto, partidas: synced });
  }, [proyecto?.fases, proyecto?.partidas]);

  const addFase = () => {
    const f = { id: Date.now(), nombre:`Fase ${(proyecto.fases||[]).length+1}`, items:[] };
    updateProyecto({ ...proyecto, fases:[...(proyecto.fases||[]),f] });
  };
  const updateFase = (f) => updateProyecto({ ...proyecto, fases: proyecto.fases.map(x=>x.id===f.id?f:x) });
  const deleteFase = (id) => updateProyecto({ ...proyecto, fases: proyecto.fases.filter(x=>x.id!==id) });
  const duplicateFase = (fase) => {
    const newId = Date.now().toString();
    const copia = {
      ...fase,
      id: newId,
      nombre: `${fase.nombre} (copia)`,
      items: (fase.items||[]).map(it=>({ ...it, id: Math.random().toString(36).slice(2) }))
    };
    updateProyecto({ ...proyecto, fases: [...proyecto.fases, copia] });
  };

  const addPartida = () => {
    const p = { id: Date.now(), concepto:"", faseId:"", monto:0, pctAnticipo:50, pctParcial:0, pctFinalizar:50, pctAvance:0, montoCobrado:0 };
    updateProyecto({ ...proyecto, partidas:[...(proyecto.partidas||[]),p] });
  };
  // Recibe un parche (solo los campos que cambiaron), no el objeto completo —
  // así se aplica siempre sobre el estado más fresco de proyecto.partidas, sin
  // riesgo de que un PartidaRow con un `partida` prop un frame viejo pise de
  // vuelta un campo que otro input acababa de actualizar (carrera clásica de
  // "spread del objeto completo desde un closure obsoleto").
  const updatePartida = (id, patch) => updateProyecto({ ...proyecto, partidas: proyecto.partidas.map(x=>x.id===id?{...x,...patch}:x) });
  const deletePartida = (id) => updateProyecto({ ...proyecto, partidas: proyecto.partidas.filter(x=>x.id!==id) });

  // Totales globales
  const fasesCalc = proyecto ? (proyecto.fases||[]).map(calcFase) : [];
  const totalCosto        = fasesCalc.reduce((s,f)=>s+f.costoNeto,0);
  const totalCostoBruto   = fasesCalc.reduce((s,f)=>s+f.costoBruto,0);
  const totalIvaCompra    = fasesCalc.reduce((s,f)=>s+f.ivaCompra,0);
  const totalMargen       = fasesCalc.reduce((s,f)=>s+f.margenTotal,0);
  const totalVentaNeta    = fasesCalc.reduce((s,f)=>s+f.ventaNeta,0);
  const totalIVA          = fasesCalc.reduce((s,f)=>s+(f.ivaTotal||0),0);
  const totalVentaBruta   = fasesCalc.reduce((s,f)=>s+f.ventaBruta,0);
  const totalIvaNetoSII   = totalIVA - totalIvaCompra; // débito - crédito fiscal
  const totalDescuento    = fasesCalc.reduce((s,f)=>s+(f.descMonto||0),0);
  const totalVentaNetaConDesc = fasesCalc.reduce((s,f)=>s+f.ventaNetaConDesc,0); // neto ya con descuento aplicado
  const totalIvaConDesc   = fasesCalc.reduce((s,f)=>s+f.ivaConDesc,0); // IVA calculado sobre ese neto con descuento
  const totalVentaFinal   = redondearTotal(fasesCalc.reduce((s,f)=>s+f.ventaConDesc,0)); // con descuento aplicado, redondeo chileno (Ley 20.956)
  const hayDescuento      = totalDescuento > 0;
  const margenPct = totalCosto > 0 ? (totalMargen/totalCosto*100).toFixed(1) : 0;
  const margenFinalBruto  = totalVentaFinal - totalCostoBruto; // margen post-descuento (venta final - costo bruto)
  const margenFinalPct    = totalCostoBruto > 0 ? (margenFinalBruto/totalCostoBruto*100).toFixed(1) : 0;
  // Margen neto post-descuento (venta neta con descuento - costo neto), misma base
  // "neto sobre costo neto" que totalMargen/margenPct — para que la tarjeta
  // "Margen Total" se actualice sola al aplicar un descuento de fase.
  const totalMargenConDesc = totalVentaNetaConDesc - totalCosto;
  const margenConDescPct   = totalCosto > 0 ? (totalMargenConDesc/totalCosto*100).toFixed(1) : 0;

  // Totales partidas
  const partidas = proyecto?.partidas||[];
  const totalPartidas = partidas.reduce((s,p)=>s+Number(p.monto),0);
  const totalAnticipo = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAnticipo)||0)/100),0);
  const totalParcial = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctParcial)||0)/100),0);
  const totalFinalizar = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctFinalizar)||0)/100),0);
  const totalCobrado = partidas.reduce((s,p)=>s+partidaCobrado(p),0);
  const totalSaldo = totalPartidas - totalCobrado;
  const saldoPct = totalPartidas > 0 ? Math.round((totalSaldo/totalPartidas)*100) : 0;

  // Lista de proyectos
  if(!selected) return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Proyectos</div>
        </div>
        <button onClick={newProyecto} style={{ padding:"10px 20px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Nuevo Proyecto</button>
      </div>
      {localBackup && localBackup.length>0 && (
        <div style={{ background:`${COLORS.yellow}15`, border:`1px solid ${COLORS.yellow}44`, borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.text }}>
            📥 Se encontraron <strong>{localBackup.length}</strong> proyecto{localBackup.length===1?"":"s"} de costeo guardados en este navegador que aún no están en la nube.
          </div>
          <button onClick={importLocalBackup} disabled={importing}
            style={{ padding:"8px 16px", background:COLORS.accent, border:"none", borderRadius:7, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:importing?"default":"pointer", opacity:importing?0.6:1 }}>
            {importing?"Importando…":"Importar a la nube"}
          </button>
        </div>
      )}
      <input
        value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Buscar por nombre o cliente..."
        style={{ width:"100%", padding:"10px 14px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.text, fontFamily:FONT, fontSize:13, marginBottom:16, boxSizing:"border-box", outline:"none" }}
      />
      {loading && <div style={{ textAlign:"center", color:COLORS.textMuted, fontFamily:FONT, padding:60 }}>Cargando…</div>}
      {!loading && proyectos.length===0 && <div style={{ textAlign:"center", color:COLORS.textMuted, fontFamily:FONT, padding:60 }}>Sin proyectos. ¡Crea el primero!</div>}
      <div style={{ display:"grid", gap:12 }}>
        {proyectos.filter(p=>{
          const q = search.toLowerCase();
          return !q || (p.nombre||"").toLowerCase().includes(q) || (p.cliente||"").toLowerCase().includes(q) || (p.clienteNombre||"").toLowerCase().includes(q) || (p.clienteEmpresa||"").toLowerCase().includes(q) || (p.cotizacion||"").includes(q);
        }).sort((a,b)=>{
          const an = a.cotizacion ? Number(a.cotizacion) : null;
          const bn = b.cotizacion ? Number(b.cotizacion) : null;
          if(an!=null || bn!=null){
            if(an==null) return 1;   // sin cotizar → al final
            if(bn==null) return -1;
            if(an!==bn) return bn-an; // cotización más reciente primero
          }
          return (b.fecha||"").localeCompare(a.fecha||""); // entre iguales, fecha más reciente primero
        }).map(p=>{
          const fc = (p.fases||[]).map(calcFase);
          // ventaConDesc/ventaNetaConDesc ya incluyen el descuento de fase aplicado
          // (y colapsan al valor sin descuento cuando descPct=0), a diferencia de
          // ventaTotal/margenTotal que siempre muestran el valor previo al descuento.
          const tc = fc.reduce((s,f)=>s+f.costoTotal,0);
          const tv = Math.round(fc.reduce((s,f)=>s+f.ventaConDesc,0));
          const tm = Math.round(fc.reduce((s,f)=>s+f.ventaNetaConDesc,0) - tc);
          const qInfo = p.cotizacionId ? quoteMap[p.cotizacionId] : null;
          const codigoCot = qInfo ? `${qInfo.serie}-${String(qInfo.numero).padStart(3,"0")}`
            : (p.cotizacion ? `COT-${String(p.cotizacion).padStart(3,"0")}` : null); // fallback proyectos legacy sin cotizacion_id
          return (
            <div key={p.id} style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"16px 20px", display:"flex", alignItems:"center", gap:16, cursor:"pointer" }} onClick={()=>setSelected(p.id)}>
              <div style={{ flex:1 }}>
                {codigoCot && (
                  <span style={{ display:"inline-block", fontFamily:FONT, fontSize:10, fontWeight:700, color:COLORS.accent, background:`${COLORS.accent}18`, border:`1px solid ${COLORS.accent}33`, borderRadius:5, padding:"2px 7px", marginBottom:5 }}>
                    {codigoCot}
                  </span>
                )}
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>
                  {p.nombre}
                </div>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{p.cliente} · {p.fecha}</div>
              </div>
              <div style={{ display:"flex", gap:20 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>COSTO</div>
                  <div style={{ fontFamily:FONT, fontSize:13, fontWeight:600, color:COLORS.text }}>${tc.toLocaleString("es-CL")}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.green }}>MARGEN</div>
                  <div style={{ fontFamily:FONT, fontSize:13, fontWeight:600, color:COLORS.green }}>${tm.toLocaleString("es-CL")}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent }}>VENTA</div>
                  <div style={{ fontFamily:FONT, fontSize:13, fontWeight:600, color:COLORS.accent }}>${tv.toLocaleString("es-CL")}</div>
                </div>
              </div>
              <button onClick={e=>duplicateProyecto(p,e)} title="Duplicar proyecto" style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:15, padding:"0 4px" }}>⧉</button>
              <button onClick={e=>{e.stopPropagation();deleteProyecto(p.id);}} style={{ background:"none", border:"none", color:COLORS.red, cursor:"pointer", fontSize:16 }}>×</button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const searchRut = (val) => {
    setRutSearch(val);
    if(val.length < 3) { setRutMatches([]); return; }
    const q = val.toLowerCase().replace(/[.\-]/g,"");
    const found = contacts.filter(c => {
      const rut = (c.rut||"").toLowerCase().replace(/[.\-]/g,"");
      const name = (c.name||"").toLowerCase();
      const company = (c.company||"").toLowerCase();
      return rut.includes(q) || name.includes(q) || company.includes(q);
    });
    setRutMatches(found.slice(0,5));
  };

  const selectContacto = (c) => {
    const addr = c.address ? [c.address.calle, c.address.comuna, c.address.region].filter(Boolean).join(", ") : "";
    updateProyecto({ ...proyecto, clienteNombre:c.name, clienteEmpresa:c.company, clienteRut:c.rut||"", clienteTelefono:c.phone||"", clienteDireccion:addr, clienteId:c.id });
    setRutSearch(""); setRutMatches([]);
  };

  // PDF Interno — muestra todo: bruto, neto, IVA, margen, venta neta y bruta
  const printInterno = async () => {
    const fases = (proyecto.fases || []).map(calcFase);
    const codigosPorFaseArr = fases.map((f, fi) => codigosPorFase(f.items, fi));
    const totales = {
      costo: fases.reduce((s, f) => s + f.costoNeto, 0),
      margen: fases.reduce((s, f) => s + f.margenTotal, 0),
      margenPct: (() => { const c = fases.reduce((s, f) => s + f.costoNeto, 0); const m = fases.reduce((s, f) => s + f.margenTotal, 0); return c > 0 ? (m / c * 100).toFixed(1) : "0"; })(),
      ventaNeta: fases.reduce((s, f) => s + f.ventaNeta, 0),
      ventaBruta: fases.reduce((s, f) => s + f.ventaBruta, 0),
      descuento: fases.reduce((s, f) => s + (f.descMonto || 0), 0),
      ventaNetaConDesc: fases.reduce((s, f) => s + f.ventaNetaConDesc, 0),
      ivaConDesc: fases.reduce((s, f) => s + f.ivaConDesc, 0),
      ventaFinal: redondearTotal(fases.reduce((s, f) => s + f.ventaConDesc, 0)),
    };
    let logoDataUri = null;
    try { logoDataUri = await fetchImageAsDataUri(LOGO_PRINT); } catch { /* el documento se genera igual, sin logo */ }
    const blob = await pdf(<CosteoInternoDoc proyecto={proyecto} fasesCalc={fases} codigosPorFaseArr={codigosPorFaseArr} totales={totales} logoDataUri={logoDataUri} />).toBlob();
    const url = URL.createObjectURL(blob);
    setPdfPreviewUrl(url);
  };

  // PDF Cliente — solo venta neta + IVA, sin costos ni márgenes
  const printCliente = async () => {
    const fases = (proyecto.fases || []).map(calcFase);
    const codigosPorFaseArr = fases.map((f, fi) => codigosPorFase(f.items, fi));
    const totales = {
      ventaNeta: fases.reduce((s, f) => s + f.ventaNeta, 0),
      ventaBruta: fases.reduce((s, f) => s + f.ventaBruta, 0),
      descuento: fases.reduce((s, f) => s + (f.descMonto || 0), 0),
      ventaNetaConDesc: fases.reduce((s, f) => s + f.ventaNetaConDesc, 0),
      ivaConDesc: fases.reduce((s, f) => s + f.ivaConDesc, 0),
      ventaFinal: redondearTotal(fases.reduce((s, f) => s + f.ventaConDesc, 0)),
    };
    let logoDataUri = null;
    try { logoDataUri = await fetchImageAsDataUri(LOGO_PRINT); } catch { /* el documento se genera igual, sin logo */ }
    const blob = await pdf(<CosteoClienteDoc proyecto={proyecto} fasesCalc={fases} codigosPorFaseArr={codigosPorFaseArr} totales={totales} partidas={proyecto.partidas || []} logoDataUri={logoDataUri} />).toBlob();
    const url = URL.createObjectURL(blob);
    setPdfPreviewUrl(url);
  };

  // ── GENERAR COTIZACIÓN ──────────────────────────────────────────────────────
  // Guarda una foto del costeo actual (fases/partidas) en costeo_versiones,
  // con un correlativo autoincremental POR PROYECTO (no global). Se dispara
  // automático al generar la primera cotización y al sincronizar cambios con
  // una ya existente (ver generarCotizacion/applySync), y también a mano vía
  // el botón "📌 Guardar versión" — así queda historial aunque el usuario no
  // haya sincronizado todavía.
  const saveVersion = async (cotizacionRef, nota) => {
    const { data: existing } = await supabase.from("costeo_versiones")
      .select("version_num").eq("costeo_id", proyecto.id)
      .order("version_num", { ascending: false }).limit(1);
    const nextVersion = existing && existing[0] ? existing[0].version_num + 1 : 1;
    await supabase.from("costeo_versiones").insert({
      costeo_id: proyecto.id, version_num: nextVersion,
      fases: proyecto.fases || [], partidas: proyecto.partidas || [],
      cotizacion_ref: cotizacionRef || null, nota: nota || null,
    });
    return nextVersion;
  };

  const guardarVersionManual = async () => {
    setVersionSaving(true);
    const cotRef = proyecto.cotizacionId ? `COT-${String(proyecto.cotizacion).padStart(3,"0")}` : null;
    const n = await saveVersion(cotRef, versionNota.trim() || null);
    setVersionSaving(false);
    setVersionSavedNum(n);
  };

  const generarCotizacion = async () => {
    setGenSaving(true);
    const fases = (proyecto.fases||[]).map(calcFase);
    const partidas = proyecto.partidas||[];
    const totalVentaNeta = fases.reduce((s,f)=>s+f.ventaNeta,0);
    const totalBruto     = fases.reduce((s,f)=>s+f.ventaBruta,0);
    const totalBrutoFinal= fases.reduce((s,f)=>s+f.ventaConDesc,0); // con descuentos de fase
    const totalAnt = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAnticipo)||0)/100),0);
    const totalPar = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctParcial)||0)/100),0);
    const totalFin = partidas.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctFinalizar)||0)/100),0);
    // Usar totalBrutoFinal como base — las partidas tienen montos post-descuento
    const pctBase = totalBrutoFinal>0 ? totalBrutoFinal : totalBruto;
    const pctAnt = pctBase>0?Math.round(totalAnt/pctBase*100):0;
    const pctPar = pctBase>0?Math.round(totalPar/pctBase*100):0;
    const pctFin = pctBase>0?Math.round(totalFin/pctBase*100):0;
    // Mapear al valor estándar del dropdown del QuoteEditor
    const formaPago = partidas.length > 0 ? "Según partidas" : "A convenir";
    const { data: ultimas } = await supabase.from("cotizaciones").select("numero").order("numero",{ascending:false}).limit(1);
    const nextNum = ultimas&&ultimas[0] ? ultimas[0].numero+1 : 1;
    const sapBase = `POL-${String(nextNum).padStart(4,"0")}`;
    const codigoProyecto = sapBase; // raíz WBS del proyecto

    // ── INDEXAR ÍTEMS AL CATÁLOGO ────────────────────────────────────────────
    // Para cada ítem de cada fase, upsert en products usando el código SAP como key
    // (mismo código correlativo que se muestra en el costeo, vía codigosPorFase)
    const itemsParaCatalogo = [];
    fases.forEach((f, fi) => {
      const codigoPorId = codigosPorFase(f.items, fi);
      (f.items||[]).forEach(it => {
        const sapCod = `${sapBase}-${codigoPorId[it.id]}`;
        // Solo indexa si tiene descripción
        if(it.descripcion) {
          itemsParaCatalogo.push({
            code: sapCod,
            name: it.descripcion,
            description: it.modelo||"",
            price: Math.round(it.tipo==="Mano de Obra / HH" ? it.valorHH*(IVA) : (it.costoUnitNeto||it.costoUnit||0)*(IVA)),
            unit: it.tipo==="Mano de Obra / HH" ? "HH" : (it.unit||"un"),
            category: it.tipo,
            provider: "",
            type: "producto",
          });
        }
      });
    });
    // Upsert al catálogo (on conflict do update)
    if(itemsParaCatalogo.length > 0) {
      await supabase.from("products").upsert(itemsParaCatalogo, { onConflict: "code", ignoreDuplicates: false });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const quoteData = {
      numero:nextNum, fecha:proyecto.fecha||new Date().toISOString().slice(0,10),
      contact_id:proyecto.clienteId||null, nombre_cliente:proyecto.clienteNombre||proyecto.cliente||"",
      rut_cliente:proyecto.clienteRut||"", razon_social:proyecto.clienteEmpresa||"",
      direccion:proyecto.clienteDireccion||"", telefono:proyecto.clienteTelefono||"",
      forma_pago:formaPago, pct_anticipo:pctAnt, aplica_iva:false, iva_modo:"empresa",
      comentarios:`${proyecto.nombre}`,
      terminos:"", estado:"borrador", tipo:"productos", total:redondearTotal(totalBrutoFinal),
      rubro: proyecto.rubro || null, tipo_trabajo: proyecto.tipoTrabajo || null,
    };
    const { data: savedQuote } = await supabase.from("cotizaciones").insert(quoteData).select().single();
    if(!savedQuote){ setGenSaving(false); return; }

    let lineas = [];
    let ordenCounter = 0;
    if(genTipo==="fases") {
      // Línea por fase — precio c/IVA (ventaBruta) con descuento de fase.
      // aplica_iva=false porque el precio ya incluye IVA; q.total = ventaConDesc (c/IVA discountado).
      fases.forEach((f,fi)=>{
        const codigoFase = `${sapBase}-F${fi+1}`;
        const desc = Number(f.descPct)||0;
        const subtotalFinal = Math.round(f.ventaConDesc);
        lineas.push({ quote_id:savedQuote.id, product_id:null,
          codigo:codigoFase, descripcion:f.nombre||`Fase ${fi+1}`,
          cantidad:1, precio_unitario:Math.round(f.ventaBruta),
          descuento:desc, tipo_linea:"item", hito:"",
          subtotal:subtotalFinal, orden: ordenCounter++ });
      });
    } else {
      // Proyecto total: una línea con precio c/IVA post-descuento (totalBrutoFinal).
      lineas.push({ quote_id:savedQuote.id, product_id:null,
        codigo:codigoProyecto, descripcion:proyecto.nombre||"Suministro e instalación",
        cantidad:1, precio_unitario:Math.round(totalBrutoFinal),
        descuento:0, tipo_linea:"item", hito:"",
        subtotal:Math.round(totalBrutoFinal), orden: ordenCounter++ });
    }
    // Hitos de pago al final como sección separada
    if(partidas.length>0) {
      lineas = [...lineas, ...partidas.map((p,pi)=>({
        quote_id:savedQuote.id, product_id:null,
        codigo:`${sapBase}-P${String(pi+1).padStart(2,"0")}`,
        descripcion:p.concepto||"Hito de pago", cantidad:1,
        precio_unitario:Number(p.monto)||0, descuento:0, tipo_linea:"hito",
        hito:[
          p.pctAnticipo>0  ? `${p.pctAnticipo}% Anticipo (día 0)` : null,
          p.pctParcial>0   ? `${p.pctParcial}% Avance${Number(p.diasParcial)>0 ? ` (${p.diasParcial} días)` : ``}` : null,
          p.pctFinalizar>0 ? `${p.pctFinalizar}% Final${Number(p.diasFinalizar)>0 ? ` (${p.diasFinalizar} días)` : ``}` : null,
        ].filter(Boolean).join(" · "),
        subtotal:Number(p.monto)||0, orden: ordenCounter++,
      }))];
    }
    if(lineas.length>0) await supabase.from("quote_lines").insert(lineas);
    setQuoteMap(prev=>({ ...prev, [savedQuote.id]: { numero:savedQuote.numero, serie:savedQuote.serie||"COT" } }));
    updateProyecto({ ...proyecto, cotizacion: String(nextNum), cotizacionId: savedQuote.id });
    await saveVersion(`COT-${String(nextNum).padStart(3,"0")}`, "Cotización generada");
    setGenSaving(false);
    setGenDone(nextNum);
  };

  // Recalcula los totales actuales de cada fase y arma una vista previa de lo
  // que cambiaría en la cotización ya generada, SIN aplicar nada todavía.
  // No toca líneas de hito (cronograma de pago ya acordado) ni crea líneas
  // nuevas — si una fase no tiene línea correspondiente (código no encontrado),
  // se marca como "no encontrada" y se omite al aplicar.
  const openSyncPreview = async () => {
    if(!proyecto.cotizacionId) return;
    setSyncLoading(true);
    setSyncDone(false);
    const [{ data: cotRow }, { data: lineRows }] = await Promise.all([
      supabase.from("cotizaciones").select("id,numero,total,aplica_iva").eq("id",proyecto.cotizacionId).single(),
      supabase.from("quote_lines").select("*").eq("quote_id",proyecto.cotizacionId).order("orden"),
    ]);
    setSyncLoading(false);
    if(!cotRow){ alert("No se pudo cargar la cotización enlazada — puede haber sido eliminada."); return; }
    const sapBase = `POL-${String(cotRow.numero).padStart(4,"0")}`;
    const itemLines = (lineRows||[]).filter(l=>l.tipo_linea!=="hito");
    const isFaseMode = itemLines.some(l=>/-F\d+$/.test(l.codigo||""));
    const fases = fasesCalc;
    let rows;
    if(isFaseMode) {
      rows = fases.map((f,fi)=>{
        const codigo = `${sapBase}-F${fi+1}`;
        const linea = itemLines.find(l=>l.codigo===codigo);
        return {
          fase: f.nombre||`Fase ${fi+1}`, codigo,
          actual: linea ? Number(linea.subtotal)||0 : null,
          nuevo: Math.round(f.ventaConDesc),
          precioNuevo: Math.round(f.ventaBruta), descNuevo: Number(f.descPct)||0,
          lineaId: linea ? linea.id : null,
        };
      });
    } else {
      const totalNuevo = Math.round(fases.reduce((s,f)=>s+f.ventaConDesc,0));
      const linea = itemLines[0]||null;
      rows = [{
        fase:"Proyecto total", codigo: linea?.codigo||sapBase,
        actual: linea ? Number(linea.subtotal)||0 : null,
        nuevo: totalNuevo, precioNuevo: totalNuevo, descNuevo: 0,
        lineaId: linea ? linea.id : null,
      }];
    }
    const netoNuevo = Math.round(rows.reduce((s,r)=>s+r.nuevo,0));
    const totalNuevo = totalCotizacion(netoNuevo, cotRow.aplica_iva).total;
    setSyncPreview({ rows, totalActual:Number(cotRow.total)||0, totalNuevo, cotId:cotRow.id });
    setSyncModal(true);
  };

  const applySync = async () => {
    if(!syncPreview) return;
    setSyncSaving(true);
    const updates = syncPreview.rows.filter(r=>r.lineaId);
    await Promise.all(updates.map(r=>
      supabase.from("quote_lines").update({ precio_unitario:r.precioNuevo, descuento:r.descNuevo, subtotal:r.nuevo }).eq("id",r.lineaId)
    ));
    await supabase.from("cotizaciones").update({ total:syncPreview.totalNuevo }).eq("id", syncPreview.cotId);
    await saveVersion(`COT-${String(proyecto.cotizacion).padStart(3,"0")}`, "Sincronizado con cotización");
    setSyncSaving(false);
    setSyncDone(true);
  };

  return (
    <div>
      {/* Modal generar cotización */}
      {genModal && (
        <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:28, width:420, maxWidth:"95vw" }}>
            {genDone ? (
              <>
                <div style={{ textAlign:"center", marginBottom:16 }}>
                  <div style={{ fontSize:36 }}>✅</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text, marginTop:8 }}>Cotización #{genDone} creada</div>
                  <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginTop:4 }}>Ve al módulo Cotizar para revisarla y enviarla</div>
                </div>
                <button onClick={()=>{ setGenModal(false); setGenDone(null); }}
                  style={{ width:"100%", padding:"10px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  Cerrar
                </button>
              </>
            ) : (
              <>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text, marginBottom:4 }}>Generar Cotización</div>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:20 }}>Se creará en borrador con los datos del proyecto.</div>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:8, fontWeight:600 }}>¿Cómo desglosar las líneas?</div>
                <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                  {[["fases","Por fase","Una línea por cada fase"],["total","Proyecto total","Una sola línea con el total"]].map(([val,lab,desc])=>(
                    <div key={val} onClick={()=>setGenTipo(val)}
                      style={{ flex:1, border:`2px solid ${genTipo===val?COLORS.accent:COLORS.border}`, borderRadius:9, padding:"12px 10px", cursor:"pointer", background:genTipo===val?`${COLORS.accent}11`:"transparent" }}>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:genTipo===val?COLORS.accent:COLORS.text }}>{lab}</div>
                      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:3 }}>{desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:COLORS.card, borderRadius:8, padding:"10px 14px", marginBottom:20 }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Vista previa</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}><strong>Cliente:</strong> {proyecto.clienteNombre||proyecto.cliente||"(sin cliente)"}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}><strong>RUT:</strong> {proyecto.clienteRut||"—"}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text }}><strong>Fecha:</strong> {proyecto.fecha}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.text, marginTop:4 }}><strong>Forma de pago:</strong> {(()=>{
                    const ps=proyecto.partidas||[];
                    const tbFinal=fasesCalc.reduce((s,f)=>s+f.ventaConDesc,0);
                    const tb=tbFinal>0?tbFinal:fasesCalc.reduce((s,f)=>s+f.ventaBruta,0);
                    const ant=ps.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctAnticipo)||0)/100),0);
                    const par=ps.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctParcial)||0)/100),0);
                    const fin=ps.reduce((s,p)=>s+(Number(p.monto)*(Number(p.pctFinalizar)||0)/100),0);
                    const pts=[];
                    if(tb>0&&ant>0) pts.push(`${Math.round(ant/tb*100)}% Anticipo`);
                    if(tb>0&&par>0) pts.push(`${Math.round(par/tb*100)}% Avance`);
                    if(tb>0&&fin>0) pts.push(`${Math.round(fin/tb*100)}% Al finalizar`);
                    return pts.length>0?pts.join(" · "):"A convenir";
                  })()}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:4 }}>
                    {genTipo==="fases"
                      ? `${(proyecto.fases||[]).length} línea(s) por fase + ${(proyecto.partidas||[]).length} hito(s) de pago`
                      : `1 línea total + ${(proyecto.partidas||[]).length} hito(s) de pago`}
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={()=>{ setGenModal(false); setGenDone(null); }}
                    style={{ flex:1, padding:"10px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                    Cancelar
                  </button>
                  <button onClick={generarCotizacion} disabled={genSaving}
                    style={{ flex:2, padding:"10px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer", opacity:genSaving?0.6:1 }}>
                    {genSaving?"Creando...":"✦ Crear Cotización"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal sincronizar con cotización */}
      {syncModal && syncPreview && (
        <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:28, width:520, maxWidth:"95vw", maxHeight:"85vh", overflowY:"auto" }}>
            {syncDone ? (
              <>
                <div style={{ textAlign:"center", marginBottom:16 }}>
                  <div style={{ fontSize:36 }}>✅</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text, marginTop:8 }}>Cotización sincronizada</div>
                  <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginTop:4 }}>El total y las líneas quedaron al día con el costeo actual.</div>
                </div>
                <button onClick={()=>{ setSyncModal(false); setSyncPreview(null); setSyncDone(false); }}
                  style={{ width:"100%", padding:"10px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  Cerrar
                </button>
              </>
            ) : (
              <>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text, marginBottom:4 }}>Sincronizar con cotización</div>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:16 }}>
                  Se actualiza el precio de cada línea al valor recalculado del costeo. No se tocan los hitos de pago ni se crean líneas nuevas.
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                  {syncPreview.rows.map((r,i)=>(
                    <div key={i} style={{ background:COLORS.card, borderRadius:8, padding:"10px 12px", border:`1px solid ${r.lineaId?COLORS.border:COLORS.yellow+"66"}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.fase}</div>
                          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{r.codigo}</div>
                        </div>
                        {r.lineaId ? (
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textDecoration: r.actual!==r.nuevo?"line-through":"none" }}>{fmt(r.actual)}</div>
                            <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color: r.actual!==r.nuevo?COLORS.accent:COLORS.text }}>{fmt(r.nuevo)}</div>
                          </div>
                        ) : (
                          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.yellow, flexShrink:0 }}>⚠ No encontrada — se omite</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background:COLORS.card, borderRadius:8, padding:"10px 14px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em" }}>Total cotización</span>
                  <div style={{ textAlign:"right" }}>
                    {syncPreview.totalActual!==syncPreview.totalNuevo && (
                      <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textDecoration:"line-through" }}>{fmt(syncPreview.totalActual)}</div>
                    )}
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.accent }}>{fmt(syncPreview.totalNuevo)}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={()=>{ setSyncModal(false); setSyncPreview(null); }}
                    style={{ flex:1, padding:"10px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                    Cancelar
                  </button>
                  <button onClick={applySync} disabled={syncSaving}
                    style={{ flex:2, padding:"10px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer", opacity:syncSaving?0.6:1 }}>
                    {syncSaving?"Aplicando...":"🔄 Aplicar sincronización"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <button onClick={()=>{ flushPending(selected); setSelected(null); }} style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:12 }}>← Proyectos</button>
        {proyecto.cotizacion && (
          <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.accent, background:`${COLORS.accent}18`, border:`1px solid ${COLORS.accent}44`, borderRadius:6, padding:"4px 10px" }}>
            COT-{String(proyecto.cotizacion).padStart(3,"0")}
          </span>
        )}
        <div style={{ flex:1 }}>
          <input value={proyecto.nombre} onChange={e=>updateProyecto({...proyecto,nombre:e.target.value})}
            style={{ background:"transparent", border:"none", color:COLORS.text, fontFamily:FONT_DISPLAY, fontSize:20, fontWeight:700, outline:"none", width:"100%" }} />
        </div>
        {saveStatus==="saving" && <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>Guardando…</span>}
        {saveStatus==="saved" && <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.green }}>✓ Guardado</span>}
        <input type="date" value={proyecto.fecha} onChange={e=>updateProyecto({...proyecto,fecha:e.target.value})}
          style={{ background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:12, padding:"5px 10px" }} />
        <button onClick={printInterno} style={{ padding:"8px 14px", background:"#1e293b", border:"none", borderRadius:7, color:"white", fontFamily:FONT, fontSize:11, cursor:"pointer" }}>📋 PDF Interno</button>
        <button onClick={printCliente} style={{ padding:"8px 14px", background:COLORS.accent, border:"none", borderRadius:7, color:COLORS.bg, fontFamily:FONT, fontSize:11, fontWeight:700, cursor:"pointer" }}>📄 PDF Cliente</button>
        <button onClick={()=>{ setGenModal(true); setGenDone(null); }}
          style={{ padding:"8px 16px", background:"#7c3aed", border:"none", borderRadius:7, color:"white", fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer" }}>
          ✦ Generar Cotización
        </button>
        {proyecto.cotizacionId && (
          <button onClick={openSyncPreview} disabled={syncLoading}
            style={{ padding:"8px 16px", background:"transparent", border:`1px solid ${COLORS.accent}`, borderRadius:7, color:COLORS.accent, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer", opacity:syncLoading?0.6:1 }}>
            {syncLoading?"Cargando…":"🔄 Sincronizar con cotización"}
          </button>
        )}
        <button onClick={()=>{ setVersionModal(true); setVersionNota(""); setVersionSavedNum(null); }}
          style={{ padding:"8px 16px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:7, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer" }}>
          📌 Guardar versión
        </button>
      </div>

      {/* Modal guardar versión manual */}
      {versionModal && (
        <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:28, width:420, maxWidth:"95vw" }}>
            {versionSavedNum ? (
              <>
                <div style={{ textAlign:"center", marginBottom:16 }}>
                  <div style={{ fontSize:36 }}>📌</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text, marginTop:8 }}>Versión {versionSavedNum} guardada</div>
                  <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginTop:4 }}>Ya aparece en "Historial de Cambios"</div>
                </div>
                <button onClick={()=>setVersionModal(false)}
                  style={{ width:"100%", padding:"10px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  Cerrar
                </button>
              </>
            ) : (
              <>
                <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text, marginBottom:4 }}>Guardar versión</div>
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginBottom:16 }}>
                  Guarda una foto del costeo tal como está ahora — queda disponible para comparar contra versiones futuras.
                </div>
                <textarea value={versionNota} onChange={e=>setVersionNota(e.target.value)} placeholder="Nota (opcional) — ej: se sacó switch PoE, se agregó pantalla VTH"
                  rows={3}
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:7, color:COLORS.text, fontFamily:FONT, fontSize:12, padding:"9px 12px", boxSizing:"border-box", marginBottom:20, resize:"vertical" }} />
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={()=>setVersionModal(false)}
                    style={{ flex:1, padding:"10px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:8, color:COLORS.textMuted, fontFamily:FONT, fontSize:12, cursor:"pointer" }}>
                    Cancelar
                  </button>
                  <button onClick={guardarVersionManual} disabled={versionSaving}
                    style={{ flex:2, padding:"10px", background:COLORS.accent, border:"none", borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, cursor:"pointer", opacity:versionSaving?0.6:1 }}>
                    {versionSaving?"Guardando...":"📌 Guardar versión"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Rubro / Tipo de trabajo */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <select value={proyecto.rubro||""} onChange={e=>updateProyecto({...proyecto,rubro:e.target.value})}
          style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:7, color:proyecto.rubro?COLORS.text:COLORS.textMuted, fontFamily:FONT, fontSize:12, padding:"7px 10px" }}>
          <option value="">Rubro: sin clasificar</option>
          {RUBRO_OPTIONS.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <select value={proyecto.tipoTrabajo||""} onChange={e=>updateProyecto({...proyecto,tipoTrabajo:e.target.value})}
          style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:7, color:proyecto.tipoTrabajo?COLORS.text:COLORS.textMuted, fontFamily:FONT, fontSize:12, padding:"7px 10px" }}>
          <option value="">Tipo de trabajo: sin clasificar</option>
          {TIPO_TRABAJO_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Buscador RUT / Cliente */}
      <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:"14px 18px", marginBottom:16, position:"relative" }}>
        {proyecto.clienteNombre ? (
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text }}>{proyecto.clienteNombre}</div>
              <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{proyecto.clienteEmpresa} · RUT: {proyecto.clienteRut}</div>
              <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{proyecto.clienteTelefono} · {proyecto.clienteDireccion}</div>
            </div>
            <button onClick={()=>updateProyecto({...proyecto,clienteNombre:"",clienteEmpresa:"",clienteRut:"",clienteTelefono:"",clienteDireccion:""})}
              style={{ background:"none", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, cursor:"pointer", fontFamily:FONT, fontSize:11, padding:"4px 10px" }}>✕ Cambiar</button>
          </div>
        ) : (
          <div>
            <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>Buscar Cliente por RUT o Nombre</div>
            <input value={rutSearch} onChange={e=>searchRut(e.target.value)}
              placeholder="Ej: 65.066.845-6 o Condominio..."
              style={{ width:"100%", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:7, color:COLORS.text, fontFamily:FONT, fontSize:13, padding:"8px 12px", boxSizing:"border-box" }} />
            {rutMatches.length>0 && (
              <div style={{ position:"absolute", left:18, right:18, background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:7, zIndex:50, marginTop:4 }}>
                {rutMatches.map(c=>(
                  <div key={c.id} onClick={()=>selectContacto(c)}
                    style={{ padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${COLORS.border}22` }}
                    onMouseEnter={e=>e.currentTarget.style.background=COLORS.card}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600, color:COLORS.text }}>{c.name} · {c.company}</div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>RUT: {c.rut} · {c.phone}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:`1px solid ${COLORS.border}` }}>
        {["costeo","partidas","historial","diseno"].map(t=>(
          <button key={t} onClick={()=>setPage(t)} style={{ padding:"8px 20px", background:"none", border:"none", borderBottom:page===t?`2px solid ${COLORS.accent}`:"2px solid transparent", color:page===t?COLORS.accent:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:page===t?700:400, cursor:"pointer", marginBottom:-1 }}>
            {t==="costeo"?"📊 Control de Costos":t==="partidas"?"💳 Partidas de Pago":t==="historial"?"🌳 Historial de Cambios":"🎥 Planos de Diseño"}
          </button>
        ))}
      </div>

      {page==="costeo" && (
        <>
          {/* Totales globales — 8 tarjetas */}
          <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
            <TotBox label="Costo Neto Total" value={totalCosto}      color={COLORS.textMuted} sub="Sin IVA" />
            <TotBox label="Costo Bruto"      value={totalCostoBruto} color={COLORS.text}      sub="Neto + IVA compra" />
            <TotBox label="Margen Total"     value={hayDescuento?totalMargenConDesc:totalMargen}     color={COLORS.green}     sub={hayDescuento?`${margenConDescPct}% sobre costo (con desc.)`:`${margenPct}% sobre costo`} />
            <TotBox label="Venta Neta"       value={totalVentaNeta}  color={COLORS.text}      sub="Costo + Margen" />
            <TotBox label="IVA Compra"       value={totalIvaCompra}  color="#06b6d4"          sub="Crédito fiscal" />
            <TotBox label="IVA Venta"        value={totalIVA}        color="#ef4444"          sub="Débito fiscal" />
            <TotBox label="IVA Neto SII"     value={totalIvaNetoSII} color="#f59e0b"          sub="A pagar al SII" />
            {hayDescuento ? (
              <>
                <TotBox label="Descuento" value={totalDescuento} color="#f59e0b" />
                <TotBox label="Venta Neta c/Desc" value={totalVentaNetaConDesc} color={COLORS.text} sub="Neta − descuento" />
                <TotBox label="IVA c/Desc" value={totalIvaConDesc} color="#ef4444" sub="Sobre neta con descuento" />
                <TotBox label="Venta Final c/IVA" value={totalVentaFinal} color="#22c55e" sub={`Margen ${margenFinalPct}% sobre costo`} />
              </>
            ) : (
              <TotBox label="Venta c/IVA" value={totalVentaBruta} color={COLORS.accent} sub="Precio al cliente" />
            )}
          </div>

          {/* Fases */}
          {fasesCalc.map((f,fi)=>(
            <FaseBlock key={f.id} fase={f} faseIdx={fi} onChange={updateFase} onDelete={()=>deleteFase(f.id)} onDuplicate={()=>duplicateFase(f)} productos={productos} partidas={partidas} />
          ))}
          <button onClick={addFase} style={{ width:"100%", padding:"12px", background:"transparent", border:`1px dashed ${COLORS.border}`, borderRadius:10, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer", marginBottom:16 }}>
            + Agregar Fase
          </button>
        </>
      )}

      {page==="partidas" && (
        <>
          {/* Totales partidas */}
          <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
            <TotBox label="Anticipo Total" value={totalAnticipo} color={COLORS.accent} sub={`${totalPartidas>0?(totalAnticipo/totalPartidas*100).toFixed(0):0}% del total`} />
            <TotBox label="Parciales Total" value={totalParcial} color={COLORS.green} sub={`${totalPartidas>0?(totalParcial/totalPartidas*100).toFixed(0):0}% del total`} />
            <TotBox label="Al Finalizar Total" value={totalFinalizar} color="#f59e0b" sub={`${totalPartidas>0?(totalFinalizar/totalPartidas*100).toFixed(0):0}% del total`} />
            <TotBox label="Total Proyecto" value={totalPartidas} color={COLORS.text} />
            <TotBox label="Saldo por Cobrar" value={totalSaldo} color={totalSaldo > 0 ? COLORS.red : COLORS.green} sub={`${saldoPct}% pendiente · Cobrado: $${Math.round(totalCobrado).toLocaleString("es-CL")}`} />
          </div>

          <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, overflow:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${COLORS.border}`, background:COLORS.surface }}>
                  <th style={{ textAlign:"left", fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"10px 8px", letterSpacing:"0.08em" }}>CONCEPTO / HITO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"10px 8px", letterSpacing:"0.08em" }}>FASE</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, padding:"10px 8px", letterSpacing:"0.08em" }}>MONTO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"10px 8px", letterSpacing:"0.08em" }}>% ANT. / días</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent, padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>$ ANTICIPO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, padding:"10px 8px", letterSpacing:"0.08em" }}>% PARC. / días</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.green, padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>$ PARCIAL</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:"#f59e0b", padding:"10px 8px", letterSpacing:"0.08em" }}>% FIN. / días</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:"#f59e0b", padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>$ FINALIZAR</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:COLORS.text, padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>TOTAL HITO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:"#22d3ee", padding:"10px 8px", letterSpacing:"0.08em", textAlign:"center" }}>% COBRADO</th>
                  <th style={{ fontFamily:FONT, fontSize:10, color:"#22d3ee", padding:"10px 8px", letterSpacing:"0.08em", textAlign:"right" }}>$ COBRADO</th>
                  <th style={{ width:30 }}></th>
                </tr>
              </thead>
              <tbody>
                {partidas.map((p,i)=>(
                  <PartidaRow key={p.id} partida={p} fases={proyecto.fases||[]} onChange={updatePartida} onDelete={()=>deletePartida(p.id)} />
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`2px solid ${COLORS.border}`, background:COLORS.surface }}>
                  <td colSpan={2} style={{ padding:"10px 8px", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:COLORS.text }}>TOTALES</td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.text }}>${totalPartidas.toLocaleString("es-CL")}</td>
                  <td></td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.accent, textAlign:"right" }}>${totalAnticipo.toLocaleString("es-CL")}</td>
                  <td></td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:12, fontWeight:700, color:COLORS.green, textAlign:"right" }}>${totalParcial.toLocaleString("es-CL")}</td>
                  <td></td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:12, fontWeight:700, color:"#f59e0b", textAlign:"right" }}>${totalFinalizar.toLocaleString("es-CL")}</td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:13, fontWeight:700, color:COLORS.accent, textAlign:"right" }}>${totalPartidas.toLocaleString("es-CL")}</td>
                  <td></td>
                  <td style={{ padding:"10px 8px", fontFamily:FONT, fontSize:13, fontWeight:700, color:"#22d3ee", textAlign:"right" }}>${Math.round(partidas.reduce((s,p)=>s+partidaCobrado(p),0)).toLocaleString("es-CL")}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button onClick={addPartida} style={{ width:"100%", marginTop:12, padding:"12px", background:"transparent", border:`1px dashed ${COLORS.border}`, borderRadius:10, color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>
            + Agregar Hito
          </button>
        </>
      )}
      {page==="historial" && (
        <HistorialCambiosTab costeoId={proyecto.id} proyecto={proyecto} />
      )}

      {page==="diseno" && (
        <DesignProjectsPanel costeoId={proyecto.id} onOpenDesign={onOpenDesign} />
      )}
      <PdfPreviewModal url={pdfPreviewUrl} onClose={() => { URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }} />
    </div>
  );
}

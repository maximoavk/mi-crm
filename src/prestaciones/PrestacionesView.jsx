// ── PRESTACIONES: comprobantes de pago (CP) y pre-facturación (PF) ──────────
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { mapQuote, mapQuoteLine } from "../shared/mappers.js";
import { FONT_DISPLAY, COLORS, FONT } from "../theme.js";
import { AddBtn, Loader } from "../shared/ui.jsx";
import { PedidosGrid } from "./PedidosGrid.jsx";
import { PedidoModal } from "./PedidoModal.jsx";
import { EditTxModal } from "./EditTxModal.jsx";
import { NuevoPrestacionModal } from "./NuevoPrestacionModal.jsx";
import { hoyISO } from "../shared/format.js";

export function PrestacionesView({ isMobile }) {
  const [tab, setTab]             = useState("cp"); // "cp" | "pf"
  const [docs, setDocs]           = useState([]);
  const [pfDocs, setPfDocs]           = useState([]);
  const [quotes, setQuotes]           = useState([]);   // serie SIN
  const [pfQuotes, setPfQuotes]       = useState([]);   // serie COT
  const [pedidos, setPedidos]         = useState([]);   // pedidos CP (serie SIN)
  const [pfPedidos, setPfPedidos]     = useState([]);   // pedidos PF (serie COT)
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editDoc, setEditDoc]         = useState(null);
  const [showPedidoModal, setShowPedidoModal] = useState(false);
  const [editPedido, setEditPedido]           = useState(null);
  const [docContext, setDocContext]           = useState(null); // { quoteId }

  useEffect(()=>{ loadAll(); },[]);

  const loadAll = async () => {
    setLoading(true);
    const [
      { data: docsData },
      { data: quotesData },
      { data: pedidosData },
    ] = await Promise.all([
      supabase.from("comprobantes_pago").select("*").order("created_at",{ascending:false}),
      supabase.from("cotizaciones").select("*").order("numero",{ascending:false}),
      supabase.from("pedidos").select("*").order("created_at",{ascending:false}),
    ]);

    const allDocs = docsData||[];
    setDocs(allDocs.filter(d=> d.estado!=="pf" && !(d.numero||"").startsWith("PF-")));
    setPfDocs(allDocs.filter(d=> d.estado==="pf" || (d.numero||"").startsWith("PF-")));

    const sinSerie = (quotesData||[]).filter(q=>(q.serie||"COT")==="SIN").map(mapQuote);
    const cotSerie = (quotesData||[]).filter(q=>(q.serie||"COT")==="COT").map(mapQuote);
    const allMapped = [...sinSerie, ...cotSerie];
    if(allMapped.length>0){
      const { data: linesData } = await supabase.from("quote_lines")
        .select("*").in("quote_id", allMapped.map(q=>q.id)).order("orden");
      const byQ=(linesData||[]).reduce((acc,l)=>{ if(!acc[l.quote_id])acc[l.quote_id]=[]; acc[l.quote_id].push(mapQuoteLine(l)); return acc; },{});
      setQuotes(sinSerie.map(q=>({...q,lines:(byQ[q.id]||[]).filter(l=>l.lineType!=="hito")})));
      setPfQuotes(cotSerie.map(q=>({...q,lines:(byQ[q.id]||[]).filter(l=>l.lineType!=="hito")})));
    } else { setQuotes([]); setPfQuotes([]); }

    // Separar pedidos por tipo (campo "tipo": "cp" | "pf"). Default "cp" si null.
    const allPedidos = pedidosData||[];
    setPedidos(allPedidos.filter(p=>(p.tipo||"cp")==="cp"));
    setPfPedidos(allPedidos.filter(p=>p.tipo==="pf"));
    setLoading(false);
  };

  const deleteDoc = async (id) => {
    if(!window.confirm("¿Eliminar este documento?")) return;
    const { error } = await supabase.from("comprobantes_pago").delete().eq("id",id); if(error) return;
    setDocs(prev=>prev.filter(d=>d.id!==id));
    setPfDocs(prev=>prev.filter(d=>d.id!==id));
  };

  const deletePedido = async (id) => {
    const isCP = tab==="cp";
    if(!window.confirm(`¿Eliminar este ${isCP?"Pedido":"grupo Pre-Factura"}? Los documentos existentes no se eliminan.`)) return;
    const { error } = await supabase.from("pedidos").delete().eq("id",id); if(error) return;
    if(isCP) setPedidos(prev=>prev.filter(p=>p.id!==id));
    else     setPfPedidos(prev=>prev.filter(p=>p.id!==id));
  };

  const savePedido = async (form) => {
    const isCP = tab==="cp";
    const payload = { ...form, tipo: isCP ? "cp" : "pf" };
    if(editPedido?.id){
      const { data } = await supabase.from("pedidos").update({...payload, updated_at:new Date().toISOString()}).eq("id",editPedido.id).select().single();
      if(!data) return; // falló: el formulario queda abierto
      if(isCP) setPedidos(prev=>prev.map(p=>p.id===data.id?data:p));
      else     setPfPedidos(prev=>prev.map(p=>p.id===data.id?data:p));
    } else {
      const { data } = await supabase.from("pedidos").insert(payload).select().single();
      if(!data) return;
      if(isCP) setPedidos(prev=>[data,...prev]);
      else     setPfPedidos(prev=>[data,...prev]);
    }
    setShowPedidoModal(false); setEditPedido(null);
  };

  const [facturaModal, setFacturaModal] = useState(null); // { ped, cotCompensated }
  const [factNum, setFactNum]           = useState("");
  const [syncMonto, setSyncMonto]       = useState("total_cot");
  const [montoManual, setMontoManual]   = useState("");
  const [fechaEmision, setFechaEmision] = useState(hoyISO());
  const [sincronizar, setSincronizar]   = useState(true);
  const [savingFact, setSavingFact]     = useState(false);

  const abrirFacturaModal = (ped, cotCompensated) => {
    setFacturaModal({ ped, cotCompensated });
    setFactNum(ped.numero_factura || "");
    setSyncMonto("total_cot");
    setMontoManual("");
    setSincronizar(!ped.numero_factura); // si ya tiene N°, no sincronizar por defecto
    setFechaEmision(hoyISO());
  };

  const saveFacturaPF = async () => {
    if (!factNum.trim() || !facturaModal) return;
    setSavingFact(true);
    const { ped, cotCompensated } = facturaModal;

    // Guardar N° en pedido
    await supabase.from("pedidos").update({ numero_factura: factNum.trim() }).eq("id", ped.id);

    if (sincronizar) {
      const totalCot = cotCompensated.reduce((s,c) => s + (c.qTotal||0), 0);
      const montoPF  = cotCompensated.reduce((s,c) => s + (c.qPagado||0), 0);
      let montoTotal = syncMonto === "total_cot" ? totalCot
                     : syncMonto === "monto_pf"  ? montoPF
                     : Number(montoManual) || 0;

      for (const c of cotCompensated) {
        const q = c.quote;
        const prop = cotCompensated.length > 1 ? ((c.qTotal||0) / (totalCot||1)) : 1;
        const ctTotal = Math.round(montoTotal * prop);
        const ctNeto  = q.hasIva ? Math.round(ctTotal / 1.19) : ctTotal;
        const ctIva   = ctTotal - ctNeto;
        await supabase.from("facturas_emitidas").insert({
          numero_documento:     factNum.trim(),
          tipo_documento:       "Factura",
          fecha_emision:        fechaEmision,
          razon_social_cliente: q.clientCompany || q.clientName || "",
          rut_cliente:          q.clientRut || "",
          monto_neto:           ctNeto,
          aplica_iva:           q.hasIva,
          monto_iva:            ctIva,
          monto_total:          ctTotal,
          cotizacion_id:        q.id,
          referencia_cotizacion:`COT-${q.number}`,
          notas:                `Generado desde PF "${ped.nombre}"`,
        });
      }
    }

    // Actualizar estado local
    if (isCP) setDocs(prev => prev.map(d => d.id===ped.id ? {...d, numero_factura: factNum.trim()} : d));
    else setPfDocs(prev => prev.map(d => d.id===ped.id ? {...d, numero_factura: factNum.trim()} : d));
    if (isCP) setPedidos(prev => prev.map(p => p.id===ped.id ? {...p, numero_factura: factNum.trim()} : p));
    else setPfPedidos(prev => prev.map(p => p.id===ped.id ? {...p, numero_factura: factNum.trim()} : p));

    setSavingFact(false);
    setFacturaModal(null);
  };

  const TAB_STYLE = (active, color) => ({
    padding:"8px 22px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700,
    cursor:"pointer", border:`1px solid ${active?color:COLORS.border}`,
    background:active?`${color}22`:"transparent", color:active?color:COLORS.textMuted,
    transition:"all 0.15s",
  });

  const isCP  = tab==="cp";
  const AC    = isCP ? COLORS.accent : COLORS.secondary;
  const activeDocs    = isCP ? docs    : pfDocs;
  const activeQuotes  = isCP ? quotes  : pfQuotes;
  const activePedidos = isCP ? pedidos : pfPedidos;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>
            {isCP ? "Sin IVA · Comprobantes de Pago" : "Con IVA · No válido como documento legal"}
          </div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>
            {isCP ? "Pedidos · Comprobantes de Pago" : "Pedidos · Pre-Facturas"}
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:6, background:COLORS.surface, padding:4, borderRadius:10, border:`1px solid ${COLORS.border}` }}>
            <button style={TAB_STYLE(isCP, COLORS.accent)} onClick={()=>setTab("cp")}>📋 Prestaciones</button>
            <button style={TAB_STYLE(!isCP, COLORS.secondary)} onClick={()=>setTab("pf")}>🧾 Pre-Facturas</button>
          </div>
          <AddBtn onClick={()=>{ setEditPedido(null); setShowPedidoModal(true); }}
            label={isCP?"Nuevo Pedido":"Nuevo grupo PF"} />
        </div>
      </div>

      {!isCP && (
        <div style={{ marginBottom:16, padding:"7px 14px", borderLeft:`3px solid ${COLORS.secondary}`, background:`${COLORS.secondary}08` }}>
          <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
            Sistema de Pre-Facturación · Polygonos SpA · Documento interno de gestión, no válido como documento legal ni tributariamente ante el SII.
          </span>
        </div>
      )}

      {loading ? <Loader /> : (
        <PedidosGrid
          pedidos={activePedidos}
          quotes={activeQuotes}
          docs={activeDocs}
          isPF={!isCP}
          AC={AC}
          docLabel={isCP?"CP":"PF"}
          onEditPedido={(p)=>{ setEditPedido(p); setShowPedidoModal(true); }}
          onDeletePedido={deletePedido}
          onNuevoDoc={(quoteId)=>{ setDocContext({quoteId}); setEditDoc(null); setShowModal(true); }}
          onEditDoc={(doc)=>{ setEditDoc(doc); setShowModal(true); }}
          onReprintDoc={(doc)=>{ setEditDoc({...doc,_reprint:true}); setShowModal(true); }}
          onDeleteDoc={deleteDoc}
          onRegistrarFactura={abrirFacturaModal}
        />
      )}

      {/* Modal Pedido/PF */}
      {showPedidoModal && (
        <PedidoModal
          pedido={editPedido}
          quotes={activeQuotes}
          docs={activeDocs}
          isPF={!isCP}
          onSave={savePedido}
          onClose={()=>{ setShowPedidoModal(false); setEditPedido(null); }}
          onEditDoc={(doc)=>{ setEditDoc(doc); setShowModal(true); }}
          onReprintDoc={(doc)=>{ setEditDoc({...doc,_reprint:true}); setShowModal(true); }}
          onDeleteDoc={deleteDoc}
          onNuevoDoc={(quoteId)=>{ setDocContext({quoteId}); setEditDoc(null); setShowModal(true); }}
        />
      )}

      {/* Modal documento */}
      {showModal && editDoc && !editDoc._reprint && (
        <EditTxModal
          doc={editDoc}
          onClose={()=>{ setShowModal(false); setEditDoc(null); }}
          onSaved={(doc)=>{
            if(tab==="pf") setPfDocs(prev=>prev.map(d=>d.id===doc.id?doc:d));
            else setDocs(prev=>prev.map(d=>d.id===doc.id?doc:d));
            setShowModal(false); setEditDoc(null);
          }}
        />
      )}
      {showModal && (!editDoc || editDoc._reprint) && (
        <NuevoPrestacionModal
          quotes={activeQuotes}
          existing={editDoc}
          allDocs={activeDocs}
          tab={tab}
          preselectedQuoteId={docContext?.quoteId||null}
          onClose={()=>{ setShowModal(false); setEditDoc(null); setDocContext(null); }}
          onSaved={(doc)=>{
            if(tab==="pf") setPfDocs(prev=>[doc,...prev]);
            else setDocs(prev=>[doc,...prev]);
            setShowModal(false); setEditDoc(null); setDocContext(null);
          }}
        />
      )}

      {/* ── Modal N° Factura con sincronización (igual que ColaboradorView) ── */}
      {facturaModal && (() => {
        const { ped, cotCompensated } = facturaModal;
        const totalCot = cotCompensated.reduce((s,c) => s + (c.qTotal||0), 0);
        const montoPF  = cotCompensated.reduce((s,c) => s + (c.qPagado||0), 0);
        const montoPreview = syncMonto==="total_cot" ? totalCot
                           : syncMonto==="monto_pf"  ? montoPF
                           : Number(montoManual)||0;
        const aplicaIva = cotCompensated[0]?.quote.hasIva ?? true;
        const netoPreview = aplicaIva ? Math.round(montoPreview/1.19) : montoPreview;
        const ivaPreview  = montoPreview - netoPreview;
        const fmtP = n => "$"+Math.round(n||0).toLocaleString("es-CL");
        return (
          <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:300,
            display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`,
              borderRadius:14, padding:24, width:"100%", maxWidth:500,
              maxHeight:"92vh", overflowY:"auto" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent,
                    letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:2 }}>
                    Registrar factura emitida
                  </div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>{ped.nombre}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:2 }}>
                    {cotCompensated.length} COT · {fmtP(totalCot)}
                  </div>
                </div>
                <button onClick={()=>setFacturaModal(null)}
                  style={{ background:"transparent", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:20 }}>✕</button>
              </div>

              {/* N° Factura */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                  letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>N° Factura emitida en el SII</div>
                <input value={factNum} onChange={e=>setFactNum(e.target.value)}
                  placeholder="Ej: 1234567"
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
                    borderRadius:8, padding:"11px 14px", fontFamily:FONT_DISPLAY,
                    fontSize:20, fontWeight:700, color:COLORS.accent,
                    outline:"none", boxSizing:"border-box" }} />
              </div>

              {/* Fecha emisión */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                  letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Fecha de emisión</div>
                <input type="date" value={fechaEmision} onChange={e=>setFechaEmision(e.target.value)}
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
                    borderRadius:8, padding:"10px 14px", fontFamily:FONT, fontSize:13,
                    color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
              </div>

              {/* Toggle sincronizar */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:sincronizar?16:20,
                padding:"10px 14px", background:sincronizar?COLORS.green+"12":COLORS.bg,
                border:`1px solid ${sincronizar?COLORS.green+"44":COLORS.border}`, borderRadius:8 }}>
                <button onClick={()=>setSincronizar(p=>!p)}
                  style={{ width:36, height:20, borderRadius:10, border:"none", cursor:"pointer",
                    background:sincronizar?COLORS.green:COLORS.border, position:"relative", flexShrink:0 }}>
                  <div style={{ position:"absolute", top:2, left:sincronizar?18:2, width:16, height:16,
                    borderRadius:"50%", background:"#fff", transition:"left 0.15s" }} />
                </button>
                <div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600,
                    color:sincronizar?COLORS.green:COLORS.textMuted }}>
                    {sincronizar ? "Crear en Finanzas → Cuentas x Cobrar" : "Solo guardar N° (sin registro financiero)"}
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                    {sincronizar ? "Se vincula automáticamente al módulo Rendimiento" : "Puedes crearlo manualmente después"}
                  </div>
                </div>
              </div>

              {/* Opciones monto */}
              {sincronizar && (
                <>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                    letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
                    ¿Qué monto registrar?
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
                    {[
                      { key:"total_cot", label:"Total de la(s) cotización(es)", sub:`${fmtP(totalCot)}`, color:COLORS.accent },
                      { key:"monto_pf",  label:"Monto pagado en comprobantes",  sub:`${fmtP(montoPF)}`, color:COLORS.green },
                      { key:"manual",    label:"Monto manual",                   sub:"Lo ingreso yo",    color:COLORS.yellow },
                    ].map(opt=>(
                      <button key={opt.key} onClick={()=>setSyncMonto(opt.key)}
                        style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                          borderRadius:8, border:`1.5px solid ${syncMonto===opt.key?opt.color:COLORS.border}`,
                          background:syncMonto===opt.key?opt.color+"14":"transparent",
                          cursor:"pointer", textAlign:"left" }}>
                        <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0,
                          border:`2px solid ${opt.color}`,
                          background:syncMonto===opt.key?opt.color:"transparent",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {syncMonto===opt.key && <div style={{ width:6, height:6, borderRadius:"50%", background:"#fff" }} />}
                        </div>
                        <div>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600,
                            color:syncMonto===opt.key?opt.color:COLORS.text }}>{opt.label}</div>
                          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{opt.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {syncMonto==="manual" && (
                    <input type="number" value={montoManual} onChange={e=>setMontoManual(e.target.value)}
                      placeholder="Monto total con IVA"
                      style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.yellow}`,
                        borderRadius:8, padding:"10px 14px", fontFamily:FONT_DISPLAY,
                        fontSize:16, fontWeight:700, color:COLORS.yellow,
                        outline:"none", boxSizing:"border-box", marginBottom:14 }} />
                  )}
                  {montoPreview > 0 && (
                    <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:8,
                      padding:"12px 16px", marginBottom:16, fontFamily:FONT, fontSize:12 }}>
                      {[
                        { l:"Neto:", v:netoPreview, c:COLORS.text },
                        { l:"IVA 19%:", v:ivaPreview, c:COLORS.yellow },
                      ].map((r,i)=>(
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ color:COLORS.textMuted }}>{r.l}</span>
                          <span style={{ color:r.c, fontWeight:600 }}>{fmtP(r.v)}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between",
                        borderTop:`1px solid ${COLORS.border}`, paddingTop:6, marginTop:2 }}>
                        <span style={{ color:COLORS.text, fontWeight:700 }}>Total factura:</span>
                        <span style={{ color:COLORS.accent, fontWeight:700, fontSize:14 }}>{fmtP(montoPreview)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setFacturaModal(null)}
                  style={{ flex:1, padding:"10px 0", background:"transparent",
                    border:`1px solid ${COLORS.border}`, borderRadius:8,
                    color:COLORS.textMuted, fontFamily:FONT_DISPLAY, fontSize:13, cursor:"pointer" }}>
                  Cancelar
                </button>
                <button onClick={saveFacturaPF}
                  disabled={savingFact || !factNum.trim() || (sincronizar && syncMonto==="manual" && !montoManual)}
                  style={{ flex:2, padding:"10px 0", background:COLORS.accent, border:"none",
                    borderRadius:8, color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13,
                    fontWeight:700, cursor:"pointer", opacity:savingFact?0.7:1 }}>
                  {savingFact ? "Guardando…" : sincronizar ? "Guardar y registrar en Finanzas" : "Solo guardar N°"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Vista restringida para colaboradores: pedidos por facturar.
import { useState, useEffect } from "react";
import { hoyISO } from "../shared/format.js";
import { supabase } from "../supabaseClient.js";
import { printResumenPedido } from "../prestaciones/printResumenPedido.js";
import { FONT, COLORS, FONT_DISPLAY } from "../theme.js";
import { EMPRESA_RUT } from "../shared/empresa.js";

// ── VISTA COLABORADOR — Por Facturar ─────────────────────────────────────────
export function ColaboradorView({ session }) {
  const [pfs, setPfs]               = useState([]);
  const [allComprobantes, setAllComprobantes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState({});
  const [cotExpanded, setCotExpanded] = useState({});
  const [cotLines, setCotLines]     = useState({});
  const [editFact, setEditFact] = useState(null); // { pfId, pf obj }
  const [factNum, setFactNum]   = useState("");
  const [saving, setSaving]     = useState(false);

  // Estado modal sincronización
  const [syncMonto, setSyncMonto]   = useState("total_cot"); // "total_cot"|"monto_pf"|"manual"
  const [montoManual, setMontoManual] = useState("");
  const [fechaEmision, setFechaEmision] = useState(hoyISO());
  const [sincronizar, setSincronizar]   = useState(true); // si crear factura_emitida automáticamente

  useEffect(() => {
    (async () => {
      const { data: grupos } = await supabase.from("pedidos")
        .select("*").eq("tipo","pf").order("created_at", { ascending:false });
      if (!grupos) { setLoading(false); return; }

      const allQuoteIds = [...new Set(grupos.flatMap(g => g.quote_ids||[]))];
      let quotesMap = {};
      if (allQuoteIds.length > 0) {
        const { data: cots } = await supabase.from("cotizaciones")
          .select("id,numero,nombre_cliente,razon_social,rut_cliente,total,aplica_iva,direccion")
          .in("id", allQuoteIds);
        (cots||[]).forEach(c => { quotesMap[c.id] = c; });
      }

      // Traer comprobantes_pago con todos los campos necesarios para el PDF detallado
      const { data: comprobantes } = await supabase
        .from("comprobantes_pago")
        .select("id, numero, fecha_pago, responsable, monto_pagado, transacciones, quote_ids, estado")
        .in("estado", ["pf", "emitido", "pagado"]);

      setAllComprobantes(comprobantes||[]);

      const results = grupos.map(g => {
        const cots = (g.quote_ids||[]).map(qid => quotesMap[qid]).filter(Boolean);
        // Sumar monto_pagado de comprobantes que comparten quote_ids con este pedido
        const pedidoQuoteSet = new Set(g.quote_ids||[]);
        const montoPagado = (comprobantes||[])
          .filter(cp => (cp.quote_ids||[]).some(qid => pedidoQuoteSet.has(qid)))
          .reduce((s, cp) => s + Number(cp.monto_pagado||0), 0);
        return { ...g, cots, monto_pagado_calculado: montoPagado };
      });

      setPfs(results);
      setLoading(false);
    })();
  }, []);

  const saveFactura = async (pfId) => {
    if (!factNum.trim()) return;
    setSaving(true);
    const pf = pfs.find(p => p.id === pfId);

    // 1. Guardar N° factura en pedidos (comportamiento original)
    await supabase.from("pedidos").update({ numero_factura: factNum.trim() }).eq("id", pfId);

    // 2. Sincronizar a facturas_emitidas si el usuario lo eligió
    if (sincronizar && pf) {
      const IVA = 0.19;
      // Calcular el monto según la opción elegida
      const totalCot = pf.cots.reduce((s,c) => s + Number(c.total||0), 0);
      const montoPF  = Number(pf.monto_pagado_calculado || 0);

      let montoTotal = 0;
      if (syncMonto === "total_cot")  montoTotal = totalCot;
      else if (syncMonto === "monto_pf") montoTotal = montoPF;
      else montoTotal = Number(montoManual) || 0;

      // Determinar si aplica IVA (tomar de la primera COT)
      const aplicaIva = pf.cots[0]?.aplica_iva ?? true;
      const montoNeto = aplicaIva ? Math.round(montoTotal / 1.19) : montoTotal;
      const montoIva  = aplicaIva ? montoTotal - montoNeto : 0;

      // Cliente de la primera cotización
      const cot0 = pf.cots[0];
      const razon = cot0?.razon_social || cot0?.nombre_cliente || pf.cliente || "";
      const rut   = cot0?.rut_cliente || pf.rut || "";

      // Crear una factura_emitida por cotización vinculada
      for (const cot of pf.cots) {
        // Proporción del monto si hay varias cots
        const prop = pf.cots.length > 1
          ? (Number(cot.total||0) / (totalCot||1))
          : 1;
        const ctTotal = Math.round(montoTotal * prop);
        const ctNeto  = aplicaIva ? Math.round(ctTotal / 1.19) : ctTotal;
        const ctIva   = ctTotal - ctNeto;

        await supabase.from("facturas_emitidas").insert({
          numero_documento:    factNum.trim(),
          tipo_documento:      "Factura",
          fecha_emision:       fechaEmision,
          razon_social_cliente: cot.razon_social || cot.nombre_cliente || razon,
          rut_cliente:          cot.rut_cliente || rut,
          monto_neto:           ctNeto,
          aplica_iva:           aplicaIva,
          monto_iva:            ctIva,
          monto_total:          ctTotal,
          cotizacion_id:        cot.id,
          referencia_cotizacion: `COT-${cot.numero}`,
          notas: `Generado desde PF "${pf.nombre}"`,
        });
      }
    }

    setPfs(prev => prev.map(p => p.id===pfId ? {...p, numero_factura: factNum.trim()} : p));
    setSaving(false);
    setEditFact(null);
    setFactNum("");
    setSyncMonto("total_cot");
    setMontoManual("");
    setSincronizar(true);
  };

  const printPF = (pf) => {
    const fecha = new Date().toLocaleDateString("es-CL", {day:"2-digit",month:"long",year:"numeric"});
    const total = pf.cots.reduce((s,c) => s + Number(c.total||0), 0);
    const cotRows = pf.cots.map(cot => {
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-family:monospace;color:#0ea5e9;font-weight:700">COT-${cot.numero||"—"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${cot.razon_social||cot.nombre_cliente||"—"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">$${Number(cot.total||0).toLocaleString("es-CL")}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${cot.aplica_iva?"Con IVA":"Sin IVA"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;padding:14mm;background:#fff;color:#1e293b}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #0f172a}
      .hdr-logo{height:40px}
      .hdr-title{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px}
      .hdr-sub{font-size:9px;color:#64748b}
      .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;background:#00e5a022;color:#00a371;border:1px solid #00e5a044}
      h2{font-size:12px;font-weight:700;color:#0f172a;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;letter-spacing:0.08em}
      table{width:100%;border-collapse:collapse}
      thead th{background:#0f172a;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:600}
      .total-row td{padding:10px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;border-top:2px solid #0f172a}
      .factura-box{margin-top:16px;padding:12px 16px;border:2px solid ${pf.numero_factura?"#22c55e":"#e2e8f0"};border-radius:8px;background:${pf.numero_factura?"#f0fdf4":"#f8fafc"}}
      .firma{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end}
      @page{size:A4 portrait;margin:0}
      @media print{body{padding:10mm}}
    </style></head><body>
    <div class="hdr">
      <div style="display:flex;align-items:center;gap:14px">
        <img src="https://cdn.prod.website-files.com/696fa5e2a1636324a9a4a146/69ab26415799a62e62fbc137_Recurso%207.png" class="hdr-logo"/>
        <div>
          <div class="hdr-title">Pre-Factura · Documento Interno</div>
          <div class="hdr-sub">${EMPRESA_RUT}</div>
          <div class="hdr-sub">NO VÁLIDO COMO DOCUMENTO LEGAL TRIBUTARIO</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:900;color:#0f172a">${pf.nombre||"Pre-Factura"}</div>
        <div style="margin-top:4px"><span class="badge">${pf.numero_factura ? "Factura N° "+pf.numero_factura : "Pendiente de facturar"}</span></div>
        <div style="font-size:9px;color:#64748b;margin-top:4px">Emitido: ${fecha}</div>
      </div>
    </div>
    <h2>Cotizaciones incluidas</h2>
    <table>
      <thead><tr>
        <th>N° Cotización</th><th>Cliente / Razón Social</th>
        <th style="text-align:right">Total</th><th style="text-align:center">IVA</th>
      </tr></thead>
      <tbody>
        ${cotRows}
        <tr class="total-row"><td colspan="2">TOTAL PRE-FACTURA</td><td colspan="2">$${total.toLocaleString("es-CL")}</td></tr>
      </tbody>
    </table>
    ${pf.descripcion?`<h2>Descripción del servicio</h2><p style="font-size:11px;color:#334155;line-height:1.6">${pf.descripcion}</p>`:""}
    <div class="factura-box">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px">Número de Factura SII</div>
      ${pf.numero_factura
        ? `<div style="font-size:18px;font-weight:900;color:#16a34a">Factura N° ${pf.numero_factura}</div>`
        : `<div style="font-size:13px;color:#94a3b8;font-style:italic">Pendiente de emisión — completar al facturar en SII</div>`}
    </div>
    <div class="firma">
      <div style="text-align:right;font-size:10px;color:#475569">
        <div style="font-weight:700;color:#1e293b;font-size:11px">Firmado digitalmente por</div>
        <div style="font-weight:700;color:#1e293b;font-size:11px">MAXIMO MANUEL HUDSON BLANCO</div>
        <div style="margin-top:3px">Fecha: ${new Date().toLocaleDateString("es-CL")} ${new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}</div>
        <div>${EMPRESA_RUT}</div>
      </div>
    </div>
    <div style="position:fixed;bottom:0;left:0;right:0;padding:4px 20px;border-top:1px solid #e2e8f0;display:flex;align-items:center;background:#fff;z-index:9999"><div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:6px;font-weight:700;color:#0ea5e9;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif">CLAUDE ERP</span><span style="font-size:11px;font-weight:900;color:#0f172a;font-family:Arial,sans-serif;letter-spacing:-0.01em">Polygonos 360</span></div></div>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`;
    const w = window.open("","_blank"); w.document.write(html); w.document.close();
  };

  const fmt = n => `$${Math.round(n).toLocaleString("es-CL")}`;

  // Carga líneas de una COT bajo demanda
  const loadCotLines = async (cotId) => {
    if(cotLines[cotId]) return;
    setCotLines(p=>({...p,[cotId]:"loading"}));
    const { data } = await supabase.from("quote_lines")
      .select("codigo, descripcion, cantidad, precio_unitario, descuento, subtotal, tipo_linea")
      .eq("quote_id", cotId.toString()).order("orden");
    setCotLines(p=>({...p,[cotId]: data||[]}));
  };

  const toggleCot = (cotId) => {
    const next = !cotExpanded[cotId];
    setCotExpanded(p=>({...p,[cotId]:next}));
    if(next) loadCotLines(cotId);
  };

  // Genera el mismo PDF detallado que usa la vista principal (printResumenPedido)
  const printDetallado = (pf) => {
    const pfDocs = allComprobantes.filter(cp =>
      (cp.quote_ids||[]).some(qid => (pf.quote_ids||[]).includes(qid))
    );
    const cotData = (pf.cots||[]).map(cot => {
      const qTotal  = Number(cot.total||0);
      const qDocs   = pfDocs.filter(d => (d.quote_ids||[]).includes(cot.id));
      const qPagado = qDocs.reduce((s,d) =>
        s + (d.transacciones||[]).reduce((a,t)=>a+Number(t.monto||0),0), 0);
      return {
        quote: { number: cot.numero, clientCompany: cot.razon_social, clientName: cot.nombre_cliente, clientRut: cot.rut_cliente },
        docs: qDocs,
        qTotal,
        qPagado,
      };
    });
    const pedidoTotal  = cotData.reduce((s,c)=>s+c.qTotal, 0);
    const pedidoPagado = cotData.reduce((s,c)=>s+c.qPagado, 0);
    let pool = pedidoPagado;
    const cotCompensated = cotData.map(c => {
      const efectivo = Math.min(pool, c.qTotal);
      pool = Math.max(0, pool - c.qTotal);
      const saldo = Math.max(0, c.qTotal - efectivo);
      const pct   = c.qTotal > 0 ? Math.min((efectivo/c.qTotal)*100, 100) : 0;
      return { ...c, efectivo, saldo, pct };
    });
    const pedidoSaldo = Math.max(0, pedidoTotal - pedidoPagado);
    const pedidoPct   = pedidoTotal > 0 ? Math.min((pedidoPagado/pedidoTotal)*100, 100) : 0;
    const isPaid      = pedidoSaldo <= 0 && pedidoTotal > 0;
    printResumenPedido({ ped:pf, cotCompensated, pedidoTotal, pedidoPagado, pedidoSaldo, pedidoPct, isPaid }, pfDocs, true);
  };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4 }}>Portal Colaborador</div>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Por Facturar</div>
        <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginTop:4 }}>
          Sesión: <b style={{color:COLORS.accent}}>{session?.user?.email}</b>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:COLORS.textMuted, fontFamily:FONT }}>Cargando pre-facturas…</div>
      ) : pfs.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:COLORS.textMuted, fontFamily:FONT }}>No hay pre-facturas pendientes</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {pfs.map(pf => {
            const total = (pf.cots||[]).reduce((s,c)=>s+Number(c.total||0),0);
            const isOpen = expanded[pf.id];
            const facturado = !!pf.numero_factura;
            return (
              <div key={pf.id} style={{ background:COLORS.card, border:`1px solid ${facturado?COLORS.green+"44":COLORS.border}`, borderRadius:12, overflow:"hidden" }}>
                {/* Header */}
                <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <div onClick={()=>setExpanded(p=>({...p,[pf.id]:!isOpen}))} style={{ cursor:"pointer", flexShrink:0 }}>
                    <span style={{ color:COLORS.accent, fontSize:14 }}>{isOpen?"▼":"▶"}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:3 }}>
                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:15, fontWeight:700, color:COLORS.text }}>{pf.nombre}</span>
                      {facturado
                        ? <span style={{ fontFamily:FONT, fontSize:11, background:`${COLORS.green}22`, color:COLORS.green, border:`1px solid ${COLORS.green}44`, borderRadius:10, padding:"2px 10px" }}>✓ Factura N° {pf.numero_factura}</span>
                        : <span style={{ fontFamily:FONT, fontSize:11, background:"#FFB80022", color:"#FFB800", border:"1px solid #FFB80044", borderRadius:10, padding:"2px 10px" }}>Pendiente</span>
                      }
                    </div>
                    <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                      {pf.cots.length} cotización(es) · Total: <b style={{color:COLORS.accent}}>{fmt(total)}</b>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <button onClick={()=>printDetallado(pf)} style={{ padding:"6px 14px", background:`${COLORS.green}22`, border:`1px solid ${COLORS.green}44`, borderRadius:6, color:COLORS.green, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>🖨 PDF Detallado</button>
                    {!facturado && (
                      <button onClick={()=>{ setEditFact({pfId:pf.id, pf}); setFactNum(pf.numero_factura||""); setSyncMonto("total_cot"); setMontoManual(""); setSincronizar(true); setFechaEmision(hoyISO()); }}
                        style={{ padding:"6px 14px", background:COLORS.accentDim, border:`1px solid ${COLORS.accent}44`, borderRadius:6, color:COLORS.accent, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                        + N° Factura
                      </button>
                    )}
                    {facturado && (
                      <button onClick={()=>{ setEditFact({pfId:pf.id, pf}); setFactNum(pf.numero_factura||""); setSyncMonto("total_cot"); setMontoManual(""); setSincronizar(false); setFechaEmision(hoyISO()); }}
                        style={{ padding:"6px 10px", background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.textMuted, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>✏️</button>
                    )}
                  </div>
                </div>
                {/* COTs detalle */}
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"10px 18px 14px" }}>
                    <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Cotizaciones incluidas</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {pf.cots.map(cot => {
                        const isExpCot = !!cotExpanded[cot.id];
                        const lines    = cotLines[cot.id];
                        const fmtN = n => "$"+Math.round(n||0).toLocaleString("es-CL");
                        return (
                          <div key={cot.id} style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, overflow:"hidden" }}>
                            {/* Fila resumen COT */}
                            <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
                              onClick={()=>toggleCot(cot.id)}>
                              <span style={{ color:COLORS.accent, fontSize:11, flexShrink:0 }}>{isExpCot?"▼":"▶"}</span>
                              <div style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:COLORS.accent, flexShrink:0 }}>COT-{cot.numero||"—"}</div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600, color:COLORS.text }}>{cot.razon_social||cot.nombre_cliente||"—"}</div>
                                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>{cot.aplica_iva?"Con IVA":"Sin IVA"} · Toca para ver ítems</div>
                              </div>
                              <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.accent, flexShrink:0 }}>{fmt(cot.total||0)}</div>
                            </div>
                            {/* Tabla de líneas */}
                            {isExpCot && (
                              <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"10px 14px" }}>
                                {lines==="loading" ? (
                                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textAlign:"center", padding:"12px 0" }}>Cargando ítems…</div>
                                ) : lines && lines.length > 0 ? (
                                  <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FONT, fontSize:11 }}>
                                    <thead>
                                      <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                                        {["Código","Descripción","Cant.","P.Unit.","Desc.%","Subtotal"].map(h=>(
                                          <th key={h} style={{ padding:"4px 8px", textAlign:"left", fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lines.filter(l=>l.tipo_linea!=="hito").map((l,i)=>{
                                        const neto = Math.round(Number(l.precio_unitario||0)*(1-Number(l.descuento||0)/100)*Number(l.cantidad||1));
                                        const sub  = cot.aplica_iva ? Math.round(neto*1.19) : neto;
                                        return (
                                          <tr key={i} style={{ borderBottom:`1px solid ${COLORS.border}22` }}>
                                            <td style={{ padding:"5px 8px", color:COLORS.accent, fontFamily:"monospace", fontSize:10 }}>{l.codigo||"—"}</td>
                                            <td style={{ padding:"5px 8px", color:COLORS.text }}>{l.descripcion}</td>
                                            <td style={{ padding:"5px 8px", color:COLORS.textMuted, textAlign:"center" }}>{l.cantidad}</td>
                                            <td style={{ padding:"5px 8px", color:COLORS.textMuted, textAlign:"right" }}>{fmtN(l.precio_unitario)}</td>
                                            <td style={{ padding:"5px 8px", color:COLORS.textMuted, textAlign:"center" }}>{l.descuento||0}%</td>
                                            <td style={{ padding:"5px 8px", color:COLORS.text, fontWeight:700, textAlign:"right" }}>{fmtN(sub)}</td>
                                          </tr>
                                        );
                                      })}
                                      <tr>
                                        <td colSpan={5} style={{ padding:"6px 8px", textAlign:"right", fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.06em" }}>Total{cot.aplica_iva?" (con IVA)":""}</td>
                                        <td style={{ padding:"6px 8px", textAlign:"right", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.accent }}>{fmt(cot.total||0)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                ) : (
                                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, textAlign:"center", padding:"8px 0" }}>Sin ítems registrados</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {pf.descripcion && (
                      <div style={{ marginTop:10, fontFamily:FONT, fontSize:11, color:COLORS.textMuted, background:COLORS.bg, borderRadius:6, padding:"8px 12px" }}>
                        <b style={{color:COLORS.text}}>Descripción:</b> {pf.descripcion}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal ingresar N° factura + sincronización */}
      {editFact && (() => {
        const pf         = editFact.pf;
        const totalCot   = pf.cots.reduce((s,c) => s + Number(c.total||0), 0);
        const montoPF    = Number(pf.monto_pagado_calculado || 0);
        const montoPreview =
          syncMonto === "total_cot"  ? totalCot :
          syncMonto === "monto_pf"   ? montoPF  :
          Number(montoManual) || 0;
        const aplicaIva  = pf.cots[0]?.aplica_iva ?? true;
        const netoPreview = aplicaIva ? Math.round(montoPreview / 1.19) : montoPreview;
        const ivaPreview  = montoPreview - netoPreview;
        const fmt = n => "$" + Math.round(n||0).toLocaleString("es-CL");
        const esEdicion = !!pf.numero_factura;

        return (
          <div style={{ position:"fixed", inset:0, background:"#000A", zIndex:300,
            display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`,
              borderRadius:14, padding:24, width:"100%", maxWidth:500,
              maxHeight:"92vh", overflowY:"auto" }}>

              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <div>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent,
                    letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:2 }}>
                    {esEdicion ? "Editar factura emitida" : "Registrar factura emitida"}
                  </div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700,
                    color:COLORS.text }}>{pf.nombre}</div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginTop:2 }}>
                    {pf.cots.length} COT · {fmt(totalCot)}
                  </div>
                </div>
                <button onClick={()=>setEditFact(null)}
                  style={{ background:"transparent", border:"none",
                    color:COLORS.textMuted, cursor:"pointer", fontSize:20 }}>✕</button>
              </div>

              {/* N° Factura SII */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                  letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>
                  N° Factura emitida en el SII
                </div>
                <input value={factNum} onChange={e=>setFactNum(e.target.value)}
                  placeholder="Ej: 1234567"
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
                    borderRadius:8, padding:"11px 14px", fontFamily:FONT_DISPLAY,
                    fontSize:20, fontWeight:700, color:COLORS.accent,
                    outline:"none", boxSizing:"border-box", letterSpacing:"0.05em" }} />
              </div>

              {/* Fecha emisión */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                  letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>
                  Fecha de emisión
                </div>
                <input type="date" value={fechaEmision} onChange={e=>setFechaEmision(e.target.value)}
                  style={{ width:"100%", background:COLORS.bg, border:`1px solid ${COLORS.border}`,
                    borderRadius:8, padding:"10px 14px", fontFamily:FONT, fontSize:13,
                    color:COLORS.text, outline:"none", boxSizing:"border-box" }} />
              </div>

              {/* Toggle sincronizar */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:sincronizar?16:20,
                padding:"10px 14px", background:sincronizar?COLORS.green+"12":COLORS.bg,
                border:`1px solid ${sincronizar?COLORS.green+"44":COLORS.border}`,
                borderRadius:8 }}>
                <button onClick={()=>setSincronizar(p=>!p)}
                  style={{ width:36, height:20, borderRadius:10, border:"none", cursor:"pointer",
                    background:sincronizar?COLORS.green:COLORS.border, position:"relative",
                    flexShrink:0, transition:"background 0.2s" }}>
                  <div style={{ position:"absolute", top:2,
                    left:sincronizar?18:2, width:16, height:16, borderRadius:"50%",
                    background:"#fff", transition:"left 0.15s" }} />
                </button>
                <div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600,
                    color:sincronizar?COLORS.green:COLORS.textMuted }}>
                    {sincronizar ? "Crear en Finanzas → Cuentas x Cobrar" : "Solo guardar N° (sin crear registro financiero)"}
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                    {sincronizar ? "Se vincula automáticamente al módulo Rendimiento" : "Puedes crearlo manualmente después en Finanzas"}
                  </div>
                </div>
              </div>

              {/* Opciones de monto — solo si sincronizar está ON */}
              {sincronizar && (
                <>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted,
                    letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
                    ¿Qué monto registrar como factura?
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
                    {[
                      { key:"total_cot", label:"Total de la(s) cotización(es)", sub:`${fmt(totalCot)} · suma de COTs vinculadas`, color:COLORS.accent },
                      { key:"monto_pf",  label:"Monto pagado en comprobantes", sub:`${fmt(montoPF)} · suma de comprobantes vinculados`, color:COLORS.green },
                      { key:"manual",    label:"Monto manual", sub:"Lo ingreso yo", color:COLORS.yellow },
                    ].map(opt => (
                      <button key={opt.key} onClick={()=>setSyncMonto(opt.key)}
                        style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                          borderRadius:8, border:`1.5px solid ${syncMonto===opt.key?opt.color:COLORS.border}`,
                          background:syncMonto===opt.key?opt.color+"14":"transparent",
                          cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
                        <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0,
                          border:`2px solid ${opt.color}`,
                          background:syncMonto===opt.key?opt.color:"transparent",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {syncMonto===opt.key && <div style={{ width:6, height:6,
                            borderRadius:"50%", background:"#fff" }} />}
                        </div>
                        <div>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:600,
                            color:syncMonto===opt.key?opt.color:COLORS.text }}>{opt.label}</div>
                          <div style={{ fontFamily:FONT, fontSize:11,
                            color:COLORS.textMuted }}>{opt.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Input manual */}
                  {syncMonto === "manual" && (
                    <div style={{ marginBottom:14 }}>
                      <input type="number" value={montoManual}
                        onChange={e=>setMontoManual(e.target.value)}
                        placeholder="Ingresa el monto total (con IVA)"
                        style={{ width:"100%", background:COLORS.bg,
                          border:`1px solid ${COLORS.yellow}`,
                          borderRadius:8, padding:"10px 14px", fontFamily:FONT_DISPLAY,
                          fontSize:16, fontWeight:700, color:COLORS.yellow,
                          outline:"none", boxSizing:"border-box" }} />
                    </div>
                  )}

                  {/* Preview */}
                  {montoPreview > 0 && (
                    <div style={{ background:COLORS.bg, border:`1px solid ${COLORS.border}`,
                      borderRadius:8, padding:"12px 16px", marginBottom:16,
                      fontFamily:FONT, fontSize:12 }}>
                      <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted,
                        textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
                        Vista previa — se creará en Cuentas x Cobrar
                      </div>
                      {[
                        { l:"Neto (sin IVA)", v:netoPreview, c:COLORS.text },
                        { l:`IVA 19% ${!aplicaIva?"(exenta)":""}`, v:ivaPreview, c:COLORS.yellow },
                      ].map((r,i)=>(
                        <div key={i} style={{ display:"flex", justifyContent:"space-between",
                          padding:"5px 0", borderBottom:`1px solid ${COLORS.border}` }}>
                          <span style={{ color:COLORS.textMuted }}>{r.l}</span>
                          <span style={{ color:r.c, fontWeight:600 }}>{fmt(r.v)}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between",
                        paddingTop:8, marginTop:2 }}>
                        <span style={{ fontFamily:FONT_DISPLAY, fontSize:13,
                          fontWeight:700, color:COLORS.text }}>Total factura</span>
                        <span style={{ fontFamily:FONT_DISPLAY, fontSize:16,
                          fontWeight:700, color:COLORS.accent }}>{fmt(montoPreview)}</span>
                      </div>
                      {pf.cots.length > 1 && (
                        <div style={{ marginTop:8, fontFamily:FONT, fontSize:10,
                          color:COLORS.textMuted, fontStyle:"italic" }}>
                          Se prorrateará en {pf.cots.length} facturas según peso de cada COT
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Botones */}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setEditFact(null)}
                  style={{ flex:1, padding:"10px 0", background:"transparent",
                    border:`1px solid ${COLORS.border}`, borderRadius:8,
                    color:COLORS.textMuted, fontFamily:FONT_DISPLAY,
                    fontSize:13, cursor:"pointer" }}>Cancelar</button>
                <button onClick={()=>saveFactura(editFact.pfId)}
                  disabled={saving || !factNum.trim() || (sincronizar && syncMonto==="manual" && !montoManual)}
                  style={{ flex:2, padding:"10px 0",
                    background:saving?"#666":COLORS.accent, border:"none", borderRadius:8,
                    color:COLORS.bg, fontFamily:FONT_DISPLAY, fontSize:13,
                    fontWeight:700, cursor:saving?"not-allowed":"pointer",
                    opacity:saving?0.7:1 }}>
                  {saving ? "Guardando…" : sincronizar ? "Guardar y registrar en Finanzas" : "Solo guardar N°"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

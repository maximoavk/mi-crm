// Grilla de pedidos (CP) y pre-facturas (PF) con sus documentos.
import { useState } from "react";
import { FONT_DISPLAY, COLORS, FONT } from "../theme.js";
import { Badge } from "../shared/ui.jsx";
import { printResumenPedido } from "./printResumenPedido.js";
import { fmtDate } from "../shared/format.js";

// ── PEDIDOS GRID (CP + PF unificado) ─────────────────────────────────────────
export function PedidosGrid({ pedidos, quotes, docs, isPF, AC, docLabel, onEditPedido, onDeletePedido, onNuevoDoc, onEditDoc, onReprintDoc, onDeleteDoc, onRegistrarFactura }) {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (k) => setCollapsed(p=>({...p,[k]:!p[k]}));

  const lineSubtotal = l => {
    const qty=Number(l.qty||1), p=Number(l.unitPrice||0), d=Number(l.discount||0);
    const neto = Math.round(p*(1-d/100)*qty);
    return isPF ? Math.round(neto*1.19) : neto;
  };
  const fmt = v => "$"+Math.round(v).toLocaleString("es-CL");

  // Suma SOLO las transacciones bancarias reales del documento
  const txPagado = doc => (doc.transacciones||[]).reduce((s,t)=>s+Number(t.monto||0),0);

  const MiniBar = ({pct,color,h=4}) => (
    <div style={{ height:h, background:"#1F2535", borderRadius:99, overflow:"hidden", flex:1 }}>
      <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:color, borderRadius:99, transition:"width 0.3s" }} />
    </div>
  );

  // ── Enriquecer pedidos con COTs y compensación ─────────────────────────────
  const pedidosEnrich = pedidos.map(ped => {
    const pedQuotes = quotes.filter(q=>(ped.quote_ids||[]).includes(q.id));
    const pedDocs   = docs.filter(d=>(d.quote_ids||[]).some(qid=>(ped.quote_ids||[]).includes(qid)));

    const cotData = pedQuotes.map(q=>{
      const qTotal  = q.total||0;  // q.total ya refleja el precio c/IVA con descuentos aplicados
      const qDocs   = docs.filter(d=>(d.quote_ids||[]).includes(q.id));
      const qPagado = qDocs.reduce((s,d)=>s+txPagado(d),0);  // ← transacciones reales
      return { quote:q, docs:qDocs, qTotal, qPagado };
    });

    const pedidoTotal  = cotData.reduce((s,c)=>s+c.qTotal,0);
    const pedidoPagado = cotData.reduce((s,c)=>s+c.qPagado,0);  // ← transacciones reales

    // Compensación global: pool distribuido en orden
    let pool = pedidoPagado;
    const cotCompensated = cotData.map(c=>{
      const efectivo = Math.min(pool, c.qTotal);
      pool = Math.max(0, pool - c.qTotal);
      const saldo = Math.max(0, c.qTotal - efectivo);
      const pct   = c.qTotal>0 ? Math.min((efectivo/c.qTotal)*100,100) : 0;
      return { ...c, efectivo, saldo, pct };
    });

    const pedidoSaldo = Math.max(0, pedidoTotal - pedidoPagado);
    const pedidoPct   = pedidoTotal>0 ? Math.min((pedidoPagado/pedidoTotal)*100,100) : 0;
    const isPaid      = pedidoSaldo <= 0 && pedidoTotal > 0;
    return { ped, cotCompensated, pedidoTotal, pedidoPagado, pedidoSaldo, pedidoPct, isPaid };
  });

  // COTs sin pedido que tienen documentos
  const assignedIds = new Set(pedidos.flatMap(p=>p.quote_ids||[]));
  const orphanQuotes = quotes.filter(q=>!assignedIds.has(q.id) && docs.some(d=>(d.quote_ids||[]).includes(q.id)));

  const serieLabel = isPF ? "COT" : "SIN";
  const qPrefix    = (q) => `${serieLabel}-${String(q.number).padStart(3,"0")}`;

  if(pedidosEnrich.length===0 && orphanQuotes.length===0)
    return (
      <div style={{ textAlign:"center", padding:70 }}>
        <div style={{ fontSize:32, marginBottom:10 }}>{isPF?"🧾":"📦"}</div>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:15, color:COLORS.textMuted, marginBottom:6 }}>
          Sin {isPF?"pre-facturas":"pedidos"} aún
        </div>
        <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>
          {isPF ? "Crea una Pre-Factura para agrupar cotizaciones COT." : "Crea tu primer Pedido y vincula cotizaciones SIN."}
        </div>
      </div>
    );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {pedidosEnrich.map(({ ped, cotCompensated, pedidoTotal, pedidoPagado, pedidoSaldo, pedidoPct, isPaid }) => {
        const isOpen = !!collapsed[ped.id];
        const R=52, r=34, cx=60, cy=60, circum=2*Math.PI*r;
        const pagadoPct  = pedidoTotal>0 ? Math.min(pedidoPagado/pedidoTotal,1) : 0;
        const dashPagado = pagadoPct*circum;
        const dashSaldo  = (1-pagadoPct)*circum;

        return (
          <div key={ped.id} style={{ background:COLORS.card, border:`1px solid ${isPaid?COLORS.green+"55":COLORS.border}`, borderRadius:16, overflow:"hidden" }}>

            {/* ── HEADER ── */}
            <div style={{ borderLeft:`4px solid ${isPaid?COLORS.green:AC}`, display:"flex", alignItems:"center" }}>

              {/* Área expandible */}
              <div onClick={()=>toggle(ped.id)} style={{ flex:1, display:"flex", alignItems:"center", gap:12, padding:"13px 14px", cursor:"pointer", userSelect:"none", minWidth:0 }}>
                <span style={{ fontSize:10, color:COLORS.textMuted, flexShrink:0, display:"inline-block", transition:"transform 0.2s", transform:isOpen?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
                <div style={{ flexShrink:0 }}>
                  <div style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>{isPF?"Pre-Factura":"Pedido"}</div>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:AC }}>{ped.nombre}</div>
                </div>
                <div style={{ flex:1, overflow:"hidden", minWidth:0 }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {ped.cliente||cotCompensated[0]?.quote.clientCompany||cotCompensated[0]?.quote.clientName||""}
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginTop:1 }}>
                    {cotCompensated.map(c=>qPrefix(c.quote)).join(" · ")}
                  </div>
                </div>
                <Badge color={isPaid?COLORS.green:pedidoPct>0?COLORS.yellow:COLORS.textMuted}>
                  {isPaid?"Pagado":pedidoPct>0?"Parcial":"Pendiente"}
                </Badge>
                <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0, width:95 }}>
                  <MiniBar pct={pedidoPct} color={isPaid?COLORS.green:`linear-gradient(90deg,${AC},${COLORS.green})`} h={4}/>
                  <span style={{ fontFamily:FONT, fontSize:10, color:isPaid?COLORS.green:AC, minWidth:26, textAlign:"right" }}>{pedidoPct.toFixed(0)}%</span>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:isPaid?COLORS.green:COLORS.text }}>{fmt(pedidoPagado)}</div>
                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>de {fmt(pedidoTotal)}</div>
                </div>
                <div style={{ background:`${AC}22`, border:`1px solid ${AC}33`, borderRadius:20, padding:"2px 9px", fontFamily:FONT, fontSize:9, color:AC, flexShrink:0 }}>
                  {cotCompensated.length} {serieLabel}
                </div>
              </div>

              {/* Botones compactos — siempre visibles */}
              <div style={{ display:"flex", alignItems:"center", gap:4, padding:"0 12px", flexShrink:0 }}>
                {/* Botón N° Factura — solo en Pre-Facturas */}
                {isPF && (
                  <button
                    title={ped.numero_factura ? `Factura N° ${ped.numero_factura}` : "Registrar N° Factura SII"}
                    onClick={()=>onRegistrarFactura && onRegistrarFactura(ped, cotCompensated)}
                    style={{ padding:"6px 10px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11,
                      fontWeight:700, cursor:"pointer",
                      background: ped.numero_factura ? `${COLORS.green}22` : `${COLORS.accent}22`,
                      border: `1px solid ${ped.numero_factura ? COLORS.green : COLORS.accent}55`,
                      color: ped.numero_factura ? COLORS.green : COLORS.accent }}>
                    {ped.numero_factura ? `✓ ${ped.numero_factura}` : "+ N° Fact."}
                  </button>
                )}
                <button
                  title="Imprimir resumen"
                  onClick={()=>printResumenPedido({ ped, cotCompensated, pedidoTotal, pedidoPagado, pedidoSaldo, pedidoPct, isPaid }, docs, isPF)}
                  style={{ padding:"6px 10px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer", background:`${AC}22`, border:`1px solid ${AC}55`, color:AC }}>
                  🖨
                </button>
                <button
                  title="Editar pedido"
                  onClick={()=>onEditPedido(ped)}
                  style={{ padding:"6px 10px", borderRadius:7, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.secondary}44`, color:COLORS.secondary }}>
                  ✏️
                </button>
                <button
                  title="Eliminar pedido"
                  onClick={()=>onDeletePedido(ped.id)}
                  style={{ padding:"6px 9px", borderRadius:7, fontSize:11, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.red}44`, color:COLORS.red }}>
                  ✕
                </button>
              </div>
            </div>

            {/* ── EXPANDIDO ── */}
            {isOpen && (
              <div style={{ borderTop:`1px solid ${COLORS.border}22`, padding:"16px 20px 20px", background:COLORS.surface+"28" }}>
                <div style={{ display:"flex", gap:18, alignItems:"flex-start", flexWrap:"wrap" }}>

                  {/* Dona */}
                  <div style={{ flexShrink:0, width:130 }}>
                    <svg width={120} height={120} viewBox="0 0 120 120">
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.border} strokeWidth={R-r}/>
                      {(1-pagadoPct)>0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#pgSaldo)" strokeWidth={R-r}
                        strokeDasharray={`${dashSaldo} ${circum-dashSaldo}`} strokeDashoffset={-(pagadoPct*circum)}
                        strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`}/>}
                      {pagadoPct>0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#pgPagado)" strokeWidth={R-r}
                        strokeDasharray={`${dashPagado} ${circum-dashPagado}`}
                        strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`}/>}
                      <defs>
                        <linearGradient id="pgPagado" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={AC}/><stop offset="100%" stopColor={COLORS.green}/></linearGradient>
                        <linearGradient id="pgSaldo"  x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={COLORS.yellow}/><stop offset="100%" stopColor={COLORS.red}/></linearGradient>
                      </defs>
                      <text x={cx} y={cy-6} textAnchor="middle" fill={COLORS.text} fontSize="14" fontWeight="700" fontFamily="Space Grotesk,sans-serif">{pedidoPct.toFixed(0)}%</text>
                      <text x={cx} y={cy+10} textAnchor="middle" fill={COLORS.textMuted} fontSize="8" fontFamily="DM Mono,monospace">PAGADO</text>
                    </svg>
                    <div style={{ display:"flex", flexDirection:"column", gap:3, marginTop:4 }}>
                      {[
                        {label:"Pagado", val:pedidoPagado, color:COLORS.green,  grad:`linear-gradient(135deg,${AC},${COLORS.green})`},
                        {label:"Saldo",  val:pedidoSaldo,  color:COLORS.yellow, grad:`linear-gradient(135deg,${COLORS.yellow},${COLORS.red})`},
                        {label:"Total",  val:pedidoTotal,  color:COLORS.text,   grad:COLORS.border},
                      ].map(({label,val,color,grad})=>(
                        <div key={label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <div style={{ width:8,height:8,borderRadius:99,background:grad,flexShrink:0 }}/>
                          <span style={{ fontFamily:FONT,fontSize:8,color:COLORS.textMuted }}>{label}</span>
                          <span style={{ fontFamily:FONT_DISPLAY,fontSize:9,color,marginLeft:"auto",fontWeight:700 }}>{fmt(val)}</span>
                        </div>
                      ))}
                      {pedidoPagado>pedidoTotal && pedidoTotal>0 && (
                        <div style={{ marginTop:4,padding:"3px 6px",borderRadius:5,background:`${AC}22`,border:`1px solid ${AC}44` }}>
                          <span style={{ fontFamily:FONT,fontSize:8,color:AC }}>↑ Sobrepago: {fmt(pedidoPagado-pedidoTotal)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COTs */}
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10, minWidth:280 }}>
                    {cotCompensated.map(({ quote:q, docs:qDocs, qTotal, efectivo, saldo, pct }) => {
                      const cotKey = `cot-${ped.id}-${q.id}`;
                      const isCotOpen = !!collapsed[cotKey];
                      const qPaid = saldo<=0 && qTotal>0;
                      const isComp = efectivo > qDocs.reduce((s,d)=>s+Number(d.monto_pagado||0),0);
                      return (
                        <div key={q.id} style={{ background:COLORS.card, border:`1px solid ${qPaid?COLORS.green+"44":COLORS.border}`, borderRadius:10, overflow:"hidden" }}>
                          {/* COT row */}
                          <div style={{ display:"flex", alignItems:"stretch", borderLeft:`3px solid ${qPaid?COLORS.green:AC+"88"}` }}>
                            <div onClick={()=>toggle(cotKey)}
                              style={{ flex:1, display:"flex", alignItems:"center", gap:10, padding:"9px 12px", cursor:"pointer", userSelect:"none", minWidth:0 }}>
                              <span style={{ fontSize:10, color:COLORS.textMuted, flexShrink:0, display:"inline-block", transition:"transform 0.2s", transform:isCotOpen?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
                              <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:AC, flexShrink:0 }}>{qPrefix(q)}</span>
                              <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{q.clientCompany||q.clientName}</span>
                              {isComp && <span style={{ fontFamily:FONT, fontSize:8, color:AC, background:`${AC}22`, borderRadius:4, padding:"1px 5px", flexShrink:0 }}>⇄ comp.</span>}
                              <Badge color={qPaid?COLORS.green:COLORS.yellow} size="sm">{qPaid?"Pagado":"Pendiente"}</Badge>
                              <div style={{ display:"flex", alignItems:"center", gap:5, width:85, flexShrink:0 }}>
                                <MiniBar pct={pct} color={qPaid?COLORS.green:`linear-gradient(90deg,${AC},${COLORS.green})`} h={4}/>
                                <span style={{ fontFamily:FONT, fontSize:9, color:qPaid?COLORS.green:AC, minWidth:24, textAlign:"right" }}>{pct.toFixed(0)}%</span>
                              </div>
                              <div style={{ textAlign:"right", flexShrink:0 }}>
                                <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:qPaid?COLORS.green:COLORS.text }}>{fmt(efectivo)}</div>
                                <div style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted }}>de {fmt(qTotal)}</div>
                              </div>
                              <div style={{ background:`${AC}22`, border:`1px solid ${AC}33`, borderRadius:20, padding:"1px 8px", fontFamily:FONT, fontSize:9, color:AC, flexShrink:0 }}>
                                {qDocs.length} {docLabel}
                              </div>
                            </div>
                          </div>

                          {/* Documentos dentro de la COT */}
                          {isCotOpen && (
                            <div style={{ borderTop:`1px solid ${COLORS.border}22`, padding:"14px 14px 14px", background:COLORS.surface+"44" }}>
                              <div style={{ display:"flex", gap:14, alignItems:"flex-start", flexWrap:"wrap" }}>

                                {/* Dona COT */}
                                <div style={{ flexShrink:0, width:120, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                                  {(() => {
                                    const R2=44,r2=28,cx2=52,cy2=52,circ2=2*Math.PI*r2;
                                    const pPct = qTotal>0 ? Math.min(efectivo/qTotal,1) : 0;
                                    const dP = pPct*circ2, dS = (1-pPct)*circ2;
                                    const qPagadoReal = qDocs.reduce((s,d)=>s+Number(d.monto_pagado||0),0);
                                    return (
                                      <>
                                        <svg width={104} height={104} viewBox="0 0 104 104">
                                          <circle cx={cx2} cy={cy2} r={r2} fill="none" stroke={COLORS.border} strokeWidth={R2-r2}/>
                                          {(1-pPct)>0 && <circle cx={cx2} cy={cy2} r={r2} fill="none" stroke="url(#cotSaldo)" strokeWidth={R2-r2}
                                            strokeDasharray={`${dS} ${circ2-dS}`} strokeDashoffset={-(pPct*circ2)}
                                            strokeLinecap="butt" transform={`rotate(-90 ${cx2} ${cy2})`}/>}
                                          {pPct>0 && <circle cx={cx2} cy={cy2} r={r2} fill="none" stroke="url(#cotPagado)" strokeWidth={R2-r2}
                                            strokeDasharray={`${dP} ${circ2-dP}`}
                                            strokeLinecap="butt" transform={`rotate(-90 ${cx2} ${cy2})`}/>}
                                          <defs>
                                            <linearGradient id="cotPagado" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={AC}/><stop offset="100%" stopColor={COLORS.green}/></linearGradient>
                                            <linearGradient id="cotSaldo"  x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={COLORS.yellow}/><stop offset="100%" stopColor={COLORS.red}/></linearGradient>
                                          </defs>
                                          <text x={cx2} y={cy2-5} textAnchor="middle" fill={COLORS.text} fontSize="13" fontWeight="700" fontFamily="Space Grotesk,sans-serif">{(pPct*100).toFixed(0)}%</text>
                                          <text x={cx2} y={cy2+9} textAnchor="middle" fill={COLORS.textMuted} fontSize="7" fontFamily="DM Mono,monospace">PAGADO</text>
                                        </svg>
                                        <div style={{ display:"flex", flexDirection:"column", gap:3, width:"100%" }}>
                                          {[
                                            {label:"Pagado", val:efectivo,           color:COLORS.green,  grad:`linear-gradient(135deg,${AC},${COLORS.green})`},
                                            {label:"Saldo",  val:Math.max(0,saldo),  color:COLORS.yellow, grad:`linear-gradient(135deg,${COLORS.yellow},${COLORS.red})`},
                                            {label:"Total",  val:qTotal,             color:COLORS.text,   grad:COLORS.border},
                                          ].map(({label,val,color,grad})=>(
                                            <div key={label} style={{ display:"flex", alignItems:"center", gap:4 }}>
                                              <div style={{ width:7,height:7,borderRadius:99,background:grad,flexShrink:0 }}/>
                                              <span style={{ fontFamily:FONT,fontSize:8,color:COLORS.textMuted }}>{label}</span>
                                              <span style={{ fontFamily:FONT_DISPLAY,fontSize:8,color,marginLeft:"auto",fontWeight:700 }}>{fmt(val)}</span>
                                            </div>
                                          ))}
                                          {qPagadoReal>qTotal && qTotal>0 && (
                                            <div style={{ marginTop:3,padding:"2px 5px",borderRadius:4,background:`${AC}22`,border:`1px solid ${AC}44` }}>
                                              <span style={{ fontFamily:FONT,fontSize:7,color:AC }}>⇄ comp. {fmt(qPagadoReal-qTotal)}</span>
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Líneas de la COT */}
                                {(q.lines||[]).length > 0 && (
                                  <div style={{ flexShrink:0, minWidth:200, maxWidth:280 }}>
                                    <div style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Líneas de cotización</div>
                                    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                                      {q.lines.slice(0,6).map((l,i)=>{
                                        const qty=Number(l.qty||1), p=Number(l.unitPrice||0), d=Number(l.discount||0);
                                        const sub=Math.round(p*(1-d/100)*qty);
                                        return (
                                          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 0", borderBottom:`1px solid ${COLORS.border}22` }}>
                                            <span style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted, width:16, flexShrink:0, textAlign:"right" }}>{qty}×</span>
                                            <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.description||l.descripcion||"—"}</span>
                                            <span style={{ fontFamily:FONT_DISPLAY, fontSize:9, color:COLORS.text, flexShrink:0 }}>{fmt(sub)}</span>
                                          </div>
                                        );
                                      })}
                                      {q.lines.length>6 && <div style={{ fontFamily:FONT,fontSize:8,color:COLORS.textMuted,marginTop:2 }}>+{q.lines.length-6} líneas más…</div>}
                                    </div>
                                  </div>
                                )}

                                {/* CPs / PFs */}
                                <div style={{ flex:1, display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-start", minWidth:200 }}>
                                  {qDocs.map(doc=>{
                                    const txs      = (doc.transacciones||[]).filter(t=>Number(t.monto)>0);
                                    const txTot    = txs.reduce((s,t)=>s+Number(t.monto||0),0);
                                    const docNominal = Number(doc.monto_pagado||0);
                                    // Barras basadas en transacciones reales vs total COT
                                    const docPct   = qTotal>0 ? Math.min((txTot/qTotal)*100, 100) : 0;
                                    const saldoPct = qTotal>0 ? Math.min((Math.max(0,qTotal-txTot)/qTotal)*100, 100) : 0;
                                    const docPagado= txTot>0;
                                    const docEstado= docPagado ? "Pagado" : "Sin pago";
                                    return (
                                      <div key={doc.id} style={{ background:COLORS.card, border:`1px solid ${docPagado?COLORS.green+"44":COLORS.yellow+"44"}`, borderRadius:9, padding:"11px 13px", width:215, flexShrink:0 }}>
                                        {/* Header doc */}
                                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                                          <div>
                                            <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:AC }}>{doc.numero}</div>
                                            <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>{fmtDate(doc.fecha_pago)} · {doc.responsable||""}</div>
                                          </div>
                                          <div style={{ textAlign:"right" }}>
                                            <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:docPagado?COLORS.green:COLORS.yellow }}>
                                              {docPagado ? fmt(txTot) : fmt(docNominal)}
                                            </div>
                                            {docPagado && docNominal!==txTot && (
                                              <div style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted }}>decl: {fmt(docNominal)}</div>
                                            )}
                                            <div style={{ fontFamily:FONT, fontSize:8, padding:"1px 5px", borderRadius:4, background:docPagado?`${COLORS.green}22`:`${COLORS.yellow}22`, color:docPagado?COLORS.green:COLORS.yellow, marginTop:2 }}>
                                              {docEstado}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Transacciones bancarias */}
                                        {txs.length>0 ? (
                                          <div style={{ marginBottom:7, padding:"5px 7px", background:COLORS.surface, borderRadius:5 }}>
                                            {txs.slice(0,3).map((t,i)=>(
                                              <div key={i} style={{ fontFamily:FONT,fontSize:8,color:COLORS.textMuted,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                                                🏦 {t.codigo?t.codigo.slice(0,16)+"…":"—"} · {fmt(Number(t.monto||0))}
                                              </div>
                                            ))}
                                            {txs.length>3 && <div style={{ fontFamily:FONT,fontSize:8,color:COLORS.textMuted }}>+{txs.length-3} más…</div>}
                                          </div>
                                        ) : (
                                          <div style={{ marginBottom:7, padding:"5px 7px", background:`${COLORS.yellow}11`, border:`1px dashed ${COLORS.yellow}44`, borderRadius:5 }}>
                                            <span style={{ fontFamily:FONT, fontSize:8, color:COLORS.yellow }}>⚠ Sin transacciones bancarias</span>
                                          </div>
                                        )}

                                        {/* Barras — respecto al total de la COT */}
                                        <div style={{ marginBottom:7 }}>
                                          {[
                                            {label:"Pagado", pct:docPct,   color:`linear-gradient(90deg,${AC},${COLORS.green})`},
                                            {label:"Saldo",  pct:saldoPct, color:`linear-gradient(90deg,${COLORS.yellow},${COLORS.red})`},
                                          ].map(({label,pct:p,color})=>(
                                            <div key={label} style={{ display:"flex",alignItems:"center",gap:5,marginBottom:3 }}>
                                              <span style={{ fontFamily:FONT,fontSize:8,color:COLORS.textMuted,width:40,flexShrink:0 }}>{label}</span>
                                              <MiniBar pct={p} color={color}/>
                                              <span style={{ fontFamily:FONT,fontSize:8,color:AC,flexShrink:0,minWidth:26,textAlign:"right" }}>{p.toFixed(0)}%</span>
                                            </div>
                                          ))}
                                        </div>

                                        {/* Acciones */}
                                        <div style={{ display:"flex", gap:5, borderTop:`1px solid ${COLORS.border}`, paddingTop:7 }}>
                                          <button onClick={()=>onEditDoc(doc)}
                                            style={{ flex:1,padding:"4px 0",borderRadius:5,fontFamily:FONT,fontSize:9,cursor:"pointer",background:docPagado?"transparent":`${COLORS.yellow}22`,border:`1px solid ${docPagado?COLORS.secondary+"44":COLORS.yellow+"66"}`,color:docPagado?COLORS.secondary:COLORS.yellow, fontWeight:docPagado?400:700 }}>
                                            {docPagado?"✏️ Editar":"💳 Registrar pago"}
                                          </button>
                                          <button onClick={()=>onReprintDoc(doc)} style={{ flex:1,padding:"4px 0",borderRadius:5,fontFamily:FONT,fontSize:9,cursor:"pointer",background:"transparent",border:`1px solid ${AC}44`,color:AC }}>🖨 PDF</button>
                                          <button onClick={()=>onDeleteDoc(doc.id)} style={{ padding:"4px 7px",borderRadius:5,fontFamily:FONT,fontSize:10,cursor:"pointer",background:"transparent",border:`1px solid ${COLORS.red}44`,color:COLORS.red }}>✕</button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {/* + Nuevo doc */}
                                  <div onClick={()=>onNuevoDoc(q.id)}
                                    style={{ width:90,flexShrink:0,border:`2px dashed ${COLORS.border}`,borderRadius:9,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:12,color:COLORS.textMuted,gap:5,minHeight:80 }}>
                                    <span style={{ fontSize:20 }}>+</span>
                                    <span style={{ fontFamily:FONT,fontSize:9,textAlign:"center",lineHeight:1.4 }}>Nuevo {docLabel}</span>
                                  </div>
                                </div>

                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {pedidoPagado>pedidoTotal && pedidoTotal>0 && (
                      <div style={{ padding:"7px 12px",borderRadius:8,background:`${AC}11`,border:`1px solid ${AC}33`,fontFamily:FONT,fontSize:10,color:AC }}>
                        ⇄ Sobrepago de <strong>{fmt(pedidoPagado-pedidoTotal)}</strong> — compensa saldos entre cotizaciones de este pedido.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* COTs huérfanas */}
      {orphanQuotes.length>0 && (
        <div style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:14, padding:"12px 18px" }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>
            Sin {isPF?"pre-factura":"pedido"} asignado
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {orphanQuotes.map(q=>{
              const qDocs  = docs.filter(d=>(d.quote_ids||[]).includes(q.id));
              const qTotal  = (q.lines||[]).reduce((s,l)=>s+lineSubtotal(l),0);
              const qPagado = qDocs.reduce((s,d)=>s+Number(d.monto_pagado||0),0);
              return (
                <div key={q.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,background:COLORS.surface,border:`1px solid ${COLORS.border}` }}>
                  <span style={{ fontFamily:FONT_DISPLAY,fontSize:12,fontWeight:700,color:AC }}>{qPrefix(q)}</span>
                  <span style={{ fontFamily:FONT,fontSize:11,color:COLORS.textMuted,flex:1 }}>{q.clientCompany||q.clientName}</span>
                  <span style={{ fontFamily:FONT_DISPLAY,fontSize:11,color:COLORS.green }}>{fmt(qPagado)}</span>
                  <span style={{ fontFamily:FONT,fontSize:10,color:COLORS.textMuted }}>de {fmt(qTotal)}</span>
                  <span style={{ fontFamily:FONT,fontSize:9,color:COLORS.textMuted,background:COLORS.border+"44",borderRadius:4,padding:"2px 6px" }}>{qDocs.length} {docLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

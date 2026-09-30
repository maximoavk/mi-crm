// Modal para crear o editar un pedido (CP) o grupo de pre-factura (PF).
import { useState } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../theme.js";

// ── PEDIDO MODAL ─────────────────────────────────────────────────────────────
export function PedidoModal({ pedido, quotes, docs, isPF, onSave, onClose, onEditDoc, onReprintDoc, onDeleteDoc, onNuevoDoc }) {
  const [tab,     setTab]     = useState(pedido?.id ? "pagos" : "config");
  const [form,    setForm]    = useState({
    nombre:    pedido?.nombre||"",
    cliente:   pedido?.cliente||"",
    rut:       pedido?.rut||"",
    notas:     pedido?.notas||"",
    quote_ids: pedido?.quote_ids||[],
  });
  const [saving,    setSaving]    = useState(false);
  const [openCots,  setOpenCots]  = useState({});

  const ff = (k,v) => setForm(p=>({...p,[k]:v}));
  const toggleQ   = id => setForm(p=>({...p, quote_ids: p.quote_ids.includes(id) ? p.quote_ids.filter(x=>x!==id) : [...p.quote_ids,id]}));
  const toggleCot = id => setOpenCots(p=>({...p,[id]:!p[id]}));

  const inp = { background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, color:COLORS.text, fontFamily:FONT, fontSize:12, padding:"7px 10px", width:"100%", boxSizing:"border-box" };

  const handleSave = async () => {
    if(!form.nombre.trim()) return alert("Nombre del pedido requerido");
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const selQuotes  = quotes.filter(q=>form.quote_ids.includes(q.id));
  const autoCliente= selQuotes[0]?.clientCompany||selQuotes[0]?.clientName||"";
  const autoRut    = selQuotes[0]?.clientRut||"";
  const serieLabel = isPF ? "COT" : "SIN";
  const docLabel   = isPF ? "PF"  : "CP";
  const AC         = isPF ? COLORS.secondary : COLORS.accent;
  const fmt        = v => "$"+Math.round(v||0).toLocaleString("es-CL");
  const fmtDate    = s => s ? new Date(s+"T00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short"}) : "—";

  const lineSubtotal = l => {
    const qty=Number(l.qty||1), p=Number(l.unitPrice||0), d=Number(l.discount||0);
    const neto = Math.round(p*(1-d/100)*qty);
    return isPF ? Math.round(neto*1.19) : neto;
  };

  // Suma solo transacciones bancarias reales
  const txPagado = doc => (doc.transacciones||[]).reduce((s,t)=>s+Number(t.monto||0),0);

  // Calcula totales por COT para el tab pagos
  const cotDataModal = selQuotes.map(q => {
    const qTotal  = (q.lines||[]).reduce((s,l)=>s+lineSubtotal(l),0);
    const qDocs   = (docs||[]).filter(d=>(d.quote_ids||[]).includes(q.id));
    const qPagado = qDocs.reduce((s,d)=>s+txPagado(d),0);  // ← transacciones reales
    const pct     = qTotal>0 ? Math.min((qPagado/qTotal)*100,100) : 0;
    const saldo   = Math.max(0, qTotal-qPagado);
    return { q, qTotal, qDocs, qPagado, pct, saldo };
  });
  const totalPedido  = cotDataModal.reduce((s,c)=>s+c.qTotal,0);
  const totalPagado  = cotDataModal.reduce((s,c)=>s+c.qPagado,0);
  const totalPct     = totalPedido>0 ? Math.min((totalPagado/totalPedido)*100,100) : 0;

  const TAB = (label, key) => (
    <button onClick={()=>setTab(key)} style={{
      padding:"6px 18px", borderRadius:7, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700,
      cursor:"pointer", border:`1px solid ${tab===key?AC:COLORS.border}`,
      background:tab===key?`${AC}22`:"transparent", color:tab===key?AC:COLORS.textMuted
    }}>{label}</button>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:0, width:680, maxWidth:"96vw", maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 0", borderBottom:`1px solid ${COLORS.border}22` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700, color:COLORS.text }}>
              {pedido?.id ? `Editar ${isPF?"grupo Pre-Factura":"Pedido"}` : `Nuevo ${isPF?"grupo Pre-Factura":"Pedido"}`}
              {pedido?.nombre && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, fontWeight:400, marginTop:2 }}>{pedido.nombre}</div>}
            </div>
            <button onClick={onClose} style={{ background:"transparent", border:"none", color:COLORS.textMuted, fontSize:18, cursor:"pointer", padding:"0 4px" }}>✕</button>
          </div>
          <div style={{ display:"flex", gap:8, paddingBottom:14 }}>
            {TAB("⚙ Configuración","config")}
            {pedido?.id && TAB(`💳 Pagos${selQuotes.length>0?` · ${totalPct.toFixed(0)}%`:""}`, "pagos")}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {/* ── TAB CONFIG ── */}
          {tab==="config" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Nombre del Pedido *</div>
                <input style={inp} value={form.nombre} onChange={e=>ff("nombre",e.target.value)} placeholder="Ej: Mantención anual Condominio X" />
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Cliente</div>
                  <input style={inp} value={form.cliente||autoCliente} onChange={e=>ff("cliente",e.target.value)} placeholder="Nombre o empresa" />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>RUT</div>
                  <input style={inp} value={form.rut||autoRut} onChange={e=>ff("rut",e.target.value)} placeholder="XX.XXX.XXX-X" />
                </div>
              </div>
              <div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Notas</div>
                <textarea style={{...inp, resize:"vertical", minHeight:60}} value={form.notas} onChange={e=>ff("notas",e.target.value)} placeholder="Descripción del servicio..." />
              </div>
              <div>
                <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
                  Cotizaciones {serieLabel} vinculadas ({form.quote_ids.length})
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:240, overflowY:"auto" }}>
                  {quotes.length===0 && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, fontStyle:"italic" }}>No hay cotizaciones disponibles</div>}
                  {quotes.map(q=>{
                    const sel = form.quote_ids.includes(q.id);
                    const qT  = (q.lines||[]).reduce((s,l)=>{ const qty=Number(l.qty||1),p=Number(l.unitPrice||0),d=Number(l.discount||0); return s+Math.round(p*(1-d/100)*qty); },0);
                    return (
                      <div key={q.id} onClick={()=>toggleQ(q.id)}
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, cursor:"pointer",
                          background:sel?`${AC}18`:COLORS.card, border:`1px solid ${sel?AC:COLORS.border}` }}>
                        <div style={{ width:16,height:16,borderRadius:4,border:`2px solid ${sel?AC:COLORS.border}`,background:sel?AC:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
                          {sel && <span style={{ color:COLORS.bg,fontSize:10,fontWeight:900 }}>✓</span>}
                        </div>
                        <div style={{ flex:1 }}>
                          <span style={{ fontFamily:FONT_DISPLAY,fontSize:12,fontWeight:700,color:sel?AC:COLORS.text }}>{serieLabel}-{String(q.number).padStart(3,"0")}</span>
                          <span style={{ fontFamily:FONT,fontSize:11,color:COLORS.textMuted,marginLeft:8 }}>{q.clientCompany||q.clientName}</span>
                        </div>
                        <span style={{ fontFamily:FONT_DISPLAY,fontSize:11,color:COLORS.text }}>${qT.toLocaleString("es-CL")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB PAGOS ── */}
          {tab==="pagos" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

              {/* Barra resumen global */}
              <div style={{ padding:"12px 16px", borderRadius:10, background:COLORS.card, border:`1px solid ${COLORS.border}`, display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>Avance total del pedido</div>
                  <div style={{ height:8, background:"#1F2535", borderRadius:99, overflow:"hidden", marginBottom:5 }}>
                    <div style={{ height:"100%", width:`${Math.min(totalPct,100)}%`, background:`linear-gradient(90deg,${AC},${COLORS.green})`, borderRadius:99, transition:"width 0.4s" }}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontFamily:FONT,fontSize:9,color:COLORS.textMuted }}>Pagado: <strong style={{ color:COLORS.green }}>{fmt(totalPagado)}</strong></span>
                    <span style={{ fontFamily:FONT,fontSize:9,color:COLORS.textMuted }}>Saldo: <strong style={{ color:totalPagado>=totalPedido?COLORS.green:COLORS.yellow }}>{fmt(Math.max(0,totalPedido-totalPagado))}</strong></span>
                    <span style={{ fontFamily:FONT,fontSize:9,color:COLORS.textMuted }}>Total: <strong style={{ color:COLORS.text }}>{fmt(totalPedido)}</strong></span>
                  </div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:900,color:totalPct>=100?COLORS.green:AC }}>{totalPct.toFixed(0)}%</div>
                  <div style={{ fontFamily:FONT,fontSize:8,color:COLORS.textMuted }}>pagado</div>
                </div>
              </div>

              {selQuotes.length===0 && (
                <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, fontStyle:"italic", textAlign:"center", padding:20 }}>
                  Sin cotizaciones vinculadas. Ve a Configuración para agregar.
                </div>
              )}

              {/* Una fila por COT */}
              {cotDataModal.map(({ q, qTotal, qDocs, qPagado, pct, saldo }) => {
                const isOpen = !!openCots[q.id];
                const qPaid  = saldo<=0 && qTotal>0;
                return (
                  <div key={q.id} style={{ background:COLORS.card, border:`1px solid ${qPaid?COLORS.green+"44":COLORS.border}`, borderRadius:10, overflow:"hidden" }}>

                    {/* Header COT — clickeable */}
                    <div onClick={()=>toggleCot(q.id)} style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", userSelect:"none", borderLeft:`3px solid ${qPaid?COLORS.green:AC}` }}>
                      <span style={{ fontSize:9, color:COLORS.textMuted, transition:"transform 0.2s", display:"inline-block", transform:isOpen?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
                      <div style={{ flexShrink:0 }}>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:AC }}>{serieLabel}-{String(q.number).padStart(3,"0")}</div>
                        <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>{q.clientCompany||q.clientName}</div>
                      </div>
                      <div style={{ flex:1, display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ flex:1, height:5, background:"#1F2535", borderRadius:99, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:`linear-gradient(90deg,${AC},${COLORS.green})`, borderRadius:99 }}/>
                        </div>
                        <span style={{ fontFamily:FONT, fontSize:10, color:qPaid?COLORS.green:AC, minWidth:30, textAlign:"right" }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:qPaid?COLORS.green:COLORS.text }}>{fmt(qPagado)}</div>
                        <div style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted }}>de {fmt(qTotal)}</div>
                      </div>
                      <div style={{ fontFamily:FONT, fontSize:9, padding:"2px 8px", borderRadius:4, background:qPaid?`${COLORS.green}22`:`${COLORS.yellow}22`, color:qPaid?COLORS.green:COLORS.yellow, flexShrink:0 }}>
                        {qDocs.length} {docLabel}
                      </div>
                    </div>

                    {/* Expandido: líneas + docs */}
                    {isOpen && (
                      <div style={{ borderTop:`1px solid ${COLORS.border}22`, padding:"14px 16px", background:COLORS.surface+"33" }}>
                        <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>

                          {/* Líneas COT */}
                          <div style={{ flexShrink:0, minWidth:220, maxWidth:280 }}>
                            <div style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Líneas cotización</div>
                            {(q.lines||[]).map((l,i)=>{
                              const sub = lineSubtotal(l);
                              return (
                                <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 0", borderBottom:`1px solid ${COLORS.border}18` }}>
                                  <span style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted, width:18, flexShrink:0, textAlign:"right" }}>{Number(l.qty||1)}×</span>
                                  <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.description||l.descripcion||"—"}</span>
                                  <span style={{ fontFamily:FONT_DISPLAY, fontSize:9, color:COLORS.text, flexShrink:0 }}>{fmt(sub)}</span>
                                </div>
                              );
                            })}
                            {(q.lines||[]).length===0 && <div style={{ fontFamily:FONT,fontSize:9,color:COLORS.textMuted,fontStyle:"italic" }}>Sin líneas</div>}
                            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:5, paddingTop:4, borderTop:`1px solid ${COLORS.border}` }}>
                              <span style={{ fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, color:COLORS.text }}>Total: {fmt(qTotal)}</span>
                            </div>
                          </div>

                          {/* Comprobantes */}
                          <div style={{ flex:1, minWidth:200 }}>
                            <div style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Comprobantes de pago</div>
                            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                              {qDocs.map(doc=>{
                                const txs     = (doc.transacciones||[]).filter(t=>Number(t.monto)>0);
                                const dMonto  = txs.reduce((s,t)=>s+Number(t.monto||0),0); // ← solo tx reales
                                const dNominal= Number(doc.monto_pagado||0); // monto declarado
                                const dPct    = qTotal>0 ? Math.min((dMonto/qTotal)*100,100) : 0;
                                const hasTx   = txs.length>0;
                                return (
                                  <div key={doc.id} style={{ background:COLORS.bg, border:`1px solid ${hasTx?COLORS.green+"44":COLORS.yellow+"44"}`, borderRadius:8, padding:"10px 12px" }}>
                                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                                      <div>
                                        <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:AC }}>{doc.numero}</span>
                                        <span style={{ fontFamily:FONT, fontSize:9, color:COLORS.textMuted, marginLeft:8 }}>{fmtDate(doc.fecha_pago)} · {doc.responsable||""}</span>
                                      </div>
                                      <div style={{ textAlign:"right" }}>
                                        <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, color:hasTx?COLORS.green:COLORS.yellow }}>
                                          {hasTx ? fmt(dMonto) : fmt(dNominal)}
                                        </div>
                                        {hasTx && dNominal!==dMonto && (
                                          <div style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted }}>declarado: {fmt(dNominal)}</div>
                                        )}
                                        <div style={{ fontFamily:FONT, fontSize:8, color:hasTx?COLORS.green:COLORS.yellow }}>{hasTx?"Pagado":"Sin pago bancario"}</div>
                                      </div>
                                    </div>
                                    {/* Barra progreso */}
                                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                                      <span style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted, width:42, flexShrink:0 }}>% Total</span>
                                      <div style={{ flex:1, height:4, background:"#1F2535", borderRadius:99, overflow:"hidden" }}>
                                        <div style={{ height:"100%", width:`${dPct}%`, background:`linear-gradient(90deg,${AC},${COLORS.green})`, borderRadius:99 }}/>
                                      </div>
                                      <span style={{ fontFamily:FONT, fontSize:8, color:AC, minWidth:26, textAlign:"right" }}>{dPct.toFixed(0)}%</span>
                                    </div>
                                    {/* Transacciones */}
                                    {txs.length>0 && (
                                      <div style={{ marginBottom:6 }}>
                                        {txs.map((t,i)=>(
                                          <div key={i} style={{ fontFamily:FONT, fontSize:8, color:COLORS.textMuted, marginBottom:2, display:"flex", justifyContent:"space-between" }}>
                                            <span>🏦 {fmtDate(t.fecha)} · {t.codigo||"—"}</span>
                                            <span style={{ color:COLORS.green, fontWeight:700 }}>{fmt(Number(t.monto||0))}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {!hasTx && (
                                      <div style={{ padding:"4px 8px", borderRadius:5, background:`${COLORS.yellow}11`, border:`1px dashed ${COLORS.yellow}44`, marginBottom:6 }}>
                                        <span style={{ fontFamily:FONT, fontSize:8, color:COLORS.yellow }}>⚠ Sin transacciones bancarias registradas</span>
                                      </div>
                                    )}
                                    {/* Acciones */}
                                    <div style={{ display:"flex", gap:6, paddingTop:6, borderTop:`1px solid ${COLORS.border}` }}>
                                      <button onClick={()=>onEditDoc(doc)} style={{ flex:1,padding:"4px 0",borderRadius:5,fontFamily:FONT,fontSize:9,cursor:"pointer",background:hasTx?"transparent":`${COLORS.yellow}22`,border:`1px solid ${hasTx?COLORS.secondary+"44":COLORS.yellow+"66"}`,color:hasTx?COLORS.secondary:COLORS.yellow,fontWeight:hasTx?400:700 }}>
                                        {hasTx?"✏️ Editar":"💳 Registrar pago"}
                                      </button>
                                      <button onClick={()=>onReprintDoc(doc)} style={{ flex:1,padding:"4px 0",borderRadius:5,fontFamily:FONT,fontSize:9,cursor:"pointer",background:"transparent",border:`1px solid ${AC}44`,color:AC }}>🖨 PDF</button>
                                      <button onClick={()=>onDeleteDoc(doc.id)} style={{ padding:"4px 8px",borderRadius:5,fontFamily:FONT,fontSize:10,cursor:"pointer",background:"transparent",border:`1px solid ${COLORS.red}44`,color:COLORS.red }}>✕</button>
                                    </div>
                                  </div>
                                );
                              })}
                              {/* + Nuevo doc */}
                              <div onClick={()=>onNuevoDoc(q.id)}
                                style={{ border:`2px dashed ${COLORS.border}`, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", padding:"10px 14px", color:COLORS.textMuted, gap:6 }}>
                                <span style={{ fontSize:16 }}>+</span>
                                <span style={{ fontFamily:FONT, fontSize:10 }}>Nuevo {docLabel}</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${COLORS.border}22`, display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, cursor:"pointer", background:"transparent", border:`1px solid ${COLORS.border}`, color:COLORS.textMuted }}>
            {tab==="pagos" ? "Cerrar" : "Cancelar"}
          </button>
          {tab==="config" && (
            <button onClick={handleSave} disabled={saving} style={{ padding:"8px 22px", borderRadius:8, fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor:"pointer", background:AC, border:"none", color:COLORS.bg }}>
              {saving?"Guardando…":"Guardar Pedido"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// Tarjeta de cotización con sus servicios, gastos directos y rendimiento.
import { useState } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../../theme.js";
import { LabelInput, BtnSec, BtnPrimary } from "../ui.jsx";
import { fmtClp, fmtFecha } from "../../shared/format.js";
import { supabase } from "../../supabaseClient.js";
import { ModalServicio } from "./ModalServicio.jsx";
import { ModalGastoDirecto } from "./ModalGastoDirecto.jsx";

// ── COMPONENTE FILA DE SERVICIO/PRODUCTO (reutilizable) ──────────────────────
function SlRow({ sl, products, editSl, setEditSl, savingEdit, setSavingEdit, cot, setDetail, onRefresh, color }) {
  const prod = products.find(p => p.id === sl.product_id);
  const accentColor = color || COLORS.red;

  if (editSl?.id === sl.id) {
    return (
      <div style={{ padding:"12px", background:COLORS.accentDim,
        borderRadius:8, marginBottom:5, border:`1px solid ${COLORS.accent}44` }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 10px" }}>
          <LabelInput label="Descripción" value={editSl.descripcion}
            onChange={e=>setEditSl(p=>({...p,descripcion:e.target.value}))} />
          <LabelInput label="Código" value={editSl.codigo}
            onChange={e=>setEditSl(p=>({...p,codigo:e.target.value}))} />
          <LabelInput label="Cantidad" type="number" value={editSl.cantidad}
            onChange={e=>setEditSl(p=>({...p,cantidad:e.target.value}))} />
          <LabelInput label="Precio neto unitario" type="number" value={editSl.precio_unitario}
            onChange={e=>setEditSl(p=>({...p,precio_unitario:e.target.value}))} />
        </div>
        {Number(editSl.precio_unitario) > 0 && (
          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, marginBottom:10 }}>
            Neto: {fmtClp(Number(editSl.cantidad||1)*Number(editSl.precio_unitario))} ·
            IVA: {fmtClp(Math.round(Number(editSl.cantidad||1)*Number(editSl.precio_unitario)*0.19))} ·
            Total: {fmtClp(Math.round(Number(editSl.cantidad||1)*Number(editSl.precio_unitario)*1.19))}
          </div>
        )}
        <div style={{ display:"flex", gap:8 }}>
          <BtnSec onClick={()=>setEditSl(null)}>Cancelar</BtnSec>
          <BtnPrimary disabled={savingEdit} onClick={async ()=>{
            setSavingEdit(true);
            await supabase.from("cot_service_lines").update({
              descripcion:     editSl.descripcion,
              codigo:          editSl.codigo||"",
              cantidad:        Number(editSl.cantidad)||1,
              precio_unitario: Math.round(Number(editSl.precio_unitario)||0),
              aplica_iva:      editSl.aplica_iva,
            }).eq("id", editSl.id);
            const { data: sls } = await supabase
              .from("cot_service_lines")
              .select("id, descripcion, codigo, cantidad, precio_unitario, subtotal_neto, monto_iva, subtotal_total, aplica_iva, estado_pago, product_id, suppliers(nombre)")
              .eq("cotizacion_id", cot.cotizacion_id);
            setDetail(p=>({...p, sls: sls||[]}));
            setEditSl(null);
            setSavingEdit(false);
            onRefresh();
          }}>
            {savingEdit?"Guardando…":"Guardar cambios"}
          </BtnPrimary>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", justifyContent:"space-between",
      alignItems:"center", padding:"8px 12px", background:COLORS.surface,
      borderRadius:7, marginBottom:5,
      border:`1px solid ${color ? color+"33" : COLORS.border}` }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600,
          color:COLORS.text, overflow:"hidden", textOverflow:"ellipsis",
          whiteSpace:"nowrap" }}>{sl.descripcion}</div>
        <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
          {sl.suppliers?.nombre || (color ? "Directo" : "Sin subcontratista")}
          {sl.codigo ? ` · ${sl.codigo}` : ""}
          {prod && <span style={{ marginLeft:6, fontSize:10,
            color:accentColor, background:accentColor+"18",
            borderRadius:3, padding:"1px 5px" }}>{prod.tipo}</span>}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, marginLeft:10 }}>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700,
            color:accentColor }}>{fmtClp(sl.subtotal_neto)}</div>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>neto</div>
        </div>
        <button onClick={()=>setEditSl({
            id: sl.id, descripcion: sl.descripcion, codigo: sl.codigo||"",
            cantidad: String(sl.cantidad||1),
            precio_unitario: String(sl.precio_unitario||0),
            aplica_iva: sl.aplica_iva, notas: sl.notas||"",
          })}
          style={{ padding:"4px 8px", background:COLORS.accentDim,
            border:`1px solid ${COLORS.accentGlow}`, borderRadius:5,
            color:COLORS.accent, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>
          ✏️
        </button>
        <button onClick={async ()=>{
            if (!window.confirm("¿Eliminar esta línea?")) return;
            const { error } = await supabase.from("cot_service_lines").delete().eq("id", sl.id); if(error) return;
            setDetail(p=>({...p, sls: p.sls.filter(x=>x.id!==sl.id)}));
            onRefresh();
          }}
          style={{ padding:"4px 8px", background:COLORS.red+"18",
            border:`1px solid ${COLORS.red}44`, borderRadius:5,
            color:COLORS.red, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>
          ✕
        </button>
      </div>
    </div>
  );
}

export function CotCard({ cot, suppliers, products, onRefresh, isMobile }) {
  const [open, setOpen]           = useState(false);
  const [detail, setDetail]       = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalServicio, setModalServicio] = useState(false);
  const [modalProducto, setModalProducto] = useState(false);
  const [modalGasto, setModalGasto]       = useState(false);
  const [editSl, setEditSl]       = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const pct = cot.presupuesto_total > 0
    ? Math.min(100, Math.round((
        (Number(cot.total_neto_compras)||0) +
        (Number(cot.total_neto_servicios)||0) +
        (Number(cot.total_neto_gastos)||0) +
        (Number(cot.total_neto_fr)||0)
      ) / (Number(cot.presupuesto_total)||1) * 100))
    : 0;

  const margen     = Number(cot.margen_neto) || 0;
  const pctMargen  = Number(cot.pct_margen)  || 0;
  const margenColor = margen >= 0 ? COLORS.green : COLORS.red;

  const estadoColor = {
    aprobada:"#00C2FF", enviada:"#FFB800", cerrado:"#00E5A0",
    por_facturar:"#A855F7", facturada:"#00E5A0",
  }[cot.estado_cotizacion] || COLORS.textMuted;

  const loadDetail = async () => {
    if (detail) return;
    setLoadingDetail(true);
    const [{ data: ocs }, { data: sls }, { data: fes }, { data: frs }, { data: gds }] = await Promise.all([
      supabase.from("purchase_orders")
        .select("id, numero_oc, estado, suppliers(nombre), purchase_order_lines(cantidad, precio_unitario)")
        .eq("cotizacion_id", cot.cotizacion_id),
      supabase.from("cot_service_lines")
        .select("id, descripcion, codigo, cantidad, precio_unitario, subtotal_neto, monto_iva, subtotal_total, aplica_iva, estado_pago, product_id, linea_negocio, suppliers(nombre)")
        .eq("cotizacion_id", cot.cotizacion_id),
      supabase.from("facturas_emitidas")
        .select("id, numero_documento, fecha_emision, monto_neto, monto_iva, monto_total, razon_social_cliente, pagos_recibidos(monto)")
        .eq("cotizacion_id", cot.cotizacion_id),
      supabase.from("facturas_recibidas")
        .select("id, numero_documento, fecha_recepcion, monto_neto, monto_iva, monto_total, razon_social_proveedor, tipo_proveedor, linea_negocio")
        .eq("cotizacion_id", cot.cotizacion_id),
      supabase.from("cot_gastos_directos")
        .select("id, fecha, categoria, descripcion, monto_neto, aplica_iva, monto_iva, monto_total, numero_documento, proveedor, notas")
        .eq("cotizacion_id", cot.cotizacion_id)
        .order("fecha", { ascending: false }),
    ]);
    setDetail({ ocs: ocs||[], sls: sls||[], fes: fes||[], frs: frs||[], gds: gds||[] });
    setLoadingDetail(false);
  };

  const toggle = () => {
    if (!open) loadDetail();
    setOpen(p=>!p);
  };

  const SubHeader = ({ label, count, color }) => (
    <div style={{ fontFamily:FONT, fontSize:10, color:color||COLORS.textMuted,
      letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8,
      display:"flex", alignItems:"center", gap:8 }}>
      {label}
      {count > 0 && <span style={{ background:color+"22", color, border:`1px solid ${color}44`,
        borderRadius:10, padding:"1px 7px", fontSize:10 }}>{count}</span>}
    </div>
  );

  const EmptyRow = ({ msg }) => (
    <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textDim,
      padding:"8px 0", fontStyle:"italic" }}>{msg}</div>
  );

  return (
    <div style={{ background:COLORS.card, border:`1px solid ${open?COLORS.accent:COLORS.border}`,
      borderRadius:12, marginBottom:12, overflow:"hidden",
      transition:"border-color 0.15s" }}>

      {/* ── CABECERA TARJETA ── */}
      <div onClick={toggle} style={{ padding:"16px 20px", cursor:"pointer",
        display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>

        {/* COT badge */}
        <div style={{ fontFamily:FONT, fontSize:13, fontWeight:700, color:COLORS.accent,
          background:COLORS.accentDim, border:`1px solid ${COLORS.accentGlow}`,
          borderRadius:6, padding:"4px 12px", flexShrink:0 }}>
          COT-{cot.numero_cotizacion}
        </div>

        {/* Cliente + estado */}
        <div style={{ flex:1, minWidth:120 }}>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700,
            color:COLORS.text }}>{cot.cliente || "—"}</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
            <span style={{ fontFamily:FONT, fontSize:10, color:estadoColor,
              background:estadoColor+"18", border:`1px solid ${estadoColor}33`,
              borderRadius:4, padding:"1px 7px", textTransform:"uppercase",
              letterSpacing:"0.06em" }}>{cot.estado_cotizacion}</span>
          </div>
        </div>

        {/* Barra presupuesto */}
        {!isMobile && (
          <div style={{ width:140, flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Ejecutado</span>
              <span style={{ fontFamily:FONT, fontSize:10, fontWeight:700,
                color:pct>90?COLORS.red:COLORS.text }}>{pct}%</span>
            </div>
            <div style={{ height:6, background:COLORS.border, borderRadius:3 }}>
              <div style={{ height:6, borderRadius:3, width:`${pct}%`,
                background:pct>90?COLORS.red:pct>70?COLORS.yellow:COLORS.green,
                transition:"width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Montos clave */}
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Presupuesto</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700,
            color:COLORS.text }}>{fmtClp(cot.presupuesto_total)}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>Margen</div>
          <div style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700,
            color:margenColor }}>
            {Number(cot.total_neto_emitido)>0 ? `${pctMargen}%` : "—"}
          </div>
        </div>

        <span style={{ color:COLORS.textMuted, fontSize:16, flexShrink:0 }}>{open?"▲":"▼"}</span>
      </div>

      {/* ── DETALLE EXPANDIDO ── */}
      {open && (
        <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"18px 20px" }}>
          {loadingDetail ? (
            <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted,
              textAlign:"center", padding:20 }}>Cargando detalle…</div>
          ) : detail && (
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:20 }}>

              {/* ── COL IZQ: EGRESOS ── */}
              <div>
                {/* OC de compras */}
                <SubHeader label="Órdenes de compra" count={detail.ocs.length} color={COLORS.accent} />
                {detail.ocs.length === 0
                  ? <EmptyRow msg="Sin OC vinculadas" />
                  : detail.ocs.map(oc => {
                    const totalOC = (oc.purchase_order_lines||[])
                      .reduce((s,l)=>s+(l.cantidad*l.precio_unitario),0);
                    return (
                      <div key={oc.id} style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", padding:"8px 12px", background:COLORS.surface,
                        borderRadius:7, marginBottom:5, border:`1px solid ${COLORS.border}` }}>
                        <div>
                          <div style={{ fontFamily:FONT, fontSize:12, fontWeight:700,
                            color:COLORS.accent }}>{oc.numero_oc}</div>
                          <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                            {oc.suppliers?.nombre || "—"}
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700,
                            color:COLORS.text }}>{fmtClp(Math.round(totalOC/1.19))}</div>
                          <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>neto</div>
                        </div>
                      </div>
                    );
                  })
                }

                {/* Líneas de servicio */}
                <div style={{ marginTop:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    marginBottom:8 }}>
                    <SubHeader label="Servicios / Subcontratistas"
                      count={detail.sls.filter(s=>!s._isProd).length} color={COLORS.purple} />
                    <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                      <button onClick={()=>setModalServicio(true)}
                        style={{ padding:"4px 10px", background:COLORS.purple+"22",
                          border:`1px solid ${COLORS.purple}44`, borderRadius:6,
                          color:COLORS.purple, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                        + Servicio
                      </button>
                      <button onClick={()=>setModalProducto(true)}
                        style={{ padding:"4px 10px", background:COLORS.yellow+"22",
                          border:`1px solid ${COLORS.yellow}44`, borderRadius:6,
                          color:COLORS.yellow, fontFamily:FONT, fontSize:11, cursor:"pointer" }}>
                        + Producto
                      </button>
                    </div>
                  </div>
                  {detail.sls.filter(sl => {
                    const tipo = sl.products?.tipo || sl._tipo || "";
                    return tipo !== "producto";
                  }).length === 0
                    ? <EmptyRow msg="Sin líneas de servicio" />
                    : detail.sls.filter(sl => {
                        const p = products.find(p => p.id === sl.product_id);
                        return !p || p.tipo !== "producto";
                      }).map(sl => <SlRow key={sl.id} sl={sl} products={products} editSl={editSl} setEditSl={setEditSl} savingEdit={savingEdit} setSavingEdit={setSavingEdit} cot={cot} setDetail={setDetail} onRefresh={onRefresh} />)
                  }
                </div>

                {/* Productos directos (sin OC) — naranja */}
                {detail.sls.filter(sl => {
                  const p = products.find(p => p.id === sl.product_id);
                  return p && p.tipo === "producto";
                }).length > 0 && (
                  <div style={{ marginTop:16 }}>
                    <SubHeader label="Productos directos (sin OC)"
                      count={detail.sls.filter(sl => {
                        const p = products.find(p => p.id === sl.product_id);
                        return p && p.tipo === "producto";
                      }).length} color={COLORS.yellow} />
                    {detail.sls.filter(sl => {
                      const p = products.find(p => p.id === sl.product_id);
                      return p && p.tipo === "producto";
                    }).map(sl => <SlRow key={sl.id} sl={sl} products={products} editSl={editSl} setEditSl={setEditSl} savingEdit={savingEdit} setSavingEdit={setSavingEdit} cot={cot} setDetail={setDetail} onRefresh={onRefresh} color={COLORS.yellow} />)}
                  </div>
                )}

                {/* Materiales / Gastos directos de terreno — naranja oscuro */}
                <div style={{ marginTop:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:8 }}>
                    <SubHeader label="Materiales / Ferretería"
                      count={detail.gds.length} color="#F97316" />
                    <button onClick={()=>setModalGasto(true)}
                      style={{ padding:"4px 10px", background:"#F9731622",
                        border:"1px solid #F9731644", borderRadius:6,
                        color:"#F97316", fontFamily:FONT, fontSize:11,
                        cursor:"pointer", marginBottom:8 }}>
                      + Gasto
                    </button>
                  </div>
                  {detail.gds.length === 0
                    ? <EmptyRow msg="Sin gastos de terreno registrados" />
                    : detail.gds.map(gd => (
                      <div key={gd.id} style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", padding:"8px 12px", background:COLORS.surface,
                        borderRadius:7, marginBottom:5,
                        border:"1px solid #F9731622" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                            <span style={{ fontFamily:FONT, fontSize:10, color:"#F97316",
                              background:"#F9731618", borderRadius:3, padding:"1px 6px" }}>
                              {gd.categoria}
                            </span>
                            <span style={{ fontFamily:FONT, fontSize:10, color:COLORS.textMuted }}>
                              {fmtFecha(gd.fecha)}
                            </span>
                          </div>
                          <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600,
                            color:COLORS.text, overflow:"hidden", textOverflow:"ellipsis",
                            whiteSpace:"nowrap" }}>{gd.descripcion}</div>
                          {gd.proveedor && (
                            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                              {gd.proveedor}
                              {gd.numero_documento ? ` · N° ${gd.numero_documento}` : ""}
                            </div>
                          )}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8,
                          flexShrink:0, marginLeft:10 }}>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontFamily:FONT_DISPLAY, fontSize:12,
                              fontWeight:700, color:"#F97316" }}>{fmtClp(gd.monto_neto)}</div>
                            {gd.aplica_iva && (
                              <div style={{ fontFamily:FONT, fontSize:10,
                                color:COLORS.green }}>IVA: {fmtClp(gd.monto_iva)}</div>
                            )}
                          </div>
                          <button onClick={async ()=>{
                              if (!window.confirm("¿Eliminar este gasto?")) return;
                              const { error } = await supabase.from("cot_gastos_directos").delete().eq("id", gd.id); if(error) return;
                              setDetail(p=>({...p, gds: p.gds.filter(x=>x.id!==gd.id)}));
                              onRefresh();
                            }}
                            style={{ padding:"4px 8px", background:COLORS.red+"18",
                              border:`1px solid ${COLORS.red}44`, borderRadius:5,
                              color:COLORS.red, fontFamily:FONT, fontSize:10,
                              cursor:"pointer" }}>✕</button>
                        </div>
                      </div>
                    ))
                  }
                </div>

              </div>
              <div>
                {/* Facturas emitidas */}
                <SubHeader label="Facturas emitidas al cliente"
                  count={detail.fes.length} color={COLORS.green} />
                {detail.fes.length === 0
                  ? <EmptyRow msg="Sin facturas emitidas vinculadas" />
                  : detail.fes.map(fe => {
                    const cobrado = (fe.pagos_recibidos||[]).reduce((s,p)=>s+p.monto,0);
                    const saldo   = fe.monto_total - cobrado;
                    return (
                      <div key={fe.id} style={{ padding:"8px 12px", background:COLORS.surface,
                        borderRadius:7, marginBottom:5, border:`1px solid ${COLORS.border}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between" }}>
                          <div>
                            <div style={{ fontFamily:FONT, fontSize:12, fontWeight:700,
                              color:COLORS.green }}>N° {fe.numero_documento}</div>
                            <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>
                              {fmtFecha(fe.fecha_emision)}
                            </div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700,
                              color:COLORS.text }}>{fmtClp(fe.monto_total)}</div>
                            {saldo > 0 && (
                              <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.yellow }}>
                                Saldo: {fmtClp(saldo)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                }

                {/* Panel IVA neteo */}
                <div style={{ marginTop:16, background:COLORS.bg, borderRadius:8,
                  border:`1px solid ${COLORS.border}`, padding:"12px 16px" }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent,
                    letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>
                    IVA — Neteo por cotización
                  </div>
                  {[
                    { l:"Débito fiscal (IVA venta)",    v: Number(cot.total_debito_fiscal),  c:COLORS.red   },
                    { l:"Crédito fiscal (IVA compras)", v: Number(cot.total_credito_fiscal), c:COLORS.green },
                  ].map((r,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between",
                      padding:"6px 0", borderBottom:`1px solid ${COLORS.border}` }}>
                      <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>{r.l}</span>
                      <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:600,
                        color:r.c }}>{fmtClp(r.v)}</span>
                    </div>
                  ))}
                  {(() => {
                    const neto = Number(cot.total_debito_fiscal) - Number(cot.total_credito_fiscal);
                    return (
                      <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8 }}>
                        <span style={{ fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700,
                          color:COLORS.text }}>{neto>=0?"IVA neto a pagar":"Remanente"}</span>
                        <span style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700,
                          color:neto>=0?COLORS.yellow:COLORS.green }}>{fmtClp(Math.abs(neto))}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* P&L */}
                <div style={{ marginTop:12, background:COLORS.bg, borderRadius:8,
                  border:`1px solid ${COLORS.border}`, padding:"12px 16px" }}>
                  <div style={{ fontFamily:FONT, fontSize:10, color:COLORS.accent,
                    letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>
                    P&L — Margen bruto
                  </div>
                  {[
                    { l:"Ingreso neto (facturado)", v: Number(cot.total_neto_emitido)||0,    c:COLORS.green },
                    { l:"Compras (neto)",            v: Number(cot.total_neto_compras)||0,    c:COLORS.red   },
                    { l:"Flete (neto)",               v: Number(cot.total_neto_flete)||0,      c:COLORS.red, always:true },
                    { l:"Servicios (neto)",           v: Number(cot.total_neto_servicios)||0, c:COLORS.red   },
                    { l:"Materiales / Terreno (neto)",v: Number(cot.total_neto_gastos)||0,    c:"#F97316"    },
                    { l:"Fact. recibidas (neto)",     v: Number(cot.total_neto_fr)||0,        c:COLORS.red   },
                  ].filter(r => r.always || r.v > 0).map((r,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between",
                      padding:"5px 0", borderBottom:`1px solid ${COLORS.border}` }}>
                      <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{r.l}</span>
                      <span style={{ fontFamily:FONT, fontSize:11, fontWeight:600,
                        color:r.v>0?r.c:COLORS.textDim }}>{r.v>0?fmtClp(r.v):"—"}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", paddingTop:8, marginTop:2 }}>
                    <span style={{ fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700,
                      color:COLORS.text }}>Margen bruto</span>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:700,
                        color:margenColor }}>{fmtClp(margen)}</div>
                      <div style={{ fontFamily:FONT, fontSize:11, color:margenColor }}>{pctMargen}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal agregar servicio */}
      {modalServicio && (
        <ModalServicio
          cotizacion={cot}
          suppliers={suppliers}
          products={products}
          modo="servicio"
          onClose={()=>setModalServicio(false)}
          onSaved={()=>{ setModalServicio(false); setDetail(null); loadDetail(); onRefresh(); }}
        />
      )}

      {/* Modal agregar gasto directo de terreno */}
      {modalGasto && (
        <ModalGastoDirecto
          cotizacion={cot}
          onClose={()=>setModalGasto(false)}
          onSaved={(gd)=>{
            setDetail(p=>({...p, gds: [gd, ...(p?.gds||[])]}));
            setModalGasto(false);
            onRefresh();
          }}
        />
      )}

      {/* Modal agregar producto (costo sin OC) */}
      {modalProducto && (
        <ModalServicio
          cotizacion={cot}
          suppliers={suppliers}
          products={products}
          modo="producto"
          onClose={()=>setModalProducto(false)}
          onSaved={()=>{ setModalProducto(false); setDetail(null); loadDetail(); onRefresh(); }}
        />
      )}
    </div>
  );
}

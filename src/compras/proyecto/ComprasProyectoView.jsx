// Compras → Por proyecto. Las compras nacen de una cotización aprobada: lo
// que el cliente pagó por ella es la bolsa del proyecto, y desde ese saldo
// se emiten y pagan las OC de lo que falta comprar según el Costeo.
// Todos los montos son BRUTOS (con IVA). Cálculos en calculos.js.
import { useEffect, useMemo, useState } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../../theme.js";
import { Loader, Stat } from "../../shared/ui.jsx";
import { fmt, fmtFecha } from "../../shared/format.js";
import { TreeCaret } from "../../shared/TreeCaret.jsx";
import { TREE_ELBOW, treeLine } from "../../shared/tree.js";
import { OC_ESTADOS } from "../ocEstados.js";
import { cobradoCotizacion, codigoCot, porComprar, resumenProyecto, totalOC, pagadoOC } from "./calculos.js";
import { cargarTodo, borrarPago } from "./datos.js";
import { campo } from "./estilos.js";
import { GenerarOCModal } from "./GenerarOCModal.jsx";
import { PagarOCModal } from "./PagarOCModal.jsx";
import { CrearProductoModal } from "./CrearProductoModal.jsx";
import { vincularFactura } from "../../finanzas/facturaCotizacion.js";

const mismoId = (a, b) => a != null && b != null && String(a) === String(b);

const tarjeta = { background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:16 };
const tituloSeccion = { fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:700, color:COLORS.text };
const th = { fontFamily:FONT, fontSize:10, color:COLORS.textMuted, letterSpacing:"0.08em", textTransform:"uppercase", textAlign:"left", padding:"0 8px 8px", fontWeight:400 };
const td = { fontFamily:FONT, fontSize:12, color:COLORS.text, padding:"8px" };

export function ComprasProyectoView({ isMobile }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [selId, setSelId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [marcadosPor, setMarcadosPor] = useState({}); // quoteId → { productId: true } (para "Generar OC")
  const [abiertas, setAbiertas] = useState({});      // ocId → desplegada
  const [verCobrado, setVerCobrado] = useState(false);
  const [generar, setGenerar] = useState(false);
  const [pagarOC, setPagarOC] = useState(null);
  const [aviso, setAviso] = useState("");
  const [crearProducto, setCrearProducto] = useState(null); // ítem del Costeo sin maestro

  const recargar = () => cargarTodo()
    .then(d => { setDatos(d); setError(null); })
    .catch(e => setError(e.message || String(e)));
  useEffect(() => { recargar(); }, []);

  // Resumen de cada cotización aprobada (para la lista y el detalle).
  const proyectos = useMemo(() => {
    if (!datos) return [];
    const totales = Object.fromEntries(datos.cotizaciones.map(q => [q.id, Number(q.total) || 0]));
    return datos.cotizaciones.filter(q => q.estado === "aprobada").map(q => {
      const cobrado = cobradoCotizacion({ quote: q, comprobantes: datos.comprobantes, facturas: datos.facturas, totalesPorCotizacion: totales, cotizaciones: datos.cotizaciones });
      const ocs = datos.ocs.filter(o => mismoId(o.cotizacion_id, q.id));
      const costeo = datos.costeos.find(c => mismoId(c.cotizacion_id, q.id));
      return { quote: q, codigo: codigoCot(q), cobrado, ocs, costeo, resumen: resumenProyecto({ cobrado: cobrado.total, ocs, pagos: datos.pagos }) };
    });
  }, [datos]);

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (!t) return proyectos;
    return proyectos.filter(p => [p.codigo, p.quote.nombre_cliente, p.quote.razon_social].some(x => String(x || "").toLowerCase().includes(t)));
  }, [proyectos, busqueda]);

  const sel = proyectos.find(p => mismoId(p.quote.id, selId)) || filtrados[0] || null;

  const faltante = useMemo(() => sel
    ? porComprar(sel.costeo?.fases || [], sel.ocs.flatMap(o => o.lines))
    : { items: [], sinMaestro: [] }, [sel]);

  // Mientras no se toque la selección de un proyecto, van marcados los ítems con algo pendiente.
  const marcados = (sel && marcadosPor[sel.quote.id])
    || Object.fromEntries(faltante.items.filter(i => i.pendiente > 0).map(i => [i.productId, true]));
  const setMarcados = (fn) => setMarcadosPor(m => ({ ...m, [sel.quote.id]: typeof fn === "function" ? fn(marcados) : fn }));

  if (error) return <div style={{ ...tarjeta, color:COLORS.red, fontFamily:FONT, fontSize:13 }}>No se pudieron cargar las compras: {error}</div>;
  if (!datos) return <Loader />;

  const seleccionados = faltante.items.filter(i => marcados[i.productId]);

  const confirmarVinculo = async (d) => {
    try {
      await vincularFactura(d.facturaId, sel.quote);
      setAviso(`Factura ${d.ref} vinculada a ${sel.codigo}.`);
      await recargar();
    } catch (e) { alert("No se pudo vincular la factura: " + e.message); }
  };

  const quitarPago = async (pago) => {
    if (!confirm(`¿Borrar el pago de ${fmt(Number(pago.monto) || 0)} del ${fmtFecha(pago.fecha)}?${pago.movimiento_id ? " También se borra su egreso en Caja." : ""}`)) return;
    try { await borrarPago(pago); await recargar(); }
    catch (e) { alert("No se pudo borrar el pago: " + e.message); }
  };

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:FONT_DISPLAY, fontSize:22, fontWeight:700, color:COLORS.text }}>Compras por proyecto</div>
        <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginTop:4 }}>
          Lo cobrado por una cotización aprobada es la bolsa del proyecto: desde ese saldo se emiten y pagan sus OC. Montos brutos (con IVA).
        </div>
      </div>

      {datos.faltaSQL && (
        <div style={{ ...tarjeta, borderColor:`${COLORS.yellow}66`, color:COLORS.yellow, fontFamily:FONT, fontSize:12, marginBottom:14 }}>
          ⚠ Falta crear la tabla de pagos a OC: corre <b>supabase/sql/2026-10-01_compras_proyecto.sql</b> en Supabase → SQL Editor. Mientras tanto no se pueden registrar pagos.
        </div>
      )}
      {aviso && (
        <div style={{ ...tarjeta, borderColor:`${COLORS.green}66`, color:COLORS.green, fontFamily:FONT, fontSize:12, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px" }}>
          <span>{aviso}</span>
          <button onClick={() => setAviso("")} style={{ background:"none", border:"none", color:COLORS.green, cursor:"pointer" }}>✕</button>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "300px minmax(0,1fr)", gap:16, alignItems:"start" }}>
        {/* ── Lista de proyectos (cotizaciones aprobadas) ── */}
        <div style={{ ...tarjeta, padding:12 }}>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar cotización o cliente…" style={{ ...campo, marginBottom:10 }} />
          {filtrados.length === 0 && (
            <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, padding:8 }}>
              {proyectos.length ? "Sin resultados." : "No hay cotizaciones aprobadas."}
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight: isMobile ? 260 : "70vh", overflowY:"auto" }}>
            {filtrados.map(p => {
              const activo = sel && mismoId(p.quote.id, sel.quote.id);
              const saldo = p.resumen.saldoDisponible;
              return (
                <button key={p.quote.id} onClick={() => setSelId(p.quote.id)}
                  style={{ textAlign:"left", padding:"9px 10px", borderRadius:8, cursor:"pointer",
                    background: activo ? `${COLORS.accent}18` : "transparent", border:`1px solid ${activo ? `${COLORS.accent}55` : "transparent"}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                    <span style={{ fontFamily:FONT, fontSize:12, fontWeight:700, color: activo ? COLORS.accent : COLORS.text }}>{p.codigo}</span>
                    <span style={{ fontFamily:FONT, fontSize:11, color: saldo < 0 ? COLORS.red : saldo > 0 ? COLORS.green : COLORS.textMuted }}>{fmt(saldo)}</span>
                  </div>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {p.quote.razon_social || p.quote.nombre_cliente || "—"}{p.ocs.length ? ` · ${p.ocs.length} OC` : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Detalle del proyecto ── */}
        {sel ? (
          <div style={{ display:"flex", flexDirection:"column", gap:16, minWidth:0 }}>
            <div>
              <div style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:700, color:COLORS.text }}>
                {sel.codigo} · {sel.quote.razon_social || sel.quote.nombre_cliente || "—"}
              </div>
              <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, marginTop:2 }}>Total cotización {fmt(Number(sel.quote.total) || 0)}</div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0,1fr))", gap:10 }}>
              <Stat label="Cobrado al cliente" value={fmt(sel.resumen.cobrado)} color={COLORS.accent}
                sub={Number(sel.quote.total) > 0 ? `${Math.round(100 * sel.resumen.cobrado / Number(sel.quote.total))}% de la cotización` : null} />
              <Stat label="Comprometido en OC" value={fmt(sel.resumen.comprometido)} sub={`${sel.ocs.length} OC`} />
              <Stat label="Pagado a proveedores" value={fmt(sel.resumen.pagado)} sub={`Por pagar ${fmt(sel.resumen.porPagar)}`} />
              <Stat label="Saldo disponible" value={fmt(sel.resumen.saldoDisponible)}
                color={sel.resumen.saldoDisponible < 0 ? COLORS.red : COLORS.green}
                sub={`Proyectado ${fmt(sel.resumen.saldoProyectado)}`} />
            </div>

            {/* Detalle de lo cobrado */}
            <div style={tarjeta}>
              <div style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }} onClick={() => setVerCobrado(v => !v)}>
                <TreeCaret collapsed={!verCobrado} onToggle={() => setVerCobrado(v => !v)} />
                <span style={tituloSeccion}>De dónde sale lo cobrado</span>
                <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.textMuted }}>{sel.cobrado.detalle.length} pago{sel.cobrado.detalle.length === 1 ? "" : "s"}</span>
              </div>
              {verCobrado && (
                <div className="tree-row-in" style={{ marginTop:10 }}>
                  {sel.cobrado.detalle.length === 0 && (
                    <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>
                      Todavía no hay pagos del cliente: se registran en Pedidos (comprobantes) o en Cuentas por Cobrar (facturas vinculadas a esta cotización).
                    </div>
                  )}
                  {sel.cobrado.detalle.map((d, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", gap:10, fontFamily:FONT, fontSize:12, padding:"4px 0", color:COLORS.textMuted }}>
                      <span>
                        {d.origen} {d.ref}
                        {d.compartido && <span title="El comprobante cubre varias cotizaciones: se reparte en proporción al total de cada una" style={{ color:COLORS.yellow }}> · compartido</span>}
                        {d.porReferencia && <span title="Factura sin cotización vinculada: se asoció por su texto de referencia" style={{ color:COLORS.yellow }}> · por referencia</span>}
                        {d.porReferencia && (
                          <button onClick={() => confirmarVinculo(d)} title={`Guardar el vínculo de la factura ${d.ref} con ${sel.codigo}`}
                            style={{ marginLeft:8, padding:"1px 8px", borderRadius:5, border:`1px solid ${COLORS.accent}55`, background:`${COLORS.accent}14`,
                              color:COLORS.accent, fontFamily:FONT, fontSize:10, cursor:"pointer" }}>🔗 Vincular</button>
                        )}
                      </span>
                      <span style={{ color:COLORS.text }}>{fmt(d.monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Por comprar (desde el Costeo) */}
            <div style={tarjeta}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:12 }}>
                <span style={tituloSeccion}>Por comprar <span style={{ fontFamily:FONT, fontSize:11, fontWeight:400, color:COLORS.textMuted }}>· desde el Costeo</span></span>
                <button onClick={() => setGenerar(true)} disabled={!seleccionados.length}
                  style={{ padding:"8px 14px", borderRadius:7, border:"none", fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700,
                    background: seleccionados.length ? COLORS.accent : COLORS.border, color: seleccionados.length ? COLORS.bg : COLORS.textMuted,
                    cursor: seleccionados.length ? "pointer" : "not-allowed" }}>
                  Generar OC{seleccionados.length ? ` (${seleccionados.length})` : ""}
                </button>
              </div>
              {!sel.costeo && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Esta cotización no tiene un Costeo vinculado: créalo en Proyectos → Crear proyecto para ver qué comprar.</div>}
              {sel.costeo && faltante.items.length === 0 && faltante.sinMaestro.length === 0 && (
                <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>El Costeo no tiene equipos, ferretería ni materiales.</div>
              )}
              {faltante.items.length > 0 && (
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", minWidth:520 }}>
                    <thead><tr>
                      <th style={{ ...th, width:24 }}>
                        <input type="checkbox" aria-label="Marcar todos"
                          checked={faltante.items.length > 0 && faltante.items.every(i => marcados[i.productId])}
                          onChange={e => setMarcados(Object.fromEntries(e.target.checked ? faltante.items.map(i => [i.productId, true]) : []))} />
                      </th>
                      <th style={th}>Producto</th>
                      <th style={{ ...th, textAlign:"right" }}>Costeo</th>
                      <th style={{ ...th, textAlign:"right" }}>En OC</th>
                      <th style={{ ...th, textAlign:"right" }}>Pendiente</th>
                      <th style={{ ...th, textAlign:"right" }}>Costo bruto</th>
                    </tr></thead>
                    <tbody>
                      {faltante.items.map(it => (
                        <tr key={it.productId} style={{ borderTop:`1px solid ${COLORS.border}`, opacity: it.pendiente > 0 ? 1 : 0.55 }}>
                          <td style={td}><input type="checkbox" aria-label={`Comprar ${it.descripcion}`} checked={!!marcados[it.productId]}
                            onChange={e => setMarcados(m => ({ ...m, [it.productId]: e.target.checked }))} /></td>
                          <td style={td}>{it.descripcion}{it.modelo && <div style={{ fontSize:10, color:COLORS.textMuted }}>{it.modelo}</div>}</td>
                          <td style={{ ...td, textAlign:"right" }}>{it.qty}</td>
                          <td style={{ ...td, textAlign:"right", color:COLORS.textMuted }}>{it.yaEnOC}</td>
                          <td style={{ ...td, textAlign:"right", fontWeight:700, color: it.pendiente > 0 ? COLORS.yellow : COLORS.green }}>{it.pendiente > 0 ? it.pendiente : "✓"}</td>
                          <td style={{ ...td, textAlign:"right" }}>{fmt(it.costoBruto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {faltante.sinMaestro.length > 0 && (
                <div style={{ marginTop:12, padding:"10px 12px", borderRadius:8, background:COLORS.bg, border:`1px dashed ${COLORS.border}` }}>
                  <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.yellow, marginBottom:6 }}>
                    Sin producto del maestro — créalos en el Maestro para poder pedirlos en una OC:
                  </div>
                  {faltante.sinMaestro.map((s, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontFamily:FONT, fontSize:12, color:COLORS.textMuted, padding:"3px 0" }}>
                      <span style={{ flex:1, minWidth:0 }}>{s.descripcion} × {s.qty} <span style={{ color:COLORS.textDim }}>({s.fases.join(", ")})</span></span>
                      <span>{fmt(s.costoBruto)}</span>
                      <button onClick={() => setCrearProducto(s)}
                        style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${COLORS.accent}55`, background:`${COLORS.accent}14`,
                          color:COLORS.accent, fontFamily:FONT_DISPLAY, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>+ Crear en maestro</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* OC del proyecto */}
            <div style={tarjeta}>
              <div style={{ ...tituloSeccion, marginBottom:12 }}>Órdenes de compra del proyecto</div>
              {sel.ocs.length === 0 && <div style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted }}>Todavía no hay OC para este proyecto.</div>}
              {sel.ocs.map(oc => {
                const total = totalOC(oc);
                const pagado = pagadoOC(oc.id, datos.pagos);
                const pendiente = total - pagado;
                const est = OC_ESTADOS.find(e => e.key === oc.estado) || OC_ESTADOS[0];
                const pagos = datos.pagos.filter(p => mismoId(p.purchase_order_id, oc.id));
                const abierta = !!abiertas[oc.id];
                const hijos = [
                  ...oc.lines.map(l => ({ key:`l${l.id}`, izq: `${l.products?.codigo ? l.products.codigo + " · " : ""}${l.products?.nombre || "Producto"} × ${l.cantidad}`, der: fmt((Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0)) })),
                  ...pagos.map(p => ({ key:`p${p.id}`, pago:p, izq: `💰 Pago ${fmtFecha(p.fecha)} · ${p.metodo || ""}${p.referencia ? ` · ${p.referencia}` : ""}`, der: fmt(Number(p.monto) || 0) })),
                ];
                return (
                  <div key={oc.id} style={{ borderTop:`1px solid ${COLORS.border}`, padding:"10px 0" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                      <TreeCaret collapsed={!abierta} onToggle={() => setAbiertas(a => ({ ...a, [oc.id]: !a[oc.id] }))}
                        title={abierta ? "Ocultar detalle" : "Ver líneas y pagos"} />
                      <span style={{ fontFamily:FONT, fontSize:13, fontWeight:700, color:COLORS.text }}>{oc.numero_oc}</span>
                      <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, flex:1, minWidth:100 }}>
                        {oc.suppliers?.nombre || "—"}
                        {datos.facturasProveedor && (() => {
                          const facts = datos.facturasProveedor.filter(f => mismoId(f.purchase_order_id, oc.id));
                          return facts.length
                            ? <span title="Factura del proveedor en Cuentas por Pagar" style={{ marginLeft:8, fontSize:10, color:COLORS.green }}>🧾 Fact. {facts.map(f => f.numero_documento).join(", ")}</span>
                            : <span title="Regístrala en Finanzas → Cuentas por Pagar (sección Órdenes de compra sin factura)" style={{ marginLeft:8, fontSize:10, color:COLORS.textDim }}>sin factura</span>;
                        })()}
                      </span>
                      <span style={{ fontFamily:FONT, fontSize:10, padding:"2px 8px", borderRadius:4, color:est.color, background:`${est.color}22`, border:`1px solid ${est.color}44` }}>{est.icon} {est.key}</span>
                      <span style={{ fontFamily:FONT, fontSize:12, color:COLORS.textMuted, whiteSpace:"nowrap" }}>
                        {fmt(pagado)} / <span style={{ color:COLORS.text }}>{fmt(total)}</span>
                      </span>
                      {pendiente > 0 ? (
                        <button onClick={() => setPagarOC(oc)} disabled={datos.faltaSQL}
                          title={datos.faltaSQL ? "Falta correr el SQL de pagos a OC" : `Pendiente ${fmt(pendiente)}`}
                          style={{ padding:"5px 12px", borderRadius:6, border:`1px solid ${COLORS.green}66`, background:`${COLORS.green}18`, color:COLORS.green,
                            fontFamily:FONT_DISPLAY, fontSize:12, fontWeight:700, cursor: datos.faltaSQL ? "not-allowed" : "pointer" }}>Pagar</button>
                      ) : (
                        <span style={{ fontFamily:FONT, fontSize:11, color:COLORS.green }}>✓ Pagada</span>
                      )}
                    </div>
                    {abierta && (
                      <div className="tree-row-in" style={{ marginTop:6 }}>
                        {hijos.map((h, i) => {
                          const ultimo = i === hijos.length - 1;
                          return (
                            <div key={h.key} style={{ position:"relative", display:"flex", alignItems:"center", gap:10, padding:"4px 0 4px 26px", fontFamily:FONT, fontSize:12,
                              color: h.pago ? COLORS.green : COLORS.textMuted }}>
                              {!ultimo && <div style={treeLine({ left:6, top:0, bottom:0, borderLeftWidth:1 })} />}
                              <div style={treeLine({ left:6, top:0, height:"50%", width:TREE_ELBOW, borderLeftWidth:1, borderBottomWidth:1, borderBottomLeftRadius:6 })} />
                              <span style={{ flex:1, minWidth:0 }}>{h.izq}</span>
                              <span style={{ color:COLORS.text }}>{h.der}</span>
                              {h.pago && (
                                <button onClick={() => quitarPago(h.pago)} title="Borrar este pago"
                                  style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:12 }}>✕</button>
                              )}
                            </div>
                          );
                        })}
                        {oc.notas && <div style={{ fontFamily:FONT, fontSize:11, color:COLORS.textDim, padding:"4px 0 0 26px" }}>{oc.notas}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ ...tarjeta, fontFamily:FONT, fontSize:13, color:COLORS.textMuted }}>Elige una cotización aprobada.</div>
        )}
      </div>

      {generar && sel && (
        <GenerarOCModal quote={sel.quote} codigo={sel.codigo} items={seleccionados}
          suppliers={datos.suppliers} prices={datos.prices} saldoProyectado={sel.resumen.saldoProyectado}
          onClose={() => setGenerar(false)}
          onCreated={async (numeros) => {
            setGenerar(false);
            setMarcadosPor(m => ({ ...m, [sel.quote.id]: undefined }));
            setAviso(`Se generaron ${numeros.join(", ")} para ${sel.codigo}. Las encuentras también en Órdenes de Compra (PDF, despacho, estados).`);
            await recargar();
          }} />
      )}
      {pagarOC && sel && (
        <PagarOCModal oc={pagarOC} total={totalOC(pagarOC)} pagado={pagadoOC(pagarOC.id, datos.pagos)}
          saldoDisponible={sel.resumen.saldoDisponible} codigo={sel.codigo}
          cuentas={datos.conCaja ? datos.cuentas : []}
          onClose={() => setPagarOC(null)}
          onPaid={async () => { setPagarOC(null); await recargar(); }} />
      )}
      {crearProducto && sel?.costeo && (
        <CrearProductoModal item={crearProducto} costeoId={sel.costeo.id} productos={datos.productos} suppliers={datos.suppliers}
          onClose={() => setCrearProducto(null)}
          onCreated={async ({ producto, cambiados }) => {
            setCrearProducto(null);
            setMarcadosPor(m => ({ ...m, [sel.quote.id]: undefined }));
            setAviso(`${producto.codigo} · ${producto.nombre} creado en el Maestro y enlazado en ${cambiados} ítem${cambiados === 1 ? "" : "s"} del Costeo.`);
            await recargar();
          }} />
      )}
    </div>
  );
}

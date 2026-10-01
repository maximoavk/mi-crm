// Genera las órdenes de compra de un proyecto a partir de lo que falta
// comprar del Costeo: una OC por proveedor, con proveedor y precio del
// maestro (el preferido) sugeridos. Precios BRUTOS (con IVA).
import { useMemo, useState } from "react";
import { COLORS, FONT, FONT_DISPLAY } from "../../theme.js";
import { fmt } from "../../shared/format.js";
import { Ventana } from "../../shared/Ventana.jsx";
import { campo, etiqueta } from "./estilos.js";
import { crearOCs } from "./datos.js";

// Proveedor y precio sugeridos para un producto: el precio preferido del
// maestro (o el primero); sin precios, el costo del Costeo y sin proveedor.
function sugerencia(item, prices) {
  const propios = prices.filter(p => String(p.product_id) === String(item.productId));
  const pref = propios.find(p => p.es_preferido) || propios[0];
  return pref
    ? { supplier_id: String(pref.supplier_id), supplier_price_id: pref.id, precio: Math.round(Number(pref.precio_bruto) || 0) }
    : { supplier_id: "", supplier_price_id: null, precio: item.costoBruto || 0 };
}

export function GenerarOCModal({ quote, codigo, items, suppliers, prices, saldoProyectado, onClose, onCreated }) {
  const [filas, setFilas] = useState(() => items.map(it => ({
    productId: it.productId, descripcion: it.descripcion, modelo: it.modelo,
    qty: it.pendiente || 1, ...sugerencia(it, prices),
  })));
  const [notas, setNotas] = useState(`Proyecto ${codigo} · ${quote.razon_social || quote.nombre_cliente || ""}`.trim());
  const [guardando, setGuardando] = useState(false);

  const setFila = (i, cambios) => setFilas(p => p.map((f, j) => j === i ? { ...f, ...cambios } : f));
  const cambiarProveedor = (i, supplier_id) => {
    const f = filas[i];
    const pp = prices.find(p => String(p.product_id) === String(f.productId) && String(p.supplier_id) === supplier_id);
    setFila(i, { supplier_id, supplier_price_id: pp?.id || null, precio: pp ? Math.round(Number(pp.precio_bruto) || 0) : f.precio });
  };

  const nombreProveedor = (id) => suppliers.find(s => String(s.id) === String(id))?.nombre || "—";
  const grupos = useMemo(() => {
    const g = {};
    for (const f of filas) {
      if (!f.supplier_id) continue;
      g[f.supplier_id] ??= { supplier_id: f.supplier_id, filas: [], total: 0 };
      g[f.supplier_id].filas.push(f);
      g[f.supplier_id].total += (Number(f.qty) || 0) * (Number(f.precio) || 0);
    }
    return Object.values(g);
  }, [filas]);
  const totalNuevo = grupos.reduce((s, g) => s + g.total, 0);
  const incompletas = filas.filter(f => !f.supplier_id || !(Number(f.qty) > 0) || !(Number(f.precio) > 0)).length;
  const saldoDespues = saldoProyectado - totalNuevo;

  const generar = async () => {
    if (incompletas || !filas.length) return;
    setGuardando(true);
    try {
      const numeros = await crearOCs(quote.id, grupos.map(g => ({
        supplier_id: g.supplier_id,
        lineas: g.filas.map(f => ({
          product_id: f.productId, supplier_price_id: f.supplier_price_id || null,
          cantidad: Number(f.qty), precio_unitario: Math.round(Number(f.precio)),
        })),
      })), notas.trim());
      onCreated(numeros);
    } catch (e) {
      alert("No se pudieron generar las órdenes de compra: " + e.message);
      setGuardando(false);
    }
  };

  return (
    <Ventana title={`Generar OC · ${codigo}`} sub="Se crea una orden de compra por proveedor. Precios brutos (con IVA)."
      onClose={onClose} onSubmit={generar} disabled={guardando || !!incompletas || !filas.length}
      submitLabel={guardando ? "Generando…" : grupos.length ? `Generar ${grupos.length} OC` : "Generar OC"}>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:620 }}>
          <thead>
            <tr>{["Producto", "Proveedor", "Cant.", "Precio bruto", "Subtotal", ""].map(h => (
              <th key={h} style={{ ...etiqueta, textAlign:"left", padding:"0 6px 6px", fontWeight:400 }}>{h}</th>))}</tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const conPrecio = prices.filter(p => String(p.product_id) === String(f.productId));
              const idsConPrecio = new Set(conPrecio.map(p => String(p.supplier_id)));
              return (
                <tr key={f.productId} style={{ borderTop:`1px solid ${COLORS.border}` }}>
                  <td style={{ padding:"8px 6px", fontFamily:FONT, fontSize:12, color:COLORS.text }}>
                    {f.descripcion}
                    {f.modelo && <div style={{ fontSize:10, color:COLORS.textMuted }}>{f.modelo}</div>}
                  </td>
                  <td style={{ padding:"8px 6px", width:190 }}>
                    <select aria-label="Proveedor" value={f.supplier_id} onChange={e => cambiarProveedor(i, e.target.value)}
                      style={{ ...campo, borderColor: f.supplier_id ? COLORS.border : COLORS.yellow }}>
                      <option value="">— Elegir proveedor —</option>
                      {conPrecio.length > 0 && (
                        <optgroup label="Con precio en el maestro">
                          {conPrecio.map(p => (
                            <option key={p.id} value={String(p.supplier_id)}>
                              {p.es_preferido ? "★ " : ""}{p.suppliers?.nombre || nombreProveedor(p.supplier_id)} · {fmt(Number(p.precio_bruto) || 0)}
                            </option>))}
                        </optgroup>
                      )}
                      <optgroup label="Otros proveedores">
                        {suppliers.filter(s => !idsConPrecio.has(String(s.id))).map(s => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
                      </optgroup>
                    </select>
                  </td>
                  <td style={{ padding:"8px 6px", width:70 }}>
                    <input aria-label="Cantidad" type="number" min="1" value={f.qty} onChange={e => setFila(i, { qty: e.target.value })} style={campo} />
                  </td>
                  <td style={{ padding:"8px 6px", width:110 }}>
                    <input aria-label="Precio bruto" type="number" min="0" value={f.precio} onChange={e => setFila(i, { precio: e.target.value })} style={campo} />
                  </td>
                  <td style={{ padding:"8px 6px", fontFamily:FONT, fontSize:12, color:COLORS.text, textAlign:"right", whiteSpace:"nowrap" }}>
                    {fmt((Number(f.qty) || 0) * (Number(f.precio) || 0))}
                  </td>
                  <td style={{ padding:"8px 2px", width:24 }}>
                    <button onClick={() => setFilas(p => p.filter((_, j) => j !== i))} title="Quitar de esta compra"
                      style={{ background:"none", border:"none", color:COLORS.textMuted, cursor:"pointer", fontSize:14 }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop:14 }}>
        <div style={etiqueta}>Notas de las OC</div>
        <input value={notas} onChange={e => setNotas(e.target.value)} style={campo} />
      </div>

      {grupos.length > 0 && (
        <div style={{ marginTop:14, padding:"10px 12px", background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:8 }}>
          {grupos.map(g => (
            <div key={g.supplier_id} style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT, fontSize:12, color:COLORS.textMuted, padding:"2px 0" }}>
              <span>OC a {nombreProveedor(g.supplier_id)} · {g.filas.length} ítem{g.filas.length === 1 ? "" : "s"}</span>
              <span style={{ color:COLORS.text }}>{fmt(g.total)}</span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", fontFamily:FONT_DISPLAY, fontSize:13, fontWeight:700, color:COLORS.text, borderTop:`1px solid ${COLORS.border}`, marginTop:6, paddingTop:6 }}>
            <span>Total a comprometer</span><span>{fmt(totalNuevo)}</span>
          </div>
          <div style={{ fontFamily:FONT, fontSize:11, marginTop:4, color: saldoDespues < 0 ? COLORS.yellow : COLORS.textMuted }}>
            Saldo proyectado del proyecto después: {fmt(saldoDespues)}
            {saldoDespues < 0 && " — lo cobrado todavía no alcanza para todas las OC emitidas"}
          </div>
        </div>
      )}
      {incompletas > 0 && (
        <div style={{ marginTop:10, fontFamily:FONT, fontSize:11, color:COLORS.yellow }}>
          {incompletas} ítem{incompletas === 1 ? "" : "s"} sin proveedor, cantidad o precio.
        </div>
      )}
    </Ventana>
  );
}

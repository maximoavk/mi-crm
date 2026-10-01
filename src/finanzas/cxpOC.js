// Cuentas por Pagar ↔ órdenes de compra. Lo que se paga a una OC desde
// Compras → Por proyecto (tabla pagos_oc) cuenta como pagado en la factura
// del proveedor vinculada a esa OC, para no registrar el pago dos veces.
// Tests en cxpOC.test.js.

const num = (v) => Number(v) || 0;
const totalOC = (oc) => (oc.purchase_order_lines || oc.lines || []).reduce((s, l) => s + num(l.cantidad) * num(l.precio_unitario), 0);
export const pagadoPropio = (f) => (f.pagos_realizados || []).reduce((s, p) => s + num(p.monto), 0);

// Parte de los pagos de cada OC que cubre cada factura vinculada a ella.
// Si una OC tiene varias facturas, los pagos se aplican en orden de
// recepción y sin pasarse del saldo de cada factura.
export function pagosOCPorFactura(facturas, pagosOC) {
  const disponible = {};
  for (const p of pagosOC || []) disponible[p.purchase_order_id] = (disponible[p.purchase_order_id] || 0) + num(p.monto);
  const asignado = {};
  const vinculadas = (facturas || []).filter(f => f.purchase_order_id != null)
    .sort((a, b) => String(a.fecha_recepcion || "").localeCompare(String(b.fecha_recepcion || "")) || String(a.id).localeCompare(String(b.id)));
  for (const f of vinculadas) {
    const resto = disponible[f.purchase_order_id] || 0;
    const parte = Math.min(Math.max(0, num(f.monto_total) - pagadoPropio(f)), resto);
    asignado[f.id] = parte;
    disponible[f.purchase_order_id] = resto - parte;
  }
  return asignado;
}

// OC que todavía no tienen factura del proveedor: las que tienen algo
// pagado (falta la factura para el crédito fiscal) o algo por pagar.
export function ocsSinFactura(ocs, facturas, pagosOC) {
  const conFactura = new Set((facturas || []).filter(f => f.purchase_order_id != null).map(f => String(f.purchase_order_id)));
  return (ocs || []).filter(oc => !conFactura.has(String(oc.id))).map(oc => {
    const total = totalOC(oc);
    const pagado = (pagosOC || []).filter(p => String(p.purchase_order_id) === String(oc.id)).reduce((s, p) => s + num(p.monto), 0);
    return { oc, total, pagado, pendiente: Math.max(0, total - pagado) };
  }).filter(x => x.pagado > 0 || (x.pendiente > 0 && x.oc.estado !== "PAGADA"));
}

// Neto e IVA de una factura a partir del total bruto de la OC.
export function netoDesdeBruto(bruto) {
  const neto = Math.round(num(bruto) / 1.19);
  return { neto, iva: num(bruto) - neto };
}

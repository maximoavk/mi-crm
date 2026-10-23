// Cálculos puros de Prestaciones (pedidos CP/PF): pagos reales y
// compensación entre cotizaciones de un mismo pedido. Tests en calculos.test.js.
// Antes vivían copiados (y ligeramente distintos) en PedidosGrid.jsx y
// PedidoModal.jsx: la grilla repartía el pool entre las COTs del pedido,
// pero el modal sumaba directo sin repartir, así que una COT sobrepagada
// podía verse "pagada" en la grilla y "con saldo" al abrir el mismo pedido.

// Suma solo las transacciones bancarias reales de un comprobante — nunca
// `monto_pagado` (el monto declarado a mano al crear/editar el documento,
// que puede no coincidir si se corrigió después).
export function txPagado(doc) {
  return (doc.transacciones || []).reduce((s, t) => s + Number(t.monto || 0), 0);
}

// Reparte lo pagado de un pedido entre sus cotizaciones, en el orden dado:
// si una cotización queda sobrepagada, el excedente compensa el saldo de
// las que vienen después en la lista — así un pedido con varias COTs no
// muestra sobrepago en una y pendiente en otra cuando en la práctica ya
// está cubierto entre todas.
//
// `cotData` es un array de objetos con al menos las claves `totalKey` y
// `pagadoKey` (por defecto "total"/"pagado"); se conservan todas las demás
// claves y se agregan `efectivo` (lo que realmente cubre a esa cotización),
// `saldo` y `pct` a cada fila.
export function compensarPool(cotData, totalKey = "total", pagadoKey = "pagado") {
  let pool = cotData.reduce((s, c) => s + c[pagadoKey], 0);
  return cotData.map(c => {
    const total = c[totalKey];
    const efectivo = Math.min(pool, total);
    pool = Math.max(0, pool - total);
    const saldo = Math.max(0, total - efectivo);
    const pct = total > 0 ? Math.min((efectivo / total) * 100, 100) : 0;
    return { ...c, efectivo, saldo, pct };
  });
}

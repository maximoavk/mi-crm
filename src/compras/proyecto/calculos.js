// Cálculos de "Compras del proyecto": lo que el cliente pagó por una
// cotización aprobada es la bolsa desde la que se pagan las compras de ese
// proyecto. Todos los montos son BRUTOS (con IVA). Tests en calculos.test.js.

const num = (v) => Number(v) || 0;

// "COT-043" / "SIN-007"
export const codigoCot = (q) => `${q.serie || "COT"}-${String(q.numero).padStart(3, "0")}`;

// ── Cobrado al cliente ───────────────────────────────────────────────────────

// Suma de las transacciones bancarias de un comprobante de pago.
export const pagadoComprobante = (doc) => (doc.transacciones || []).reduce((s, t) => s + num(t.monto), 0);

// Parte de un comprobante que corresponde a una cotización. Un comprobante
// puede cubrir varias cotizaciones y no guarda cuánto va a cada una: se
// reparte en proporción al total de cada cotización (en partes iguales si
// no hay totales).
export function parteDeComprobante(doc, quoteId, totalesPorCotizacion) {
  const ids = doc.quote_ids || [];
  if (!ids.some(id => String(id) === String(quoteId))) return 0;
  const pagado = pagadoComprobante(doc);
  if (ids.length === 1) return pagado;
  const totales = ids.map(id => num(totalesPorCotizacion[id]));
  const suma = totales.reduce((s, t) => s + t, 0);
  const propio = num(totalesPorCotizacion[quoteId]);
  return suma > 0 ? Math.round(pagado * propio / suma) : Math.round(pagado / ids.length);
}

// ¿El texto "Ref. cotización" de una factura (ej. "COT-043", "cot 43", "43")
// apunta a esta cotización? Solo para facturas antiguas sin cotizacion_id.
export function referenciaCoincide(ref, quote) {
  if (!ref || !quote) return false;
  const m = String(ref).toUpperCase().match(/(COT|SIN)?\s*-?\s*0*(\d+)/);
  if (!m) return false;
  const serie = m[1];
  if (Number(m[2]) !== Number(quote.numero)) return false;
  return !serie || serie === (quote.serie || "COT");
}

// La cotización a la que apunta una referencia escrita a mano, solo si es
// una sola (con varias candidatas no se adivina).
export function sugerirCotizacion(ref, cotizaciones) {
  const candidatas = (cotizaciones || []).filter(q => referenciaCoincide(ref, q));
  return candidatas.length === 1 ? candidatas[0] : null;
}

// Facturas emitidas de una cotización: las vinculadas por cotizacion_id y,
// si no tienen vínculo, las que la nombran en "Ref. cotización". Con la
// lista de cotizaciones, una referencia ambigua ("43" con COT-043 y
// SIN-043) no se asigna a ninguna, para no contar el pago dos veces.
export function facturasDeCotizacion(facturas, quote, cotizaciones) {
  const porRef = (f) => cotizaciones
    ? String(sugerirCotizacion(f.referencia_cotizacion, cotizaciones)?.id) === String(quote.id)
    : referenciaCoincide(f.referencia_cotizacion, quote);
  return (facturas || []).filter(f => f.cotizacion_id ? String(f.cotizacion_id) === String(quote.id) : porRef(f));
}

// Las facturas que Prestaciones / Colaborador generan desde un comprobante
// ("Generado desde PF …") documentan plata que ya está en ese comprobante:
// sus pagos no se suman de nuevo.
export const facturaDeComprobante = (f) => /^Generado desde PF/i.test(f.notas || "");

// Todo lo cobrado por una cotización, con su detalle.
export function cobradoCotizacion({ quote, comprobantes, facturas, totalesPorCotizacion, cotizaciones }) {
  const detalle = [];
  for (const doc of comprobantes || []) {
    const monto = parteDeComprobante(doc, quote.id, totalesPorCotizacion);
    if (monto > 0) detalle.push({ origen: "Comprobante", ref: doc.numero || "", monto,
      compartido: (doc.quote_ids || []).length > 1 });
  }
  for (const f of facturasDeCotizacion(facturas, quote, cotizaciones)) {
    if (facturaDeComprobante(f)) continue;
    const monto = (f.pagos_recibidos || []).reduce((s, p) => s + num(p.monto), 0);
    if (monto > 0) detalle.push({ origen: "Factura", ref: f.numero_documento || "", monto,
      porReferencia: !f.cotizacion_id, facturaId: f.id });
  }
  return { total: detalle.reduce((s, d) => s + d.monto, 0), detalle };
}

// ── Órdenes de compra y sus pagos ────────────────────────────────────────────

// Total bruto de una OC (precio_unitario se guarda con IVA).
export const totalOC = (oc) => (oc.lines || []).reduce((s, l) => s + num(l.cantidad) * num(l.precio_unitario), 0);

export const pagadoOC = (ocId, pagos) =>
  (pagos || []).filter(p => String(p.purchase_order_id) === String(ocId)).reduce((s, p) => s + num(p.monto), 0);

// Resumen de la bolsa del proyecto.
export function resumenProyecto({ cobrado, ocs, pagos }) {
  const comprometido = (ocs || []).reduce((s, oc) => s + totalOC(oc), 0);
  const pagado = (ocs || []).reduce((s, oc) => s + pagadoOC(oc.id, pagos), 0);
  return {
    cobrado,
    comprometido,                          // total de las OC emitidas
    pagado,                                // pagado a proveedores
    porPagar: comprometido - pagado,
    saldoDisponible: cobrado - pagado,     // plata del proyecto que queda hoy
    saldoProyectado: cobrado - comprometido, // si se pagan todas las OC emitidas
  };
}

// ¿Un pago deja el proyecto en negativo? (Se advierte, pero se permite.)
export function evaluarPago(monto, saldoDisponible) {
  const saldoDespues = num(saldoDisponible) - num(monto);
  return { excede: saldoDespues < 0, saldoDespues };
}

// ── Qué falta comprar (desde el Costeo) ─────────────────────────────────────

const TIPOS_COMPRABLES = ["Equipos", "Ferretería", "Materiales"];

const normDesc = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

// Ítems del costeo por comprar, agrupados por producto del maestro y
// descontando lo que ya está en OC del proyecto. Los ítems que no vienen
// del maestro van aparte, agrupados por descripción (no se pueden pedir en
// una OC hasta crearlos en el maestro).
export function porComprar(fases, lineasOC) {
  const comprado = {};
  for (const l of lineasOC || []) comprado[l.product_id] = (comprado[l.product_id] || 0) + num(l.cantidad);
  const porProducto = {};
  const porDescripcion = {};
  for (const fase of fases || []) {
    for (const it of fase.items || []) {
      if (!TIPOS_COMPRABLES.includes(it.tipo)) continue;
      const qty = num(it.qty) || 1;
      const costoBruto = Math.round(num(it.costoUnitNeto) * (it.aplicaIVA === false ? 1 : 1.19));
      if (!it.productId) {
        const k = normDesc(it.descripcion);
        porDescripcion[k] ??= { descripcion: it.descripcion || "(sin descripción)", modelo: it.modelo || "", tipo: it.tipo,
          datasheet_url: it.datasheet_url || "", qty: 0, costoBruto, fases: [] };
        const g = porDescripcion[k];
        g.qty += qty;
        if (!g.fases.includes(fase.nombre)) g.fases.push(fase.nombre);
        continue;
      }
      const k = it.productId;
      porProducto[k] ??= { productId: k, descripcion: it.descripcion, modelo: it.modelo || "", qty: 0, costoBruto };
      porProducto[k].qty += qty;
    }
  }
  const items = Object.values(porProducto).map(p => {
    const yaEnOC = comprado[p.productId] || 0;
    return { ...p, yaEnOC, pendiente: Math.max(0, p.qty - yaEnOC) };
  });
  return { items, sinMaestro: Object.values(porDescripcion) };
}

// Enlaza un producto recién creado en el maestro con los ítems del costeo
// que tenían esa descripción y no venían del maestro. Devuelve las fases
// nuevas y cuántos ítems cambiaron.
export function vincularProductoEnFases(fases, descripcion, producto) {
  const k = normDesc(descripcion);
  let cambiados = 0;
  const nuevas = (fases || []).map(f => ({
    ...f,
    items: (f.items || []).map(it => {
      if (it.productId || !TIPOS_COMPRABLES.includes(it.tipo) || normDesc(it.descripcion) !== k) return it;
      cambiados++;
      return { ...it, productId: producto.id, cod: producto.codigo || it.cod || "",
        datasheet_url: it.datasheet_url || producto.ficha_tecnica_url || "" };
    }),
  }));
  return { fases: nuevas, cambiados };
}

// Siguiente número de OC ("OC-007") a partir de los números existentes.
export function siguienteNumeroOC(numeros) {
  const n = (numeros || []).map(x => parseInt(String(x || "").split("-")[1], 10)).filter(x => !isNaN(x));
  return `OC-${String(Math.max(0, ...n) + 1).padStart(3, "0")}`;
}

// Código sugerido para un producto nuevo de una categoría: el prefijo más
// usado en esa categoría y el número siguiente ("ECAM-007" → "ECAM-008").
// Sin productos en la categoría no se sugiere nada.
export function sugerirCodigo(categoria, productos) {
  const conteo = {};
  for (const p of productos || []) {
    if (!categoria || p.categoria !== categoria) continue;
    const m = String(p.codigo || "").match(/^(.*?)(\d+)$/);
    if (!m) continue;
    const c = (conteo[m[1]] ??= { n: 0, max: 0, ancho: m[2].length });
    c.n++;
    c.max = Math.max(c.max, Number(m[2]));
    c.ancho = Math.max(c.ancho, m[2].length);
  }
  const [prefijo, c] = Object.entries(conteo).sort((a, b) => b[1].n - a[1].n)[0] || [];
  if (prefijo == null) return "";
  // El siguiente número libre entre todos los códigos con ese prefijo (de cualquier categoría).
  const usados = (productos || []).map(p => String(p.codigo || "")).filter(x => x.startsWith(prefijo))
    .map(x => Number(x.slice(prefijo.length))).filter(n => !isNaN(n));
  return prefijo + String(Math.max(c.max, ...usados) + 1).padStart(c.ancho, "0");
}

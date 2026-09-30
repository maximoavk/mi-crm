// Cálculos de plata del ERP (IVA, líneas de cotización, costeo por fases).
// Funciones puras, sin React ni Supabase, para poder testearlas en
// calculos.test.js. Cualquier cambio acá cambia montos reales: correr
// `npm test` antes de subirlo.

export const IVA = 1.19;       // factor neto → bruto
export const TASA_IVA = 0.19;  // literal: 1.19 - 1 en coma flotante no da 0.19 exacto
export const CAT_TIPOS = ["Equipos","Ferretería","Mano de Obra / HH"];

// ── Cotizaciones ─────────────────────────────────────────────────────────────

// Subtotal de una línea: precio × cantidad, menos el % de descuento, en pesos
// enteros. Cantidad vacía o 0 cuenta como 1 (así lo usa el editor).
export function subtotalLinea(precio, cantidad, descuentoPct) {
  const price = Number(precio)||0;
  const qty   = Number(cantidad)||1;
  const disc  = Number(descuentoPct)||0;
  return Math.round(price * qty * (1 - disc/100));
}

// Regla de redondeo de Chile (Ley 20.956): el monto final se redondea a la
// decena; si termina en 1 a 5 baja a la decena inferior y si termina en 6 a 9
// sube a la superior. Se aplica a todo total de cotización, propuesta y
// costeo, venga del editor, del costeo, de una sincronización o de un cambio
// de alcance, para que todos muestren el mismo monto.
export function redondearTotal(monto) {
  const n = Math.round(Number(monto)||0);
  const ultimo = ((n % 10) + 10) % 10;
  return ultimo <= 5 ? n - ultimo : n + (10 - ultimo);
}

// Totales de una cotización a partir del neto: IVA 19% redondeado al peso y
// total con la regla de redondeo chilena (con o sin IVA).
export function totalCotizacion(neto, conIva) {
  const n   = Math.round(Number(neto)||0);
  const iva = conIva ? Math.round(n * TASA_IVA) : 0;
  return { neto: n, iva, total: redondearTotal(n + iva) };
}

// ── Costeo de proyectos ──────────────────────────────────────────────────────

// Códigos SAP de una fase: correlativo único (sin distinguir categoría) según el orden
// visual de los ítems (mismo agrupamiento que se renderiza: Equipos, Ferretería, Mano de Obra).
// Se recalcula siempre a partir de la posición real — así reordenar/duplicar ítems o fases
// nunca puede dejar códigos repetidos o desalineados con la fase que los contiene.
export function codigosPorFase(items, faseIdx) {
  const grouped = CAT_TIPOS.reduce((acc,t)=>{
    acc[t] = t==="Ferretería" ? (items||[]).filter(i=>i.tipo==="Ferretería"||i.tipo==="Materiales") : (items||[]).filter(i=>i.tipo===t);
    return acc;
  },{});
  const map = {};
  let n = 0;
  CAT_TIPOS.forEach(t => { grouped[t].forEach(it => { n++; map[it.id] = `F${faseIdx+1}-${String(n).padStart(3,"0")}`; }); });
  return map;
}


export function calcItem(it) {
  const qty = Number(it.qty)||1;
  const _costoUnit = it.tipo==="Mano de Obra / HH"
    ? (Number(it.hh)||0)*(Number(it.valorHH)||0)
    : it.tipo==="Costos Indirectos"
      ? Number(it.costoUnit)||0
      : Number(it.costoUnitNeto)||0;
  const costoNeto = _costoUnit * qty;
  let ventaNeta;
  if(it.ventaUnitNeta !== undefined && it.ventaUnitNeta !== "" && it.ventaUnitNeta !== null) {
    ventaNeta = Number(it.ventaUnitNeta) * qty;
  } else {
    ventaNeta = costoNeto * (1 + (Number(it.margen)||0)/100);
  }
  const margenVal  = ventaNeta - costoNeto;
  const aplicaIVA  = !!it.aplicaIVA;
  const ivaCompra  = aplicaIVA ? costoNeto*(IVA-1) : 0;
  const ivaVenta   = aplicaIVA ? ventaNeta*(IVA-1) : 0;
  const costoBruto = costoNeto + ivaCompra;
  const ventaBruta = ventaNeta + ivaVenta;
  return { ...it, _costoUnit, costoNeto, costoBruto, ivaCompra, margenTotal:margenVal, ventaNeta, ivaVenta, ventaBruta };
}

export function calcFase(fase) {
  const items = (fase.items||[]).map(calcItem);
  const costoNeto   = items.reduce((s,i)=>s+i.costoNeto,0);
  const costoBruto  = items.reduce((s,i)=>s+i.costoBruto,0);
  const ivaCompra   = items.reduce((s,i)=>s+i.ivaCompra,0);
  const margenTotal = items.reduce((s,i)=>s+i.margenTotal,0);
  const ventaNeta   = items.reduce((s,i)=>s+i.ventaNeta,0);
  const ivaTotal    = items.reduce((s,i)=>s+i.ivaVenta,0);
  const ventaBruta  = items.reduce((s,i)=>s+i.ventaBruta,0);
  // Descuento a nivel de fase, aplicado sobre el neto (antes de IVA); el IVA se recalcula
  // sobre ese neto ya descontado, manteniendo la proporción IVA/neto real de la fase.
  const descPct      = Number(fase.descuento)||0;
  const descMonto    = Math.round(ventaNeta * (descPct/100));
  const ventaNetaConDesc = ventaNeta - descMonto;
  const ivaConDesc   = Math.round(ivaTotal * (1 - descPct/100));
  const ventaConDesc = ventaNetaConDesc + ivaConDesc;
  return {
    ...fase, items,
    costoNeto, costoTotal: costoNeto,
    costoBruto, ivaCompra,
    margenTotal,
    ventaNeta,
    ivaTotal,
    ventaBruta, ventaTotal: ventaBruta,
    descPct, descMonto, ventaNetaConDesc, ivaConDesc, ventaConDesc,
  };
}

// Plata ya cobrada de una partida, en pesos exactos. `montoCobrado` es el dato
// real (lo que se escribe directo en la columna "Cobrado"); `pctAvance` es
// solo una vista de respaldo para partidas antiguas que no tengan
// `montoCobrado` guardado todavía — nunca se recalculan pesos desde ahí para
// no perder precisión (pctAvance solo guarda 1 decimal).
export function partidaCobrado(p) {
  if(p.montoCobrado !== undefined && p.montoCobrado !== null && p.montoCobrado !== "") return Number(p.montoCobrado)||0;
  return Number(p.monto||0) * (Number(p.pctAvance)||0) / 100;
}

// Mantiene el monto de cada partida vinculada a una fase igual al total actual
// de esa fase, para que un cambio en el costeo no deje avances/cobertura desfasados.
// La plata YA cobrada (montoCobrado) es un hecho que no cambia retroactivamente
// — se preserva tal cual cuando el monto de la fase cambia (ej. se saca o
// agrega un ítem); solo se recalcula pctAvance como referencia visual.
export function syncPartidasConFases(partidas, fases) {
  let changed = false;
  const next = (partidas||[]).map(p => {
    if(!p.faseId) return p;
    const fase = (fases||[]).find(f=>String(f.id)===String(p.faseId));
    if(!fase) return p;
    const montoActual = Math.round(calcFase(fase).ventaConDesc);
    if(Number(p.monto)===montoActual) return p;
    changed = true;
    const cobrado = partidaCobrado(p);
    const pctAvanceNuevo = montoActual>0 ? Math.min(100, Math.round((cobrado/montoActual)*1000)/10) : 0;
    return { ...p, monto: montoActual, pctAvance: pctAvanceNuevo };
  });
  return changed ? next : partidas;
}

// Desglose de totales para el PDF de una cotización. El total manda (viene
// de la cotización guardada/sincronizada); las líneas solo se usan si cuadran
// con él, para mostrar el neto real y la diferencia por redondeo en una fila
// aparte en vez de esconderla dentro del neto.
//   conIva:       cotización con IVA (líneas netas).
//   lineasConIva: cotización generada desde el Costeo (líneas ya con IVA).
// Si las líneas no cuadran con el total (quedaron desactualizadas), se vuelve
// al cálculo desde el total: neto = total / 1,19, sin fila de redondeo.
export function desgloseTotal(total, sumaLineas, { conIva = false, lineasConIva = false } = {}) {
  const t = Math.round(Number(total)||0);
  const suma = Math.round(Number(sumaLineas)||0);
  if (conIva) {
    const calc = totalCotizacion(suma, true);
    if (suma > 0 && calc.total === t) return { neto: calc.neto, iva: calc.iva, redondeo: t - calc.neto - calc.iva };
  } else if (lineasConIva) {
    if (suma > 0 && redondearTotal(suma) === t) {
      const neto = Math.round(suma / IVA);
      return { neto, iva: suma - neto, redondeo: t - suma };
    }
  } else {
    if (suma > 0 && redondearTotal(suma) === t) return { neto: suma, iva: 0, redondeo: t - suma };
    return { neto: t, iva: 0, redondeo: 0 };
  }
  const neto = Math.round(t / IVA);
  return { neto, iva: t - neto, redondeo: 0 };
}

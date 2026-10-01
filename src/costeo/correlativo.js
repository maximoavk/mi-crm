// Número de cotización de un proyecto de Costeo. Los proyectos se nombran con
// el número que tendrá su cotización ("Cot 150 …", "Cot Nro 144 …", "COT-150"),
// y la serie COT lleva su propio correlativo, separado de la serie SIN.

const RE_NUMERO = /\bcot(?:izaci[oó]n)?\.?\s*(?:n(?:ro|o|°|º)?\.?\s*)?[-#]?\s*(\d+)/i;

// Número escrito en el nombre del proyecto, o null si no tiene.
export function numeroEnNombre(nombre) {
  const m = RE_NUMERO.exec(String(nombre || ""));
  return m ? Number(m[1]) : null;
}

// Número para la cotización que se genera desde un proyecto: el del nombre si
// ninguna cotización COT lo usa todavía; si no, el siguiente de la serie COT.
export function numeroParaCotizacion(cotizaciones, nombre) {
  const usados = new Set((cotizaciones || []).filter(q => (q.serie || "COT") === "COT").map(q => Number(q.numero) || 0));
  const delNombre = numeroEnNombre(nombre);
  if (delNombre && !usados.has(delNombre)) return delNombre;
  return usados.size ? Math.max(...usados) + 1 : 1;
}

// Código que se muestra para el proyecto ("COT-150") y si no coincide con el
// número escrito en su nombre.
export function codigoProyecto(proyecto, cotizacion) {
  const serie = cotizacion ? cotizacion.serie || "COT" : "COT";
  const numero = cotizacion ? cotizacion.numero : (proyecto.cotizacion ? Number(proyecto.cotizacion) : null);
  if (!numero) return null;
  const delNombre = numeroEnNombre(proyecto.nombre);
  return {
    codigo: `${serie}-${String(numero).padStart(3, "0")}`,
    distinto: delNombre != null && (serie !== "COT" || delNombre !== Number(numero)) ? delNombre : null,
  };
}

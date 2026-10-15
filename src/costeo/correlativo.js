// Número de cotización de un proyecto de Costeo. Los proyectos se nombran con
// el número que tendrá su cotización ("Cot 150 …", "Cot Nro 144 …", "COT-150"),
// y la serie COT lleva su propio correlativo, separado de la serie SIN.

const RE_NUMERO = /\bcot(?:izaci[oó]n)?\.?\s*(?:n(?:ro|o|°|º)?\.?\s*)?[-#]?\s*(\d+)/i;

// Número escrito en el nombre del proyecto, o null si no tiene.
export function numeroEnNombre(nombre) {
  const m = RE_NUMERO.exec(String(nombre || ""));
  return m ? Number(m[1]) : null;
}

// Número para la cotización que se genera desde un proyecto. Para la serie
// COT: el número del nombre del proyecto ("Cot 150 …") si está libre; si no,
// el siguiente correlativo de COT. Los proyectos se nombran pensando en su
// número COT, así que ese número del nombre NO aplica a SIN — SIN siempre
// sigue su propio correlativo, separado de COT.
export function numeroParaCotizacion(cotizaciones, nombre, serie = "COT") {
  const usados = new Set((cotizaciones || []).filter(q => (q.serie || "COT") === serie).map(q => Number(q.numero) || 0));
  if (serie === "COT") {
    const delNombre = numeroEnNombre(nombre);
    if (delNombre && !usados.has(delNombre)) return delNombre;
  }
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

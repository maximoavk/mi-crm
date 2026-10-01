// Geometría de una barra de la Carta Gantt dentro del rango visible del
// calendario. Una tarea que empieza antes del inicio del calendario (o
// termina después del final) se recorta al rango: si no, quedaría con
// posición negativa y se dibujaría encima de las columnas de la tabla.
// Tests en barra.test.js.
import { diffDays } from "./fechas.js";

// Devuelve null si la tarea no cae en el rango visible. Si no:
//   left, width        posición y ancho visibles (px)
//   cortaInicio/Fin    la barra sigue antes / después del rango
//   avanceVisible      px del avance (pct sobre la barra completa) que caen en lo visible
export function geometriaBarra({ inicio, fin, calStart, calDays, cellW, pct = 0 }) {
  if (!inicio || !fin) return null;
  const left = diffDays(calStart, inicio) * cellW;
  const width = Math.max(1, diffDays(inicio, fin) + 1) * cellW;
  const finRango = calDays * cellW;
  if (left + width <= 0 || left >= finRango) return null;
  const visIni = Math.max(0, left);
  const visFin = Math.min(finRango, left + width);
  const avanceFin = left + width * Math.min(100, Math.max(0, Number(pct) || 0)) / 100;
  return {
    left: visIni,
    width: visFin - visIni,
    cortaInicio: left < 0,
    cortaFin: left + width > finRango,
    avanceVisible: Math.max(0, Math.min(visFin, avanceFin) - visIni),
  };
}

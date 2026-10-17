// Flecha de una dependencia Fin → Inicio: sale del fin de la predecesora y
// llega al inicio de la sucesora. Se dibuja dentro de la celda de la
// sucesora (filas de 32 px), así que `dy` es la distancia vertical hasta la
// fila de la predecesora. En rojo cuando la sucesora empieza antes de tiempo.
import { diffDays } from "./fechas.js";
import { COLORS_LIGHT as C, FONT_NUM, LIGHT_THEME } from "../theme.js";
const ALTO_FILA = 32;

export function FlechaDependencia({ pred, tarea, dy, calStart, calDays, cellW, incumple }) {
  if (!pred?.fin || !tarea?.inicio) return null;
  const x0 = (diffDays(calStart, pred.fin) + 1) * cellW;
  const x1 = diffDays(calStart, tarea.inicio) * cellW;
  const limite = calDays * cellW;
  // Fuera del calendario visible la flecha invadiría la tabla: no se dibuja.
  if (x0 < 0 || x1 < 0 || x0 > limite || x1 > limite) return null;

  const ys = ALTO_FILA / 2;
  const yp = ys + dy;
  const hayEspacio = x1 >= x0 + 8;
  const ymid = dy < 0 ? ys - ALTO_FILA / 2 : ys + ALTO_FILA / 2;
  const d = hayEspacio
    ? `M${x0},${yp} H${x0 + 5} V${ys} H${x1}`
    : `M${x0},${yp} H${x0 + 4} V${ymid} H${x1 - 6} V${ys} H${x1}`;
  const color = incumple ? C.red : C.accent;

  return (
    <svg width={1} height={1} style={{ position:"absolute", left:0, top:0, overflow:"visible", pointerEvents:"none", zIndex:2 }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.85} />
      <polygon points={`${x1},${ys} ${x1 - 5},${ys - 3} ${x1 - 5},${ys + 3}`} fill={color} fillOpacity={0.9} />
    </svg>
  );
}

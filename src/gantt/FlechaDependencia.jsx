// Flecha de una dependencia Fin → Inicio: sale del fin de la predecesora y
// llega al inicio de la sucesora. Se dibuja dentro de la celda de la
// sucesora (filas de 32 px), así que `dy` es la distancia vertical hasta la
// fila de la predecesora. En rojo cuando la sucesora empieza antes de tiempo.
import { diffDays } from "./fechas.js";
import { useTheme } from "../shared/useTheme.js";
const ALTO_FILA = 32;

export function FlechaDependencia({ pred, tarea, dy, calStart, calDays, cellW, incumple }) {
  const { C } = useTheme();
  if (!pred?.fin || !tarea?.inicio) return null;
  const x0 = (diffDays(calStart, pred.fin) + 1) * cellW;
  const x1 = diffDays(calStart, tarea.inicio) * cellW;
  const limite = calDays * cellW;
  // Fuera del calendario visible la flecha invadiría la tabla: no se dibuja.
  if (x0 < 0 || x1 < 0 || x0 > limite || x1 > limite) return null;

  const ys = ALTO_FILA / 2;
  const yp = ys + dy;
  // Curva bezier tipo "hilo": los puntos de control se cruzan cuando las
  // barras están lejos, lo que produce la S característica; se aplanan
  // solos cuando están cerca o cuando la sucesora empieza antes de tiempo.
  const mx1 = Math.max(x0 + 10, x1 - 10);
  const mx2 = Math.min(x0 + 10, x1 - 10);
  const d = `M${x0},${yp} C${mx1},${yp} ${mx2},${ys} ${x1},${ys}`;
  const color = incumple ? C.red : C.accent;

  return (
    <svg width={1} height={1} style={{ position:"absolute", left:0, top:0, overflow:"visible", pointerEvents:"none", zIndex:2 }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.85} />
      <polygon points={`${x1},${ys} ${x1 - 5},${ys - 3} ${x1 - 5},${ys + 3}`} fill={color} fillOpacity={0.9} />
    </svg>
  );
}

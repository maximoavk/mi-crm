// Días que muestran las vistas Semana y Mes de Tareas, como "YYYY-MM-DD"
// en hora local. Tests en calendario.test.js.
import { fechaISO } from "../shared/format.js";

// Lunes a domingo de la semana que contiene `fecha` (un domingo pertenece a
// la semana que empezó el lunes anterior, no a la siguiente).
export function diasSemana(fecha) {
  const d = new Date(fecha + "T12:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const dd = new Date(d); dd.setDate(d.getDate() + i); return fechaISO(dd); });
}

// Cuadrícula de 6 semanas (lunes a domingo) que cubre el mes de `fecha`.
export function diasMes(fecha) {
  const ref = new Date(fecha + "T12:00");
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 12);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i);
    return { date: fechaISO(d), inMonth: d.getMonth() === ref.getMonth() };
  });
}

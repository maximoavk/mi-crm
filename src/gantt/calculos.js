// Cálculos de la Carta Gantt: fechas y avance de cada fase a partir de sus
// actividades, avance del proyecto, % planificado a la fecha y atrasos.
// Funciones puras; tests en calculos.test.js.
import { diffDays, sumarHabiles, habilesEntre, duracionHabil, endOfBusinessSpan } from "./fechas.js";

const num = (v) => Number(v) || 0;
const duracion = (t) => (t.inicio && t.fin) ? Math.max(1, diffDays(t.inicio, t.fin) + 1) : 1;

// Hijos de cada fase según el orden de la lista (como la numeración 1.0, 1.1…).
export function hijosPorFase(tasks) {
  const hijos = {};
  let fase = null;
  for (const t of tasks || []) {
    if (t.tipo === "F") { fase = t.id; hijos[fase] = []; }
    else if (fase) hijos[fase].push(t);
  }
  return hijos;
}

// Avance ponderado por duración (días): una tarea de 5 días pesa 5 veces
// más que una de 1. Los hitos solo cuentan si no hay tareas.
export function avancePonderado(items) {
  const tareas = (items || []).filter(t => t.tipo !== "H" && t.tipo !== "F");
  const base = tareas.length ? tareas : (items || []).filter(t => t.tipo === "H");
  const peso = base.reduce((s, t) => s + duracion(t), 0);
  if (!peso) return 0;
  return Math.round(base.reduce((s, t) => s + duracion(t) * Math.min(100, Math.max(0, num(t.pctAvance))), 0) / peso);
}

// % que debería llevar una actividad a la fecha `hoy` según sus fechas.
export function planHoy(t, hoy) {
  if (!t.inicio || !t.fin) return 0;
  if (hoy < t.inicio) return 0;
  if (hoy >= t.fin) return 100;
  return Math.round(100 * (diffDays(t.inicio, hoy) + 1) / duracion(t));
}

// Tareas con las fases recalculadas: una fase con actividades toma su
// inicio (la más temprana), su fin (la más tardía) y su avance ponderado.
// Todas las filas llevan pctPlan calculado a la fecha. Una fase sin
// actividades conserva lo que tenga.
export function derivarGantt(tasks, hoy) {
  // Un hito es un solo día (su inicio): uno guardado con rango de fechas
  // se pintaba repetido en cada día del rango.
  const lista = (tasks || []).map(t => t.tipo === "H" && t.inicio && t.fin && t.fin !== t.inicio ? { ...t, fin: t.inicio } : t);
  const hijos = hijosPorFase(lista);
  return lista.map(t => {
    if (t.tipo === "F" && hijos[t.id]?.length) {
      const conFechas = hijos[t.id].filter(h => h.inicio && h.fin);
      const inicio = conFechas.length ? conFechas.reduce((m, h) => h.inicio < m ? h.inicio : m, conFechas[0].inicio) : t.inicio;
      const fin = conFechas.length ? conFechas.reduce((m, h) => h.fin > m ? h.fin : m, conFechas[0].fin) : t.fin;
      const fase = { ...t, inicio, fin, pctAvance: avancePonderado(hijos[t.id]), derivada: true };
      return { ...fase, pctPlan: planHoy(fase, hoy) };
    }
    return { ...t, pctPlan: planHoy(t, hoy) };
  });
}

// Avance del proyecto: ponderado por duración sobre las tareas (si no hay
// tareas, sobre las fases; si tampoco, sobre los hitos).
export function avanceProyecto(tasks) {
  const tareas = (tasks || []).filter(t => t.tipo === "T");
  if (tareas.length) return avancePonderado(tareas);
  const fases = (tasks || []).filter(t => t.tipo === "F").map(f => ({ ...f, tipo: "T" }));
  if (fases.length) return avancePonderado(fases);
  return avancePonderado(tasks);
}

// Atrasada: tarea o hito que ya debió terminar y no está al 100%.
export const atrasada = (t, hoy) => t.tipo !== "F" && !!t.fin && t.fin < hoy && num(t.pctAvance) < 100;

// ── Guardado ─────────────────────────────────────────────────────────────────
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// UUID nuevo (crypto.randomUUID donde existe; si no, uno v4 armado a mano).
export function nuevoUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Filas de gantt_tareas para guardar. Cada fila lleva un id UUID (el que ya
// tenía o uno nuevo: las filas importadas o agregadas tienen ids temporales
// "new_…", que la columna uuid rechaza) y parent_id = la fase bajo la que
// está (el mismo criterio de la numeración). Devuelve también el mapa
// id anterior → id guardado, para seguir usando los mismos ids.
export function filasParaGuardar(tasks, ganttId, generar = nuevoUuid) {
  const ids = {};
  for (const t of tasks || []) ids[t.id] = UUID.test(String(t.id)) ? t.id : generar();
  let fase = null;
  const rows = (tasks || []).map((t, i) => {
    if (t.tipo === "F") fase = t.id;
    return {
      id: ids[t.id], gantt_id: ganttId, tipo: t.tipo, nombre: t.nombre, rol: t.rol,
      responsable: t.responsable, fecha_inicio: t.inicio, fecha_fin: t.fin,
      pct_plan: Number(t.pctPlan) || 0, pct_avance: Number(t.pctAvance) || 0,
      hh_presup: Number(t.hhPresup) || 0, hh_real: Number(t.hhReal) || 0, hh_terceros: Number(t.hhTerceros) || 0,
      depende_de: t.depende || "", orden: i,
      parent_id: t.tipo !== "F" && fase ? ids[fase] : null,
    };
  });
  return { rows, ids };
}

// ── Desplazar y empujar ──────────────────────────────────────────────────────

// Corre una actividad `dias` días HÁBILES (lunes a sábado) conservando su
// cantidad de días hábiles, como arma la secuencia el Costeo. Antes se
// corría por días corridos y, al cruzar un domingo, la actividad ganaba o
// perdía un día hábil.
export function desplazar(t, dias) {
  if (!dias || !t.inicio) return t;
  const inicio = sumarHabiles(t.inicio, dias);
  if (!t.fin) return { ...t, inicio };
  const fin = t.tipo === "H" ? inicio : endOfBusinessSpan(inicio, duracionHabil(t.inicio, t.fin));
  return { ...t, inicio, fin };
}

// ── Empuje en cadena ─────────────────────────────────────────────────────────
// Cuando una actividad (o una fase entera) termina `dias` días hábiles más
// tarde, las filas que vienen después en la lista y que empezaban DESPUÉS de
// su fin anterior se corren los mismos días hábiles. Las que
// iban en paralelo (empezaban antes de ese fin) y las de `excluir` no se
// tocan. Solo empuja hacia adelante.
export function empujarDespues(tasks, { despuesDe, finAnterior, dias, excluir = new Set() }) {
  if (!(dias > 0) || !finAnterior) return tasks;
  return tasks.map((t, i) => {
    if (i <= despuesDe || excluir.has(t.id) || !t.inicio || t.inicio <= finAnterior) return t;
    return desplazar(t, dias);
  });
}

// Aplica el cambio de fechas de una actividad (no fase) y empuja lo que viene después.
export function cambiarFechasConEmpuje(tasks, id, nuevas) {
  const i = tasks.findIndex(t => t.id === id);
  if (i < 0) return tasks;
  const antes = tasks[i];
  const cambiadas = tasks.map(t => t.id === id ? { ...t, ...nuevas } : t);
  const finNuevo = nuevas.fin ?? antes.fin;
  return empujarDespues(cambiadas, { despuesDe: i, finAnterior: antes.fin, dias: habilesEntre(antes.fin, finNuevo) });
}

// Después de mover una fase con sus actividades (`antes` → `despues`, misma
// lista), empuja las filas que vienen después del bloque de la fase.
export function empujarTrasFase(antes, despues, faseId) {
  const hijosAntes = hijosPorFase(antes)[faseId] || [];
  const finDe = (lista, ids) => lista.filter(t => ids.has(t.id) && t.fin).reduce((m, t) => !m || t.fin > m ? t.fin : m, null);
  const ids = new Set([faseId, ...hijosAntes.map(h => h.id)]);
  const finAnterior = finDe(antes, ids);
  const finNuevo = finDe(despues, ids);
  if (!finAnterior || !finNuevo) return despues;
  const ultimo = Math.max(...despues.map((t, i) => ids.has(t.id) ? i : -1));
  return empujarDespues(despues, { despuesDe: ultimo, finAnterior, dias: habilesEntre(finAnterior, finNuevo), excluir: ids });
}


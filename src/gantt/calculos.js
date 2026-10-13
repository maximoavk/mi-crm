// Cálculos de la Carta Gantt: fechas y avance de cada fase a partir de sus
// actividades, avance del proyecto, % planificado a la fecha y atrasos.
// Funciones puras; tests en calculos.test.js.
import { diffDays, sumarHabiles, habilesEntre, duracionHabil, endOfBusinessSpan, nextBusinessDay } from "./fechas.js";

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

// Numeración de las filas (1.0 para la fase, 1.1, 1.2… para sus actividades;
// las filas sin fase llevan 1, 2…). Es la que se ve en la tabla.
export function numerarFilas(tasks) {
  const numeros = {};
  let fases = 0, sub = 0, sueltas = 0, enFase = false;
  for (const t of tasks || []) {
    if (t.tipo === "F") { fases++; sub = 0; enFase = true; numeros[t.id] = `${fases}.0`; }
    else if (enFase) { sub++; numeros[t.id] = `${fases}.${sub}`; }
    else { sueltas++; numeros[t.id] = String(sueltas); }
  }
  return numeros;
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
      depende_de: ids[t.depende] || "", orden: i,
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


// ── Dependencias (Fin → Inicio) ──────────────────────────────────────────────
// `depende` guarda el id de la actividad predecesora: la sucesora no puede
// empezar antes del día hábil siguiente al fin de su predecesora.

// Las Gantt guardadas antes llevan en `depende` el número de la fila ("2.1").
// Se cambia por el id de esa fila; si ya es un id válido se deja, y si no
// apunta a nada queda vacío.
export function normalizarDependencias(tasks) {
  const numeros = numerarFilas(tasks);
  const idPorNumero = Object.fromEntries(Object.entries(numeros).map(([id, n]) => [n, id]));
  const ids = new Set((tasks || []).map(t => t.id));
  return (tasks || []).map(t => {
    if (!t.depende) return t;
    const destino = ids.has(t.depende) ? t.depende : idPorNumero[t.depende] || "";
    const valido = destino === t.id ? "" : destino;
    return valido === t.depende ? t : { ...t, depende: valido };
  });
}

// ¿Poner `predId` como predecesora de `id` cerraría un ciclo? También cuenta
// como ciclo relacionar una fase con sus propias actividades.
export function creaCiclo(tasks, id, predId) {
  if (!id || !predId) return false;
  if (id === predId) return true;
  const porId = Object.fromEntries((tasks || []).map(t => [t.id, t]));
  const hijos = hijosPorFase(tasks);
  const faseDe = {};
  for (const [f, hs] of Object.entries(hijos)) for (const h of hs) faseDe[h.id] = f;
  if (faseDe[id] === predId || faseDe[predId] === id) return true;
  const visto = new Set();
  for (let cur = predId; cur && !visto.has(cur); cur = porId[cur]?.depende) {
    if (cur === id) return true;
    visto.add(cur);
  }
  return false;
}

// Filas que se pueden elegir como predecesora de `id` (sin ciclos).
export const predecesorasPosibles = (tasks, id) => (tasks || []).filter(t => !creaCiclo(tasks, id, t.id));

// Corre hacia adelante cada actividad que empieza antes de que termine su
// predecesora, y repite hasta que ninguna incumpla (la que se corre puede
// empujar a su vez a sus sucesoras). Solo empuja: nunca adelanta. Una fase
// sucesora se corre con sus actividades. Los ciclos heredados se ignoran.
export function aplicarDependencias(tasks) {
  let lista = tasks || [];
  const tope = lista.length * lista.length + 10;
  for (let pasada = 0; pasada < tope; pasada++) {
    const vista = derivarGantt(lista, "");
    const porId = Object.fromEntries(vista.map(t => [t.id, t]));
    const hijos = hijosPorFase(lista);
    const incumple = vista.find(t => {
      const p = t.depende ? porId[t.depende] : null;
      return p && p.id !== t.id && p.fin && t.inicio && !creaCiclo(lista, t.id, t.depende)
        && t.inicio < nextBusinessDay(p.fin);
    });
    if (!incumple) return lista;
    const dias = habilesEntre(incumple.inicio, nextBusinessDay(porId[incumple.depende].fin));
    const mover = new Set([incumple.id, ...(incumple.tipo === "F" ? (hijos[incumple.id] || []).map(h => h.id) : [])]);
    lista = lista.map(t => mover.has(t.id) ? desplazar(t, dias) : t);
  }
  return lista;
}

// Predecesoras con fecha incumplida (la sucesora empieza antes de tiempo):
// sirve para pintar la flecha en rojo cuando el empuje en cadena está apagado.
export const incumpleDependencia = (t, pred) =>
  !!(t && pred && pred.fin && t.inicio && t.inicio < nextBusinessDay(pred.fin));

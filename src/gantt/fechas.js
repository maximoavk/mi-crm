// Fechas del Gantt: días hábiles (lunes a sábado), desplazamientos y formatos. Tests en fechas.test.js.
import { fechaLocal } from "../shared/format.js";
export function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10);
}

export function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// Días hábiles de lunes a sábado (se salta solo el domingo)
export function isSunday(dateStr) {
  return new Date(dateStr+"T00:00").getDay() === 0;
}

export function nextBusinessDay(dateStr) {
  let d = addDays(dateStr, 1);
  if(isSunday(d)) d = addDays(d, 1);
  return d;
}

// Desplaza una fecha `delta` días (puede ser negativo) y, si el resultado cae
// domingo, la corre al lunes siguiente — para que auto-ajustar el Gantt al
// cambiar la fecha de inicio del proyecto no deje tareas agendadas en domingo.
export function shiftDateBusinessDay(dateStr, delta) {
  if(!dateStr) return dateStr;
  const shifted = addDays(dateStr, delta);
  return isSunday(shifted) ? addDays(shifted, 1) : shifted;
}

// Fecha de fin dado un inicio (día hábil) y una cantidad de días hábiles, contando el inicio como día 1
export function endOfBusinessSpan(startDateStr, days) {
  let d = isSunday(startDateStr) ? addDays(startDateStr, 1) : startDateStr;
  for(let i=1; i<days; i++) d = nextBusinessDay(d);
  return d;
}

export function fmtShort(dateStr) {
  if(!dateStr) return "";
  // Fecha local: new Date("YYYY-MM-DD") se interpreta en UTC y en Chile
  // mostraba el día anterior (05-oct aparecía como 04-oct).
  const d = fechaLocal(String(dateStr).slice(0,10));
  return d.toLocaleDateString("es-CL",{day:"2-digit",month:"short"});
}

// Formatea un string "YYYY-MM-DD" como "dd/mm/aaaa" sin depender del locale del navegador
export function fmtDDMMYYYY(dateStr) {
  if(!dateStr) return "";
  const [y,m,d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// Genera rango de fechas para el header del calendario
export function buildCalHeader(startDate, days) {
  const cols = [];
  const base = new Date(startDate+"T00:00:00Z");
  if(isNaN(base.getTime())) return cols;
  for(let i=0; i<days; i++) {
    const d = new Date(base); d.setUTCDate(d.getUTCDate()+i);
    const dow = ["D","L","M","X","J","V","S"][d.getUTCDay()];
    const isWeekend = d.getUTCDay()===0||d.getUTCDay()===6;
    cols.push({ date: d.toISOString().slice(0,10), dow, day: d.getUTCDate(), month: d.getUTCMonth(), isWeekend });
  }
  return cols;
}

// Corre una fecha `n` días hábiles (lunes a sábado; n puede ser negativo).
// Con n = 0, una fecha en domingo pasa al lunes.
export function sumarHabiles(dateStr, n) {
  if(!dateStr) return dateStr;
  let d = dateStr;
  const paso = n < 0 ? -1 : 1;
  for(let i = 0; i < Math.abs(n); i++) { d = addDays(d, paso); while(isSunday(d)) d = addDays(d, paso); }
  if(n === 0 && isSunday(d)) d = addDays(d, 1);
  return d;
}

// Días hábiles de `a` a `b` (sin contar `a`); negativo si `b` es anterior.
export function habilesEntre(a, b) {
  if(!a || !b || a === b) return 0;
  const signo = b > a ? 1 : -1;
  let n = 0, d = a;
  while(d !== b) { d = addDays(d, signo); if(!isSunday(d)) n += signo; }
  return n;
}

// Cantidad de días hábiles de una actividad, contando inicio y fin (mínimo 1).
export function duracionHabil(inicio, fin) {
  if(!inicio || !fin || fin <= inicio) return 1;
  return Math.max(1, habilesEntre(inicio, fin) + (isSunday(inicio) ? 0 : 1));
}


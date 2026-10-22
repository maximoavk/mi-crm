// Lógica pura de los equipos (portones, motores, cámaras…) dentro de una OT:
// una OT puede tener varios equipos —por ejemplo Portón 1 y Portón 2 de un
// mismo condominio—, cada uno con su propio detalle y checklist.
import { CHECKLIST_TEMPLATES, CHECKLIST_COMISIONAMIENTO, buildChecklist } from "./checklists.js";

let seq = 0;
const nuevoId = () => `eq_${Date.now()}_${seq++}`;

export function nuevoEquipo(equipoTipo, tipoServicio, nombre) {
  const tmpl = tipoServicio === "comisionamiento"
    ? CHECKLIST_COMISIONAMIENTO[equipoTipo]
    : CHECKLIST_TEMPLATES[equipoTipo];
  return {
    id: nuevoId(),
    nombre: nombre || "Equipo 1",
    equipo_tipo: equipoTipo,
    detalle: "",
    checklist: buildChecklist(tmpl || []),
  };
}

// Las OT antiguas solo tenían un equipo_tipo + checklist plano a nivel de OT
// (sin el arreglo "equipos"). Las envolvemos como un único equipo para no
// perder ni tener que migrar esos datos en la base.
export function normalizarEquipos(ot) {
  if (!ot) return [];
  if (Array.isArray(ot.equipos) && ot.equipos.length > 0) return ot.equipos;
  if (ot.equipo_tipo || (ot.checklist && ot.checklist.length > 0)) {
    return [{
      id: "eq_legacy",
      nombre: "Equipo 1",
      equipo_tipo: ot.equipo_tipo || Object.keys(CHECKLIST_TEMPLATES)[0],
      detalle: "",
      checklist: ot.checklist || [],
    }];
  }
  return [];
}

export function avanceChecklist(checklist) {
  const items = (checklist || []).flatMap(s => s.items || []).filter(it => it.estado !== "na");
  const done = items.filter(it => it.estado === "ok" || it.estado === "ok_c");
  return { total: items.length, done: done.length, pct: items.length ? Math.round(done.length / items.length * 100) : 0 };
}

export function avanceEquipos(equipos) {
  return avanceChecklist((equipos || []).flatMap(e => e.checklist || []));
}

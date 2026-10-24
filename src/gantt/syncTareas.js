// Sincronización Carta Gantt → Tareas de Operaciones (unidireccional).
// Ver docs/superpowers/specs/2026-10-24-gantt-tareas-sync-design.md para el diseño.

const CAMPOS_COMPARABLES = [
  "titulo", "fecha_inicio", "fecha_limite", "hora_inicio", "hora_fin",
  "categoria", "estado", "completada", "notas", "cotizacion",
];

// Fila Gantt (T o H) → shape de `task` listo para insertar/actualizar.
export function filaATarea(fila, ganttProyecto) {
  const pct = Number(fila.pctAvance) || 0;
  const estado = pct >= 100 ? "completada" : pct > 0 ? "en_progreso" : "pendiente";
  return {
    gantt_tarea_id: fila.id,
    gantt_proyecto_id: ganttProyecto?.id ?? null,
    titulo: fila.nombre || "",
    fecha_inicio: fila.inicio || null,
    fecha_limite: fila.fin || null,
    hora_inicio: "09:00",
    hora_fin: "18:00",
    categoria: "Operaciones / Terreno",
    estado,
    completada: pct >= 100,
    notas: fila.responsable ? `Responsable (Gantt): ${fila.responsable}` : "",
    // `task.cotizacion` guarda solo el número (la UI antepone "COT-" ella
    // misma, ver TasksView.jsx) — mismo criterio que ya usa el resto del código.
    cotizacion: String(ganttProyecto?.cotNum ?? ""),
  };
}

function difiereDeExistente(existente, mapeada) {
  return CAMPOS_COMPARABLES.some(c => String(existente[c] ?? "") !== String(mapeada[c] ?? ""));
}

// `filas`: filas de la Gantt ya guardadas (con id final). `tareasExistentes`:
// filas de `task` con gantt_proyecto_id = este proyecto, ya cargadas desde
// Supabase (id, gantt_tarea_id + los campos de CAMPOS_COMPARABLES).
// Devuelve { crear, actualizar, eliminar } listas para aplicar tal cual.
export function calcularSyncGantt(filas, tareasExistentes, ganttProyecto) {
  const relevantes = (filas || []).filter(f => f.tipo === "T" || f.tipo === "H");
  const idsVigentes = new Set(relevantes.map(f => f.id));
  const existentesPorGanttId = new Map((tareasExistentes || []).map(t => [t.gantt_tarea_id, t]));

  const crear = [];
  const actualizar = [];
  for (const fila of relevantes) {
    const mapeada = filaATarea(fila, ganttProyecto);
    const existente = existentesPorGanttId.get(fila.id);
    if (!existente) crear.push(mapeada);
    else if (difiereDeExistente(existente, mapeada)) actualizar.push({ id: existente.id, ...mapeada });
  }

  const eliminar = (tareasExistentes || [])
    .filter(t => !idsVigentes.has(t.gantt_tarea_id))
    .map(t => t.id);

  return { crear, actualizar, eliminar };
}

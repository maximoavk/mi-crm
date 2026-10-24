import { describe, it, expect } from "vitest";
import { filaATarea, calcularSyncGantt } from "./syncTareas.js";

const proyecto = { id: "gantt-proy-1", cotNum: "154", serie: "COT" };

const tarea = (over = {}) => ({
  id: "t1", tipo: "T", nombre: "Instalar cámaras", responsable: "Juan",
  inicio: "2026-11-01", fin: "2026-11-05", pctAvance: 0, ...over,
});

describe("filaATarea", () => {
  it("usa horario fijo 09:00-18:00 y categoría Operaciones / Terreno", () => {
    const t = filaATarea(tarea(), proyecto);
    expect(t.hora_inicio).toBe("09:00");
    expect(t.hora_fin).toBe("18:00");
    expect(t.categoria).toBe("Operaciones / Terreno");
    // Solo el número: la UI de Tareas antepone "COT-" ella misma (TasksView.jsx).
    expect(t.cotizacion).toBe("154");
    expect(t.gantt_proyecto_id).toBe("gantt-proy-1");
  });

  it("agrega el responsable a las notas sin inventar un contacto", () => {
    const t = filaATarea(tarea({ responsable: "Juan" }), proyecto);
    expect(t.notas).toBe("Responsable (Gantt): Juan");
  });

  it("sin responsable, notas vacías", () => {
    const t = filaATarea(tarea({ responsable: "" }), proyecto);
    expect(t.notas).toBe("");
  });

  it.each([
    [0, "pendiente", false],
    [40, "en_progreso", false],
    [100, "completada", true],
  ])("pctAvance %i → estado %s, completada %s", (pct, estado, completada) => {
    const t = filaATarea(tarea({ pctAvance: pct }), proyecto);
    expect(t.estado).toBe(estado);
    expect(t.completada).toBe(completada);
  });
});

describe("calcularSyncGantt", () => {
  it("crea una tarea para una fila T sin tarea vinculada todavía", () => {
    const { crear, actualizar, eliminar } = calcularSyncGantt([tarea()], [], proyecto);
    expect(crear).toHaveLength(1);
    expect(crear[0].gantt_tarea_id).toBe("t1");
    expect(actualizar).toHaveLength(0);
    expect(eliminar).toHaveLength(0);
  });

  it("incluye hitos igual que tareas", () => {
    const hito = tarea({ id: "h1", tipo: "H", nombre: "Entrega final" });
    const { crear } = calcularSyncGantt([hito], [], proyecto);
    expect(crear).toHaveLength(1);
  });

  it("excluye las fases", () => {
    const fase = tarea({ id: "f1", tipo: "F", nombre: "Fase 1" });
    const { crear } = calcularSyncGantt([fase], [], proyecto);
    expect(crear).toHaveLength(0);
  });

  it("actualiza cuando cambia la fecha de una fila ya vinculada", () => {
    const existente = { id: "task-db-1", gantt_tarea_id: "t1", ...filaATarea(tarea(), proyecto) };
    const filaConNuevaFecha = tarea({ fin: "2026-11-10" });
    const { crear, actualizar, eliminar } = calcularSyncGantt([filaConNuevaFecha], [existente], proyecto);
    expect(crear).toHaveLength(0);
    expect(eliminar).toHaveLength(0);
    expect(actualizar).toHaveLength(1);
    expect(actualizar[0].id).toBe("task-db-1");
    expect(actualizar[0].fecha_limite).toBe("2026-11-10");
  });

  it("sin cambios, no hace nada", () => {
    const existente = { id: "task-db-1", gantt_tarea_id: "t1", ...filaATarea(tarea(), proyecto) };
    const { crear, actualizar, eliminar } = calcularSyncGantt([tarea()], [existente], proyecto);
    expect(crear).toHaveLength(0);
    expect(actualizar).toHaveLength(0);
    expect(eliminar).toHaveLength(0);
  });

  it("elimina la tarea espejo cuando la fila ya no existe en la Gantt", () => {
    const existente = { id: "task-db-1", gantt_tarea_id: "t1", ...filaATarea(tarea(), proyecto) };
    const { crear, actualizar, eliminar } = calcularSyncGantt([], [existente], proyecto);
    expect(crear).toHaveLength(0);
    expect(actualizar).toHaveLength(0);
    expect(eliminar).toEqual(["task-db-1"]);
  });

  it("elimina la tarea espejo cuando la fila cambió de tipo a Fase", () => {
    const existente = { id: "task-db-1", gantt_tarea_id: "t1", ...filaATarea(tarea(), proyecto) };
    const filaAhoraFase = tarea({ tipo: "F" });
    const { eliminar } = calcularSyncGantt([filaAhoraFase], [existente], proyecto);
    expect(eliminar).toEqual(["task-db-1"]);
  });
});

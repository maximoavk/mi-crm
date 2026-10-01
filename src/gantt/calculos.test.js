import { describe, it, expect } from "vitest";
import { hijosPorFase, avancePonderado, planHoy, derivarGantt, avanceProyecto, atrasada } from "./calculos.js";

const T = (id, tipo, inicio, fin, pctAvance = 0) => ({ id, tipo, inicio, fin, pctAvance });
const tasks = [
  T("f1", "F", "2026-10-01", "2026-10-01", 0),          // fechas viejas: se recalculan
  T("h1", "H", "2026-10-02", "2026-10-02", 100),
  T("t1", "T", "2026-10-03", "2026-10-07", 100),         // 5 días
  T("t2", "T", "2026-10-08", "2026-10-08", 0),           // 1 día
  T("f2", "F", "2026-10-20", "2026-10-25", 30),          // sin hijos: se respeta
];

describe("Gantt: fases, avance y plan", () => {
  it("agrupa por fase según el orden", () => {
    expect(Object.fromEntries(Object.entries(hijosPorFase(tasks)).map(([k, v]) => [k, v.map(t => t.id)])))
      .toEqual({ f1: ["h1", "t1", "t2"], f2: [] });
  });
  it("avance ponderado por duración, hitos solo si no hay tareas", () => {
    expect(avancePonderado(tasks.slice(1, 4))).toBe(83);   // (5*100 + 1*0) / 6
    expect(avancePonderado([T("a", "H", "2026-10-02", "2026-10-02", 100), T("b", "H", "2026-10-03", "2026-10-03", 0)])).toBe(50);
    expect(avancePonderado([])).toBe(0);
  });
  it("plan a la fecha", () => {
    const t = T("x", "T", "2026-10-03", "2026-10-07");
    expect(planHoy(t, "2026-10-02")).toBe(0);
    expect(planHoy(t, "2026-10-03")).toBe(20);
    expect(planHoy(t, "2026-10-05")).toBe(60);
    expect(planHoy(t, "2026-10-07")).toBe(100);
    expect(planHoy(t, "2026-11-01")).toBe(100);
  });
  it("la fase toma fechas y avance de sus actividades", () => {
    const d = derivarGantt(tasks, "2026-10-05");
    expect(d[0]).toMatchObject({ inicio: "2026-10-02", fin: "2026-10-08", pctAvance: 83, derivada: true });
    expect(d[0].pctPlan).toBe(57);                              // 4 de 7 días
    expect(d[4]).toMatchObject({ inicio: "2026-10-20", fin: "2026-10-25", pctAvance: 30, pctPlan: 0 });
    expect(d[4].derivada).toBeUndefined();
  });
  it("avance del proyecto: sobre las tareas, no promedia fases en 0%", () => {
    expect(avanceProyecto(tasks)).toBe(83);
    expect(avanceProyecto([T("f", "F", "2026-10-01", "2026-10-02", 50)])).toBe(50);
  });
  it("atrasadas: tareas e hitos vencidos sin terminar, nunca fases", () => {
    expect(atrasada(T("a", "T", "2026-10-01", "2026-10-02", 50), "2026-10-05")).toBe(true);
    expect(atrasada(T("a", "H", "2026-10-01", "2026-10-01", 0), "2026-10-05")).toBe(true);
    expect(atrasada(T("a", "T", "2026-10-01", "2026-10-02", 100), "2026-10-05")).toBe(false);
    expect(atrasada(T("a", "F", "2026-10-01", "2026-10-02", 0), "2026-10-05")).toBe(false);
  });
});

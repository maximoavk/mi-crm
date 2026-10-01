import { describe, it, expect } from "vitest";
import { geometriaBarra, aplicarArrastre } from "./barra.js";

const base = { calStart: "2026-10-05", calDays: 15, cellW: 20 };

describe("barra de la Gantt dentro del rango visible", () => {
  it("una tarea dentro del rango no cambia", () => {
    expect(geometriaBarra({ ...base, inicio: "2026-10-07", fin: "2026-10-09", pct: 50 }))
      .toEqual({ left: 40, width: 60, cortaInicio: false, cortaFin: false, avanceVisible: 30 });
  });
  it("si empieza antes del calendario se recorta (nunca queda en posición negativa)", () => {
    // 30-sep → 09-oct: 10 días, 5 antes del 05-oct
    const g = geometriaBarra({ ...base, inicio: "2026-09-30", fin: "2026-10-09", pct: 0 });
    expect(g).toMatchObject({ left: 0, width: 100, cortaInicio: true, cortaFin: false });
  });
  it("el avance se mide sobre la barra completa", () => {
    // 60% de 10 días = 6 días desde el 30-sep → llega al 05-oct inclusive: 1 día visible
    expect(geometriaBarra({ ...base, inicio: "2026-09-30", fin: "2026-10-09", pct: 60 }).avanceVisible).toBe(20);
    expect(geometriaBarra({ ...base, inicio: "2026-09-30", fin: "2026-10-09", pct: 30 }).avanceVisible).toBe(0);
  });
  it("si termina después del calendario se recorta al final", () => {
    expect(geometriaBarra({ ...base, inicio: "2026-10-16", fin: "2026-10-25" }))
      .toMatchObject({ left: 220, width: 80, cortaInicio: false, cortaFin: true });
  });
  it("fuera del rango no se dibuja", () => {
    expect(geometriaBarra({ ...base, inicio: "2026-09-20", fin: "2026-10-04" })).toBeNull();
    expect(geometriaBarra({ ...base, inicio: "2026-10-20", fin: "2026-10-22" })).toBeNull();
    expect(geometriaBarra({ ...base, inicio: "", fin: "2026-10-22" })).toBeNull();
  });
});

describe("arrastrar barras", () => {
  const t = { tipo: "T", inicio: "2026-10-05", fin: "2026-10-09" };
  it("mover desplaza inicio y fin", () => {
    expect(aplicarArrastre(t, "mover", 3)).toEqual({ inicio: "2026-10-08", fin: "2026-10-12" });
    expect(aplicarArrastre(t, "mover", -5)).toEqual({ inicio: "2026-09-30", fin: "2026-10-04" });
  });
  it("estirar desde un borde cambia la duración sin cruzar el otro borde", () => {
    expect(aplicarArrastre(t, "fin", 2)).toEqual({ inicio: "2026-10-05", fin: "2026-10-11" });
    expect(aplicarArrastre(t, "fin", -10)).toEqual({ inicio: "2026-10-05", fin: "2026-10-05" });
    expect(aplicarArrastre(t, "inicio", -2)).toEqual({ inicio: "2026-10-03", fin: "2026-10-09" });
    expect(aplicarArrastre(t, "inicio", 9)).toEqual({ inicio: "2026-10-09", fin: "2026-10-09" });
  });
  it("un hito solo se mueve y 0 días no cambia nada", () => {
    expect(aplicarArrastre({ tipo: "H", inicio: "2026-10-05", fin: "2026-10-05" }, "fin", 2)).toEqual({ inicio: "2026-10-07", fin: "2026-10-07" });
    expect(aplicarArrastre(t, "mover", 0)).toEqual({ inicio: "2026-10-05", fin: "2026-10-09" });
  });
});

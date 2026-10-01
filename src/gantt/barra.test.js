import { describe, it, expect } from "vitest";
import { geometriaBarra } from "./barra.js";

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

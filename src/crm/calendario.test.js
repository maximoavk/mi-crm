/* global process */
process.env.TZ = "America/Santiago";
import { describe, it, expect } from "vitest";
import { diasSemana, diasMes } from "./calendario.js";

// Octubre 2026: jue 1, sáb 3, dom 4, lun 5
describe("diasSemana", () => {
  it("va de lunes a domingo", () => {
    expect(diasSemana("2026-09-30")).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  });
  it("un domingo pertenece a la semana que empezó el lunes anterior", () => {
    expect(diasSemana("2026-10-04")[0]).toBe("2026-09-28");
    expect(diasSemana("2026-10-04")).toContain("2026-10-04");
  });
  it("un lunes empieza su propia semana", () => {
    expect(diasSemana("2026-10-05")[0]).toBe("2026-10-05");
  });
  it("cruza el cambio de horario de septiembre sin saltarse ni repetir días", () => {
    expect(diasSemana("2026-09-06")).toEqual(["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06"]);
  });
});

describe("diasMes", () => {
  it("6 semanas desde el lunes de la semana del día 1", () => {
    const dias = diasMes("2026-10-15");
    expect(dias).toHaveLength(42);
    expect(dias[0]).toEqual({ date: "2026-09-28", inMonth: false });
    expect(dias[3]).toEqual({ date: "2026-10-01", inMonth: true });
    expect(dias.filter(d => d.inMonth)).toHaveLength(31);
  });
  it("días consecutivos, sin repetir ni saltar (incluye el cambio de horario)", () => {
    const dias = diasMes("2026-09-10").map(d => d.date);
    expect(new Set(dias).size).toBe(42);
    expect(dias).toContain("2026-09-06");
  });
});

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { hoyISO, fechaISO, isOverdue } from "./format.js";

describe("hoyISO / isOverdue", () => {
  // 23:30 hora local: en UTC ya sería el día siguiente, y no debe importar
  beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 30, 23, 30)); });
  afterAll(() => { vi.useRealTimers(); });

  it("hoyISO usa la fecha local (toISOString ya diría 2026-10-01)", () => {
    expect(hoyISO()).toBe("2026-09-30");
  });
  it("fechaISO formatea cualquier Date en hora local", () => {
    expect(fechaISO(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    const d = new Date(2026, 8, 30, 23, 30); d.setDate(d.getDate() + 7);
    expect(fechaISO(d)).toBe("2026-10-07");
  });
  it("lo que vence hoy no está atrasado; lo de ayer sí", () => {
    expect(isOverdue("2026-09-30")).toBe(false);
    expect(isOverdue("2026-10-01")).toBe(false);
    expect(isOverdue("2026-09-29")).toBe(true);
  });
  it("sin fecha no está atrasado", () => {
    expect(isOverdue(null)).toBe(false);
    expect(isOverdue("")).toBe(false);
  });
});

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { hoyISO, isOverdue } from "./format.js";

describe("hoyISO / isOverdue", () => {
  // 23:30 hora local: en UTC ya sería el día siguiente, y no debe importar
  beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 30, 23, 30)); });
  afterAll(() => { vi.useRealTimers(); });

  it("hoyISO usa la fecha local", () => {
    expect(hoyISO()).toBe("2026-09-30");
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

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { calcEstado } from "./estadoPago.js";

describe("calcEstado", () => {
  beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-30T12:00:00")); });
  afterAll(() => { vi.useRealTimers(); });

  it("pagado cuando lo pagado cubre el total", () => {
    expect(calcEstado(100000, 100000, "2026-10-15")).toBe("pagado");
    expect(calcEstado(100000, 120000, "2026-10-15")).toBe("pagado");
  });
  it("pagado aunque esté vencido, si ya se pagó todo", () => {
    expect(calcEstado(100000, 100000, "2026-01-01")).toBe("pagado");
  });
  it("vencido si pasó la fecha y no está pagado (aunque tenga abonos)", () => {
    expect(calcEstado(100000, 0, "2026-09-01")).toBe("vencido");
    expect(calcEstado(100000, 40000, "2026-09-01")).toBe("vencido");
  });
  it("lo que vence hoy todavía no está vencido; desde mañana sí", () => {
    expect(calcEstado(100000, 0, "2026-09-30")).toBe("pendiente");
    expect(calcEstado(100000, 40000, "2026-09-30")).toBe("parcial");
    expect(calcEstado(100000, 0, "2026-09-29")).toBe("vencido");
  });
  it("acepta vencimientos con hora (timestamp)", () => {
    expect(calcEstado(100000, 0, "2026-09-30T00:00:00")).toBe("pendiente");
    expect(calcEstado(100000, 0, "2026-09-29T23:59:00")).toBe("vencido");
  });
  it("parcial si tiene abonos y no está vencido", () => {
    expect(calcEstado(100000, 40000, "2026-10-15")).toBe("parcial");
    expect(calcEstado(100000, 40000, null)).toBe("parcial");
  });
  it("pendiente sin abonos ni vencimiento pasado", () => {
    expect(calcEstado(100000, 0, "2026-10-15")).toBe("pendiente");
    expect(calcEstado(100000, 0, "")).toBe("pendiente");
  });
  it("un documento en 0 sin pagos queda pendiente, no pagado", () => {
    expect(calcEstado(0, 0, null)).toBe("pendiente");
  });
  it("el estado manual manda sobre el cálculo", () => {
    expect(calcEstado(100000, 0, "2026-01-01", "pagado")).toBe("pagado");
  });
});

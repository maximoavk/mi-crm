import { describe, it, expect } from "vitest";
import { esNuevo } from "./nuevo.js";

describe("etiqueta New del maestro de productos", () => {
  it("se muestra hasta el último día inclusive", () => {
    expect(esNuevo("2026-10-30", "2026-10-23")).toBe(true);
    expect(esNuevo("2026-10-30", "2026-10-30")).toBe(true);
  });

  it("desaparece al día siguiente", () => {
    expect(esNuevo("2026-10-30", "2026-10-31")).toBe(false);
  });

  it("los productos sin fecha no la muestran", () => {
    expect(esNuevo(null, "2026-10-23")).toBe(false);
    expect(esNuevo("", "2026-10-23")).toBe(false);
    expect(esNuevo(undefined, "2026-10-23")).toBe(false);
  });

  it("acepta fechas con hora (timestamp) tomando solo el día", () => {
    expect(esNuevo("2026-10-30T00:00:00", "2026-10-30")).toBe(true);
  });

  it("compara bien al cruzar de mes y de año", () => {
    expect(esNuevo("2027-01-03", "2026-12-28")).toBe(true);
    expect(esNuevo("2026-12-28", "2027-01-03")).toBe(false);
  });
});

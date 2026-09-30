/* global process */
// Zona horaria de Chile: el error solo aparece fuera de UTC.
process.env.TZ = "America/Santiago";
import { describe, it, expect } from "vitest";
import { fechaLocal } from "./format.js";

describe("fechaLocal", () => {
  it("una fecha sin hora es ese mismo día en Chile", () => {
    const d = fechaLocal("2026-10-05");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 5]);
    expect(d.toLocaleDateString("es-CL")).toBe("05-10-2026");
  });
  it("el día 1 del mes queda en su mes (no en el anterior)", () => {
    expect(fechaLocal("2026-10-01").toLocaleDateString("es-CL", { month: "short" })).toMatch(/oct/);
  });
  it("fin de garantía: 12 meses desde el 05-10-2026 vence el 05-10-2027", () => {
    const f = "2026-10-05";
    const fin = new Date(fechaLocal(f).setMonth(fechaLocal(f).getMonth() + 12));
    expect(fin.toLocaleDateString("es-CL")).toBe("05-10-2027");
  });
  it("respeta timestamps completos y fechas vacías", () => {
    expect(fechaLocal("2026-10-05T15:00:00Z").toISOString()).toBe("2026-10-05T15:00:00.000Z");
    expect(fechaLocal("")).toBeNull();
    expect(fechaLocal(null)).toBeNull();
  });
});

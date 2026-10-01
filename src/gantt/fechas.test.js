/* global process */
// Se fuerza la zona horaria de Chile: los errores de fechas del Gantt solo
// aparecen fuera de UTC.
process.env.TZ = "America/Santiago";
import { describe, it, expect } from "vitest";
import { addDays, diffDays, isSunday, nextBusinessDay, shiftDateBusinessDay, endOfBusinessSpan, fmtShort, fmtDDMMYYYY, buildCalHeader } from "./fechas.js";

// Octubre 2026: sáb 3, dom 4, lun 5
describe("addDays / diffDays", () => {
  it("suma y resta días, cruzando meses y años", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-10-05", -5)).toBe("2026-09-30");
  });
  it("no se corre con el cambio de horario de Chile (sep 2026)", () => {
    expect(addDays("2026-09-05", 1)).toBe("2026-09-06");
    expect(addDays("2026-09-05", 2)).toBe("2026-09-07");
  });
  it("diffDays cuenta días entre fechas", () => {
    expect(diffDays("2026-10-01", "2026-10-05")).toBe(4);
    expect(diffDays("2026-10-05", "2026-10-05")).toBe(0);
  });
});

describe("días hábiles (lunes a sábado)", () => {
  it("isSunday", () => {
    expect(isSunday("2026-10-04")).toBe(true);
    expect(isSunday("2026-10-03")).toBe(false);
    expect(isSunday("2026-09-06")).toBe(true); // día del cambio de horario
  });
  it("nextBusinessDay salta el domingo", () => {
    expect(nextBusinessDay("2026-10-02")).toBe("2026-10-03"); // vie → sáb
    expect(nextBusinessDay("2026-10-03")).toBe("2026-10-05"); // sáb → lun
  });
  it("endOfBusinessSpan cuenta el inicio como día 1", () => {
    expect(endOfBusinessSpan("2026-10-05", 1)).toBe("2026-10-05");
    expect(endOfBusinessSpan("2026-10-05", 6)).toBe("2026-10-10"); // lun → sáb
    expect(endOfBusinessSpan("2026-10-05", 7)).toBe("2026-10-12"); // salta dom 11
    expect(endOfBusinessSpan("2026-10-04", 1)).toBe("2026-10-05"); // inicio en domingo → lunes
  });
  it("shiftDateBusinessDay corre al lunes si cae en domingo", () => {
    expect(shiftDateBusinessDay("2026-10-01", 3)).toBe("2026-10-05");
    expect(shiftDateBusinessDay("2026-10-01", 2)).toBe("2026-10-03");
    expect(shiftDateBusinessDay("2026-10-06", -2)).toBe("2026-10-05");
    expect(shiftDateBusinessDay("", 3)).toBe("");
  });
});

describe("formatos", () => {
  it("fmtShort muestra el mismo día en Chile (antes mostraba el anterior)", () => {
    expect(fmtShort("2026-10-05")).toMatch(/^05.oct/);
    expect(fmtShort("2026-06-15")).toMatch(/^15.jun/);
    expect(fmtShort("2026-10-05T00:00:00")).toMatch(/^05.oct/);
    expect(fmtShort("")).toBe("");
  });
  it("fmtDDMMYYYY", () => {
    expect(fmtDDMMYYYY("2026-10-05")).toBe("05/10/2026");
    expect(fmtDDMMYYYY("")).toBe("");
  });
  it("buildCalHeader arma una columna por día con fin de semana marcado", () => {
    const cols = buildCalHeader("2026-10-02", 4);
    expect(cols.map(c => c.date)).toEqual(["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]);
    expect(cols.map(c => c.dow)).toEqual(["V", "S", "D", "L"]);
    expect(cols.map(c => c.isWeekend)).toEqual([false, true, true, false]);
    expect(buildCalHeader("fecha-mala", 3)).toEqual([]);
  });
});

describe("días hábiles", () => {
  it("sumar, contar y duración (lunes a sábado)", async () => {
    const { sumarHabiles, habilesEntre, duracionHabil } = await import("./fechas.js");
    expect(sumarHabiles("2026-12-05", 1)).toBe("2026-12-07");   // sáb + 1 = lun
    expect(sumarHabiles("2026-12-07", -1)).toBe("2026-12-05");  // lun - 1 = sáb
    expect(sumarHabiles("2026-12-06", 0)).toBe("2026-12-07");   // domingo → lunes
    expect(habilesEntre("2026-12-04", "2026-12-08")).toBe(3);   // sáb, lun, mar
    expect(habilesEntre("2026-12-08", "2026-12-04")).toBe(-3);
    expect(duracionHabil("2026-12-02", "2026-12-05")).toBe(4);
    expect(duracionHabil("2026-12-04", "2026-12-08")).toBe(4);  // vie, sáb, lun, mar
    expect(duracionHabil("2026-12-04", "2026-12-04")).toBe(1);
  });
});


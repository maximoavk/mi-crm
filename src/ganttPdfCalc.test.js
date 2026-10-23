import { describe, it, expect } from "vitest";
import { daysInMonthOf, groupColsIntoProjectMonths, monthCoverage, monthCoverageOffset } from "./ganttPdfCalc.js";

describe("daysInMonthOf", () => {
  it("cuenta los días de un mes de 30 y de uno de 31", () => {
    expect(daysInMonthOf("2026-04-01")).toBe(30);
    expect(daysInMonthOf("2026-10-01")).toBe(31);
  });
  it("respeta el año bisiesto", () => {
    expect(daysInMonthOf("2028-02-01")).toBe(29);
  });
});

describe("groupColsIntoProjectMonths", () => {
  it("agrupa columnas de varios meses en un bucket por cada uno", () => {
    const calCols = [
      { date: "2026-10-30" }, { date: "2026-10-31" },
      { date: "2026-11-01" }, { date: "2026-11-02" },
    ];
    const months = groupColsIntoProjectMonths(calCols);
    expect(months.map(m => m.monthStart)).toEqual(["2026-10-01", "2026-11-01"]);
    expect(months[0].cols).toHaveLength(2);
    expect(months[1].cols).toHaveLength(2);
  });
});

describe("monthCoverage / monthCoverageOffset", () => {
  it("una tarea que cubre todo el mes tiene cobertura 1 y offset 0", () => {
    expect(monthCoverage("2026-10-01", "2026-10-01", "2026-10-31")).toBe(1);
    expect(monthCoverageOffset("2026-10-01", "2026-10-01", "2026-10-31")).toBe(0);
  });
  it("una tarea de una semana a mitad de mes tiene cobertura parcial con offset", () => {
    expect(monthCoverage("2026-10-01", "2026-10-15", "2026-10-21")).toBeCloseTo(7 / 31);
    expect(monthCoverageOffset("2026-10-01", "2026-10-15", "2026-10-21")).toBe(14);
  });
  it("sin fechas, cobertura 0", () => {
    expect(monthCoverage("2026-10-01", null, null)).toBe(0);
  });
});

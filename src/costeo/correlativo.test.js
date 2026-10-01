import { describe, it, expect } from "vitest";
import { numeroEnNombre, numeroParaCotizacion, codigoProyecto } from "./correlativo.js";

describe("correlativo de cotización de los proyectos", () => {
  it("lee el número escrito en el nombre", () => {
    expect(numeroEnNombre("Cot 150 Cond Portal Pacífico I")).toBe(150);
    expect(numeroEnNombre("Cot Nro 144 Cond Mistral II")).toBe(144);
    expect(numeroEnNombre("COT-148 Citofonía")).toBe(148);
    expect(numeroEnNombre("Cotización N° 12 Obra")).toBe(12);
    expect(numeroEnNombre("Cotizar 5 cámaras")).toBeNull();
    expect(numeroEnNombre("Proyecto CCTV")).toBeNull();
    expect(numeroEnNombre(null)).toBeNull();
  });
  it("usa el número del nombre si está libre en la serie COT", () => {
    const cots = [{ numero: 150, serie: "COT" }, { numero: 148 }, { numero: 160, serie: "SIN" }];
    expect(numeroParaCotizacion(cots, "Cot 149 Renovación")).toBe(149);
    expect(numeroParaCotizacion(cots, "Cot 150 Repetido")).toBe(151);
    expect(numeroParaCotizacion(cots, "Sin número")).toBe(151);   // la serie SIN no cuenta
    expect(numeroParaCotizacion([], "Obra")).toBe(1);
  });
  it("marca el proyecto cuyo nombre no coincide con su cotización", () => {
    expect(codigoProyecto({ nombre: "Cot 149 X" }, { numero: 150, serie: "COT" })).toEqual({ codigo: "COT-150", distinto: 149 });
    expect(codigoProyecto({ nombre: "Cot 150 X" }, { numero: 150 })).toEqual({ codigo: "COT-150", distinto: null });
    expect(codigoProyecto({ nombre: "Obra", cotizacion: "7" }, null)).toEqual({ codigo: "COT-007", distinto: null });
    expect(codigoProyecto({ nombre: "Cot 9" }, null)).toBeNull();
  });
});

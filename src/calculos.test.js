import { describe, it, expect } from "vitest";
import {
  subtotalLinea, totalCotizacion, redondearTotal, calcItem, calcFase,
  partidaCobrado, syncPartidasConFases, codigosPorFase,
} from "./calculos.js";

describe("subtotalLinea", () => {
  it("multiplica precio × cantidad y aplica el descuento", () => {
    expect(subtotalLinea(1000, 3, 10)).toBe(2700);
    expect(subtotalLinea(50000, 2, 0)).toBe(100000);
  });
  it("redondea al peso", () => {
    expect(subtotalLinea(999, 1, 15)).toBe(849);   // 849,15
    expect(subtotalLinea(333, 1, 50)).toBe(167);   // 166,5 → 167
  });
  it("acepta valores de formulario (texto o vacíos)", () => {
    expect(subtotalLinea("1000", "2", "")).toBe(2000);
    expect(subtotalLinea(1000, "", 0)).toBe(1000);  // cantidad vacía = 1
    expect(subtotalLinea("", 5, 0)).toBe(0);
  });
});

describe("redondearTotal (Ley 20.956)", () => {
  it("termina en 1 a 5: baja a la decena inferior", () => {
    expect(redondearTotal(1234561)).toBe(1234560);
    expect(redondearTotal(1234563)).toBe(1234560);
    expect(redondearTotal(1234565)).toBe(1234560);   // el 5 baja
  });
  it("termina en 6 a 9: sube a la decena superior", () => {
    expect(redondearTotal(1234566)).toBe(1234570);
    expect(redondearTotal(1234569)).toBe(1234570);
    expect(redondearTotal(1234599)).toBe(1234600);   // puede subir de centena
  });
  it("termina en 0: queda igual", () => {
    expect(redondearTotal(1234570)).toBe(1234570);
    expect(redondearTotal(0)).toBe(0);
  });
  it("redondea primero al peso y acepta valores vacíos", () => {
    expect(redondearTotal(157445.4)).toBe(157440);   // 157.445 → baja
    expect(redondearTotal(157445.6)).toBe(157450);   // 157.446 → sube
    expect(redondearTotal("")).toBe(0);
  });
  it("un total generado desde el costeo coincide con el de una sincronización sin cambios", () => {
    // Antes: generar guardaba 1.234.567 y sincronizar lo cambiaba a 1.234.600
    const ventaConDesc = 1234567;
    expect(redondearTotal(ventaConDesc)).toBe(totalCotizacion(ventaConDesc, false).total);
  });
});

describe("totalCotizacion", () => {
  it("con IVA: 19% sobre el neto y total con redondeo chileno", () => {
    expect(totalCotizacion(100000, true)).toEqual({ neto: 100000, iva: 19000, total: 119000 });
    // 123.456 × 0,19 = 23.456,64 → 23.457; 146.913 termina en 3 → 146.910
    expect(totalCotizacion(123456, true)).toEqual({ neto: 123456, iva: 23457, total: 146910 });
  });
  it("sin IVA: el total igual se redondea", () => {
    expect(totalCotizacion(123456, false)).toEqual({ neto: 123456, iva: 0, total: 123460 });
    expect(totalCotizacion(123455, false).total).toBe(123450);
    expect(totalCotizacion(150, false).total).toBe(150);
  });
  it("redondea el neto antes de calcular el IVA", () => {
    expect(totalCotizacion(99999.6, true)).toEqual({ neto: 100000, iva: 19000, total: 119000 });
  });
  it("el IVA usa 0,19 exacto (no 1,19 - 1, que en coma flotante es 0,18999…)", () => {
    // 50 × 0,19 = 9,5 → 10. Con 0,18999… daría 9,4999… → 9.
    expect(totalCotizacion(50, true).iva).toBe(10);
  });
  it("neto vacío o inválido da cero", () => {
    expect(totalCotizacion(undefined, true)).toEqual({ neto: 0, iva: 0, total: 0 });
  });
});

describe("calcItem", () => {
  it("equipo con IVA y margen", () => {
    const r = calcItem({ tipo: "Equipos", qty: 2, costoUnitNeto: 10000, margen: 30, aplicaIVA: true });
    expect(r.costoNeto).toBe(20000);
    expect(r.ventaNeta).toBeCloseTo(26000, 6);
    expect(r.margenTotal).toBeCloseTo(6000, 6);
    expect(r.ivaCompra).toBeCloseTo(3800, 6);
    expect(r.ivaVenta).toBeCloseTo(4940, 6);
    expect(r.costoBruto).toBeCloseTo(23800, 6);
    expect(r.ventaBruta).toBeCloseTo(30940, 6);
  });
  it("mano de obra: horas × valor hora, sin IVA", () => {
    const r = calcItem({ tipo: "Mano de Obra / HH", qty: 1, hh: 8, valorHH: 15000, margen: 20, aplicaIVA: false });
    expect(r._costoUnit).toBe(120000);
    expect(r.ventaNeta).toBeCloseTo(144000, 6);
    expect(r.ivaVenta).toBe(0);
    expect(r.ventaBruta).toBeCloseTo(144000, 6);
  });
  it("costos indirectos usan costoUnit", () => {
    const r = calcItem({ tipo: "Costos Indirectos", qty: 1, costoUnit: 5000, margen: 0, aplicaIVA: false });
    expect(r.costoNeto).toBe(5000);
    expect(r.ventaNeta).toBe(5000);
  });
  it("un precio de venta fijo (ventaUnitNeta) manda sobre el margen", () => {
    const r = calcItem({ tipo: "Equipos", qty: 3, costoUnitNeto: 1000, margen: 90, ventaUnitNeta: 1500, aplicaIVA: false });
    expect(r.ventaNeta).toBe(4500);
    expect(r.margenTotal).toBe(1500);
  });
  it("ventaUnitNeta vacío vuelve a usar el margen", () => {
    const r = calcItem({ tipo: "Equipos", qty: 1, costoUnitNeto: 1000, margen: 50, ventaUnitNeta: "", aplicaIVA: false });
    expect(r.ventaNeta).toBe(1500);
  });
  it("cantidad 0 o vacía cuenta como 1", () => {
    expect(calcItem({ tipo: "Equipos", qty: 0, costoUnitNeto: 1000, margen: 0 }).costoNeto).toBe(1000);
    expect(calcItem({ tipo: "Equipos", qty: "", costoUnitNeto: 1000, margen: 0 }).costoNeto).toBe(1000);
  });
});

describe("calcFase", () => {
  const equipo = { id: 1, tipo: "Equipos", qty: 2, costoUnitNeto: 10000, margen: 30, aplicaIVA: true };
  const hh     = { id: 2, tipo: "Mano de Obra / HH", qty: 1, hh: 8, valorHH: 15000, margen: 20, aplicaIVA: false };

  it("suma los ítems", () => {
    const f = calcFase({ items: [equipo, hh] });
    expect(f.costoNeto).toBeCloseTo(140000, 6);
    expect(f.ventaNeta).toBeCloseTo(170000, 6);
    expect(f.ivaTotal).toBeCloseTo(4940, 6);
    expect(f.ventaBruta).toBeCloseTo(174940, 6);
    expect(f.ventaConDesc).toBeCloseTo(174940, 6);
  });

  it("aplica el descuento de fase sobre el neto y recalcula el IVA proporcional", () => {
    const f = calcFase({ items: [equipo, hh], descuento: 10 });
    expect(f.descMonto).toBe(17000);               // 10% de 170.000
    expect(f.ventaNetaConDesc).toBeCloseTo(153000, 6);
    expect(f.ivaConDesc).toBe(4446);               // 4.940 × 0,9
    expect(f.ventaConDesc).toBeCloseTo(157446, 6);
  });

  it("fase sin ítems da cero", () => {
    const f = calcFase({ items: [] });
    expect(f.ventaConDesc).toBe(0);
    expect(calcFase({}).ventaConDesc).toBe(0);
  });
});

describe("partidaCobrado", () => {
  it("usa montoCobrado cuando existe (aunque sea 0)", () => {
    expect(partidaCobrado({ monto: 1000000, montoCobrado: 250000, pctAvance: 90 })).toBe(250000);
    expect(partidaCobrado({ monto: 1000000, montoCobrado: 0, pctAvance: 90 })).toBe(0);
  });
  it("sin montoCobrado, calcula desde pctAvance (partidas antiguas)", () => {
    expect(partidaCobrado({ monto: 1000000, pctAvance: 33.3 })).toBeCloseTo(333000, 6);
    expect(partidaCobrado({ monto: 1000000, montoCobrado: "", pctAvance: 50 })).toBe(500000);
  });
});

describe("syncPartidasConFases", () => {
  const fase = { id: 7, items: [{ id: 1, tipo: "Equipos", qty: 1, costoUnitNeto: 100000, margen: 0, aplicaIVA: false }] };

  it("devuelve el mismo arreglo si nada cambió", () => {
    const partidas = [{ faseId: 7, monto: 100000 }, { concepto: "sin fase", monto: 5 }];
    expect(syncPartidasConFases(partidas, [fase])).toBe(partidas);
  });

  it("actualiza el monto a la fase y conserva lo ya cobrado", () => {
    const partidas = [{ faseId: "7", monto: 80000, montoCobrado: 40000 }];
    const [p] = syncPartidasConFases(partidas, [fase]);
    expect(p.monto).toBe(100000);
    expect(p.montoCobrado).toBe(40000);
    expect(p.pctAvance).toBe(40);
  });

  it("el % de avance no pasa de 100 si la fase bajó bajo lo cobrado", () => {
    const [p] = syncPartidasConFases([{ faseId: 7, monto: 200000, montoCobrado: 150000 }], [fase]);
    expect(p.pctAvance).toBe(100);
  });

  it("ignora partidas sin fase o con fase inexistente", () => {
    const partidas = [{ monto: 1 }, { faseId: 99, monto: 2 }];
    expect(syncPartidasConFases(partidas, [fase])).toBe(partidas);
  });
});

describe("codigosPorFase", () => {
  it("numera Equipos, luego Ferretería/Materiales, luego Mano de Obra", () => {
    const items = [
      { id: "mo", tipo: "Mano de Obra / HH" },
      { id: "fe", tipo: "Ferretería" },
      { id: "eq", tipo: "Equipos" },
      { id: "ma", tipo: "Materiales" },
    ];
    expect(codigosPorFase(items, 1)).toEqual({ eq: "F2-001", fe: "F2-002", ma: "F2-003", mo: "F2-004" });
  });
});

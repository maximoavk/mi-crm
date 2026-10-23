import { describe, it, expect } from "vitest";
import { txPagado, compensarPool } from "./calculos.js";

describe("txPagado", () => {
  it("suma solo las transacciones reales", () => {
    expect(txPagado({ transacciones: [{ monto: 1000 }, { monto: 500 }] })).toBe(1500);
  });
  it("ignora monto_pagado declarado", () => {
    expect(txPagado({ monto_pagado: 999999, transacciones: [] })).toBe(0);
  });
  it("sin transacciones, da 0", () => {
    expect(txPagado({})).toBe(0);
  });
});

describe("compensarPool", () => {
  it("una COT pagada completa, sin sobrepago", () => {
    const r = compensarPool([{ total: 100, pagado: 100 }]);
    expect(r[0].efectivo).toBe(100);
    expect(r[0].saldo).toBe(0);
    expect(r[0].pct).toBe(100);
  });

  it("el sobrepago de la primera COT compensa el saldo de la siguiente", () => {
    // Pedido con 2 COTs de 100 c/u, pago total de 120 repartido entre ambas:
    // la primera queda pagada completa, la segunda recibe los 20 restantes.
    const r = compensarPool([
      { id: "A", total: 100, pagado: 120 },
      { id: "B", total: 100, pagado: 0 },
    ]);
    expect(r[0].efectivo).toBe(100);
    expect(r[0].saldo).toBe(0);
    expect(r[1].efectivo).toBe(20);
    expect(r[1].saldo).toBe(80);
  });

  it("sin pago, todo queda pendiente", () => {
    const r = compensarPool([{ total: 50, pagado: 0 }]);
    expect(r[0].efectivo).toBe(0);
    expect(r[0].saldo).toBe(50);
    expect(r[0].pct).toBe(0);
  });

  it("acepta nombres de claves personalizados", () => {
    const r = compensarPool([{ qTotal: 100, qPagado: 50 }], "qTotal", "qPagado");
    expect(r[0].efectivo).toBe(50);
    expect(r[0].saldo).toBe(50);
    expect(r[0].qTotal).toBe(100); // conserva las claves originales
  });

  it("total 0 no divide por cero", () => {
    const r = compensarPool([{ total: 0, pagado: 10 }]);
    expect(r[0].pct).toBe(0);
    expect(r[0].efectivo).toBe(0);
  });
});

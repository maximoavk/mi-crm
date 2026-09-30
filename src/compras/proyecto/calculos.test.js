import { describe, it, expect } from "vitest";
import {
  pagadoComprobante, parteDeComprobante, referenciaCoincide, facturasDeCotizacion, cobradoCotizacion,
  totalOC, pagadoOC, resumenProyecto, evaluarPago, porComprar, siguienteNumeroOC,
} from "./calculos.js";

const q43 = { id: "q43", numero: 43, serie: "COT", total: 1190000 };

describe("cobrado al cliente", () => {
  it("suma las transacciones de un comprobante", () => {
    expect(pagadoComprobante({ transacciones: [{ monto: 100000 }, { monto: "50000" }] })).toBe(150000);
    expect(pagadoComprobante({})).toBe(0);
  });
  it("un comprobante de una sola cotización va completo a ella", () => {
    expect(parteDeComprobante({ quote_ids: ["q43"], transacciones: [{ monto: 500000 }] }, "q43", {})).toBe(500000);
  });
  it("un comprobante de varias cotizaciones se reparte en proporción a sus totales", () => {
    const doc = { quote_ids: ["q43", "q44"], transacciones: [{ monto: 400000 }] };
    const totales = { q43: 300000, q44: 100000 };
    expect(parteDeComprobante(doc, "q43", totales)).toBe(300000);
    expect(parteDeComprobante(doc, "q44", totales)).toBe(100000);
  });
  it("sin totales se reparte en partes iguales; si no la incluye, 0", () => {
    const doc = { quote_ids: ["a", "b"], transacciones: [{ monto: 100000 }] };
    expect(parteDeComprobante(doc, "a", {})).toBe(50000);
    expect(parteDeComprobante(doc, "zzz", {})).toBe(0);
  });
  it("reconoce la referencia de cotización escrita a mano", () => {
    for (const ref of ["COT-043", "cot 43", "43", "COT043", "Cot-0043"]) expect(referenciaCoincide(ref, q43)).toBe(true);
    expect(referenciaCoincide("SIN-043", q43)).toBe(false);
    expect(referenciaCoincide("COT-044", q43)).toBe(false);
    expect(referenciaCoincide("", q43)).toBe(false);
    expect(referenciaCoincide("SIN-7", { numero: 7, serie: "SIN" })).toBe(true);
  });
  it("facturas: por vínculo cotizacion_id o, si no lo tienen, por referencia", () => {
    const facturas = [
      { id: 1, cotizacion_id: "q43" },
      { id: 2, cotizacion_id: "q99", referencia_cotizacion: "COT-043" }, // vinculada a otra: no cuenta
      { id: 3, referencia_cotizacion: "COT-43" },
      { id: 4, referencia_cotizacion: "COT-12" },
    ];
    expect(facturasDeCotizacion(facturas, q43).map(f => f.id)).toEqual([1, 3]);
  });
  it("cobrado total con detalle", () => {
    const r = cobradoCotizacion({
      quote: q43,
      comprobantes: [{ numero: "CP-1", quote_ids: ["q43"], transacciones: [{ monto: 200000 }] }],
      facturas: [{ numero_documento: "1001", cotizacion_id: "q43", pagos_recibidos: [{ monto: 300000 }, { monto: 100000 }] }],
      totalesPorCotizacion: {},
    });
    expect(r.total).toBe(600000);
    expect(r.detalle).toHaveLength(2);
  });
  it("no suma dos veces la factura generada desde un comprobante", () => {
    const r = cobradoCotizacion({
      quote: q43,
      comprobantes: [{ numero: "CP-1", quote_ids: ["q43"], transacciones: [{ monto: 200000 }] }],
      facturas: [{ numero_documento: "1002", cotizacion_id: "q43", notas: 'Generado desde PF "Obra"', pagos_recibidos: [{ monto: 200000 }] }],
      totalesPorCotizacion: {},
    });
    expect(r.total).toBe(200000);
  });
});

describe("órdenes de compra y bolsa del proyecto", () => {
  const ocs = [
    { id: "o1", lines: [{ cantidad: 4, precio_unitario: 53550 }, { cantidad: 1, precio_unitario: 142800 }] }, // 357.000
    { id: "o2", lines: [{ cantidad: 2, precio_unitario: 71400 }] },                                          // 142.800
  ];
  const pagos = [{ purchase_order_id: "o1", monto: 200000 }, { purchase_order_id: "o1", monto: 57000 }];
  it("total y pagado por OC", () => {
    expect(totalOC(ocs[0])).toBe(357000);
    expect(pagadoOC("o1", pagos)).toBe(257000);
    expect(pagadoOC("o2", pagos)).toBe(0);
  });
  it("resumen: cobrado, comprometido, pagado y saldos", () => {
    expect(resumenProyecto({ cobrado: 600000, ocs, pagos })).toEqual({
      cobrado: 600000, comprometido: 499800, pagado: 257000, porPagar: 242800,
      saldoDisponible: 343000, saldoProyectado: 100200,
    });
  });
  it("un pago que supera el saldo se marca (para advertir)", () => {
    expect(evaluarPago(100000, 343000)).toEqual({ excede: false, saldoDespues: 243000 });
    expect(evaluarPago(400000, 343000)).toEqual({ excede: true, saldoDespues: -57000 });
  });
});

describe("qué falta comprar (desde el Costeo)", () => {
  const fases = [
    { nombre: "Fase 1", items: [
      { tipo: "Equipos", productId: "p1", descripcion: "Cámara", qty: 4, costoUnitNeto: 45000, aplicaIVA: true },
      { tipo: "Ferretería", productId: "p2", descripcion: "Cable", qty: 1, costoUnitNeto: 60000, aplicaIVA: true },
      { tipo: "Mano de Obra / HH", descripcion: "Instalación", hh: 8 },           // no se compra
      { tipo: "Equipos", descripcion: "Switch nuevo", qty: 1, costoUnitNeto: 30000 }, // no está en el maestro
    ] },
    { nombre: "Fase 2", items: [{ tipo: "Equipos", productId: "p1", descripcion: "Cámara", qty: 2, costoUnitNeto: 45000, aplicaIVA: true }] },
  ];
  it("agrupa por producto, descuenta lo ya pedido y separa lo que no está en el maestro", () => {
    const { items, sinMaestro } = porComprar(fases, [{ product_id: "p1", cantidad: 5 }]);
    const cam = items.find(i => i.productId === "p1");
    expect(cam).toMatchObject({ qty: 6, yaEnOC: 5, pendiente: 1, costoBruto: 53550 });
    expect(items.find(i => i.productId === "p2")).toMatchObject({ qty: 1, pendiente: 1 });
    expect(items).toHaveLength(2);
    expect(sinMaestro).toEqual([{ descripcion: "Switch nuevo", qty: 1, costoBruto: 35700, fase: "Fase 1" }]);
  });
  it("si se pidió de más, lo pendiente queda en 0", () => {
    expect(porComprar(fases, [{ product_id: "p2", cantidad: 3 }]).items.find(i => i.productId === "p2").pendiente).toBe(0);
  });
});

describe("número de OC", () => {
  it("sigue el correlativo", () => {
    expect(siguienteNumeroOC(["OC-001", "OC-012", "OC-003"])).toBe("OC-013");
    expect(siguienteNumeroOC([])).toBe("OC-001");
    expect(siguienteNumeroOC(["OC-abc", null])).toBe("OC-001");
  });
});

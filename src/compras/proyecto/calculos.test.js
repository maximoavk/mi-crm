import { describe, it, expect } from "vitest";
import {
  pagadoComprobante, parteDeComprobante, referenciaCoincide, facturasDeCotizacion, cobradoCotizacion,
  totalOC, pagadoOC, resumenProyecto, evaluarPago, porComprar, siguienteNumeroOC,
  codigoCot, sugerirCotizacion, vincularProductoEnFases, sugerirCodigo, margenProyecto, netoCotizacion,
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
    // con la lista de cotizaciones, una referencia ambigua no se asigna
    const cots = [q43, { id: "s43", numero: 43, serie: "SIN" }];
    const amb = [{ id: 7, referencia_cotizacion: "43" }, { id: 8, referencia_cotizacion: "COT 43" }];
    expect(facturasDeCotizacion(amb, q43, cots).map(f => f.id)).toEqual([8]);
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
    expect(sinMaestro).toEqual([{ descripcion: "Switch nuevo", modelo: "", tipo: "Equipos", datasheet_url: "", qty: 1, costoBruto: 35700, fases: ["Fase 1"] }]);
  });
  it("los ítems sin maestro con la misma descripción se agrupan", () => {
    const f = [
      { nombre: "A", items: [{ tipo: "Equipos", descripcion: "Switch 8p", qty: 1, costoUnitNeto: 10000 }] },
      { nombre: "B", items: [{ tipo: "Equipos", descripcion: " switch  8P ", qty: 2, costoUnitNeto: 10000 }] },
    ];
    expect(porComprar(f, []).sinMaestro).toMatchObject([{ descripcion: "Switch 8p", qty: 3, fases: ["A", "B"] }]);
  });
  it("enlaza el producto nuevo con los ítems sin maestro de igual descripción", () => {
    const f = [
      { nombre: "A", items: [
        { tipo: "Equipos", descripcion: "Switch 8p", qty: 1 },
        { tipo: "Equipos", descripcion: "Switch 8p", productId: "otro" },       // ya enlazado: no se toca
        { tipo: "Mano de Obra / HH", descripcion: "Switch 8p" },                 // no comprable
      ] },
      { nombre: "B", items: [{ tipo: "Materiales", descripcion: "SWITCH 8P", datasheet_url: "http://x" }] },
    ];
    const r = vincularProductoEnFases(f, "switch 8p", { id: "pN", codigo: "SW-001", ficha_tecnica_url: "http://ficha" });
    expect(r.cambiados).toBe(2);
    expect(r.fases[0].items[0]).toMatchObject({ productId: "pN", cod: "SW-001", datasheet_url: "http://ficha" });
    expect(r.fases[0].items[1].productId).toBe("otro");
    expect(r.fases[0].items[2].productId).toBeUndefined();
    expect(r.fases[1].items[0]).toMatchObject({ productId: "pN", datasheet_url: "http://x" });
    expect(f[0].items[0].productId).toBeUndefined(); // no muta el original
  });
  it("si se pidió de más, lo pendiente queda en 0", () => {
    expect(porComprar(fases, [{ product_id: "p2", cantidad: 3 }]).items.find(i => i.productId === "p2").pendiente).toBe(0);
  });
});

describe("vincular facturas a su cotización", () => {
  const cots = [{ id: "a", numero: 43, serie: "COT" }, { id: "b", numero: 43, serie: "SIN" }, { id: "c", numero: 50, serie: "COT" }];
  it("código de la cotización", () => {
    expect(codigoCot({ numero: 7, serie: "SIN" })).toBe("SIN-007");
    expect(codigoCot({ numero: 43 })).toBe("COT-043");
  });
  it("sugiere solo si hay una candidata", () => {
    expect(sugerirCotizacion("COT-43", cots).id).toBe("a");
    expect(sugerirCotizacion("SIN 43", cots).id).toBe("b");
    expect(sugerirCotizacion("43", cots)).toBeNull();          // COT-043 y SIN-043: ambigua
    expect(sugerirCotizacion("COT-99", cots)).toBeNull();
    expect(sugerirCotizacion("", cots)).toBeNull();
  });
});

describe("número de OC", () => {
  it("sigue el correlativo", () => {
    expect(siguienteNumeroOC(["OC-001", "OC-012", "OC-003"])).toBe("OC-013");
    expect(siguienteNumeroOC([])).toBe("OC-001");
    expect(siguienteNumeroOC(["OC-abc", null])).toBe("OC-001");
  });
});

describe("código sugerido para un producto nuevo", () => {
  const prods = [
    { codigo: "ECAM-001", categoria: "CCTV Equipos" }, { codigo: "ECAM-007", categoria: "CCTV Equipos" },
    { codigo: "X-1", categoria: "CCTV Equipos" }, { codigo: "ECAM-009", categoria: "Otra" },
    { codigo: "SW01", categoria: "Redes" },
  ];
  it("usa el prefijo más común de la categoría y el siguiente número libre", () => {
    expect(sugerirCodigo("CCTV Equipos", prods)).toBe("ECAM-010");
    expect(sugerirCodigo("Redes", prods)).toBe("SW02");
  });
  it("sin categoría o sin productos en ella, nada", () => {
    expect(sugerirCodigo("", prods)).toBe("");
    expect(sugerirCodigo("Nueva", prods)).toBe("");
  });
});

describe("margen del proyecto", () => {
  const quote = { id: "q1", total: 1190000 };      // neto 1.000.000
  const fases = [{ nombre: "F1", items: [
    { tipo: "Equipos", qty: 4, costoUnitNeto: 50000, margen: 30 },                 // 200.000
    { tipo: "Ferretería", qty: 1, costoUnitNeto: 100000, margen: 30 },             // 100.000
    { tipo: "Mano de Obra / HH", qty: 1, hh: 10, valorHH: 15000, margen: 50 },     // 150.000
    { tipo: "Costos Indirectos", qty: 1, costoUnit: 50000, margen: 0 },            //  50.000
  ] }];
  const datos = {
    quote, fases,
    ocs: [
      { id: "o1", numero_oc: "OC-1", cotizacion_id: "q1", lines: [{ cantidad: 4, precio_unitario: 59500 }] }, // neto 200.000
      { id: "o9", numero_oc: "OC-9", cotizacion_id: "otra", lines: [{ cantidad: 1, precio_unitario: 999999 }] },
    ],
    shipments: [{ purchase_order_id: "o1", costo_despacho: 8000 }],
    serviceLines: [{ cotizacion_id: "q1", descripcion: "Instalación", subtotal_neto: 120000 }],
    gastos: [{ cotizacion_id: "q1", descripcion: "Combustible", monto_neto: 20000 }],
    facturasRecibidas: [
      { cotizacion_id: "q1", purchase_order_id: "o1", monto_neto: 200000, tipo_proveedor: "Proveedor" }, // ya está en la OC
      { cotizacion_id: "q1", purchase_order_id: null, monto_neto: 60000, tipo_proveedor: "Subcontratista", numero_documento: "OT-5", tipo_documento: "Orden de Trabajo" },
      { cotizacion_id: "q1", purchase_order_id: null, monto_neto: 90000, tipo_proveedor: "Proveedor", numero_documento: "77" },
    ],
  };
  it("neto de la cotización", () => {
    expect(netoCotizacion({ total: 1190000 })).toBe(1000000);
    expect(netoCotizacion({ total: 500000, aplica_iva: false })).toBe(500000);
  });
  it("presupuesto por categoría desde el Costeo y real sin contar dos veces la factura de la OC", () => {
    const m = margenProyecto(datos);
    expect(m.categorias.map(c => [c.key, c.presupuesto, c.real])).toEqual([
      ["materiales", 300000, 298000],   // OC 200.000 + flete 8.000 + factura sin OC 90.000
      ["manoObra", 150000, 180000],     // servicio 120.000 + OT 60.000
      ["otros", 50000, 20000],
    ]);
    expect(m.venta).toBe(1000000);
    expect(m.presupuestado).toEqual({ monto: 500000, pct: 50 });
    expect(m.real).toEqual({ monto: 502000, pct: 50.2 });
    expect(m.proyectado).toEqual({ monto: 1000000 - (300000 + 180000 + 50000), pct: 47 });
    expect(m.categorias[1].detalle.map(d => d.origen)).toEqual(["Servicio", "OT"]);
  });
});


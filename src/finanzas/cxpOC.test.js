import { describe, it, expect } from "vitest";
import { pagosOCPorFactura, ocsSinFactura, netoDesdeBruto } from "./cxpOC.js";

describe("pagos de OC aplicados a las facturas del proveedor", () => {
  it("una factura por OC recibe lo pagado a la OC, sin pasarse de su total", () => {
    const facturas = [{ id: 1, purchase_order_id: "o1", monto_total: 100000 }, { id: 2, monto_total: 50000 }];
    expect(pagosOCPorFactura(facturas, [{ purchase_order_id: "o1", monto: 60000 }])).toEqual({ 1: 60000 });
    expect(pagosOCPorFactura(facturas, [{ purchase_order_id: "o1", monto: 150000 }])).toEqual({ 1: 100000 });
  });
  it("con varias facturas, en orden de recepción y descontando sus pagos propios", () => {
    const facturas = [
      { id: "b", purchase_order_id: "o1", monto_total: 80000, fecha_recepcion: "2026-09-10" },
      { id: "a", purchase_order_id: "o1", monto_total: 50000, fecha_recepcion: "2026-09-01", pagos_realizados: [{ monto: 20000 }] },
    ];
    expect(pagosOCPorFactura(facturas, [{ purchase_order_id: "o1", monto: 70000 }])).toEqual({ a: 30000, b: 40000 });
  });
});

describe("OC sin factura", () => {
  const ocs = [
    { id: "o1", estado: "PENDIENTE", purchase_order_lines: [{ cantidad: 2, precio_unitario: 50000 }] },
    { id: "o2", estado: "PAGADA", purchase_order_lines: [{ cantidad: 1, precio_unitario: 10000 }] },   // antigua, pagada sin pagos_oc
    { id: "o3", estado: "PAGADA", purchase_order_lines: [{ cantidad: 1, precio_unitario: 30000 }] },   // pagada desde Compras
    { id: "o4", estado: "PENDIENTE", purchase_order_lines: [{ cantidad: 1, precio_unitario: 5000 }] },  // tiene factura
  ];
  it("lista las que tienen algo pagado o por pagar y no tienen factura", () => {
    const r = ocsSinFactura(ocs, [{ purchase_order_id: "o4" }], [{ purchase_order_id: "o3", monto: 30000 }]);
    expect(r.map(x => [x.oc.id, x.total, x.pagado, x.pendiente])).toEqual([["o1", 100000, 0, 100000], ["o3", 30000, 30000, 0]]);
  });
});

it("neto e IVA desde el bruto", () => {
  expect(netoDesdeBruto(119000)).toEqual({ neto: 100000, iva: 19000 });
  expect(netoDesdeBruto(53550)).toEqual({ neto: 45000, iva: 8550 });
});

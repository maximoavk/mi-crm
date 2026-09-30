// Estado de pago de un documento (factura por cobrar o por pagar):
// pagado, vencido, parcial o pendiente. Tests en estadoPago.test.js.
export const calcEstado = (total, pagado, vencimiento, estado_manual) => {
  if (estado_manual) return estado_manual;
  if (total > 0 && pagado >= total) return "pagado";
  const hoy = new Date();
  const venc = vencimiento ? new Date(vencimiento + "T00:00") : null;
  if (venc && venc < hoy) return "vencido";
  if (pagado > 0) return "parcial";
  return "pendiente";
};

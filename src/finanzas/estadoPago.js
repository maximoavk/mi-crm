// Estado de pago de un documento (factura por cobrar o por pagar):
// pagado, vencido, parcial o pendiente. Tests en estadoPago.test.js.
import { hoyISO } from "../shared/format.js";

export const calcEstado = (total, pagado, vencimiento, estado_manual) => {
  if (estado_manual) return estado_manual;
  if (total > 0 && pagado >= total) return "pagado";
  // Vence hoy = todavía a tiempo; pasa a vencido desde el día siguiente.
  if (vencimiento && String(vencimiento).slice(0, 10) < hoyISO()) return "vencido";
  if (pagado > 0) return "parcial";
  return "pendiente";
};

// Vínculo factura emitida ↔ cotización. Con el vínculo, los cobros de la
// factura entran al saldo del proyecto en Compras → Por proyecto.
import { supabase, must } from "../supabaseClient.js";
import { codigoCot } from "../compras/proyecto/calculos.js";

// quote = null quita el vínculo (y la referencia, para que no se vuelva a
// asociar sola por el texto).
export const vincularFactura = (facturaId, quote) =>
  must(supabase.from("facturas_emitidas")
    .update({ cotizacion_id: quote ? quote.id : null, referencia_cotizacion: quote ? codigoCot(quote) : null })
    .eq("id", facturaId));

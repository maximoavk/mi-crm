// Lecturas y escrituras de "Compras del proyecto" en Supabase.
import { supabase, must } from "../../supabaseClient.js";
import { hoyISO } from "../../shared/format.js";
import { siguienteNumeroOC, vincularProductoEnFases } from "./calculos.js";

// Todo lo que la pantalla necesita, en una pasada. Si la tabla pagos_oc
// todavía no existe (falta correr el SQL), se informa en faltaSQL y el
// resto funciona igual.
export async function cargarTodo() {
  const [cots, comps, facts, ocs, costeos, supps, prices, prods, pagos] = await Promise.all([
    supabase.from("cotizaciones").select("id,numero,serie,estado,total,nombre_cliente,razon_social").order("numero", { ascending:false }),
    supabase.from("comprobantes_pago").select("id,numero,quote_ids,transacciones"),
    supabase.from("facturas_emitidas").select("id,numero_documento,cotizacion_id,referencia_cotizacion,notas,pagos_recibidos(monto)"),
    supabase.from("purchase_orders")
      .select("id,numero_oc,estado,cotizacion_id,supplier_id,notas,created_at,suppliers(id,nombre),purchase_order_lines(id,product_id,cantidad,precio_unitario,products(id,codigo,nombre))")
      .not("cotizacion_id", "is", null).order("created_at"),
    supabase.from("costeos").select("id,cotizacion_id,fases"),
    supabase.from("suppliers").select("id,nombre").order("nombre"),
    supabase.from("product_prices").select("id,product_id,supplier_id,precio_bruto,es_preferido,suppliers(id,nombre)").order("es_preferido", { ascending:false }),
    supabase.from("products").select("id,codigo,categoria"),
    supabase.from("pagos_oc").select("*").order("fecha"),
  ]);
  const error = [cots, comps, facts, ocs, costeos, supps, prices, prods].find(r => r.error)?.error;
  if (error) throw error;
  return {
    cotizaciones: cots.data || [],
    comprobantes: comps.data || [],
    facturas:     facts.data || [],
    ocs:          (ocs.data || []).map(o => ({ ...o, lines: o.purchase_order_lines || [] })),
    costeos:      costeos.data || [],
    suppliers:    supps.data || [],
    prices:       prices.data || [],
    productos:    prods.data || [],
    pagos:        pagos.data || [],
    faltaSQL:     !!pagos.error,
  };
}

// Crea una OC por proveedor. grupos: [{ supplier_id, lineas:[{product_id,
// supplier_price_id, cantidad, precio_unitario (bruto)}] }]. El número se
// calcula con lo que hay en la base (no con lo cargado en pantalla), para
// no repetir un número creado desde otra ventana.
export async function crearOCs(cotizacionId, grupos, notas) {
  const existentes = await must(supabase.from("purchase_orders").select("numero_oc"));
  const numeros = existentes.map(o => o.numero_oc);
  const creadas = [];
  for (const g of grupos) {
    const numero_oc = siguienteNumeroOC(numeros);
    numeros.push(numero_oc);
    const oc = await must(supabase.from("purchase_orders").insert({
      numero_oc, supplier_id: g.supplier_id, cotizacion_id: cotizacionId, estado: "PENDIENTE",
      notas: notas || null, updated_at: new Date().toISOString(),
    }).select().single());
    try {
      await must(supabase.from("purchase_order_lines").insert(g.lineas.map(l => ({ ...l, purchase_order_id: oc.id }))));
    } catch (e) {
      // Sin líneas la OC queda vacía: se borra para no dejar basura.
      await supabase.from("purchase_orders").delete().eq("id", oc.id);
      throw e;
    }
    creadas.push(numero_oc);
  }
  return creadas;
}

export async function registrarPago(pago, marcarPagada) {
  await must(supabase.from("pagos_oc").insert(pago));
  if (marcarPagada) {
    await must(supabase.from("purchase_orders")
      .update({ estado: "PAGADA", updated_at: new Date().toISOString() }).eq("id", pago.purchase_order_id));
  }
}

export const borrarPago = (id) => must(supabase.from("pagos_oc").delete().eq("id", id));

// Crea en el maestro un producto que el Costeo tenía escrito a mano (con su
// precio de proveedor, si se indica) y lo enlaza en los ítems del costeo con
// esa descripción. Las fases se releen de la base justo antes de guardar,
// para no pisar cambios hechos en el Costeo mientras tanto.
export async function crearProductoDesdeCosteo({ producto, precio, costeoId, descripcion }) {
  const repetido = await must(supabase.from("products").select("id").eq("codigo", producto.codigo).limit(1));
  if (repetido.length) throw new Error(`ya existe un producto con el código ${producto.codigo}`);
  const creado = await must(supabase.from("products").insert(producto).select().single());
  if (precio) {
    await must(supabase.from("product_prices").insert({
      product_id: creado.id, supplier_id: precio.supplier_id, precio_bruto: precio.precio_bruto,
      es_preferido: true, actualizado: hoyISO(),
    }));
  }
  const costeo = await must(supabase.from("costeos").select("fases").eq("id", costeoId).single());
  const { fases, cambiados } = vincularProductoEnFases(costeo.fases, descripcion, creado);
  if (cambiados) {
    await must(supabase.from("costeos").update({ fases, updated_at: new Date().toISOString() }).eq("id", costeoId));
  }
  return { producto: creado, cambiados };
}


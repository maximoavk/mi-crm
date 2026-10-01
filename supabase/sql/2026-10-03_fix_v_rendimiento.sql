-- Corrige v_rendimiento_cotizacion (Finanzas → Rendimiento por COT): una
-- factura recibida vinculada a una OC (facturas_recibidas.purchase_order_id,
-- ver 2026-10-02_cxp_oc_caja.sql) documenta una compra que ya se cuenta en
-- las OC del proyecto, así que no se resta de nuevo del margen ni se suma
-- otra vez su IVA al crédito fiscal. Único cambio respecto de la vista
-- anterior: "and purchase_order_id is null" en el bloque fr_agg.
-- Compras → Por proyecto (Margen) usa las mismas fuentes.
-- Correr una vez en Supabase → SQL Editor (requiere 2026-10-02_cxp_oc_caja.sql).

-- CREATE OR REPLACE VIEW reinicia las opciones de la vista (ej.
-- security_invoker): se guardan antes y se restauran después.
begin;

create temp table _opciones_vista as
  select reloptions from pg_class where oid = 'public.v_rendimiento_cotizacion'::regclass;

create or replace view public.v_rendimiento_cotizacion as
 SELECT c.id AS cotizacion_id,
    c.numero AS numero_cotizacion,
    c.razon_social AS cliente,
    c.rut_cliente,
    c.total AS presupuesto_total,
    c.aplica_iva AS cot_aplica_iva,
    c.estado AS estado_cotizacion,
    COALESCE(fe_agg.count_facturas, 0::bigint) AS n_facturas_emitidas,
    COALESCE(fe_agg.total_neto_emitido, 0::numeric) AS total_neto_emitido,
    COALESCE(fe_agg.total_iva_emitido, 0::numeric) AS debito_fiscal,
    COALESCE(fe_agg.total_emitido, 0::numeric) AS total_facturado_cliente,
    COALESCE(fe_agg.total_cobrado, 0::numeric) AS total_cobrado,
    COALESCE(fe_agg.total_emitido, 0::numeric) - COALESCE(fe_agg.total_cobrado, 0::numeric) AS saldo_por_cobrar,
    COALESCE(oc_agg.count_oc, 0::bigint) AS n_ordenes_compra,
    COALESCE(oc_agg.total_neto_oc, 0::numeric) AS total_neto_compras,
    COALESCE(oc_agg.total_iva_oc, 0::numeric) AS iva_compras,
    COALESCE(oc_agg.total_bruto_oc, 0::numeric) AS total_bruto_compras,
    COALESCE(fl_agg.total_neto_flete, 0::numeric) AS total_neto_flete,
    COALESCE(fl_agg.total_iva_flete, 0::numeric) AS iva_flete,
    COALESCE(fl_agg.total_bruto_flete, 0::numeric) AS total_bruto_flete,
    COALESCE(sl_agg.count_lines, 0::bigint) AS n_lineas_servicio,
    COALESCE(sl_agg.total_neto_servicios, 0::numeric) AS total_neto_servicios,
    COALESCE(sl_agg.total_iva_servicios, 0::numeric) AS iva_servicios,
    COALESCE(sl_agg.total_servicios, 0::numeric) AS total_bruto_servicios,
    COALESCE(gd_agg.count_gastos, 0::bigint) AS n_gastos_directos,
    COALESCE(gd_agg.total_neto_gastos, 0::numeric) AS total_neto_gastos,
    COALESCE(gd_agg.total_iva_gastos, 0::numeric) AS iva_gastos,
    COALESCE(gd_agg.total_gastos, 0::numeric) AS total_bruto_gastos,
    COALESCE(fr_agg.count_fr, 0::bigint) AS n_facturas_recibidas,
    COALESCE(fr_agg.total_neto_fr, 0::numeric) AS total_neto_fr,
    COALESCE(fr_agg.total_iva_fr, 0::numeric) AS iva_fr,
    COALESCE(fe_agg.total_iva_emitido, 0::numeric) AS total_debito_fiscal,
    COALESCE(oc_agg.total_iva_oc, 0::numeric) + COALESCE(fl_agg.total_iva_flete, 0::numeric) + COALESCE(sl_agg.total_iva_servicios, 0::numeric) + COALESCE(gd_agg.total_iva_gastos, 0::numeric) + COALESCE(fr_agg.total_iva_fr, 0::numeric) AS total_credito_fiscal,
    COALESCE(fe_agg.total_neto_emitido, 0::numeric) - COALESCE(oc_agg.total_neto_oc, 0::numeric) - COALESCE(fl_agg.total_neto_flete, 0::numeric) - COALESCE(sl_agg.total_neto_servicios, 0::numeric) - COALESCE(gd_agg.total_neto_gastos, 0::numeric) - COALESCE(fr_agg.total_neto_fr, 0::numeric) AS margen_neto,
        CASE
            WHEN COALESCE(fe_agg.total_neto_emitido, 0::numeric) > 0::numeric THEN round((COALESCE(fe_agg.total_neto_emitido, 0::numeric) - COALESCE(oc_agg.total_neto_oc, 0::numeric) - COALESCE(fl_agg.total_neto_flete, 0::numeric) - COALESCE(sl_agg.total_neto_servicios, 0::numeric) - COALESCE(gd_agg.total_neto_gastos, 0::numeric) - COALESCE(fr_agg.total_neto_fr, 0::numeric)) / COALESCE(fe_agg.total_neto_emitido, 0::numeric) * 100::numeric, 1)
            ELSE 0::numeric
        END AS pct_margen
   FROM cotizaciones c
     LEFT JOIN ( SELECT fe_sub.cotizacion_id,
            count(*) AS count_facturas,
            sum(fe_sub.monto_neto) AS total_neto_emitido,
            sum(fe_sub.monto_iva) AS total_iva_emitido,
            sum(fe_sub.monto_total) AS total_emitido,
            ( SELECT COALESCE(sum(pr2.monto), 0::numeric) AS "coalesce"
                   FROM pagos_recibidos pr2
                     JOIN facturas_emitidas fe2 ON fe2.id = pr2.factura_id
                  WHERE fe2.cotizacion_id = fe_sub.cotizacion_id) AS total_cobrado
           FROM facturas_emitidas fe_sub
          WHERE fe_sub.cotizacion_id IS NOT NULL
          GROUP BY fe_sub.cotizacion_id) fe_agg ON fe_agg.cotizacion_id = c.id
     LEFT JOIN ( SELECT po.cotizacion_id,
            count(DISTINCT po.id) AS count_oc,
            sum(round(pol.cantidad::numeric * pol.precio_unitario / 1.19)) AS total_neto_oc,
            sum(round(pol.cantidad::numeric * pol.precio_unitario * 0.19 / 1.19)) AS total_iva_oc,
            sum(pol.cantidad::numeric * pol.precio_unitario) AS total_bruto_oc
           FROM purchase_orders po
             JOIN purchase_order_lines pol ON pol.purchase_order_id = po.id
          WHERE po.cotizacion_id IS NOT NULL
          GROUP BY po.cotizacion_id) oc_agg ON oc_agg.cotizacion_id = c.id
     LEFT JOIN ( SELECT po.cotizacion_id,
            sum(sh.costo_despacho) AS total_neto_flete,
            sum(
                CASE
                    WHEN sh.aplica_iva_despacho THEN round(sh.costo_despacho * 0.19)
                    ELSE 0::numeric
                END) AS total_iva_flete,
            sum(sh.costo_despacho +
                CASE
                    WHEN sh.aplica_iva_despacho THEN round(sh.costo_despacho * 0.19)
                    ELSE 0::numeric
                END) AS total_bruto_flete
           FROM shipments sh
             JOIN purchase_orders po ON po.id = sh.purchase_order_id
          WHERE po.cotizacion_id IS NOT NULL AND sh.costo_despacho IS NOT NULL AND sh.costo_despacho > 0::numeric
          GROUP BY po.cotizacion_id) fl_agg ON fl_agg.cotizacion_id = c.id
     LEFT JOIN ( SELECT cot_service_lines.cotizacion_id,
            count(*) AS count_lines,
            sum(cot_service_lines.subtotal_neto) AS total_neto_servicios,
            sum(cot_service_lines.monto_iva) AS total_iva_servicios,
            sum(cot_service_lines.subtotal_total) AS total_servicios
           FROM cot_service_lines
          GROUP BY cot_service_lines.cotizacion_id) sl_agg ON sl_agg.cotizacion_id = c.id
     LEFT JOIN ( SELECT cot_gastos_directos.cotizacion_id,
            count(*) AS count_gastos,
            sum(cot_gastos_directos.monto_neto) AS total_neto_gastos,
            sum(cot_gastos_directos.monto_iva) AS total_iva_gastos,
            sum(cot_gastos_directos.monto_total) AS total_gastos
           FROM cot_gastos_directos
          GROUP BY cot_gastos_directos.cotizacion_id) gd_agg ON gd_agg.cotizacion_id = c.id
     LEFT JOIN ( SELECT facturas_recibidas.cotizacion_id,
            count(*) AS count_fr,
            sum(facturas_recibidas.monto_neto) AS total_neto_fr,
            sum(facturas_recibidas.monto_iva) AS total_iva_fr
           FROM facturas_recibidas
          WHERE facturas_recibidas.cotizacion_id IS NOT NULL
            AND facturas_recibidas.purchase_order_id IS NULL
          GROUP BY facturas_recibidas.cotizacion_id) fr_agg ON fr_agg.cotizacion_id = c.id
  ORDER BY c.numero DESC;

do $$
declare
  opciones text[];
begin
  select reloptions into opciones from _opciones_vista;
  if opciones is not null then
    execute format('alter view public.v_rendimiento_cotizacion set (%s)', array_to_string(opciones, ', '));
  end if;
end $$;

drop table _opciones_vista;

commit;

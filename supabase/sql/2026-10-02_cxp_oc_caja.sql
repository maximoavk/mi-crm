-- Pagos a OC en Cuentas por Pagar y en Caja.
-- 1. facturas_recibidas.purchase_order_id: la factura del proveedor queda
--    vinculada a su OC; lo pagado a la OC (pagos_oc) cuenta como pagado en
--    la factura, sin registrarlo dos veces.
-- 2. pagos_oc.movimiento_id: el egreso que el pago generó en Caja
--    (movimientos_cuenta), para borrarlo junto con el pago.
-- Requiere 2026-10-01_compras_proyecto.sql. Correr una vez en Supabase → SQL Editor.

do $$
declare
  tipo_oc  text;
  tipo_mov text;
begin
  select format_type(a.atttypid, a.atttypmod) into tipo_oc
  from pg_attribute a where a.attrelid = 'public.purchase_orders'::regclass and a.attname = 'id';
  select format_type(a.atttypid, a.atttypmod) into tipo_mov
  from pg_attribute a where a.attrelid = 'public.movimientos_cuenta'::regclass and a.attname = 'id';

  execute format('alter table public.facturas_recibidas add column if not exists purchase_order_id %s references public.purchase_orders(id) on delete set null', tipo_oc);
  execute format('alter table public.pagos_oc add column if not exists movimiento_id %s references public.movimientos_cuenta(id) on delete set null', tipo_mov);
end $$;

create index if not exists facturas_recibidas_purchase_order_id_idx on public.facturas_recibidas (purchase_order_id);

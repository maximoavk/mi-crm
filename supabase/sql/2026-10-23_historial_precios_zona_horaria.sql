-- Corrección: el trigger de histórico usaba current_date (UTC del servidor), por
-- lo que desde las ~21:00 en Chile registraba el cambio con la fecha de mañana.
-- Ahora usa la fecha de Chile (America/Santiago), igual que el resto del ERP.
--
-- YA APLICADO en producción el 23-oct-2026 (junto con la carga de Prodalam).
-- Reemplaza la función de 2026-10-23_historial_precios_automatico.sql.

create or replace function public.registrar_cambio_precio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hoy_cl date := (now() at time zone 'America/Santiago')::date;
  usd_ref numeric;
begin
  select usd into usd_ref
  from public.tipo_cambio_diario
  where fecha <= hoy_cl
  order by fecha desc
  limit 1;

  insert into public.product_price_history
    (product_price_id, product_id, supplier_id, precio_bruto, sku_proveedor, url,
     fecha, precio_nuevo, fecha_cambio, tipo_cambio_usd, fuente)
  values
    (old.id, old.product_id, old.supplier_id, old.precio_bruto, old.sku_proveedor, old.url,
     coalesce(old.actualizado, hoy_cl), new.precio_bruto, hoy_cl, usd_ref, 'trigger');

  return new;
end;
$$;

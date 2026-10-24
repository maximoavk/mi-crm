-- Correcciones del maestro halladas por el monitor de precios (23-oct-2026).
--
-- 1) ERED-025 (Switch Dahua administrable PoE 8 puertos, en una OC): su precio de Smart Secure
--    tenía copiado el SKU de ERED-008 (DH-PFS3010-8ET-65). El producto real que vende la tienda
--    es DH-CS4010-8ET2GT-60. NO es un duplicado de ERED-008, por eso se corrige el SKU y no se fusiona.
--
-- 2) VideoVision: en EAUT-017, ECAM-017, ECAM-018 y MCAB-002 el maestro tenía el precio NETO
--    (sin IVA) en pesos al tipo de cambio de abril. El maestro guarda el precio CON IVA, igual que
--    los demás proveedores (y de ahí se calcula el neto dividiendo por 1,19). Se actualizan al
--    último valor "CLP con IVA" que calculó el monitor con la tasa de pesos del propio portal de
--    VideoVision (la misma que muestra su selector de CLP).
--    Antes, correr: select public.monitorear_precios_proveedores(false, 'VideoVision');
--    para que el monitor tenga el valor de hoy. El trigger guarda el precio anterior en el histórico.
--
-- Respaldo previo en respaldo.*_corr_20261023.
-- Correr una vez en Supabase → SQL Editor.

create table respaldo.products_corr_20261023 as select * from public.products;
create table respaldo.product_prices_corr_20261023 as select * from public.product_prices;

do $$
declare
  hoy_cl date := (now() at time zone 'America/Santiago')::date;
  vv uuid;
  n int;
begin
  -- 1) SKU de ERED-025
  update public.product_prices pp
     set sku_proveedor = 'DH-CS4010-8ET2GT-60'
    from public.products p
   where p.id = pp.product_id and p.codigo = 'ERED-025' and trim(pp.sku_proveedor) = 'DH-PFS3010-8ET-65';
  update public.products set sku_proveedor = 'DH-CS4010-8ET2GT-60'
   where codigo = 'ERED-025' and trim(sku_proveedor) = 'DH-PFS3010-8ET-65';

  -- 2) VideoVision a precio con IVA
  select id into vv from public.suppliers where nombre = 'VideoVision';

  with ult as (
    select distinct on (m.product_price_id) m.product_price_id, m.precio_web
      from public.monitor_precios m
      join public.products p on p.id = m.product_id
     where m.supplier_id = vv
       and trim(p.codigo) in ('EAUT-017', 'ECAM-017', 'ECAM-018', 'MCAB-002')
       and m.precio_web is not null and m.estado in ('revisar', 'igual')
     order by m.product_price_id, m.revisado_en desc)
  update public.product_prices pp
     set precio_bruto = ult.precio_web, actualizado = hoy_cl
    from ult
   where pp.id = ult.product_price_id;
  get diagnostics n = row_count;
  if n <> 4 then
    raise exception 'Se esperaban 4 precios de VideoVision y se actualizaron %; revisar que el monitor de VideoVision haya corrido', n;
  end if;

  update public.products p
     set precio = pp.precio_bruto, precio_actualizado = pp.actualizado
    from public.product_prices pp
   where pp.product_id = p.id and pp.es_preferido
     and trim(p.codigo) in ('EAUT-017', 'ECAM-017', 'ECAM-018', 'MCAB-002');
end $$;

select p.codigo, pp.precio_bruto as nuevo_precio, p.precio as precio_ficha, pp.sku_proveedor
  from public.products p
  join public.product_prices pp on pp.product_id = p.id
 where trim(p.codigo) in ('EAUT-017', 'ECAM-017', 'ECAM-018', 'MCAB-002', 'ERED-025')
 order by p.codigo;

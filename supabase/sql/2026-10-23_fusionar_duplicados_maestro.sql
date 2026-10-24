-- Fusión de productos duplicados del maestro (23-oct-2026).
--
-- Se borran los duplicados y se conserva la ficha más antigua de cada par:
--   EACC-001 <- EACC-002   Retenedor electromagnético CM-280HS (Smart Secure)
--   ECAM-005 <- ECAM-020   Cámara Dahua 4MP DH-IPC-HFW3441E-S-S2 (Smart Secure)
--   ECAM-004 <- ECAM-016   Cámara Dahua 2MP DH-IPC-HFW1239S1-LED-0280B (Smart Secure, IAI Tech)
--   MAT-035  <- MAT-037    Diluyente 1 Lt (Construmart)
--   MAUT-005 <- MAUT-083   Soporte superior con 2 guías 70789-UN (Prodalam); MAUT-005 queda
--                          con el SKU, la URL y el precio reales de Prodalam
--
-- NO se tocan ERED-008 / ERED-025 (mismo SKU, pero ERED-025 está en una orden de compra y el
-- precio de ERED-008 de IAI Tech sugiere que podrían ser modelos distintos).
--
-- Seguridad:
--   * Respaldo previo en respaldo.*_dup_20261023.
--   * Si algún duplicado está usado en un costeo (cot_service_lines) o una OC
--     (purchase_order_lines) NO se borra nada (esas columnas quedarían en null al borrar).
--   * Al borrar un producto se borran en cascada sus precios, histórico y registros del monitor.
--
-- ORDEN: correr DESPUÉS de aplicar el monitor a Smart Secure
--   (select public.monitorear_precios_proveedores(true, 'Smart Secure');)
--
-- Correr una vez en Supabase → SQL Editor.

create table respaldo.products_dup_20261023 as select * from public.products;
create table respaldo.product_prices_dup_20261023 as select * from public.product_prices;
create table respaldo.product_price_history_dup_20261023 as select * from public.product_price_history;

do $$
declare
  usados int;
  hoy_cl date := (now() at time zone 'America/Santiago')::date;
  nombre_nuevo text := 'Soporte Superior para Portones Corredera con 2 Guías de Nylon Soldable de 35mm (Combiarialdo)';
  url_nueva text := 'https://www.prodalam.cl/productos/70789-UN/soporte-superior-para-portones-corredera-con-2-guias-de-nylon-soldable-de-35mm-diametro-x-30mm-alto-regulables';
begin
  select (select count(*) from public.cot_service_lines l join public.products p on p.id = l.product_id
           where trim(p.codigo) in ('EACC-002','ECAM-020','ECAM-016','MAT-037','MAUT-083'))
       + (select count(*) from public.purchase_order_lines l join public.products p on p.id = l.product_id
           where trim(p.codigo) in ('EACC-002','ECAM-020','ECAM-016','MAT-037','MAUT-083'))
    into usados;
  if usados > 0 then
    raise exception 'Hay % líneas de costeo u OC que usan los duplicados; no se borra nada', usados;
  end if;

  -- MAUT-005 adopta los datos reales de Prodalam (el SKU KITG4060 de su precio no existe en el sitio).
  update public.product_prices pp
     set sku_proveedor = '70789-UN', url = url_nueva, precio_bruto = 17790, actualizado = hoy_cl
    from public.products p
   where p.id = pp.product_id and p.codigo = 'MAUT-005';

  update public.products
     set nombre = nombre_nuevo, descripcion = nombre_nuevo, precio = 17790,
         sku_proveedor = '70789-UN', url_proveedor = url_nueva, precio_actualizado = hoy_cl
   where codigo = 'MAUT-005';

  delete from public.products
   where trim(codigo) in ('EACC-002','ECAM-020','ECAM-016','MAT-037','MAUT-083');
end $$;

-- Sincronizar products.precio con el precio preferido en los 3 que estaban desfasados
-- (EAUT-016 se deja fuera a propósito: su precio de RW está pendiente).
update public.products p
   set precio = pp.precio_bruto,
       precio_actualizado = coalesce(pp.actualizado, p.precio_actualizado)
  from public.product_prices pp
 where pp.product_id = p.id and pp.es_preferido
   and p.codigo in ('EAUT-012', 'ECAM-006', 'ECAM-007');

-- Verificación: los 5 duplicados borrados (0 restantes) y los 3 sincronizados (0 desfasados).
select
  (select count(*) from public.products where trim(codigo) in ('EACC-002','ECAM-020','ECAM-016','MAT-037','MAUT-083')) as duplicados_restantes,
  (select count(*) from public.products p join public.product_prices pp on pp.product_id = p.id and pp.es_preferido
    where p.codigo in ('EAUT-012','ECAM-006','ECAM-007') and abs(p.precio - pp.precio_bruto) > 1) as desfasados_restantes;
